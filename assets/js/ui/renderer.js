/**
 * Renderer — renderiza a interface principal da Fase 3
 */
const Renderer = (() => {
  const state = {
    activeTab: 'dashboard',
    currentUser: null,
    chartRefs: {}
  };

  const _buildHeader = (user) => {
    const countdown = SessionManager.getTimeRemaining();
    const timeLabel = countdown > 0 ? `${countdown} min restantes` : 'Sessão expirada';
    return `
      <div class="app-logo">
        <img src="assets/logo.svg" alt="Grupo DB" class="app-logo-image" />
        <div>
          <div class="app-logo-title">Speed Teste DBSync</div>
          <div class="app-logo-meta">${user.usuario}</div>
        </div>
      </div>
      <div class="button-bar">
        <div class="badge info">${timeLabel}</div>
        <button class="button secondary" id="btn-logout">Sair</button>
      </div>
    `;
  };

  const _renderPage = (tabId) => {
    switch (tabId) {
      case 'methods': return _renderMethods();
      case 'profiles': return _renderTests();
      case 'groups': return _renderGroups();
      case 'scenarios': return _renderScenarios();
      case 'schedules': return _renderSchedules();
      case 'results': return _renderResults();
      case 'reports': return _renderReports();
      case 'users': return _renderUsers();
      case 'settings': return _renderSettings();
      default: return _renderDashboard();
    }
  };

  const _renderMainContent = (tabId) => {
    const main = document.getElementById('app-content');
    if (!main) return;
    main.innerHTML = _renderPage(tabId);
  };

  const _renderDashboard = () => {
    const stats = ResultsManager.getStats();
    const profileCount = ProfilesManager.count();
    const groupCount = GroupsManager.count();
    const scenarioCount = ScenariosManager.count();
    const recent = ResultsManager.list().slice(-5).reverse();

    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Visão Geral</h2>
            <p class="section-subtitle">Resumo rápido do desempenho e dados do Speed Teste DBSync.</p>
          </div>
          <div class="button-bar">
            <button class="button primary" type="button" id="btn-refresh-dashboard">Atualizar</button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Perfis</div><div class="stat-value">${profileCount}</div></div>
          <div class="stat-card"><div class="stat-label">Grupos</div><div class="stat-value">${groupCount}</div></div>
          <div class="stat-card"><div class="stat-label">Cenários</div><div class="stat-value">${scenarioCount}</div></div>
          <div class="stat-card"><div class="stat-label">Resultados</div><div class="stat-value">${stats.total}</div></div>
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Últimos Resultados</h3>
            <p class="section-subtitle">Cinco execuções recentes com status e durações.</p>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Duração</th>
                <th>Data</th>
              </tr>
            </thead>
            <tbody>
              ${recent.length ? recent.map(r => `
                <tr>
                  <td>${r.endpoint}</td>
                  <td>${r.success ? '<span class="badge success">OK</span>' : '<span class="badge danger">ERRO</span>'}</td>
                  <td>${r.duration} ms</td>
                  <td>${new Date(r.executadoEm).toLocaleString('pt-BR')}</td>
                </tr>
              `).join('') : `
                <tr><td colspan="4" class="empty-state">Nenhum resultado disponível ainda.</td></tr>
              `}
            </tbody>
          </table>
        </div>
      </section>
      <section class="wide-panel">
        <div class="chart-card fade-in-up">
          <div class="chart-title">Taxa de Sucesso</div>
          <div class="chart-canvas"><canvas id="chart-success"></canvas></div>
        </div>
        <div class="chart-card fade-in-up">
          <div class="chart-title">Duração Média</div>
          <div class="chart-canvas"><canvas id="chart-duration"></canvas></div>
        </div>
      </section>
    `;
  };

  const _renderMethods = () => {
    const methods = MethodsManager.list();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Métodos SOAP</h2>
            <p class="section-subtitle">Cadastre as operações do webservice com SOAPAction e template XML. Cada método representa uma operação do WSDL.</p>
          </div>
          <button class="button primary" type="button" id="btn-new-method">Novo Método</button>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Operação</th>
                <th>SOAPAction</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${methods.length ? methods.map(m => `
                <tr>
                  <td>
                    <strong>${m.nome}</strong>
                    ${m.descricao ? `<br><small style="color:var(--text-muted)">${m.descricao}</small>` : ''}
                  </td>
                  <td><code style="font-size:0.85em;background:var(--surface-2);padding:2px 6px;border-radius:4px;">${m.operacao}</code></td>
                  <td style="font-size:0.8em;color:var(--text-muted);word-break:break-all;max-width:320px;">${m.soapAction}</td>
                  <td>
                    <button class="button secondary small" data-action="edit-method" data-method-id="${m.id}">Editar</button>
                    <button class="button danger small" data-action="delete-method" data-method-id="${m.id}">Excluir</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="4" class="empty-state">Nenhum método cadastrado. Clique em "Novo Método" para começar.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  const _renderTests = () => {
    const profiles = ProfilesManager.list();
    const groups = GroupsManager.list();
    const methods = MethodsManager.list();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Testes</h2>
            <p class="section-subtitle">Gerencie seus endpoints SOAP e templates de payload.</p>
          </div>
          <button class="button primary" type="button" id="btn-new-profile">Novo Perfil</button>
        </div>
        <div class="card-list">
          ${profiles.length ? profiles.map(profile => `
            <div class="card-list-item">
              <div class="card-list-item-title">${profile.nome}</div>
              <div class="card-list-item-meta">Código: ${profile.codigo} · ${profile.version || 'N/A'} · ${groups.find(g => g.id === profile.groupId)?.nome || 'Sem grupo'}</div>
              <div class="card-list-item-meta">URL: ${profile.url}</div>
              <div class="card-list-item-meta" style="font-size:0.8em;color:${profile.soapAction ? 'var(--text-muted)' : '#DC2626'};">
                SOAPAction: ${profile.soapAction ? profile.soapAction : '⚠ não configurado'}
              </div>
              <div class="card-list-item-actions">
                <button class="button secondary small" type="button" data-action="edit-profile" data-profile-id="${profile.id}">Editar</button>
                <button class="button primary small" type="button" data-action="run-profile" data-profile-id="${profile.id}">Enviar agora</button>
              </div>
            </div>
          `).join('') : '<div class="empty-state">Nenhum perfil cadastrado ainda.</div>'}
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Painel de Execução</h3>
            <p class="section-subtitle">Execute testes de carga contra um perfil cadastrado.</p>
          </div>
        </div>
        <div class="form-grid">
          <label class="field">
            Perfil (Endpoint)
            <select id="test-profile-select">
              <option value="">Selecione um perfil</option>
              ${profiles.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            Método SOAP
            <select id="test-method-select">
              <option value="">Selecione um método</option>
              ${methods.map(m => `<option value="${m.id}">${m.nome}</option>`).join('')}
            </select>
            ${methods.length === 0 ? '<small class="field-note" style="color:#DC2626;">Nenhum método cadastrado. Acesse "Métodos SOAP" para cadastrar.</small>' : ''}
          </label>
          <label class="field">
            Requisições
            <input id="test-requests" type="number" min="1" value="1" />
          </label>
          <label class="field">
            Concorrência
            <input id="test-concurrency" type="number" min="1" value="1" />
          </label>
          <label class="field">
            Timeout (segundos)
            <input id="test-timeout" type="number" min="10" value="120" />
          </label>
        </div>
        <div class="button-bar" style="margin-top:16px;">
          <button class="button primary" type="button" id="btn-start-test">Iniciar Teste</button>
          <button class="button danger" type="button" id="btn-abort-test" disabled>Abortar</button>
        </div>
        <div id="test-progress" style="display:none;margin-top:16px;"></div>
      </section>
    `;
  };

  const _renderGroups = () => {
    const groups = GroupsManager.list();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Grupos</h2>
            <p class="section-subtitle">Organize perfis em grupos e facilite consultas.</p>
          </div>
          <button class="button primary" type="button" id="btn-new-group">Novo Grupo</button>
        </div>
        <div class="card-list">
          ${groups.length ? groups.map(group => `
            <div class="card-list-item">
              <div class="card-list-item-title">${group.nome}</div>
              <div class="card-list-item-meta">${group.descricao || 'Sem descrição'}</div>
            </div>
          `).join('') : '<div class="empty-state">Nenhum grupo cadastrado ainda.</div>'}
        </div>
      </section>
    `;
  };

  const _renderScenarios = () => {
    const scenarios = ScenariosManager.list();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Cenários</h2>
            <p class="section-subtitle">Checklists de teste e execução sequencial.</p>
          </div>
          <button class="button primary" type="button" id="btn-new-scenario">Novo Cenário</button>
        </div>
        <div class="card-list">
          ${scenarios.length ? scenarios.map(s => `
            <div class="card-list-item">
              <div class="card-list-item-title">${s.nome}</div>
              <div class="card-list-item-meta">${s.passos?.length || 0} passos · ${s.descricao || 'Sem descrição'}</div>
              <div class="card-list-item-actions">
                <button class="button primary small" type="button" data-action="run-scenario" data-scenario-id="${s.id}">Executar agora</button>
              </div>
            </div>
          `).join('') : '<div class="empty-state">Nenhum cenário configurado ainda.</div>'}
        </div>
      </section>
    `;
  };

  const _renderSchedules = () => {
    const schedules = SchedulerManager.list();
    const activeSchedules = schedules.filter(s => s.ativo).length;
    const nextExec = schedules
      .map(s => s.proximaExecucao ? new Date(s.proximaExecucao) : null)
      .filter(Boolean)
      .sort((a, b) => a - b)[0];

    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Agendamentos</h2>
            <p class="section-subtitle">Configure envios automáticos por período, horário e frequência.</p>
          </div>
          <button class="button primary" type="button" id="btn-new-schedule">Novo Agendamento</button>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Total</div><div class="stat-value">${schedules.length}</div></div>
          <div class="stat-card"><div class="stat-label">Ativos</div><div class="stat-value">${activeSchedules}</div></div>
          <div class="stat-card"><div class="stat-label">Inativos</div><div class="stat-value">${schedules.length - activeSchedules}</div></div>
          <div class="stat-card"><div class="stat-label">Próxima execução</div><div class="stat-value">${nextExec ? nextExec.toLocaleString('pt-BR') : 'Nenhuma'}</div></div>
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Agendamentos cadastrados</h3>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Tipo</th>
                <th>Período</th>
                <th>Frequência</th>
                <th>Próxima</th>
                <th>Status</th>
                <th>Ações</th>
                <th>Ação rápida</th>
              </tr>
            </thead>
            <tbody>
              ${schedules.length ? schedules.map(schedule => `
                <tr>
                  <td>${schedule.nome}</td>
                  <td>${schedule.cenarioId ? 'Cenário' : 'Perfis'}</td>
                  <td>${schedule.agendamento?.dataInicio || 'N/A'} → ${schedule.agendamento?.dataFim || 'N/A'}</td>
                  <td>${schedule.agendamento?.frequenciaMinutos || 'N/A'} min</td>
                  <td>${schedule.proximaExecucao ? new Date(schedule.proximaExecucao).toLocaleString('pt-BR') : 'N/A'}</td>
                  <td>${schedule.ativo ? '<span class="badge success">Ativo</span>' : '<span class="badge danger">Inativo</span>'}</td>
                  <td>
                    <button class="button secondary small" type="button" data-action="toggle-schedule" data-schedule-id="${schedule.id}">${schedule.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button class="button danger small" type="button" data-action="delete-schedule" data-schedule-id="${schedule.id}">Excluir</button>
                  </td>
                  <td>
                    <button class="button primary small" type="button" data-action="run-schedule" data-schedule-id="${schedule.id}">Executar agora</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="8" class="empty-state">Nenhum agendamento configurado ainda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  const _renderResults = () => {
    const results = ResultsManager.list().slice(-10).reverse();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Resultados</h2>
            <p class="section-subtitle">Histórico recente das últimas execuções.</p>
          </div>
          <button class="button secondary" type="button" id="btn-export-results">Exportar</button>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>Detalhe</th>
                <th>Duração</th>
                <th>Executado Em</th>
              </tr>
            </thead>
            <tbody>
              ${results.length ? results.map(result => `
                <tr>
                  <td>${result.seq}</td>
                  <td>${result.endpoint}</td>
                  <td>${result.success ? '<span class="badge success">OK</span>' : '<span class="badge danger">ERRO</span>'}</td>
                  <td style="max-width:260px;white-space:normal;font-size:0.82em;color:var(--text-muted);">${result.errorDetail ? result.errorDetail.slice(0, 120) : '—'}</td>
                  <td>${result.duration} ms</td>
                  <td>${new Date(result.executadoEm).toLocaleString('pt-BR')}</td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state">Nenhum resultado registrado ainda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  const _renderReports = () => {
    const summary = ReportsManager.getSummary();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Relatórios</h2>
            <p class="section-subtitle">Exporte dados de resultado em PDF, Excel ou CSV.</p>
          </div>
          <div class="button-bar">
            <button class="button secondary" type="button" id="btn-export-excel">Exportar Excel</button>
            <button class="button secondary" type="button" id="btn-export-pdf">Exportar PDF</button>
            <button class="button secondary" type="button" id="btn-export-csv">Exportar CSV</button>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Execuções</div><div class="stat-value">${summary.total}</div></div>
          <div class="stat-card"><div class="stat-label">Sucesso</div><div class="stat-value">${summary.successful}</div></div>
          <div class="stat-card"><div class="stat-label">Falhas</div><div class="stat-value">${summary.failed}</div></div>
          <div class="stat-card"><div class="stat-label">Taxa</div><div class="stat-value">${summary.successRate}</div></div>
        </div>
        <section class="section-card" style="margin-top:16px;">
          <div class="section-header">
            <div>
              <h3 class="section-title">Por Endpoint</h3>
            </div>
          </div>
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Endpoint</th>
                  <th>Total</th>
                  <th>Sucesso</th>
                  <th>Falhas</th>
                  <th>Taxa</th>
                  <th>Avg ms</th>
                </tr>
              </thead>
              <tbody>
                ${summary.byEndpoint.length ? summary.byEndpoint.map(item => `
                  <tr>
                    <td>${item.endpoint}</td>
                    <td>${item.total}</td>
                    <td>${item.success}</td>
                    <td>${item.failed}</td>
                    <td>${item.successRate}</td>
                    <td>${item.avgDuration}</td>
                  </tr>
                `).join('') : '<tr><td colspan="6" class="empty-state">Nenhum dado disponível para relatórios.</td></tr>'}
              </tbody>
            </table>
          </div>
        </section>
      </section>
    `;
  };

  const _buildScheduleModalBody = () => {
    const profiles = ProfilesManager.list();
    const scenarios = ScenariosManager.list();
    return `
      <form id="schedule-creation-form">
        <div class="form-grid">
          <label>
            Nome do agendamento
            <input id="schedule-name" type="text" placeholder="Ex: Verificação diária" />
          </label>
          <label>
            Descrição
            <input id="schedule-description" type="text" placeholder="Breve descrição" />
          </label>
          <label>
            Tipo de execução
            <select id="schedule-target-type">
              <option value="scenario">Cenário</option>
              <option value="profiles">Perfis</option>
            </select>
          </label>
          <label>
            Cenário
            <select id="schedule-scenario-id">
              <option value="">Selecione um cenário</option>
              ${scenarios.map(s => `<option value="${s.id}">${s.nome}</option>`).join('')}
            </select>
          </label>
          <label id="schedule-profiles-label">
            Perfis selecionados
            <select id="schedule-profile-ids" multiple size="4">
              ${profiles.map(profile => `<option value="${profile.id}">${profile.nome}</option>`).join('')}
            </select>
          </label>
          <label>
            Data de início
            <input id="schedule-start-date" type="date" />
          </label>
          <label>
            Data fim
            <input id="schedule-end-date" type="date" />
          </label>
          <label>
            Hora início
            <input id="schedule-start-time" type="time" value="08:00" />
          </label>
          <label>
            Hora fim
            <input id="schedule-end-time" type="time" value="18:00" />
          </label>
          <label>
            Frequência (minutos)
            <input id="schedule-frequency" type="number" min="5" value="60" />
          </label>
          <fieldset class="form-group" style="grid-column: 1 / -1;">
            <legend>Dias da semana</legend>
            <div class="checkbox-grid">
              ${['dom','seg','ter','qua','qui','sex','sab'].map(day => `
                <label><input type="checkbox" name="schedule-days" value="${day}" checked /> ${day.toUpperCase()}</label>
              `).join('')}
            </div>
          </fieldset>
          <label>
            Requisições por perfil
            <input id="schedule-requests" type="number" min="1" value="1" />
          </label>
          <label>
            Concorrência
            <input id="schedule-concurrency" type="number" min="1" value="1" />
          </label>
          <label>
            Timeout (segundos)
            <input id="schedule-timeout" type="number" min="10" value="120" />
          </label>
        </div>
        <p class="field-help">Selecione ao menos um perfil. Caso escolha um cenário, ele será executado para os perfis selecionados.</p>
      </form>
    `;
  };

  const _showCreateScheduleModal = () => {
    ModalManager.open({
      title: 'Criar Agendamento',
      body: _buildScheduleModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });

    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        _submitScheduleForm();
      }, true);
    }

    const targetType = document.getElementById('schedule-target-type');
    const scenarioField = document.getElementById('schedule-scenario-id');
    const profilesLabel = document.getElementById('schedule-profiles-label');

    const updateTargetFields = () => {
      if (targetType.value === 'scenario') {
        scenarioField.parentElement.style.display = 'block';
        profilesLabel.style.display = 'block';
      } else {
        scenarioField.parentElement.style.display = 'none';
        profilesLabel.style.display = 'block';
      }
    };

    if (targetType) {
      targetType.addEventListener('change', updateTargetFields);
      updateTargetFields();
    }
  };

  const _submitScheduleForm = () => {
    const name = document.getElementById('schedule-name')?.value.trim();
    const description = document.getElementById('schedule-description')?.value.trim();
    const targetType = document.getElementById('schedule-target-type')?.value;
    const scenarioId = document.getElementById('schedule-scenario-id')?.value || null;
    const profileIds = Array.from(document.getElementById('schedule-profile-ids')?.selectedOptions || []).map(option => option.value);
    const startDate = document.getElementById('schedule-start-date')?.value;
    const endDate = document.getElementById('schedule-end-date')?.value;
    const startTime = document.getElementById('schedule-start-time')?.value || '00:00';
    const endTime = document.getElementById('schedule-end-time')?.value || '23:59';
    const frequency = Number(document.getElementById('schedule-frequency')?.value || 60);
    const requestsPerProfile = Number(document.getElementById('schedule-requests')?.value || 1);
    const concurrency = Number(document.getElementById('schedule-concurrency')?.value || 1);
    const timeout = Number(document.getElementById('schedule-timeout')?.value || 120);
    const days = Array.from(document.querySelectorAll('input[name="schedule-days"]:checked')).map(input => input.value);

    if (!name) {
      return NotificationsManager.danger('Nome do agendamento é obrigatório');
    }

    if (targetType === 'scenario' && !scenarioId) {
      return NotificationsManager.danger('Selecione um cenário para agendar');
    }

    if (profileIds.length === 0) {
      return NotificationsManager.danger('Selecione ao menos um perfil para o agendamento');
    }

    if (!startDate || !endDate) {
      return NotificationsManager.danger('Período de início e fim é obrigatório');
    }

    if (new Date(startDate) > new Date(endDate)) {
      return NotificationsManager.danger('A data de início não pode ser posterior à data de fim');
    }

    try {
      SchedulerManager.create({
        nome: name,
        descricao: description,
        cenarioId: targetType === 'scenario' ? scenarioId : null,
        profileIds,
        config: {
          requestsPerProfile,
          concurrency,
          timeout
        },
        agendamento: {
          dataInicio: startDate,
          dataFim: endDate,
          horaInicio: startTime,
          horaFim: endTime,
          frequenciaMinutos: frequency,
          diasSemana: days
        },
        ativo: true
      });
      ModalManager.close();
      NotificationsManager.success('Agendamento criado com sucesso');
      _renderMainContent('schedules');
      _attachEventListeners();
    } catch (error) {
      NotificationsManager.danger(error.message || 'Falha ao criar agendamento');
    }
  };

  const _sendProfileNow = async (profileId) => {
    const profile = ProfilesManager.getById(profileId);
    if (!profile) {
      throw new Error('Perfil não encontrado');
    }

    const attendanceNumber = UtilsEngine.generateAttendanceNumber(profile.codigo);
    const filledPayload = ProfilesManager.fillPayload(profileId, {
      NUM_ATENDIMENTO: attendanceNumber,
      LOGIN: profile.login || '',
      SENHA: profile.senha || ''
    });

    const result = await RunnerEngine.executeRequest(profile, attendanceNumber, filledPayload, {
      timeout: ConfigEngine.get('DEFAULT_REQUEST_TIMEOUT') || 120
    });

    ResultsManager.add({
      profileId: profile.id,
      endpoint: profile.nome,
      version: profile.version || '1.0',
      duration: result.duration,
      statusCode: result.statusCode,
      success: result.success,
      numAtendimentoDB: result.numDB,
      requestPayload: result.requestPayload,
      responseBody: result.responseBody,
      errorDetail: result.errorDetail,
      origem: 'manual',
      scheduleId: null,
      executadoPor: state.currentUser.id,
      cenarioId: null
    });

    return result;
  };

  const _sendScenarioNow = async (scenarioId) => {
    const scenario = ScenariosManager.getById(scenarioId);
    if (!scenario) {
      throw new Error('Cenário não encontrado');
    }

    const results = await ScenarioExecutor.execute(scenarioId);
    if (!results || results.length === 0) {
      return [];
    }

    ResultsManager.addBatch(results.map(result => ({
      profileId: result.profileId,
      endpoint: result.profileName,
      version: 'v3',
      duration: result.duration,
      statusCode: result.statusCode,
      success: result.success,
      numAtendimentoDB: result.numDB,
      requestPayload: result.requestPayload,
      responseBody: result.responseBody,
      errorDetail: result.errorDetail,
      origem: 'manual',
      scheduleId: null,
      executadoPor: state.currentUser.id,
      cenarioId: scenario.id
    })));

    return results;
  };

  const _buildProfileModalBody = (profile = null) => {
    const groups = GroupsManager.list();
    const v = (field, fallback = '') => profile ? (profile[field] ?? fallback) : fallback;
    return `
      <form id="profile-creation-form">
        <div class="form-grid">
          <label class="field">
            Nome do perfil
            <input id="profile-name" type="text" placeholder="Ex: Endpoint Produção" value="${v('nome')}" />
          </label>
          <label class="field">
            Código
            <input id="profile-code" type="text" placeholder="Ex: PRD" value="${v('codigo')}" />
          </label>
          <label class="field">
            URL SOAP
            <input id="profile-url" type="url" placeholder="https://..." value="${v('url')}" />
          </label>
          <label class="field">
            Versão
            <input id="profile-version" type="text" placeholder="1.0" value="${v('version', '1.0')}" />
          </label>
          <label class="field">
            Grupo
            <select id="profile-group-id">
              <option value="">Nenhum grupo</option>
              ${groups.map(g => `<option value="${g.id}" ${profile?.groupId === g.id ? 'selected' : ''}>${g.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            SOAPAction (header HTTP)
            <input id="profile-soapaction" type="text" placeholder="Ex: http://tempuri.org/IService/OperacaoNome" value="${v('soapAction')}" />
            <small class="field-note">Obrigatório para serviços WCF. Consulte o WSDL do serviço (&lt;soap:operation soapAction=...&gt;).</small>
          </label>
          <label class="field">
            Tag XML de retorno (numDB)
            <input id="profile-xml-tag" type="text" placeholder="diag:NumeroAtendimentoApoiado" value="${v('xmlTag', 'diag:NumeroAtendimentoApoiado')}" />
            <small class="field-note">Elemento XML do qual extrair o número retornado pelo serviço.</small>
          </label>
          <label class="field">
            Cor
            <input id="profile-color" type="color" value="${v('cor', '#0F9B94')}" />
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Payload SOAP
            <textarea id="profile-payload" rows="8" placeholder="Cole aqui todo o envelope SOAP, incluindo soapenv:Envelope e soapenv:Body">${v('payloadTemplate')}</textarea>
            <small class="field-note">Cole o request SOAP completo aqui. Exemplo: todo o conteúdo entre &lt;soapenv:Envelope&gt; e &lt;/soapenv:Envelope&gt;.</small>
          </label>
        </div>
      </form>
    `;
  };

  const _showCreateProfileModal = () => {
    ModalManager.open({
      title: 'Criar Novo Perfil',
      body: _buildProfileModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitProfileForm(null);
      };
    }
  };

  const _showEditProfileModal = (profileId) => {
    const profile = ProfilesManager.getById(profileId);
    if (!profile) return NotificationsManager.danger('Perfil não encontrado');
    ModalManager.open({
      title: 'Editar Perfil',
      body: _buildProfileModalBody(profile),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitProfileForm(profileId);
      };
    }
  };

  const _submitProfileForm = (profileId = null) => {
    const name = document.getElementById('profile-name')?.value.trim();
    const code = document.getElementById('profile-code')?.value.trim();
    const url = document.getElementById('profile-url')?.value.trim();
    const version = document.getElementById('profile-version')?.value.trim() || '1.0';
    const groupId = document.getElementById('profile-group-id')?.value || null;
    const soapAction = document.getElementById('profile-soapaction')?.value.trim() || null;
    const xmlTag = document.getElementById('profile-xml-tag')?.value.trim() || 'diag:NumeroAtendimentoApoiado';
    const color = document.getElementById('profile-color')?.value || '#0F9B94';
    const payload = document.getElementById('profile-payload')?.value.trim();
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const createdBy = currentUser?.usuario || 'admin';

    if (!name) return NotificationsManager.danger('O nome do perfil é obrigatório');
    if (!code) return NotificationsManager.danger('O código do perfil é obrigatório');
    if (!url) return NotificationsManager.danger('A URL SOAP do perfil é obrigatória');
    if (!payload) return NotificationsManager.danger('O Payload SOAP é obrigatório');

    let result;
    if (profileId) {
      result = ProfilesManager.update(profileId, {
        nome: name,
        codigo: code,
        url,
        version,
        payloadTemplate: payload,
        xmlTag,
        soapAction,
        cor: color,
        groupId
      });
      if (!result) return NotificationsManager.danger('Falha ao atualizar perfil.');
      NotificationsManager.success('Perfil atualizado com sucesso');
    } else {
      result = ProfilesManager.create({
        nome: name,
        codigo: code,
        url,
        version,
        payloadTemplate: payload,
        xmlTag,
        soapAction,
        cor: color,
        groupId,
        criadoPor: createdBy
      });
      if (!result) return NotificationsManager.danger('Falha ao criar perfil. Verifique se já não existe um perfil igual.');
      NotificationsManager.success('Perfil criado com sucesso');
    }

    ModalManager.close();
    _renderMainContent('profiles');
    _attachEventListeners();
  };

  const _buildMethodModalBody = (method = null) => {
    const v = (field, fallback = '') => method ? (method[field] ?? fallback) : fallback;
    return `
      <form id="method-creation-form">
        <div class="form-grid">
          <label class="field">
            Nome do método
            <input id="method-nome" type="text" placeholder="Ex: RecebeAtendimento" value="${v('nome')}" />
            <small class="field-note">Nome amigável para identificação no sistema.</small>
          </label>
          <label class="field">
            Operação SOAP
            <input id="method-operacao" type="text" placeholder="Ex: RecebeAtendimento" value="${v('operacao')}" />
            <small class="field-note">Nome exato da operação no WSDL (case-sensitive).</small>
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            SOAPAction
            <input id="method-soapaction" type="text" placeholder="Ex: http://tempuri.org/wsrvProtocoloDBSync/RecebeAtendimento" value="${v('soapAction')}" />
            <small class="field-note">Valor do header SOAPAction. Consulte o WSDL — atributo soapAction na tag &lt;soap:operation&gt;.</small>
          </label>
          <label class="field">
            Tag XML de retorno
            <input id="method-xmltag" type="text" placeholder="diag:NumeroAtendimentoApoiado" value="${v('xmlTag', 'diag:NumeroAtendimentoApoiado')}" />
            <small class="field-note">Elemento XML do qual extrair o número retornado pelo serviço.</small>
          </label>
          <label class="field">
            Descrição
            <input id="method-descricao" type="text" placeholder="Ex: Recebe atendimento e retorna número apoiado" value="${v('descricao')}" />
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Payload SOAP (template XML)
            <textarea id="method-payload" rows="10" placeholder="Cole aqui o envelope SOAP completo. Use {{NUM_ATENDIMENTO}}, {{LOGIN}}, {{SENHA}} como placeholders.">${v('payloadTemplate')}</textarea>
            <small class="field-note">Cole o XML completo incluindo &lt;soap:Envelope&gt;. Placeholders: {{NUM_ATENDIMENTO}}, {{LOGIN}}, {{SENHA}}.</small>
          </label>
        </div>
      </form>
    `;
  };

  const _showCreateMethodModal = () => {
    ModalManager.open({
      title: 'Novo Método SOAP',
      body: _buildMethodModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitMethodForm(null); };
    }
  };

  const _showEditMethodModal = (methodId) => {
    const method = MethodsManager.getById(methodId);
    if (!method) return NotificationsManager.danger('Método não encontrado');
    ModalManager.open({
      title: 'Editar Método SOAP',
      body: _buildMethodModalBody(method),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitMethodForm(methodId); };
    }
  };

  const _submitMethodForm = (methodId = null) => {
    const nome = document.getElementById('method-nome')?.value.trim();
    const operacao = document.getElementById('method-operacao')?.value.trim();
    const soapAction = document.getElementById('method-soapaction')?.value.trim();
    const xmlTag = document.getElementById('method-xmltag')?.value.trim() || 'diag:NumeroAtendimentoApoiado';
    const descricao = document.getElementById('method-descricao')?.value.trim() || '';
    const payloadTemplate = document.getElementById('method-payload')?.value.trim();
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const criadoPor = currentUser?.usuario || 'admin';

    if (!nome) return NotificationsManager.danger('Nome do método é obrigatório');
    if (!soapAction) return NotificationsManager.danger('SOAPAction é obrigatório');
    if (!payloadTemplate) return NotificationsManager.danger('Payload SOAP é obrigatório');

    let result;
    if (methodId) {
      result = MethodsManager.update(methodId, { nome, operacao: operacao || nome, soapAction, xmlTag, descricao, payloadTemplate });
      if (!result) return NotificationsManager.danger('Falha ao atualizar método');
      NotificationsManager.success('Método atualizado com sucesso');
    } else {
      result = MethodsManager.create({ nome, operacao: operacao || nome, soapAction, xmlTag, descricao, payloadTemplate, criadoPor });
      if (!result) return NotificationsManager.danger('Falha ao criar método');
      NotificationsManager.success('Método criado com sucesso');
    }

    ModalManager.close();
    _renderMainContent('methods');
    _attachEventListeners();
  };

  const _buildGroupModalBody = () => {
    return `
      <form id="group-creation-form">
        <div class="form-grid">
          <label class="field">
            Nome do grupo
            <input id="group-name" type="text" placeholder="Ex: Produção" />
          </label>
          <label class="field">
            Descrição
            <input id="group-description" type="text" placeholder="Ex: Endpoints de produção" />
          </label>
          <label class="field">
            Cor
            <input id="group-color" type="color" value="#0F9B94" />
          </label>
        </div>
      </form>
    `;
  };

  const _showCreateGroupModal = () => {
    ModalManager.open({
      title: 'Criar Novo Grupo',
      body: _buildGroupModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
      onConfirm: _submitGroupForm
    });

    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitGroupForm();
      };
    }
  };

  const _submitGroupForm = () => {
    const name = document.getElementById('group-name')?.value.trim();
    const description = document.getElementById('group-description')?.value.trim();
    const color = document.getElementById('group-color')?.value || '#0F9B94';
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const createdBy = currentUser?.usuario || 'admin';

    if (!name) {
      return NotificationsManager.danger('Nome do grupo é obrigatório');
    }

    const group = GroupsManager.create({
      nome: name,
      descricao: description,
      cor: color,
      criadoPor: createdBy
    });

    if (!group) {
      return NotificationsManager.danger('Falha ao criar grupo. Verifique se já não existe um grupo com este nome.');
    }

    ModalManager.close();
    NotificationsManager.success('Grupo criado com sucesso');
    _renderMainContent('groups');
    _attachEventListeners();
  };

  const _buildScenarioModalBody = () => {
    const profiles = ProfilesManager.list();
    return `
      <form id="scenario-creation-form">
        <div class="form-grid">
          <label class="field">
            Nome do cenário
            <input id="scenario-name" type="text" placeholder="Ex: Check diário" />
          </label>
          <label class="field">
            Descrição
            <input id="scenario-description" type="text" placeholder="Ex: Validação de endpoints" />
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Perfil principal
            <select id="scenario-profile-id">
              <option value="">Selecione um perfil</option>
              ${profiles.map(profile => `<option value="${profile.id}">${profile.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field">
            Requisições
            <input id="scenario-requests" type="number" min="1" value="1" />
          </label>
          <label class="field">
            Concorrência
            <input id="scenario-concurrency" type="number" min="1" value="1" />
          </label>
        </div>
      </form>
      <p class="field-help">Um cenário precisa de pelo menos um passo. Você poderá editar novos passos posteriormente.</p>
    `;
  };

  const _showCreateScenarioModal = () => {
    ModalManager.open({
      title: 'Criar Novo Cenário',
      body: _buildScenarioModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
      onConfirm: _submitScenarioForm,
      width: '560px'
    });

    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitScenarioForm();
      };
    }
  };

  const _submitScenarioForm = () => {
    const name = document.getElementById('scenario-name')?.value.trim();
    const description = document.getElementById('scenario-description')?.value.trim();
    const profileId = document.getElementById('scenario-profile-id')?.value;
    const requests = Number(document.getElementById('scenario-requests')?.value || 1);
    const concurrency = Number(document.getElementById('scenario-concurrency')?.value || 1);
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const createdBy = currentUser?.usuario || 'admin';

    if (!name || !profileId) {
      return NotificationsManager.danger('Nome do cenário e perfil são obrigatórios');
    }

    if (requests < 1 || concurrency < 1) {
      return NotificationsManager.danger('Requisições e concorrência devem ser ao menos 1');
    }

    const scenario = ScenariosManager.create({
      nome: name,
      descricao: description,
      passos: [{ ordem: 1, profileId, requests, concorrencia: concurrency }],
      criadoPor: createdBy
    });

    if (!scenario) {
      return NotificationsManager.danger('Falha ao criar cenário. Verifique os dados e tente novamente.');
    }

    ModalManager.close();
    NotificationsManager.success('Cenário criado com sucesso');
    _renderMainContent('scenarios');
    _attachEventListeners();
  };

  const _renderUsers = () => {
    const users = UsersManager.list();
    const canCreate = RBACManager.canCurrent('users:create');
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Usuários</h2>
            <p class="section-subtitle">Gerencie os usuários com acesso ao sistema.</p>
          </div>
          ${canCreate ? '<button class="button primary" type="button" id="btn-new-user">Novo Usuário</button>' : ''}
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Usuário</th>
                <th>Nível</th>
                <th>Status</th>
                <th>Criado em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              ${users.length ? users.map(u => `
                <tr>
                  <td>${u.nome}</td>
                  <td>${u.usuario}</td>
                  <td>${RBACManager.getLevelDescription(u.nivel).split(' —')[0]}</td>
                  <td>${u.ativo ? '<span class="badge success">Ativo</span>' : '<span class="badge danger">Inativo</span>'}</td>
                  <td>${u.criadoEm ? new Date(u.criadoEm).toLocaleString('pt-BR') : '—'}</td>
                  <td>
                    <button class="button secondary small" type="button" data-action="toggle-user" data-user-id="${u.id}">${u.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button class="button danger small" type="button" data-action="delete-user" data-user-id="${u.id}">Excluir</button>
                  </td>
                </tr>
              `).join('') : '<tr><td colspan="6" class="empty-state">Nenhum usuário cadastrado.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
    `;
  };

  const _buildUserModalBody = () => `
    <form id="user-creation-form">
      <div class="form-grid">
        <label class="field">
          Nome completo
          <input id="user-nome" type="text" placeholder="Ex: João Silva" />
        </label>
        <label class="field">
          Email
          <input id="user-email" type="email" placeholder="Ex: joao@empresa.com" />
        </label>
        <label class="field">
          Usuário
          <input id="user-usuario" type="text" placeholder="Ex: joao.silva" />
        </label>
        <label class="field">
          Senha
          <input id="user-senha" type="password" placeholder="Mínimo 6 caracteres" />
        </label>
        <label class="field">
          Nível
          <select id="user-nivel">
            <option value="operador">Operador</option>
            <option value="visualizador">Visualizador</option>
            <option value="admin">Administrador</option>
          </select>
        </label>
      </div>
    </form>
  `;

  const _showCreateUserModal = () => {
    ModalManager.open({
      title: 'Novo Usuário',
      body: _buildUserModalBody(),
      confirmText: 'Criar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitUserForm(); };
    }
  };

  const _submitUserForm = async () => {
    const nome = document.getElementById('user-nome')?.value.trim();
    const email = document.getElementById('user-email')?.value.trim();
    const usuario = document.getElementById('user-usuario')?.value.trim();
    const senha = document.getElementById('user-senha')?.value;
    const nivel = document.getElementById('user-nivel')?.value;

    if (!nome || !email || !usuario || !senha || !nivel) {
      return NotificationsManager.danger('Preencha todos os campos obrigatórios');
    }
    if (senha.length < 6) {
      return NotificationsManager.danger('Senha deve ter no mínimo 6 caracteres');
    }

    const created = await UsersManager.create({ nome, email, usuario, senha, nivel });
    if (!created) {
      return NotificationsManager.danger('Falha ao criar usuário. Verifique se usuário ou email já existem.');
    }

    ModalManager.close();
    NotificationsManager.success('Usuário criado com sucesso');
    _renderMainContent('users');
    _attachEventListeners();
  };

  const _renderSettings = () => {
    const user = state.currentUser || { usuario: '—', nivel: '—' };
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Configurações</h2>
            <p class="section-subtitle">Status da sessão e dados do usuário autenticado.</p>
          </div>
        </div>
        <div class="stats-grid">
          <div class="stat-card"><div class="stat-label">Usuário</div><div class="stat-value">${user.usuario}</div></div>
          <div class="stat-card"><div class="stat-label">Nível</div><div class="stat-value">${RBACManager.getLevelDescription(user.nivel)}</div></div>
          <div class="stat-card"><div class="stat-label">Sessão restante</div><div class="stat-value">${SessionManager.getTimeRemaining()} min</div></div>
          <div class="stat-card"><div class="stat-label">Perfis</div><div class="stat-value">${ProfilesManager.count()}</div></div>
        </div>
      </section>
    `;
  };

  const _initializeDashboardCharts = () => {
    const results = ResultsManager.list();
    const uniqueEndpoints = [...new Set(results.map(r => r.endpoint))];
    if (uniqueEndpoints.length === 0) {
      return;
    }

    const successRates = uniqueEndpoints.map(endpoint => {
      const endpointResults = results.filter(r => r.endpoint === endpoint);
      const successCount = endpointResults.filter(r => r.success).length;
      return endpointResults.length ? Math.round((successCount / endpointResults.length) * 100) : 0;
    });
    const avgDurations = uniqueEndpoints.map(endpoint => {
      const endpointResults = results.filter(r => r.endpoint === endpoint);
      return endpointResults.length
        ? Math.round(endpointResults.reduce((sum, item) => sum + (item.duration || 0), 0) / endpointResults.length)
        : 0;
    });

    const resetChart = (id) => {
      if (state.chartRefs[id]) {
        state.chartRefs[id].destroy();
        delete state.chartRefs[id];
      }
    };

    if (document.getElementById('chart-success')) {
      resetChart('success');
      state.chartRefs.success = new Chart(document.getElementById('chart-success').getContext('2d'), {
        type: 'doughnut',
        data: {
          labels: uniqueEndpoints,
          datasets: [{
            data: successRates,
            backgroundColor: uniqueEndpoints.map((_, index) => `rgba(15, 155, 148, ${0.7 - index * 0.08})`),
            borderColor: 'transparent'
          }]
        },
        options: {
          plugins: {
            legend: { position: 'bottom', labels: { color: 'var(--text-muted)', font: { family: "'JetBrains Mono', monospace", size: 12 } } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }

    if (document.getElementById('chart-duration')) {
      resetChart('duration');
      state.chartRefs.duration = new Chart(document.getElementById('chart-duration').getContext('2d'), {
        type: 'bar',
        data: {
          labels: uniqueEndpoints,
          datasets: [{
            label: 'Duração média (ms)',
            data: avgDurations,
            backgroundColor: uniqueEndpoints.map((_, index) => `rgba(196, 155, 60, ${0.65 - index * 0.07})`),
            borderColor: 'transparent'
          }]
        },
        options: {
          plugins: {
            legend: { display: false }
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: 'var(--text-muted)' } },
            x: { ticks: { color: 'var(--text-muted)' } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      });
    }
  };

  const _attachEventListeners = () => {
    const logoutButton = document.getElementById('btn-logout');
    if (logoutButton) {
      logoutButton.addEventListener('click', () => {
        SessionManager.logout();
        window.location.reload();
      });
    }

    const refreshButton = document.getElementById('btn-refresh-dashboard');
    if (refreshButton) {
      refreshButton.addEventListener('click', () => {
        _renderMainContent('dashboard');
        NotificationsManager.success('Dashboard atualizado');
      });
    }

    const exportButton = document.getElementById('btn-export-results');
    if (exportButton) {
      exportButton.addEventListener('click', () => {
        const data = ResultsManager.exportJSON();
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `speed-teste-dbsync-resultados-${new Date().toISOString().slice(0, 10)}.json`;
        link.click();
        URL.revokeObjectURL(url);
        NotificationsManager.success('Exportação de resultados iniciada');
      });
    }

    const exportExcelButton = document.getElementById('btn-export-excel');
    if (exportExcelButton) {
      exportExcelButton.addEventListener('click', () => {
        try {
          ReportsManager.exportExcel();
          NotificationsManager.success('Exportação Excel iniciada');
        } catch (error) {
          NotificationsManager.danger('Falha ao exportar Excel: ' + error.message);
        }
      });
    }

    const exportPDFButton = document.getElementById('btn-export-pdf');
    if (exportPDFButton) {
      exportPDFButton.addEventListener('click', () => {
        try {
          ReportsManager.exportPDF();
          NotificationsManager.success('Exportação PDF iniciada');
        } catch (error) {
          NotificationsManager.danger('Falha ao exportar PDF: ' + error.message);
        }
      });
    }

    const exportCSVButton = document.getElementById('btn-export-csv');
    if (exportCSVButton) {
      exportCSVButton.addEventListener('click', () => {
        try {
          ReportsManager.exportCSV();
          NotificationsManager.success('Exportação CSV iniciada');
        } catch (error) {
          NotificationsManager.danger('Falha ao exportar CSV: ' + error.message);
        }
      });
    }

    const newProfileButton = document.getElementById('btn-new-profile');
    if (newProfileButton) {
      newProfileButton.addEventListener('click', () => {
        _showCreateProfileModal();
      });
    }

    const newGroupButton = document.getElementById('btn-new-group');
    if (newGroupButton) {
      newGroupButton.addEventListener('click', () => {
        _showCreateGroupModal();
      });
    }

    const newScenarioButton = document.getElementById('btn-new-scenario');
    if (newScenarioButton) {
      newScenarioButton.addEventListener('click', () => {
        _showCreateScenarioModal();
      });
    }

    const newScheduleButton = document.getElementById('btn-new-schedule');
    if (newScheduleButton) {
      newScheduleButton.addEventListener('click', () => {
        _showCreateScheduleModal();
      });
    }

    document.querySelectorAll('[data-action="edit-profile"]').forEach(button => {
      button.addEventListener('click', () => {
        _showEditProfileModal(button.dataset.profileId);
      });
    });

    document.querySelectorAll('[data-action="run-profile"]').forEach(button => {
      button.addEventListener('click', () => {
        const profileId = button.dataset.profileId;
        if (!profileId) return;
        const profileSelect = document.getElementById('test-profile-select');
        if (profileSelect) {
          profileSelect.value = profileId;
          document.getElementById('test-method-select')?.focus();
          document.querySelector('#test-method-select')?.closest('section')?.scrollIntoView({ behavior: 'smooth' });
        }
        NotificationsManager.info('Perfil selecionado no painel. Escolha um método SOAP e clique em Iniciar Teste.');
      });
    });

    document.querySelectorAll('[data-action="run-scenario"]').forEach(button => {
      button.addEventListener('click', async () => {
        const scenarioId = button.dataset.scenarioId;
        if (!scenarioId) return;

        NotificationsManager.info('Executando cenário agora...');
        try {
          const results = await _sendScenarioNow(scenarioId);
          const successCount = results.filter(r => r.success).length;
          const totalCount = results.length;
          NotificationsManager.success(`Cenário executado: ${successCount}/${totalCount} com sucesso`);
          _renderMainContent('scenarios');
          _attachEventListeners();
        } catch (error) {
          console.error('[Renderer] Erro ao executar cenário manualmente:', error);
          NotificationsManager.danger(error.message || 'Falha na execução manual do cenário');
        }
      });
    });

    document.querySelectorAll('[data-action="toggle-schedule"]').forEach(button => {
      button.addEventListener('click', () => {
        const scheduleId = button.dataset.scheduleId;
        const schedule = SchedulerManager.getById(scheduleId);
        if (!schedule) return;
        SchedulerManager.setActive(scheduleId, !schedule.ativo);
        NotificationsManager.success(`Agendamento ${schedule.ativo ? 'desativado' : 'ativado'}`);
        _renderMainContent('schedules');
        _attachEventListeners();
      });
    });

    document.querySelectorAll('[data-action="delete-schedule"]').forEach(button => {
      button.addEventListener('click', () => {
        const scheduleId = button.dataset.scheduleId;
        ModalManager.confirm({
          title: 'Excluir agendamento',
          body: '<p>Deseja realmente excluir este agendamento?</p>',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            SchedulerManager.delete_(scheduleId);
            NotificationsManager.warning('Agendamento excluído');
            _renderMainContent('schedules');
            _attachEventListeners();
          }
        });
      });
    });

    document.querySelectorAll('[data-action="run-schedule"]').forEach(button => {
      button.addEventListener('click', async () => {
        const scheduleId = button.dataset.scheduleId;
        const schedule = SchedulerManager.getById(scheduleId);
        if (!schedule) return;

        NotificationsManager.info('Executando agendamento agora...');
        try {
          await ScheduleRunner.forceExecute(scheduleId);
          NotificationsManager.success(`Agendamento "${schedule.nome}" executado com sucesso`);
          _renderMainContent('schedules');
          _attachEventListeners();
        } catch (error) {
          console.error('[Renderer] Erro ao executar agendamento manualmente:', error);
          NotificationsManager.danger(error.message || 'Falha ao executar agendamento');
        }
      });
    });

    // --- Painel de Execução (aba Testes) ---
    const startTestBtn = document.getElementById('btn-start-test');
    const abortTestBtn = document.getElementById('btn-abort-test');

    if (startTestBtn) {
      startTestBtn.addEventListener('click', async () => {
        const profileId = document.getElementById('test-profile-select')?.value;
        const methodId = document.getElementById('test-method-select')?.value;

        if (!profileId) return NotificationsManager.danger('Selecione um perfil (endpoint) para iniciar o teste');
        if (!methodId) return NotificationsManager.danger('Selecione um método SOAP para iniciar o teste');

        const profile = ProfilesManager.getById(profileId);
        const method = MethodsManager.getById(methodId);
        if (!profile || !method) return;

        // Perfil traz URL/credenciais; método traz SOAPAction/payload/xmlTag
        const mergedProfile = {
          ...profile,
          payloadTemplate: method.payloadTemplate,
          xmlTag: method.xmlTag,
          soapAction: method.soapAction
        };

        const requests = Number(document.getElementById('test-requests')?.value || 1);
        const concurrency = Number(document.getElementById('test-concurrency')?.value || 1);
        const timeout = Number(document.getElementById('test-timeout')?.value || 120);

        startTestBtn.disabled = true;
        if (abortTestBtn) abortTestBtn.disabled = false;

        const progressDiv = document.getElementById('test-progress');
        if (progressDiv) {
          progressDiv.style.display = 'block';
          progressDiv.innerHTML = '<span class="badge info">Iniciando...</span>';
        }

        try {
          const results = await RunnerEngine.executeBatch([mergedProfile], {
            requestsPerProfile: requests,
            concurrency,
            timeout
          }, (progress) => {
            if (progressDiv) {
              progressDiv.innerHTML = `<span class="badge info">${progress.completed}/${progress.total} (${progress.successful} ok / ${progress.failed} falhas)</span>`;
            }
          });

          const successCount = results.filter(r => r.success).length;
          const endpointLabel = `${profile.nome} / ${method.nome}`;

          ResultsManager.addBatch(results.map(r => ({
            profileId: r.profileId,
            endpoint: endpointLabel,
            version: profile.version || '1.0',
            duration: r.duration,
            statusCode: r.statusCode,
            success: r.success,
            numAtendimentoDB: r.numDB,
            requestPayload: r.requestPayload,
            responseBody: r.responseBody,
            errorDetail: r.errorDetail,
            origem: 'manual',
            scheduleId: null,
            executadoPor: state.currentUser?.id,
            cenarioId: null
          })));

          if (progressDiv) {
            progressDiv.innerHTML = `<span class="badge success">${successCount}/${results.length} com sucesso</span>`;
          }
          NotificationsManager.success(`Teste concluído: ${successCount}/${results.length} com sucesso`);
        } catch (error) {
          if (progressDiv) progressDiv.innerHTML = '<span class="badge danger">Erro ou teste abortado</span>';
          NotificationsManager.danger('Erro durante o teste: ' + (error.message || 'Desconhecido'));
        } finally {
          startTestBtn.disabled = false;
          if (abortTestBtn) abortTestBtn.disabled = true;
        }
      });
    }

    if (abortTestBtn) {
      abortTestBtn.addEventListener('click', () => {
        RunnerEngine.abort();
        abortTestBtn.disabled = true;
        if (startTestBtn) startTestBtn.disabled = false;
        const progressDiv = document.getElementById('test-progress');
        if (progressDiv) progressDiv.innerHTML = '<span class="badge danger">Abortado</span>';
        NotificationsManager.warning('Teste abortado');
      });
    }

    // --- Métodos SOAP ---
    const newMethodBtn = document.getElementById('btn-new-method');
    if (newMethodBtn) {
      newMethodBtn.addEventListener('click', () => _showCreateMethodModal());
    }

    document.querySelectorAll('[data-action="edit-method"]').forEach(button => {
      button.addEventListener('click', () => _showEditMethodModal(button.dataset.methodId));
    });

    document.querySelectorAll('[data-action="delete-method"]').forEach(button => {
      button.addEventListener('click', () => {
        const methodId = button.dataset.methodId;
        ModalManager.confirm({
          title: 'Excluir método',
          body: '<p>Deseja realmente excluir este método SOAP? A ação não pode ser desfeita.</p>',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            MethodsManager.delete_(methodId);
            NotificationsManager.warning('Método excluído');
            _renderMainContent('methods');
            _attachEventListeners();
          }
        });
      });
    });

    // --- Novo Usuário ---
    const newUserBtn = document.getElementById('btn-new-user');
    if (newUserBtn) {
      newUserBtn.addEventListener('click', () => _showCreateUserModal());
    }

    // --- Toggle / Excluir Usuário ---
    document.querySelectorAll('[data-action="toggle-user"]').forEach(button => {
      button.addEventListener('click', async () => {
        const userId = button.dataset.userId;
        const user = UsersManager.getById(userId);
        if (!user) return;
        await UsersManager.setActive(userId, !user.ativo);
        NotificationsManager.success(`Usuário ${user.ativo ? 'desativado' : 'ativado'}`);
        _renderMainContent('users');
        _attachEventListeners();
      });
    });

    document.querySelectorAll('[data-action="delete-user"]').forEach(button => {
      button.addEventListener('click', () => {
        const userId = button.dataset.userId;
        ModalManager.confirm({
          title: 'Excluir usuário',
          body: '<p>Deseja realmente excluir este usuário? A ação não pode ser desfeita.</p>',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            UsersManager.delete_(userId);
            NotificationsManager.warning('Usuário excluído');
            _renderMainContent('users');
            _attachEventListeners();
          }
        });
      });
    });
  };

  const _renderHeader = () => {
    const header = document.getElementById('app-header');
    if (!header) return;
    header.innerHTML = _buildHeader(state.currentUser);
  };

  const _navigate = (tabId) => {
    state.activeTab = tabId;
    SidebarManager.render(state.currentUser, tabId, _navigate);
    _renderMainContent(tabId);
    _renderHeader();
    _attachEventListeners();
    if (tabId === 'dashboard') {
      setTimeout(_initializeDashboardCharts, 100);
    }
  };

  const renderMainApp = (user) => {
    if (!user) return;
    state.currentUser = user;
    const app = document.getElementById('app');
    if (!app) return;
    app.classList.remove('auth-mode');

    app.innerHTML = `
      <div class="app-sidebar" id="app-sidebar"></div>
      <div class="app-workspace">
        <header class="app-header" id="app-header"></header>
        <main class="app-content" id="app-content"></main>
      </div>
    `;

    _navigate(state.activeTab);
  };

  return {
    renderMainApp,
    getCurrentTab: () => state.activeTab
  };
})();
