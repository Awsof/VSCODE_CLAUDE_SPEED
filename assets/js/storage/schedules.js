/**
 * SchedulerManager — Gerenciador de agendamentos
 * Persiste e executa testes programados
 */
const SchedulerManager = (() => {
  const namespace = 'stp_v3_schedules';

  const _token = () =>
    typeof SessionManager !== 'undefined' ? SessionManager.getToken?.() : null;

  const _apiSync = (method, path, body) => {
    try {
      const token = _token();
      if (!token) return;
      const opts = { method, headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token } };
      if (body) opts.body = JSON.stringify(body);
      fetch(path, opts).catch(e => console.warn('[SchedulerManager] API sync falhou:', e.message));
    } catch (e) {
      console.warn('[SchedulerManager] _apiSync error:', e.message);
    }
  };

  const syncFromTurso = async () => {
    try {
      const token = _token();
      if (!token) return false; // schedules GET também requer JWT
      const headers = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + token };
      const res = await fetch('/api/schedules', { headers });
      if (!res.ok) return false;
      const data = await res.json();
      const remoteSchedules = data.schedules || [];
      const localIdArr = StorageEngine.get(`${namespace}_index`, []);
      const localIds   = new Set(localIdArr);

      // Auto-migração: Turso vazio mas localStorage tem dados (JWT disponível)
      if (remoteSchedules.length === 0 && localIdArr.length > 0) {
        const localSchedules = localIdArr
          .map(id => StorageEngine.get(`${namespace}_${id}`))
          .filter(Boolean);
        console.log('[SchedulerManager] Turso vazio — migrando ' + localSchedules.length + ' agendamento(s)...');
        for (const s of localSchedules) {
          try {
            await fetch('/api/schedules', { method: 'POST', headers, body: JSON.stringify(s) });
          } catch {}
        }
        console.log('[SchedulerManager] Migração concluída');
        return false;
      }

      const remoteIds = new Set(remoteSchedules.map(s => s.id));
      const changed = remoteSchedules.length !== localIds.size ||
        [...remoteIds].some(id => !localIds.has(id));
      if (!changed) return false;

      const newIndex = [];
      remoteSchedules.forEach(s => {
        StorageEngine.set(`${namespace}_${s.id}`, s);
        newIndex.push(s.id);
      });
      StorageEngine.set(`${namespace}_index`, newIndex);
      console.log('[SchedulerManager] ' + remoteSchedules.length + ' agendamento(s) sincronizados do Turso');
      return true;
    } catch (e) {
      console.warn('[SchedulerManager] syncFromTurso falhou:', e.message);
      return false;
    }
  };

  /**
   * Schema de agendamento:
   * {
   *   id: uuid,
   *   nome: string,
   *   descricao: string,
   *   cenarioId: uuid (ou null para profile único),
   *   profileIds: [uuid, ...],
   *   config: { requestsPerProfile, concurrency, rampUp, timeout },
   *   cron: string (quartz-like: "0 0 * * MON-FRI" = segundas a sextas 00:00),
   *   ativo: boolean,
   *   proximaExecucao: ISO8601 (calculated),
   *   ultimaExecucao: ISO8601 (ou null),
   *   criadoPor: uuid,
   *   criadoEm: ISO8601
   * }
   */

  /**
   * Criar agendamento
   */
  const create = (scheduleData) => {
    if (!scheduleData.nome || scheduleData.nome.trim() === '') {
      throw new Error('Nome do agendamento obrigatório');
    }
    if (!scheduleData.profileIds || scheduleData.profileIds.length === 0) {
      throw new Error('Mínimo 1 perfil obrigatório');
    }
    if (!scheduleData.cron && !scheduleData.agendamento) {
      throw new Error('Cron ou agendamento por período obrigatório');
    }

    const schedule = {
      id: crypto.randomUUID(),
      nome: scheduleData.nome.trim(),
      descricao: scheduleData.descricao || '',
      cenarioId: scheduleData.cenarioId || null,
      profileIds: scheduleData.profileIds,
      config: {
        requestsPerProfile: scheduleData.config?.requestsPerProfile || 1,
        concurrency: scheduleData.config?.concurrency || 3,
        rampUp: scheduleData.config?.rampUp || 0,
        timeout: scheduleData.config?.timeout || 120,
        methodId: scheduleData.config?.methodId || null
      },
      cron: scheduleData.cron ? scheduleData.cron.trim() : null,
      agendamento: scheduleData.agendamento || null,
      ativo: scheduleData.ativo !== false,
      proximaExecucao: null,
      ultimaExecucao: null,
      criadoPor: SessionManager.getCurrentUser().id,
      criadoEm: new Date().toISOString()
    };

    if (schedule.agendamento) {
      schedule.agendamento = {
        dataInicio: schedule.agendamento.dataInicio || null,
        dataFim: schedule.agendamento.dataFim || null,
        horaInicio: schedule.agendamento.horaInicio || '00:00',
        horaFim: schedule.agendamento.horaFim || '23:59',
        frequenciaMinutos: schedule.agendamento.frequenciaMinutos || 60,
        diasSemana: schedule.agendamento.diasSemana || ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
      };
      schedule.proximaExecucao = _calculateNextExecutionFromWindow(schedule);
    } else {
      schedule.proximaExecucao = _calculateNextExecutionFromCron(schedule.cron);
    }

    StorageEngine.set(`${namespace}_${schedule.id}`, schedule);
    _updateIndex(schedule.id);
    _apiSync('POST', '/api/schedules', schedule);
    return schedule;
  };

  /**
   * Listar agendamentos
   */
  const list = (userId) => {
    const ids = StorageEngine.get(`${namespace}_index`, []);
    return ids
      .map(id => StorageEngine.get(`${namespace}_${id}`))
      .filter(s => s !== null && (!userId || s.criadoPor === userId));
  };

  /**
   * Obter por ID
   */
  const getById = (scheduleId) => {
    return StorageEngine.get(`${namespace}_${scheduleId}`);
  };

  /**
   * Atualizar agendamento
   */
  const update = (scheduleId, updates) => {
    const schedule = getById(scheduleId);
    if (!schedule) throw new Error('Agendamento não encontrado');

    const updated = {
      ...schedule,
      ...updates,
      id: schedule.id,
      criadoPor: schedule.criadoPor,
      criadoEm: schedule.criadoEm
    };

    if (updates.cron) {
      updated.cron = updates.cron.trim();
      updated.agendamento = null;
      updated.proximaExecucao = _calculateNextExecutionFromCron(updated.cron);
    }

    if (updates.agendamento) {
      updated.agendamento = {
        dataInicio: updates.agendamento.dataInicio || schedule.agendamento?.dataInicio || null,
        dataFim: updates.agendamento.dataFim || schedule.agendamento?.dataFim || null,
        horaInicio: updates.agendamento.horaInicio || schedule.agendamento?.horaInicio || '00:00',
        horaFim: updates.agendamento.horaFim || schedule.agendamento?.horaFim || '23:59',
        frequenciaMinutos: updates.agendamento.frequenciaMinutos || schedule.agendamento?.frequenciaMinutos || 60,
        diasSemana: updates.agendamento.diasSemana || schedule.agendamento?.diasSemana || ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sab']
      };
      updated.cron = null;
      updated.proximaExecucao = _calculateNextExecutionFromWindow(updated);
    }

    StorageEngine.set(`${namespace}_${scheduleId}`, updated);
    _apiSync('PUT', '/api/schedules?id=' + scheduleId, updated);
    return updated;
  };

  /**
   * Deletar agendamento
   */
  const delete_ = (scheduleId) => {
    StorageEngine.remove(`${namespace}_${scheduleId}`);
    const ids = StorageEngine.get(`${namespace}_index`, []);
    StorageEngine.set(`${namespace}_index`, ids.filter(id => id !== scheduleId));
    _apiSync('DELETE', '/api/schedules?id=' + scheduleId);
  };

  /**
   * Ativar/desativar agendamento
   */
  const setActive = (scheduleId, ativo) => {
    const schedule = getById(scheduleId);
    if (!schedule) throw new Error('Agendamento não encontrado');

    const updated = { ...schedule, ativo };
    if (ativo) {
      updated.proximaExecucao = schedule.agendamento
        ? _calculateNextExecutionFromWindow(updated)
        : _calculateNextExecutionFromCron(updated.cron);
    }

    StorageEngine.set(`${namespace}_${scheduleId}`, updated);
    _apiSync('PATCH', '/api/schedules?id=' + scheduleId, {
      action: 'setAtivo', ativo, proximaExecucao: updated.proximaExecucao
    });
    return updated;
  };

  /**
   * Registrar última execução
   */
  const recordExecution = (scheduleId) => {
    const schedule = getById(scheduleId);
    if (!schedule) return;

    const executedAt = new Date().toISOString();
    // Ancora a próxima execução no horário planejado, não no momento de conclusão,
    // para evitar deriva acumulada quando a execução demora vários segundos.
    const anchor = schedule.proximaExecucao || executedAt;

    const updated = {
      ...schedule,
      ultimaExecucao: executedAt,
      proximaExecucao: schedule.agendamento
        ? _calculateNextExecutionFromWindow({ ...schedule, ultimaExecucao: anchor }, new Date(anchor))
        : _calculateNextExecutionFromCron(schedule.cron)
    };

    StorageEngine.set(`${namespace}_${scheduleId}`, updated);
    _apiSync('PATCH', '/api/schedules?id=' + scheduleId, {
      action: 'recordExecution',
      ultimaExecucao: updated.ultimaExecucao,
      proximaExecucao: updated.proximaExecucao
    });
  };

  /**
   * Obter agendamentos devido (para executar agora)
   */
  const getDue = () => {
    return list().filter(s => _shouldRunNow(s));
  };

  /**
   * Limpar histórico (quando 1000 agendamentos existem)
   */
  const _cleanupIfNeeded = () => {
    const ids = StorageEngine.get(`${namespace}_index`, []);
    if (ids.length > 1000) {
      const toDelete = Math.floor(ids.length * 0.1); // Remove 10%
      const sorted = ids
        .map(id => ({ id, schedule: getById(id) }))
        .filter(item => item.schedule)
        .sort((a, b) => 
          new Date(a.schedule.criadoEm) - new Date(b.schedule.criadoEm)
        )
        .slice(0, toDelete);

      sorted.forEach(item => delete_(item.id));
    }
  };

  const _normalizeDayOfWeek = (value) => {
    const map = {
      domingo: 0, dom: 0, sunday: 0, sun: 0,
      segunda: 1, seg: 1, monday: 1, mon: 1,
      terca: 2, ter: 2, tuesday: 2, tue: 2,
      quarta: 3, qua: 3, wednesday: 3, wed: 3,
      quinta: 4, qui: 4, thursday: 4, thu: 4,
      sexta: 5, sex: 5, friday: 5, fri: 5,
      sabado: 6, sab: 6, saturday: 6, sat: 6
    };
    return map[String(value || '').trim().toLowerCase()] ?? null;
  };

  const _parseTime = (timeString) => {
    const [hours = '00', minutes = '00'] = String(timeString || '00:00').split(':');
    return {
      hours: Number(hours.padStart(2, '0')),
      minutes: Number(minutes.padStart(2, '0'))
    };
  };

  const _getDateWithTime = (date, timeString) => {
    const { hours, minutes } = _parseTime(timeString);
    const newDate = new Date(date);
    newDate.setHours(hours, minutes, 0, 0);
    return newDate;
  };

  const _normalizeDaysSemana = (days) => {
    if (!Array.isArray(days) || days.length === 0) {
      return [0, 1, 2, 3, 4, 5, 6];
    }
    return [...new Set(days
      .map(_normalizeDayOfWeek)
      .filter(v => v !== null)
    )];
  };

  const _calculateNextExecutionFromCron = (cronExpression) => {
    if (!cronExpression) return null;

    // Implementação simplificada: agendamento diário a partir de now
    const next = new Date();
    next.setDate(next.getDate() + 1);
    next.setHours(0, 0, 0, 0);
    return next.toISOString();
  };

  const _calculateNextExecutionFromWindow = (schedule, baseDate = new Date()) => {
    const config = schedule.agendamento;
    if (!config || !config.dataInicio || !config.dataFim) {
      return null;
    }

    const startDate = new Date(`${config.dataInicio}T00:00:00`);
    const endDate = new Date(`${config.dataFim}T23:59:59`);
    if (baseDate > endDate) {
      return null;
    }

    const validDays = _normalizeDaysSemana(config.diasSemana);
    const frequencyMs = (config.frequenciaMinutos || 60) * 60 * 1000;
    const current = new Date(baseDate);

    // Detectar janela overnight (horaFim < horaInicio → cruza meia-noite)
    const _fim = _parseTime(config.horaFim || '23:59');
    const _ini = _parseTime(config.horaInicio || '00:00');
    const isOvernight = (_fim.hours * 60 + _fim.minutes) < (_ini.hours * 60 + _ini.minutes);

    // Para janelas overnight, voltar 1 dia para capturar a janela que
    // começou ontem e ainda está ativa nas primeiras horas de hoje.
    const candidate = new Date(current);
    if (isOvernight) candidate.setDate(candidate.getDate() - 1);
    candidate.setHours(0, 0, 0, 0);

    if (candidate < startDate) {
      candidate.setTime(startDate.getTime());
      candidate.setHours(0, 0, 0, 0);
    }

    for (let i = 0; i < 14; i += 1) {
      const day = candidate.getDay();
      if (candidate >= startDate && candidate <= endDate && validDays.includes(day)) {
        const windowStart = _getDateWithTime(candidate, config.horaInicio || '00:00');
        const windowEnd = _getDateWithTime(candidate, config.horaFim || '23:59');

        if (windowEnd < windowStart) {
          windowEnd.setDate(windowEnd.getDate() + 1);
        }

        if (candidate <= windowEnd) {
          // Usar `current` (baseDate real) para comparação — não o ponteiro `candidate`
          if (current < windowStart) {
            return windowStart.toISOString();
          }

          const lastExec = schedule.ultimaExecucao ? new Date(schedule.ultimaExecucao) : null;
          if (!lastExec) {
            return current.toISOString();
          }

          const nextCandidate = new Date(lastExec.getTime() + frequencyMs);
          // Garantir: no futuro, dentro da janela e dentro do período do agendamento
          if (nextCandidate > current && nextCandidate <= windowEnd && nextCandidate <= endDate) {
            return nextCandidate.toISOString();
          }
        }
      }

      candidate.setDate(candidate.getDate() + 1);
      candidate.setHours(0, 0, 0, 0);
    }

    return null;
  };

  const _shouldRunNow = (schedule) => {
    if (!schedule || !schedule.ativo) return false;
    const now = new Date();
    if (!schedule.proximaExecucao) return false;

    const nextExec = new Date(schedule.proximaExecucao);
    return nextExec <= now;
  };

  /**
   * Atualizar índice de agendamentos
   */
  const _updateIndex = (scheduleId) => {
    const ids = StorageEngine.get(`${namespace}_index`, []);
    if (!ids.includes(scheduleId)) {
      ids.push(scheduleId);
      StorageEngine.set(`${namespace}_index`, ids);
    }
  };

  /**
   * Contar agendamentos
   */
  const count = () => {
    return (StorageEngine.get(`${namespace}_index`, []) || []).length;
  };

  return {
    create,
    list,
    getById,
    update,
    delete_,
    setActive,
    recordExecution,
    getDue,
    count,
    syncFromTurso
  };
})();
