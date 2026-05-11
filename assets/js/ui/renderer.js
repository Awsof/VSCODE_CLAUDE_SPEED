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
      case 'profiles': return _renderProfiles();
      case 'groups': return _renderGroups();
      case 'scenarios': return _renderScenarios();
      case 'schedules': return _renderSchedules();
      case 'results': return _renderResults();
      case 'reports': return _renderReports();
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

  const _renderProfiles = () => {
    const profiles = ProfilesManager.list();
    const groups = GroupsManager.list();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Perfis</h2>
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
            </div>
          `).join('') : '<div class="empty-state">Nenhum perfil cadastrado ainda.</div>'}
        </div>
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
                </tr>
              `).join('') : '<tr><td colspan="7" class="empty-state">Nenhum agendamento configurado ainda.</td></tr>'}
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
                  <td>${result.duration} ms</td>
                  <td>${new Date(result.executadoEm).toLocaleString('pt-BR')}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty-state">Nenhum resultado registrado ainda.</td></tr>'}
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
        NotificationsManager.info('Novo perfil ainda será implementado na Fase 4');
      });
    }

    const newGroupButton = document.getElementById('btn-new-group');
    if (newGroupButton) {
      newGroupButton.addEventListener('click', () => {
        NotificationsManager.info('Criação de grupos será habilitada na Fase 4');
      });
    }

    const newScenarioButton = document.getElementById('btn-new-scenario');
    if (newScenarioButton) {
      newScenarioButton.addEventListener('click', () => {
        NotificationsManager.info('Gerenciamento de cenários será aprimorado na Fase 5');
      });
    }

    const newScheduleButton = document.getElementById('btn-new-schedule');
    if (newScheduleButton) {
      newScheduleButton.addEventListener('click', () => {
        _showCreateScheduleModal();
      });
    }

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
