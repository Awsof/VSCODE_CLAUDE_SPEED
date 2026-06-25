/**
 * Renderer — renderiza a interface principal da Fase 3
 */
const Renderer = (() => {
  const state = {
    activeTab: 'dashboard',
    currentUser: null,
    chartRefs: {}
  };

  const _buildHeader = () => {
    return ``;
  };

  const _renderPage = (tabId) => {
    switch (tabId) {
      case 'endpoints': return _renderEndpoints();
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
    const schedulesCount = SchedulerManager.list().length;

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
          <div class="stat-card"><div class="stat-label">Testes</div><div class="stat-value">${profileCount}</div></div>
          <div class="stat-card"><div class="stat-label">Grupos</div><div class="stat-value">${groupCount}</div></div>
          <div class="stat-card"><div class="stat-label">Agendamentos</div><div class="stat-value">${schedulesCount}</div></div>
          <div class="stat-card"><div class="stat-label">Resultados</div><div class="stat-value">${stats.total}</div></div>
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Gráficos de Desempenho</h3>
          </div>
          <div class="button-bar">
            <button id="dash-tab-manual"   class="button primary small"   type="button">Manuais</button>
            <button id="dash-tab-agendado" class="button secondary small" type="button">Agendados</button>
          </div>
        </div>

        <div id="dash-charts-manual">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="button small primary"   id="dash-manual-filter-last" type="button">Última Execução</button>
            <button class="button small secondary" id="dash-manual-filter-10"   type="button">10 últimas</button>
            <button class="button small secondary" id="dash-manual-filter-50"   type="button">50 últimas</button>
            <button class="button small secondary" id="dash-manual-filter-100"  type="button">100 últimas</button>
          </div>
          <div class="wide-panel">
            <div class="chart-card fade-in-up">
              <div class="chart-title">A — Tempo de resposta por requisição</div>
              <div class="chart-canvas"><canvas id="chart-dash-ma"></canvas></div>
            </div>
            <div class="chart-card fade-in-up">
              <div class="chart-title">B — Distribuição de tempo de resposta por perfil (ms)</div>
              <div class="chart-canvas"><canvas id="chart-dash-mb"></canvas></div>
            </div>
          </div>
        </div>

        <div id="dash-charts-agendado" style="display:none;">
          <div style="display:flex;gap:8px;margin-bottom:12px;">
            <button class="button small primary"    id="dash-chart-filter-hour"  type="button">1h</button>
            <button class="button small secondary"  id="dash-chart-filter-day"   type="button">24h</button>
            <button class="button small secondary"  id="dash-chart-filter-week"  type="button">7d</button>
            <button class="button small secondary"  id="dash-chart-filter-month" type="button">30d</button>
          </div>
          <div class="wide-panel">
            <div class="chart-card fade-in-up">
              <div class="chart-title">C — Performance dos Agendamentos</div>
              <div class="chart-canvas"><canvas id="chart-dash-sa"></canvas></div>
            </div>
            <div class="chart-card fade-in-up">
              <div class="chart-title">D — Taxa de Sucesso por Endpoint</div>
              <div class="chart-canvas"><canvas id="chart-dash-sb"></canvas></div>
            </div>
          </div>
        </div>
      </section>
    `;
  };

  const _renderEndpoints = () => {
    const endpoints = EndpointsManager.list();
    const canEdit   = RBACManager.canCurrent('methods:create');
    const canDelete = RBACManager.canCurrent('methods:delete');
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Endpoints</h2>
            <p class="section-subtitle">Catálogo de URLs SOAP reutilizáveis. Selecione um endpoint ao criar um teste em vez de digitar a URL manualmente.</p>
          </div>
          ${canEdit ? '<button class="button primary" type="button" id="btn-new-endpoint">Novo Endpoint</button>' : ''}
        </div>
        <div class="card-list">
          ${endpoints.length ? endpoints.map(ep => `
            <div class="card-list-item" style="border-left:4px solid #0F9B94;">
              <div class="card-list-item-title">${ep.nome}</div>
              <div class="card-list-item-meta" style="font-family:var(--font-mono);font-size:0.82em;word-break:break-all;">${ep.url}</div>
              ${ep.descricao ? `<div class="card-list-item-meta" style="font-size:0.8em;color:var(--text-muted);">${ep.descricao}</div>` : ''}
              <div class="card-list-item-actions">
                ${canEdit   ? `<button class="button secondary small" data-action="edit-endpoint"   data-endpoint-id="${ep.id}">Editar</button>` : ''}
                ${canDelete ? `<button class="button danger small"    data-action="delete-endpoint" data-endpoint-id="${ep.id}">Excluir</button>` : ''}
              </div>
            </div>
          `).join('') : '<div class="empty-state">Nenhum endpoint cadastrado. Clique em "Novo Endpoint" para começar.</div>'}
        </div>
      </section>
    `;
  };

  const _buildEndpointModalBody = (ep = null) => {
    const v = (f, fb = '') => ep ? (ep[f] ?? fb) : fb;
    return `
      <form id="endpoint-creation-form">
        <div class="form-grid">
          <label class="field" style="grid-column:1/-1;">
            Nome
            <input id="endpoint-nome" type="text" placeholder="Ex: Produção MB" value="${v('nome')}" />
          </label>
          <label class="field" style="grid-column:1/-1;">
            URL SOAP
            <input id="endpoint-url" type="url" placeholder="https://wsmb.diagnosticosdobrasil.com.br/..." value="${v('url')}" />
          </label>
          <label class="field" style="grid-column:1/-1;">
            Descrição
            <input id="endpoint-descricao" type="text" placeholder="Descrição opcional" value="${v('descricao')}" />
          </label>
        </div>
      </form>
    `;
  };

  const _showCreateEndpointModal = () => {
    ModalManager.open({
      title: 'Novo Endpoint',
      body: _buildEndpointModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitEndpointForm(null);
      };
    }
  };

  const _showEditEndpointModal = (endpointId) => {
    const ep = EndpointsManager.getById(endpointId);
    if (!ep) return NotificationsManager.danger('Endpoint não encontrado');
    ModalManager.open({
      title: 'Editar Endpoint',
      body: _buildEndpointModalBody(ep),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitEndpointForm(endpointId);
      };
    }
  };

  const _submitEndpointForm = (endpointId = null) => {
    const nome     = document.getElementById('endpoint-nome')?.value.trim();
    const url      = document.getElementById('endpoint-url')?.value.trim();
    const descricao= document.getElementById('endpoint-descricao')?.value.trim() || '';
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const criadoPor   = currentUser?.usuario || 'admin';

    if (!nome) return NotificationsManager.danger('O nome do endpoint é obrigatório');
    if (!url)  return NotificationsManager.danger('A URL do endpoint é obrigatória');

    let result;
    if (endpointId) {
      result = EndpointsManager.update(endpointId, { nome, url, descricao });
      if (!result) return NotificationsManager.danger('Falha ao atualizar endpoint.');
      AuditLogManager.record('endpoint:editar', nome);
      NotificationsManager.success('Endpoint atualizado com sucesso');
    } else {
      result = EndpointsManager.create({ nome, url, descricao, criadoPor });
      if (!result) return NotificationsManager.danger('Falha ao criar endpoint.');
      AuditLogManager.record('endpoint:criar', nome);
      NotificationsManager.success('Endpoint criado com sucesso');
    }

    ModalManager.close();
    _renderMainContent('endpoints');
    _attachEventListeners();
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
    const profiles   = ProfilesManager.list();
    const groups     = GroupsManager.list();
    const methods    = MethodsManager.list();
    const endpoints  = EndpointsManager.list();
    const _getMethodName   = (methodId)   => { const m = methods.find(x => x.id === methodId);   return m ? m.nome : null; };
    const _getEndpointName = (endpointId) => { const e = endpoints.find(x => x.id === endpointId); return e ? e.nome : null; };
    const limits = RBACManager.getExecutionLimits();
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Testes</h2>
            <p class="section-subtitle">Gerencie seus endpoints SOAP e templates de payload.</p>
          </div>
          ${RBACManager.canCurrent('profiles:create') ? '<button class="button primary" type="button" id="btn-new-profile">Novo Teste</button>' : ''}
        </div>
        <div class="card-list">
          ${profiles.length ? profiles.map(profile => {
            const group = groups.find(g => g.id === profile.groupId);
            const displayColor = profile.cor || group?.cor || '#0F9B94';
            return `
              <div class="card-list-item" style="border-left:4px solid ${displayColor};">
                <div class="card-list-item-title" style="display:flex;align-items:center;gap:10px;">
                  <span style="display:inline-block;width:12px;height:12px;border-radius:50%;background:${displayColor};flex-shrink:0;"></span>
                  ${profile.nome}
                </div>
                <div class="card-list-item-meta">Código: ${profile.codigo} · ${profile.version || 'N/A'} · ${group?.nome || 'Sem grupo'}</div>
                <div class="card-list-item-meta">
                  Endpoint: ${_getEndpointName(profile.endpointId)
                    ? `<span style="color:var(--primary,#003761);font-weight:500;">${_getEndpointName(profile.endpointId)}</span>`
                    : `<span style="font-family:var(--font-mono);font-size:0.85em;color:var(--text-muted);">${profile.url || '—'}</span>`}
                </div>
                <div class="card-list-item-meta">Método: ${_getMethodName(profile.methodId) ? `<span style="color:var(--primary,#003761);font-weight:500;">${_getMethodName(profile.methodId)}</span>` : '<span style="color:#DC2626;">⚠ sem método vinculado</span>'}</div>
                <div class="card-list-item-actions">
                  <button class="button secondary small" type="button" data-action="edit-profile" data-profile-id="${profile.id}">Editar</button>
                  <button class="button danger small" type="button" data-action="delete-profile" data-profile-id="${profile.id}">Excluir</button>
                </div>
              </div>
            `;
          }).join('') : '<div class="empty-state">Nenhum perfil cadastrado ainda.</div>'}
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Painel de Execução</h3>
            <p class="section-subtitle">Execute testes de carga contra um teste ou grupo cadastrado.</p>
          </div>
        </div>

        <div style="display:flex;gap:24px;margin-bottom:16px;flex-wrap:wrap;">
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="radio" name="exec-mode" value="teste" id="exec-mode-teste" checked />
            Executar este Teste
          </label>
          <label style="display:flex;align-items:center;gap:8px;cursor:pointer;">
            <input type="radio" name="exec-mode" value="grupo" id="exec-mode-grupo" />
            Executar Grupo inteiro
          </label>
        </div>

        <div class="form-grid">
          <label class="field" id="exec-target-label">
            <span id="exec-target-label-text">Teste</span>
            <div id="exec-target-profile">
              <select id="test-profile-select">
                <option value="">Selecione um teste</option>
                ${profiles.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
              </select>
            </div>
            <div id="exec-target-group" style="display:none;">
              <select id="test-group-select">
                <option value="">Selecione um grupo</option>
                ${groups.map(g => `<option value="${g.id}">${g.nome}</option>`).join('')}
              </select>
            </div>
          </label>
          <div id="exec-method-info" style="grid-column:1/-1;padding:8px 12px;border-radius:6px;background:var(--surface-alt,#F3F4F6);font-size:0.85rem;display:none;align-items:center;"></div>
          <label class="field">
            Requisições ${limits.maxRequests < 9999 ? `<span style="font-size:0.78em;color:var(--text-muted);">(máx ${limits.maxRequests})</span>` : ''}
            <input id="test-requests" type="number" min="1" max="${limits.maxRequests}" value="1" />
          </label>
          <label class="field">
            Concorrência ${limits.maxConcurrency < 9999 ? `<span style="font-size:0.78em;color:var(--text-muted);">(máx ${limits.maxConcurrency})</span>` : ''}
            <input id="test-concurrency" type="number" min="1" max="${limits.maxConcurrency}" value="1" />
          </label>
          <label class="field">
            Timeout (segundos)
            <input id="test-timeout" type="number" min="10" value="120" />
          </label>
          <label class="field">
            Delay entre lotes (s)
            <input id="test-delay" type="number" min="0" max="300" step="1" value="0" />
            <small class="field-note">Aguarda N s após cada lote terminar antes do próximo.</small>
          </label>
        </div>
        <div class="button-bar" style="margin-top:16px;">
          <button class="button primary" type="button" id="btn-start-test">Iniciar Teste</button>
          <button class="button danger" type="button" id="btn-abort-test" disabled>Abortar</button>
        </div>
        <div id="test-progress" style="display:none;margin-top:16px;"></div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Gráficos — Teste Manual</h3>
            <p class="section-subtitle">Baseado na última execução manual.</p>
          </div>
        </div>
        <div class="wide-panel">
          <div class="chart-card">
            <div class="chart-title">A — Tempo de resposta por requisição (ordem de envio)</div>
            <div class="chart-canvas"><canvas id="chart-manual-timeline"></canvas></div>
          </div>
          <div class="chart-card">
            <div class="chart-title">B — Distribuição de tempo de resposta (ms)</div>
            <div class="chart-canvas"><canvas id="chart-manual-freq"></canvas></div>
          </div>
        </div>
      </section>
    `;
  };

  const _renderGroups = () => {
    const groups = GroupsManager.list();
    const profiles = ProfilesManager.list();
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
          ${groups.length ? groups.map(group => {
            const memberProfiles = profiles.filter(p => p.groupId === group.id);
            return `
              <div class="card-list-item" style="border-left:4px solid ${group.cor || '#0F9B94'};">
                <div class="card-list-item-title" style="display:flex;align-items:center;gap:10px;">
                  <span style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${group.cor || '#0F9B94'};flex-shrink:0;"></span>
                  ${group.nome}
                </div>
                <div class="card-list-item-meta">${group.descricao || 'Sem descrição'} · ${memberProfiles.length} teste(s)</div>
                <div class="card-list-item-meta" style="margin-top:6px;">
                  <span style="font-size:0.8em;color:var(--text-muted);">Testes: </span>
                  ${memberProfiles.length
                    ? memberProfiles.map(p => `<span class="badge secondary" style="font-size:0.78em;margin:0 2px;">${p.nome}</span>`).join('')
                    : '<span style="font-size:0.8em;color:var(--text-muted);">Nenhum teste associado</span>'}
                </div>
                <div class="card-list-item-actions">
                  <button class="button secondary small" type="button" data-action="edit-group" data-group-id="${group.id}">Editar</button>
                  <button class="button danger small" type="button" data-action="delete-group" data-group-id="${group.id}">Excluir</button>
                </div>
              </div>
            `;
          }).join('') : '<div class="empty-state">Nenhum grupo cadastrado ainda.</div>'}
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
            <h3 class="section-title">Performance dos Agendamentos</h3>
            <p class="section-subtitle">Tempo de resposta por agendamento — linha sólida = execuções, linha tracejada = mediana.</p>
          </div>
          <div class="button-bar">
            <button class="button secondary small" id="chart-filter-hour">Hora</button>
            <button class="button primary small" id="chart-filter-day">Dia</button>
            <button class="button secondary small" id="chart-filter-week">Semana</button>
            <button class="button secondary small" id="chart-filter-month">Mês</button>
          </div>
        </div>
        <div class="chart-canvas" style="height:340px;"><canvas id="chart-schedule-perf"></canvas></div>
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
                  <td>${schedule.groupId ? '<span class="badge info" style="font-size:0.8em;">Grupo</span>' : 'Perfis'}</td>
                  <td>${schedule.agendamento?.dataInicio || 'Recorrente'} → ${schedule.agendamento?.dataFim || ''}</td>
                  <td>${schedule.agendamento?.frequenciaMinutos || 'N/A'} min</td>
                  <td>${schedule.proximaExecucao ? new Date(schedule.proximaExecucao).toLocaleString('pt-BR') : 'N/A'}</td>
                  <td>${schedule.ativo ? '<span class="badge success">Ativo</span>' : '<span class="badge danger">Inativo</span>'}</td>
                  <td style="white-space:nowrap;">
                    <button class="button secondary small" type="button" data-action="edit-schedule" data-schedule-id="${schedule.id}">Editar</button>
                    <button class="button secondary small" type="button" data-action="toggle-schedule" data-schedule-id="${schedule.id}">${schedule.ativo ? 'Desativar' : 'Ativar'}</button>
                    <button class="button primary small" type="button" data-action="run-schedule" data-schedule-id="${schedule.id}">Executar</button>
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

  const _renderResults = (filters = {}) => {
    const PAGE_SIZE = 100;
    const profiles  = ProfilesManager.list();
    const allUsers  = UsersManager.list();
    const getUserName = (userId) => {
      const u = allUsers.find(u => u.id === userId);
      return u ? (u.nome || u.usuario) : (userId ? userId.slice(0, 8) : '—');
    };

    // Todos os resultados mais recentes primeiro
    const allRaw      = ResultsManager.list().reverse();
    const totalStored = allRaw.length;

    // Aplicar filtros
    let filtered = allRaw;
    if (filters.profileId) filtered = filtered.filter(r => r.profileId === filters.profileId);
    if (filters.tipo === 'manual')    filtered = filtered.filter(r => r.origem === 'manual');
    if (filters.tipo === 'agendado')  filtered = filtered.filter(r => r.origem === 'scheduled');
    if (filters.tipo === 'importado') filtered = filtered.filter(r => r.origem === 'imported');
    if (filters.status === 'ok')   filtered = filtered.filter(r => r.success);
    if (filters.status === 'erro') filtered = filtered.filter(r => !r.success);
    if (filters.de)  filtered = filtered.filter(r => new Date(r.executadoEm) >= new Date(filters.de));
    if (filters.ate) filtered = filtered.filter(r => new Date(r.executadoEm) <= new Date(filters.ate + 'T23:59:59'));

    // Paginação
    const totalPages  = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
    const currentPage = Math.min(Math.max(1, parseInt(filters.page, 10) || 1), totalPages);
    const start       = (currentPage - 1) * PAGE_SIZE;
    const paginated   = filtered.slice(start, start + PAGE_SIZE);
    const rangeEnd    = Math.min(start + PAGE_SIZE, filtered.length);
    const rangeLabel  = filtered.length > 0
      ? `Exibindo ${start + 1}–${rangeEnd} de ${filtered.length}${filtered.length < totalStored ? ` filtrado(s)` : ''} (${totalStored} armazenados)`
      : `Nenhum resultado encontrado (${totalStored} armazenados)`;

    return `
      <input type="hidden" id="results-page" value="${currentPage}">
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Resultados</h2>
            <p class="section-subtitle">${rangeLabel}</p>
          </div>
          <div class="button-bar">
            <button class="button secondary" type="button" id="btn-export-results">Exportar</button>
            <button class="button danger" type="button" id="btn-clear-results">Limpar Registros</button>
          </div>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:10px;padding:12px 0;align-items:flex-end;">
          <label class="field" style="flex:1;min-width:140px;margin:0;">
            Perfil
            <select id="filter-profile">
              <option value="">Todos</option>
              ${profiles.map(p => `<option value="${p.id}" ${filters.profileId === p.id ? 'selected' : ''}>${p.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field" style="min-width:120px;margin:0;">
            Tipo
            <select id="filter-tipo">
              <option value="" ${!filters.tipo ? 'selected' : ''}>Todos</option>
              <option value="manual"   ${filters.tipo === 'manual'   ? 'selected' : ''}>Manual</option>
              <option value="agendado" ${filters.tipo === 'agendado' ? 'selected' : ''}>Agendado</option>
              <option value="importado" ${filters.tipo === 'importado' ? 'selected' : ''}>Importado</option>
            </select>
          </label>
          <label class="field" style="min-width:120px;margin:0;">
            Status
            <select id="filter-status">
              <option value="" ${!filters.status ? 'selected' : ''}>Todos</option>
              <option value="ok"   ${filters.status === 'ok'   ? 'selected' : ''}>OK</option>
              <option value="erro" ${filters.status === 'erro' ? 'selected' : ''}>Erro</option>
            </select>
          </label>
          <label class="field" style="min-width:130px;margin:0;">
            De
            <input id="filter-de" type="date" value="${filters.de || ''}" />
          </label>
          <label class="field" style="min-width:130px;margin:0;">
            Até
            <input id="filter-ate" type="date" value="${filters.ate || ''}" />
          </label>
          <button class="button primary" type="button" id="btn-apply-filters" style="height:36px;">Filtrar</button>
          <button class="button secondary" type="button" id="btn-clear-filters" style="height:36px;">Limpar</button>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Seq</th>
                <th>Tipo</th>
                <th>Endpoint</th>
                <th>Status</th>
                <th>TAG</th>
                <th>Duração</th>
                <th>Usuário</th>
                <th>Executado Em</th>
                <th>Request</th>
                <th>Response</th>
              </tr>
            </thead>
            <tbody>
              ${paginated.length ? paginated.map(result => `
                <tr>
                  <td>${result.seq}</td>
                  <td>${result.origem === 'scheduled' ? '<span class="badge info">Agend.</span>' : result.origem === 'imported' ? '<span class="badge warning">Import.</span>' : '<span class="badge secondary" style="color:var(--text-muted);">Manual</span>'}</td>
                  <td>${result.endpoint}</td>
                  <td>${result.success ? '<span class="badge success">OK</span>' : '<span class="badge danger">ERRO</span>'}</td>
                  <td style="font-size:0.82em;color:var(--text-muted);">${result.numAtendimentoDB || '—'}</td>
                  <td>${result.duration} ms</td>
                  <td style="font-size:0.82em;">${getUserName(result.executadoPor)}</td>
                  <td>${new Date(result.executadoEm).toLocaleString('pt-BR')}</td>
                  <td>${result.requestPayload ? `<button class="button secondary small" data-action="view-request" data-seq="${result.seq}">XML</button>` : '—'}</td>
                  <td>${result.responseBody ? `<button class="button secondary small" data-action="view-response" data-seq="${result.seq}">Response</button>` : '—'}</td>
                </tr>
              `).join('') : '<tr><td colspan="10" class="empty-state">Nenhum resultado encontrado com os filtros aplicados.</td></tr>'}
            </tbody>
          </table>
        </div>
        ${totalPages > 1 ? `
        <div style="display:flex;align-items:center;justify-content:center;gap:14px;padding:14px 0 2px;">
          <button id="btn-page-prev" class="button secondary small" ${currentPage <= 1 ? 'disabled' : ''}>← Anterior</button>
          <span style="font-size:0.88rem;color:var(--text-muted);">Página ${currentPage} de ${totalPages}</span>
          <button id="btn-page-next" class="button secondary small" ${currentPage >= totalPages ? 'disabled' : ''}>Próxima →</button>
        </div>` : ''}
      </section>
    `;
  };

  const _renderReports = (filters = {}) => {
    const summary = ReportsManager.getSummary(filters);
    const rows = ReportsManager.getRows(filters);
    const allUsers = UsersManager.list();
    const profiles = ProfilesManager.list();
    const groups = GroupsManager.list();
    const getUserName = (id) => {
      const u = allUsers.find(u => u.id === id);
      return u ? (u.nome || u.usuario) : (id ? id.slice(0, 8) : '—');
    };
    const totalStored = ResultsManager.count();
    const filterActive = !!(filters.de || filters.ate);
    return `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h2 class="section-title">Relatórios</h2>
            <p class="section-subtitle">Exporte dados de resultado em HTML, Excel ou CSV.${filterActive ? ` <span style="color:var(--action);font-weight:600;">(${summary.total} de ${totalStored} resultado(s) filtrados)</span>` : ''}</p>
          </div>
          <div class="button-bar">
            <button class="button secondary" type="button" id="btn-import-csv-results">Importar CSV</button>
            <input type="file" id="import-csv-file-input" accept=".csv" style="display:none;">
            <button class="button secondary" type="button" id="btn-export-excel">Exportar Excel</button>
            <button class="button primary" type="button" id="btn-export-html">Exportar HTML</button>
            <button class="button secondary" type="button" id="btn-export-csv">Exportar CSV</button>
          </div>
        </div>

        <div style="padding:14px 0 18px;border-bottom:1px solid var(--border);margin-bottom:18px;">
          <div style="font-size:0.72rem;font-weight:700;color:var(--text-muted);letter-spacing:0.1em;text-transform:uppercase;margin-bottom:10px;">Filtros do Relatório</div>
          <div style="display:flex;gap:20px;flex-wrap:wrap;align-items:center;">
            <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;cursor:pointer;">
              <input type="radio" name="html-filter" value="all" checked> Todos os resultados
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;cursor:pointer;">
              <input type="radio" name="html-filter" value="profile"> Por Teste
            </label>
            <label style="display:flex;align-items:center;gap:6px;font-size:0.88rem;cursor:pointer;">
              <input type="radio" name="html-filter" value="group"> Por Grupo
            </label>
            <select id="html-filter-profile-select" style="display:none;">
              <option value="">Selecione um teste...</option>
              ${profiles.map(p => `<option value="${p.id}">${p.nome}</option>`).join('')}
            </select>
            <select id="html-filter-group-select" style="display:none;">
              <option value="">Selecione um grupo...</option>
              ${groups.map(g => `<option value="${g.id}">${g.nome}</option>`).join('')}
            </select>
          </div>
          <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin-top:10px;">
            <label style="font-size:0.88rem;display:flex;align-items:center;gap:6px;">De:
              <input type="date" id="report-filter-de" value="${filters.de || ''}" style="margin-left:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.88rem;">
            </label>
            <label style="font-size:0.88rem;display:flex;align-items:center;gap:6px;">Até:
              <input type="date" id="report-filter-ate" value="${filters.ate || ''}" style="margin-left:2px;padding:4px 8px;border:1px solid var(--border);border-radius:6px;font-size:0.88rem;">
            </label>
            <button class="button primary small" id="btn-apply-report-filter" type="button">Aplicar</button>
            <button class="button secondary small" id="btn-clear-report-filter" type="button">Limpar</button>
          </div>
        </div>

        <div class="button-bar" style="margin-bottom:16px;">
          <button id="report-view-consolidado" class="button primary small"   type="button">Consolidado</button>
          <button id="report-view-por-teste"   class="button secondary small" type="button">Por Teste</button>
        </div>

        <div id="report-section-consolidado">
          <div class="stats-grid">
            <div class="stat-card"><div class="stat-label">Execuções</div><div class="stat-value">${summary.total}</div></div>
            <div class="stat-card"><div class="stat-label">Sucesso</div><div class="stat-value">${summary.successful}</div></div>
            <div class="stat-card"><div class="stat-label">Falhas</div><div class="stat-value">${summary.failed}</div></div>
            <div class="stat-card"><div class="stat-label">Taxa</div><div class="stat-value">${summary.successRate}</div></div>
          </div>
          <section class="section-card" style="margin-top:16px;">
            <div class="section-header"><div><h3 class="section-title">Por Teste</h3></div></div>
            <div class="table-wrapper">
              <table class="table">
                <thead>
                  <tr>
                    <th>Teste</th>
                    <th>Total</th>
                    <th>Sucesso</th>
                    <th>Falhas</th>
                    <th>Taxa</th>
                    <th>Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  ${summary.byTest.length ? summary.byTest.map(item => `
                    <tr>
                      <td>${item.name}</td>
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
        </div>

        <div id="report-section-por-teste" style="display:none;">
          <div class="table-wrapper">
            <table class="table">
              <thead>
                <tr>
                  <th>Seq</th>
                  <th>Teste</th>
                  <th>Status</th>
                  <th>TAG</th>
                  <th>Duração</th>
                  <th>Usuário</th>
                  <th>Tipo</th>
                  <th>Data</th>
                </tr>
              </thead>
              <tbody>
                ${rows.length ? rows.map(r => `
                  <tr>
                    <td>${r.Seq}</td>
                    <td>${r.Teste}</td>
                    <td>${r.Status === 'OK' ? '<span class="badge success">OK</span>' : '<span class="badge danger">ERRO</span>'}</td>
                    <td style="font-size:0.82em;color:var(--text-muted);">${r.NumAtendimentoDB || '—'}</td>
                    <td>${r.DuracaoMs} ms</td>
                    <td style="font-size:0.82em;">${getUserName(r.ExecutadoPor)}</td>
                    <td>${r.Origem === 'scheduled' ? '<span class="badge info" style="font-size:0.8em;">Agendado</span>' : r.Origem === 'imported' ? '<span class="badge warning" style="font-size:0.8em;">Importado</span>' : '<span class="badge secondary" style="font-size:0.8em;color:var(--text-muted);">Manual</span>'}</td>
                    <td>${r.ExecutadoEm}</td>
                  </tr>
                `).join('') : '<tr><td colspan="8" class="empty-state">Nenhum dado disponível.</td></tr>'}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `;
  };

  const _buildScheduleModalBody = (schedule = null) => {
    const profiles = ProfilesManager.list();
    const groups = GroupsManager.list();
    const ag = schedule?.agendamento || {};
    const cfg = schedule?.config || {};
    const selectedProfileIds = schedule?.profileIds || [];
    const selectedDays = ag.diasSemana || ['dom','seg','ter','qua','qui','sex','sab'];
    const modoRecorrente = !ag.dataInicio;
    const targetIsGroup = !!schedule?.groupId;

    const v = (val, fallback) => (val !== undefined && val !== null && val !== '') ? val : fallback;

    return `
      <form id="schedule-creation-form" style="display:flex;flex-direction:column;gap:14px;">
        <div class="form-grid" style="grid-template-columns:1fr 1fr;gap:12px;">
          <label class="field" style="grid-column:1/-1;">
            Nome do agendamento
            <input id="schedule-name" type="text" placeholder="Ex: Verificação diária" value="${v(schedule?.nome, '')}" />
          </label>
          <label class="field" style="grid-column:1/-1;">
            Descrição
            <input id="schedule-description" type="text" placeholder="Breve descrição" value="${v(schedule?.descricao, '')}" />
          </label>
          <label class="field">
            Tipo de execução
            <select id="schedule-target-type">
              <option value="profiles" ${!targetIsGroup ? 'selected' : ''}>Testes</option>
              <option value="groups"   ${targetIsGroup  ? 'selected' : ''}>Grupo</option>
            </select>
          </label>
          <label class="field" id="schedule-group-label" style="${!targetIsGroup ? 'display:none;' : ''}">
            Grupo
            <select id="schedule-group-id">
              <option value="">Selecione um grupo</option>
              ${groups.map(g => `<option value="${g.id}" ${schedule?.groupId === g.id ? 'selected' : ''}>${g.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field" id="schedule-profiles-label" style="grid-column:1/-1;${targetIsGroup ? 'display:none;' : ''}">
            Perfis selecionados (Ctrl+clique para múltiplos)
            <select id="schedule-profile-ids" multiple size="4" style="height:auto;">
              ${profiles.map(p => `<option value="${p.id}" ${selectedProfileIds.includes(p.id) ? 'selected' : ''}>${p.nome}</option>`).join('')}
            </select>
          </label>
        </div>

        <fieldset style="border:1px solid var(--border,#E5E7EB);border-radius:8px;padding:12px;">
          <legend style="font-size:0.82rem;font-weight:700;padding:0 6px;color:var(--text-muted);">Modo de agendamento</legend>
          <div style="display:flex;gap:20px;margin-bottom:12px;">
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="radio" name="schedule-mode" value="periodo" ${!modoRecorrente ? 'checked' : ''} id="sched-mode-periodo" />
              Por período (data início/fim)
            </label>
            <label style="display:flex;align-items:center;gap:6px;cursor:pointer;">
              <input type="radio" name="schedule-mode" value="recorrente" ${modoRecorrente ? 'checked' : ''} id="sched-mode-recorrente" />
              Recorrente (dias da semana)
            </label>
          </div>
          <div id="sched-block-periodo" style="${modoRecorrente ? 'display:none;' : ''}display:grid;grid-template-columns:1fr 1fr;gap:10px;">
            <label class="field">
              Data de início
              <input id="schedule-start-date" type="date" value="${v(ag.dataInicio, '')}" />
            </label>
            <label class="field">
              Data fim
              <input id="schedule-end-date" type="date" value="${v(ag.dataFim, '')}" />
            </label>
          </div>
          <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px;">
            <label class="field">
              Hora início
              <input id="schedule-start-time" type="time" value="${v(ag.horaInicio, '08:00')}" />
            </label>
            <label class="field">
              Hora fim
              <input id="schedule-end-time" type="time" value="${v(ag.horaFim, '18:00')}" />
            </label>
            <label class="field">
              Frequência (min)
              <input id="schedule-frequency" type="number" min="5" value="${v(ag.frequenciaMinutos, 60)}" />
            </label>
          </div>
          <div style="margin-top:10px;">
            <div style="font-size:0.82rem;font-weight:600;margin-bottom:6px;">Dias da semana</div>
            <div style="display:flex;gap:8px;flex-wrap:wrap;">
              ${['dom','seg','ter','qua','qui','sex','sab'].map(day => `
                <label style="display:flex;align-items:center;gap:4px;font-size:0.82rem;">
                  <input type="checkbox" name="schedule-days" value="${day}" ${selectedDays.includes(day) ? 'checked' : ''} />
                  ${day.toUpperCase()}
                </label>
              `).join('')}
            </div>
          </div>
        </fieldset>

        <div class="form-grid" style="grid-template-columns:1fr 1fr 1fr;gap:10px;">
          <label class="field">
            Requisições por perfil
            <input id="schedule-requests" type="number" min="1" value="${v(cfg.requestsPerProfile, 1)}" />
          </label>
          <label class="field">
            Concorrência
            <input id="schedule-concurrency" type="number" min="1" value="${v(cfg.concurrency, 1)}" />
          </label>
          <label class="field">
            Timeout (segundos)
            <input id="schedule-timeout" type="number" min="10" value="${v(cfg.timeout, 120)}" />
          </label>
          <label class="field">
            Delay entre lotes (s)
            <input id="schedule-delay" type="number" min="0" max="300" step="1" value="${v(cfg.delaySeconds, 0)}" />
            <small class="field-note">Aguarda N s após cada lote terminar antes do próximo.</small>
          </label>
        </div>
        <p style="font-size:0.78rem;color:var(--text-muted);margin:0;">Selecione ao menos um perfil. No modo recorrente o agendamento executa indefinidamente nos dias/horários selecionados.</p>
      </form>
    `;
  };

  const _attachScheduleModalListeners = (scheduleId = null) => {
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();
        _submitScheduleForm(scheduleId);
      }, true);
    }

    const targetType = document.getElementById('schedule-target-type');
    const groupLabel    = document.getElementById('schedule-group-label');
    const profilesLabel = document.getElementById('schedule-profiles-label');

    const updateTargetFields = () => {
      if (!targetType) return;
      if (targetType.value === 'groups') {
        if (groupLabel)    groupLabel.style.display    = 'block';
        if (profilesLabel) profilesLabel.style.display = 'none';
      } else {
        if (groupLabel)    groupLabel.style.display    = 'none';
        if (profilesLabel) profilesLabel.style.display = 'block';
      }
    };

    if (targetType) {
      targetType.addEventListener('change', updateTargetFields);
      updateTargetFields();
    }

    // Toggle visibilidade do bloco de datas
    const radioPeriodo = document.getElementById('sched-mode-periodo');
    const radioRecorrente = document.getElementById('sched-mode-recorrente');
    const blocoPeriodo = document.getElementById('sched-block-periodo');

    const updateModeFields = () => {
      const isRecorrente = radioRecorrente?.checked;
      if (blocoPeriodo) blocoPeriodo.style.display = isRecorrente ? 'none' : 'grid';
    };

    if (radioPeriodo) radioPeriodo.addEventListener('change', updateModeFields);
    if (radioRecorrente) radioRecorrente.addEventListener('change', updateModeFields);
    updateModeFields();
  };

  const _showCreateScheduleModal = () => {
    ModalManager.open({
      title: 'Criar Agendamento',
      body: _buildScheduleModalBody(),
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
      width: '680px'
    });
    _attachScheduleModalListeners(null);
  };

  const _showEditScheduleModal = (scheduleId) => {
    const schedule = SchedulerManager.getById(scheduleId);
    if (!schedule) return NotificationsManager.danger('Agendamento não encontrado');
    ModalManager.open({
      title: 'Editar Agendamento',
      body: _buildScheduleModalBody(schedule),
      confirmText: 'Salvar',
      cancelText: 'Cancelar',
      width: '680px'
    });
    _attachScheduleModalListeners(scheduleId);
  };

  const _submitScheduleForm = (scheduleId = null) => {
    const name = document.getElementById('schedule-name')?.value.trim();
    const description = document.getElementById('schedule-description')?.value.trim();
    const targetType = document.getElementById('schedule-target-type')?.value;
    const isRecorrente = document.getElementById('sched-mode-recorrente')?.checked;
    const startDate = isRecorrente ? null : (document.getElementById('schedule-start-date')?.value || null);
    const endDate = isRecorrente ? null : (document.getElementById('schedule-end-date')?.value || null);
    const startTime = document.getElementById('schedule-start-time')?.value || '08:00';
    const endTime = document.getElementById('schedule-end-time')?.value || '18:00';
    const frequency = Number(document.getElementById('schedule-frequency')?.value || 60);
    const requestsPerProfile = Number(document.getElementById('schedule-requests')?.value || 1);
    const concurrency = Number(document.getElementById('schedule-concurrency')?.value || 1);
    const timeout = Number(document.getElementById('schedule-timeout')?.value || 120);
    const delaySeconds = Number(document.getElementById('schedule-delay')?.value || 0);
    const days = Array.from(document.querySelectorAll('input[name="schedule-days"]:checked')).map(input => input.value);

    // Resolver profileIds e groupId conforme tipo de alvo
    let profileIds = [];
    let groupId = null;
    if (targetType === 'groups') {
      groupId = document.getElementById('schedule-group-id')?.value || null;
      if (!groupId) return NotificationsManager.danger('Selecione um grupo para o agendamento');
      profileIds = ProfilesManager.list().filter(p => p.groupId === groupId).map(p => p.id);
      if (profileIds.length === 0) return NotificationsManager.danger('O grupo selecionado não possui testes cadastrados');
    } else {
      profileIds = Array.from(document.getElementById('schedule-profile-ids')?.selectedOptions || []).map(opt => opt.value);
    }

    if (!name) {
      return NotificationsManager.danger('Nome do agendamento é obrigatório');
    }

    if (profileIds.length === 0) {
      return NotificationsManager.danger('Selecione ao menos um perfil para o agendamento');
    }

    if (!isRecorrente) {
      if (!startDate || !endDate) {
        return NotificationsManager.danger('Período de início e fim é obrigatório');
      }
      if (new Date(startDate) > new Date(endDate)) {
        return NotificationsManager.danger('A data de início não pode ser posterior à data de fim');
      }
    }

    const data = {
      nome: name,
      descricao: description,
      cenarioId: null,
      groupId,
      profileIds,
      config: { requestsPerProfile, concurrency, timeout, delaySeconds },
      agendamento: { dataInicio: startDate, dataFim: endDate, horaInicio: startTime, horaFim: endTime, frequenciaMinutos: frequency, diasSemana: days },
      ativo: true
    };

    try {
      if (scheduleId) {
        SchedulerManager.update(scheduleId, data);
        ModalManager.close();
        NotificationsManager.success('Agendamento atualizado com sucesso');
        AuditLogManager.record('agendamento:editar', name);
      } else {
        SchedulerManager.create(data);
        ModalManager.close();
        NotificationsManager.success('Agendamento criado com sucesso');
        AuditLogManager.record('agendamento:criar', name);
      }
      _renderMainContent('schedules');
      _attachEventListeners();
    } catch (error) {
      NotificationsManager.danger(error.message || 'Falha ao salvar agendamento');
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
      LOGIN: profile.codigoApoiado || '',
      SENHA: profile.codigoSenha || '',
      CODIGO_APOIADO: profile.codigoApoiado || '',
      CODIGO_SENHA: profile.codigoSenha || ''
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
      executadoEm: result.timestamp,
      origem: 'manual',
      scheduleId: null,
      executadoPor: state.currentUser.id,
      cenarioId: scenario.id
    })));

    return results;
  };

  const _buildCustomFieldsHTML = (vars, profile) => {
    if (!vars || !vars.length) return '';
    const customVars = profile?.customVars || {};

    const customFields = vars.filter(v => v.type === 'custom' || v.type === 'atendimento_apoiado');
    const globalFields = vars.filter(v => v.type === 'global');
    const autoFields = vars.filter(v => v.type === 'execution_auto');

    let html = `<div style="background:#F8F9FA;border:1px solid #E5E7EB;border-radius:8px;padding:16px;margin-top:4px;">
      <p style="margin:0 0 12px;font-size:.85em;font-weight:600;color:#374151;">Parâmetros do Método</p>`;

    if (globalFields.length) {
      html += `<div style="margin-bottom:10px;">`;
      globalFields.forEach(f => {
        html += `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:.8em;font-weight:500;margin:2px;background:#E0F7F6;color:#0F9B94;border:1px solid #0F9B94;">
          <span style="opacity:.7;">[global]</span> ${UtilsEngine.escapeXML(f.name)}
          <span style="opacity:.55;font-size:.9em;">— auto-preenchido do perfil</span>
        </span>`;
      });
      html += `</div>`;
    }
    if (autoFields.length) {
      html += `<div style="margin-bottom:10px;">`;
      autoFields.forEach(f => {
        html += `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:.8em;font-weight:500;margin:2px;background:#EFF6FF;color:#3B82F6;border:1px solid #3B82F6;">
          <span style="opacity:.7;">[auto]</span> ${UtilsEngine.escapeXML(f.name)}
          <span style="opacity:.55;font-size:.9em;">— gerado em runtime</span>
        </span>`;
      });
      html += `</div>`;
    }

    customFields.forEach(f => {
      if (f.type === 'atendimento_apoiado') {
        const currentMode = document.querySelector('input[name="attendance-mode"]:checked')?.value || 'sequential';
        const isSeq = currentMode === 'sequential';
        const val = isSeq ? '' : UtilsEngine.escapeXML(profile?.attendanceFixed || customVars[f.name] || '');
        html += `
        <label style="display:block;margin-bottom:10px;font-size:.85em;font-weight:600;color:#374151;">
          ${UtilsEngine.escapeXML(f.name)}
          <span style="font-weight:400;color:#9CA3AF;margin-left:4px;">[apoiado]</span>
          <input type="text" data-custom-var="${UtilsEngine.escapeXML(f.name)}"
            placeholder="${isSeq ? 'Gerado automaticamente (sequencial)' : 'Valor fixo do número de atendimento'}"
            value="${val}"
            ${isSeq ? 'disabled' : ''}
            style="display:block;width:100%;margin-top:4px;padding:6px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:.9em;${isSeq ? 'opacity:.5;background:#F3F4F6;' : ''}" />
          <span style="font-size:.75em;color:#9CA3AF;">Controlado pelo modo Sequencial/Fixo acima</span>
        </label>`;
      } else {
        const val = UtilsEngine.escapeXML(customVars[f.name] || '');
        html += `
        <label style="display:block;margin-bottom:10px;font-size:.85em;font-weight:600;color:#374151;">
          ${UtilsEngine.escapeXML(f.name)}
          <span style="font-weight:400;color:#9CA3AF;margin-left:4px;">[custom]</span>
          <input type="text" data-custom-var="${UtilsEngine.escapeXML(f.name)}"
            placeholder="Valor para {{${UtilsEngine.escapeXML(f.name)}}}"
            value="${val}"
            style="display:block;width:100%;margin-top:4px;padding:6px 10px;border:1px solid #D1D5DB;border-radius:6px;font-size:.9em;" />
          <span style="font-size:.75em;color:#9CA3AF;">Substitui {{${UtilsEngine.escapeXML(f.name)}}} no XML do método</span>
        </label>`;
      }
    });

    html += `</div>`;
    return html;
  };

  const _buildProfileModalBody = (profile = null) => {
    const groups    = GroupsManager.list();
    const methods   = MethodsManager.list();
    const endpoints = EndpointsManager.list();
    const v = (field, fallback = '') => profile ? (profile[field] ?? fallback) : fallback;

    const attendanceMode = v('attendanceMode', 'sequential');
    const seqChecked     = attendanceMode === 'sequential' ? 'checked' : '';
    const fixedChecked   = attendanceMode === 'fixed'      ? 'checked' : '';

    // Endpoint dropdown or manual URL fallback
    const endpointField = endpoints.length
      ? `<label class="field" style="grid-column: 1 / -1;">
          Endpoint SOAP
          <select id="profile-endpoint-id">
            <option value="">— Selecione um endpoint —</option>
            ${endpoints.map(ep => `<option value="${ep.id}" ${profile?.endpointId === ep.id ? 'selected' : ''}>${ep.nome}</option>`).join('')}
          </select>
          <small id="profile-endpoint-url-preview"
            style="font-family:var(--font-mono);font-size:0.8em;color:var(--text-muted);margin-top:4px;display:block;min-height:1.2em;">
            ${profile?.url ? profile.url : ''}
          </small>
         </label>`
      : `<label class="field" style="grid-column: 1 / -1;">
          URL SOAP
          <input id="profile-url-manual" type="url" placeholder="https://..." value="${v('url')}" />
          <small class="field-note" style="color:#C49B3C;">Nenhum endpoint cadastrado. <a href="#" onclick="event.preventDefault();Renderer.renderTab('endpoints');">Acesse Endpoints</a> para cadastrar primeiro, ou digite a URL manualmente.</small>
         </label>`;

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
          ${endpointField}
          <label class="field">
            Versão
            <input id="profile-version" type="text" placeholder="1.0" value="${v('version', '1.0')}" />
          </label>
          <label class="field">
            Cor
            <input id="profile-color" type="color" value="${v('cor', '#0F9B94')}" />
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Grupo
            <select id="profile-group-id">
              <option value="">Nenhum grupo</option>
              ${groups.map(g => `<option value="${g.id}" ${profile?.groupId === g.id ? 'selected' : ''}>${g.nome}</option>`).join('')}
            </select>
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Modo — NumeroAtendimento
            <div style="display:flex;gap:20px;flex-wrap:wrap;margin-top:6px;">
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.9em;">
                <input type="radio" name="attendance-mode" value="sequential" ${seqChecked}>
                Sequencial <span style="color:#9CA3AF;font-size:.85em;">(PRD20260625001…)</span>
              </label>
              <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:.9em;">
                <input type="radio" name="attendance-mode" value="fixed" ${fixedChecked}>
                Fixo
              </label>
            </div>
            <small class="field-note" style="margin-top:4px;">Quando "Fixo", preencha o valor no campo <strong>NumeroAtendimentoApoiado</strong> nos Parâmetros do Método abaixo.</small>
          </label>
          <label class="field" style="grid-column: 1 / -1;">
            Método SOAP vinculado
            <select id="profile-method-id">
              <option value="">Nenhum método selecionado</option>
              ${methods.map(m => `<option value="${m.id}" ${profile?.methodId === m.id ? 'selected' : ''}>${m.nome}</option>`).join('')}
            </select>
            ${methods.length === 0
              ? '<small class="field-note" style="color:#DC2626;">Nenhum método cadastrado. Acesse "Métodos SOAP" para cadastrar primeiro.</small>'
              : '<small class="field-note">Selecione o método SOAP que este teste irá usar na execução.</small>'}
          </label>
          <div id="method-custom-fields" style="grid-column: 1 / -1;"></div>
        </div>
      </form>
    `;
  };

  const _attachMethodCustomFieldsListener = (profile) => {
    const methodSel = document.getElementById('profile-method-id');
    const container = document.getElementById('method-custom-fields');
    if (!methodSel || !container) return;

    const syncAttendanceInput = () => {
      const mode = document.querySelector('input[name="attendance-mode"]:checked')?.value || 'sequential';
      const input = document.querySelector('[data-custom-var="NumeroAtendimentoApoiado"]');
      if (!input) return;
      const isSeq = mode === 'sequential';
      input.disabled = isSeq;
      input.style.opacity = isSeq ? '0.5' : '';
      input.style.background = isSeq ? '#F3F4F6' : '';
      input.placeholder = isSeq ? 'Gerado automaticamente (sequencial)' : 'Valor fixo do número de atendimento';
      if (isSeq) input.value = '';
    };

    const render = () => {
      const mid = methodSel.value;
      const method = mid ? MethodsManager.getById(mid) : null;
      container.innerHTML = _buildCustomFieldsHTML(method?.variables || [], profile);
      syncAttendanceInput();
    };

    methodSel.addEventListener('change', render);
    document.querySelectorAll('input[name="attendance-mode"]').forEach(r =>
      r.addEventListener('change', syncAttendanceInput)
    );
    render();
  };

  const _attachEndpointSelectListener = () => {
    const sel     = document.getElementById('profile-endpoint-id');
    const preview = document.getElementById('profile-endpoint-url-preview');
    if (!sel || !preview) return;
    const update = () => {
      const ep = sel.value ? EndpointsManager.getById(sel.value) : null;
      preview.textContent = ep ? ep.url : '';
    };
    sel.addEventListener('change', update);
    update();
  };

  const _showCreateProfileModal = () => {
    ModalManager.open({
      title: 'Criar Novo Teste',
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
    _attachMethodCustomFieldsListener(null);
    _attachEndpointSelectListener();
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
    _attachMethodCustomFieldsListener(profile);
    _attachEndpointSelectListener();
  };

  const _submitProfileForm = (profileId = null) => {
    const name    = document.getElementById('profile-name')?.value.trim();
    const code    = document.getElementById('profile-code')?.value.trim();
    const version = document.getElementById('profile-version')?.value.trim() || '1.0';
    const groupId = document.getElementById('profile-group-id')?.value || null;
    const methodId= document.getElementById('profile-method-id')?.value || null;
    const color   = document.getElementById('profile-color')?.value || '#0F9B94';
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const createdBy   = currentUser?.usuario || 'admin';

    // Resolver URL: dropdown de endpoint ou fallback manual
    const endpointSel = document.getElementById('profile-endpoint-id');
    const endpointId  = endpointSel?.value || null;
    let url;
    if (endpointId) {
      url = EndpointsManager.getById(endpointId)?.url || '';
    } else {
      url = (document.getElementById('profile-url-manual')?.value || '').trim();
    }

    // Coletar campos customizados detectados pelo método
    const customVars = {};
    document.querySelectorAll('[data-custom-var]').forEach(el => {
      const key = el.dataset.customVar;
      if (key) customVars[key] = el.value.trim();
    });
    const attendanceMode  = document.querySelector('[name="attendance-mode"]:checked')?.value || 'sequential';
    const attendanceFixed = attendanceMode === 'fixed'
      ? (customVars['NumeroAtendimentoApoiado'] || '')
      : '';

    if (!name) return NotificationsManager.danger('O nome do perfil é obrigatório');
    if (!code) return NotificationsManager.danger('O código do perfil é obrigatório');
    if (!url)  return NotificationsManager.danger('Selecione um endpoint ou informe a URL SOAP');

    let result;
    if (profileId) {
      result = ProfilesManager.update(profileId, {
        nome: name, codigo: code, url, version,
        endpointId, cor: color, groupId, methodId,
        customVars, attendanceMode, attendanceFixed
      });
      if (!result) return NotificationsManager.danger('Falha ao atualizar perfil.');
      AuditLogManager.record('teste:editar', name);
      NotificationsManager.success('Perfil atualizado com sucesso');
    } else {
      result = ProfilesManager.create({
        nome: name, codigo: code, url, version,
        endpointId, cor: color, groupId, methodId,
        customVars, attendanceMode, attendanceFixed,
        criadoPor: createdBy
      });
      if (!result) return NotificationsManager.danger(`Falha ao criar perfil. Já existe um perfil com o código "${code.toUpperCase()}". Use um código diferente.`);
      AuditLogManager.record('teste:criar', name);
      NotificationsManager.success('Perfil criado com sucesso');
    }

    ModalManager.close();
    _renderMainContent('profiles');
    _attachEventListeners();
  };

  const _VAR_BADGE_STYLES = {
    global:            'background:#E0F7F6;color:#0F9B94;border:1px solid #0F9B94;',
    execution_auto:    'background:#EFF6FF;color:#3B82F6;border:1px solid #3B82F6;',
    atendimento:       'background:#FEF3C7;color:#92700A;border:1px solid #C49B3C;',
    atendimento_apoiado:'background:#F5F3FF;color:#6D28D9;border:1px solid #8B5CF6;',
    custom:            'background:#F3F4F6;color:#374151;border:1px solid #9CA3AF;',
  };

  const _VAR_TYPE_LABELS = {
    global:            'global',
    execution_auto:    'auto',
    atendimento:       'atendimento',
    atendimento_apoiado:'apoiado',
    custom:            'custom',
  };

  const _renderVarBadges = (vars) => {
    const preview = document.getElementById('method-vars-preview');
    const counter = document.getElementById('method-vars-count');
    if (!preview) return;
    if (!vars || !vars.length) {
      preview.innerHTML = '<span style="color:#9CA3AF;font-size:.85em;">Nenhum campo detectado.</span>';
      if (counter) counter.textContent = '';
      return;
    }
    const html = vars.map(v => {
      const style = _VAR_BADGE_STYLES[v.type] || _VAR_BADGE_STYLES.custom;
      const label = _VAR_TYPE_LABELS[v.type] || v.type;
      return `<span style="display:inline-flex;align-items:center;gap:4px;padding:3px 8px;border-radius:4px;font-size:.8em;font-weight:500;margin:2px;${style}">
        <span style="opacity:.7;font-size:.75em;">[${UtilsEngine.escapeXML(label)}]</span>
        ${UtilsEngine.escapeXML(v.name)}
      </span>`;
    }).join('');
    preview.innerHTML = `<div style="display:flex;flex-wrap:wrap;gap:2px;margin-top:4px;">${html}</div>`;
    if (counter) counter.textContent = `${vars.length} campo(s) detectado(s)`;
  };

  const _buildMethodModalBody = (method = null) => {
    const v = (field, fallback = '') => method ? (method[field] ?? fallback) : fallback;
    const varsJson = JSON.stringify(v('variables', []));
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
            <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:4px;">
              <span>Payload SOAP (template XML)</span>
              <span style="display:flex;align-items:center;gap:8px;">
                <button type="button" id="btn-detect-vars" style="padding:5px 12px;background:#003761;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:.82em;font-weight:500;">
                  Detectar Campos
                </button>
                <span id="method-vars-count" style="color:#6B7280;font-size:.82em;"></span>
              </span>
            </div>
            <textarea id="method-payload" rows="10" placeholder="Cole o envelope SOAP completo. Deixe as tags variáveis vazias (ex: &lt;NumeroAtendimento&gt;&lt;/NumeroAtendimento&gt;) e clique em Detectar Campos.">${v('payloadTemplate')}</textarea>
            <small class="field-note">Cole o XML com tags vazias ou placeholders {{VAR}}. Use "Detectar Campos" para identificar os campos automaticamente.</small>
            <details id="method-vars-details" style="margin-top:6px;">
              <summary style="cursor:pointer;font-size:.82em;color:#6B7280;user-select:none;">Campos detectados</summary>
              <div id="method-vars-preview" style="margin-top:6px;min-height:28px;"></div>
            </details>
          </label>
          <input type="hidden" id="method-vars-json" value="${UtilsEngine.escapeXML(varsJson)}" />
        </div>
      </form>
    `;
  };

  const _attachDetectVarsListener = () => {
    const btn = document.getElementById('btn-detect-vars');
    if (!btn) return;
    btn.addEventListener('click', () => {
      const xml = document.getElementById('method-payload')?.value.trim();
      if (!xml) return NotificationsManager.warning('Cole o XML antes de detectar.');
      let vars = UtilsEngine.extractTags(xml);
      if (!vars.length) vars = UtilsEngine.extractVariables(xml);
      const jsonInput = document.getElementById('method-vars-json');
      if (jsonInput) jsonInput.value = JSON.stringify(vars);
      _renderVarBadges(vars);
      document.getElementById('method-vars-details')?.setAttribute('open', '');
    });
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
    _attachDetectVarsListener();
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
    _attachDetectVarsListener();
    // Pré-renderiza badges se método já tem variables salvas
    if (method.variables && method.variables.length) {
      _renderVarBadges(method.variables);
      document.getElementById('method-vars-details')?.setAttribute('open', '');
    }
  };

  const _submitMethodForm = (methodId = null) => {
    const nome = document.getElementById('method-nome')?.value.trim();
    const operacao = document.getElementById('method-operacao')?.value.trim();
    const soapAction = document.getElementById('method-soapaction')?.value.trim();
    const xmlTag = document.getElementById('method-xmltag')?.value.trim() || 'diag:NumeroAtendimentoApoiado';
    const descricao = document.getElementById('method-descricao')?.value.trim() || '';
    let payloadTemplate = document.getElementById('method-payload')?.value.trim();
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const criadoPor = currentUser?.usuario || 'admin';

    if (!nome) return NotificationsManager.danger('Nome do método é obrigatório');
    if (!soapAction) return NotificationsManager.danger('SOAPAction é obrigatório');
    if (!payloadTemplate) return NotificationsManager.danger('Payload SOAP é obrigatório');

    // Obter variables detectadas (ou auto-detectar se usuário não clicou em Detectar)
    let variables;
    try {
      variables = JSON.parse(document.getElementById('method-vars-json')?.value || '[]');
    } catch { variables = []; }
    if (!variables.length) {
      variables = UtilsEngine.extractTags(payloadTemplate);
      if (!variables.length) variables = UtilsEngine.extractVariables(payloadTemplate);
    }

    // Converter tags vazias para placeholders {{...}} no template
    payloadTemplate = UtilsEngine.convertEmptyTagsToPlaceholders(payloadTemplate, variables);

    let result;
    if (methodId) {
      result = MethodsManager.update(methodId, { nome, operacao: operacao || nome, soapAction, xmlTag, descricao, payloadTemplate, variables });
      if (!result) return NotificationsManager.danger('Falha ao atualizar método');
      AuditLogManager.record('metodo:editar', nome);
      NotificationsManager.success('Método atualizado com sucesso');
    } else {
      result = MethodsManager.create({ nome, operacao: operacao || nome, soapAction, xmlTag, descricao, payloadTemplate, variables, criadoPor });
      if (!result) return NotificationsManager.danger('Falha ao criar método');
      AuditLogManager.record('metodo:criar', nome);
      NotificationsManager.success('Método criado com sucesso');
    }

    ModalManager.close();
    _renderMainContent('methods');
    _attachEventListeners();
  };

  const _buildGroupModalBody = (group = null) => {
    const v = (field, fallback = '') => group ? (group[field] ?? fallback) : fallback;
    return `
      <form id="group-creation-form">
        <div class="form-grid">
          <label class="field">
            Nome do grupo
            <input id="group-name" type="text" placeholder="Ex: Produção" value="${v('nome')}" />
          </label>
          <label class="field">
            Descrição
            <input id="group-description" type="text" placeholder="Ex: Endpoints de produção" value="${v('descricao')}" />
          </label>
          <label class="field">
            Cor
            <input id="group-color" type="color" value="${v('cor', '#0F9B94')}" />
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
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitGroupForm(null);
      };
    }
  };

  const _showEditGroupModal = (groupId) => {
    const group = GroupsManager.getById(groupId);
    if (!group) return NotificationsManager.danger('Grupo não encontrado');
    ModalManager.open({
      title: 'Editar Grupo',
      body: _buildGroupModalBody(group),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (event) => {
        event.preventDefault();
        _submitGroupForm(groupId);
      };
    }
  };

  const _submitGroupForm = (groupId = null) => {
    const name = document.getElementById('group-name')?.value.trim();
    const description = document.getElementById('group-description')?.value.trim();
    const color = document.getElementById('group-color')?.value || '#0F9B94';
    const currentUser = state.currentUser || SessionManager.getCurrentUser();
    const createdBy = currentUser?.usuario || 'admin';

    if (!name) {
      return NotificationsManager.danger('Nome do grupo é obrigatório');
    }

    if (groupId) {
      const updated = GroupsManager.update(groupId, { nome: name, descricao: description, cor: color });
      if (!updated) return NotificationsManager.danger('Falha ao atualizar grupo.');
      AuditLogManager.record('grupo:editar', name);
      ModalManager.close();
      NotificationsManager.success('Grupo atualizado com sucesso');
    } else {
      const group = GroupsManager.create({ nome: name, descricao: description, cor: color, criadoPor: createdBy });
      if (!group) return NotificationsManager.danger('Falha ao criar grupo. Verifique se já não existe um grupo com este nome.');
      AuditLogManager.record('grupo:criar', name);
      ModalManager.close();
      NotificationsManager.success('Grupo criado com sucesso');
    }

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

  const _userStatusBadge = (u) => {
    if (u.ativo) {
      const tmp = u.senhaTemporaria ? ' <span class="badge warning" style="font-size:10px;margin-left:4px;">senha temp.</span>' : '';
      return `<span class="badge success">Ativo</span>${tmp}`;
    }
    if (u.inativacaoTipo === 'temporaria' && u.inativoAte) {
      const ate = new Date(u.inativoAte).toLocaleDateString('pt-BR');
      return `<span class="badge warning">Inativo até ${ate}</span>`;
    }
    return `<span class="badge danger">Inativo</span>`;
  };

  const _renderUsers = () => {
    const users = UsersManager.list();
    const canManage = RBACManager.canCurrent('users:manage');
    const canCreate = RBACManager.canCurrent('users:create');
    const currentId = SessionManager.getCurrentUser()?.id;
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
                  <td><span style="font-family:'JetBrains Mono',monospace;font-size:12px;">${u.usuario}</span></td>
                  <td>${RBACManager.getLevelDescription(u.nivel).split(' —')[0]}</td>
                  <td>${_userStatusBadge(u)}</td>
                  <td>${u.criadoEm ? new Date(u.criadoEm).toLocaleString('pt-BR') : '—'}</td>
                  <td style="display:flex;gap:4px;flex-wrap:wrap;">
                    ${canManage && u.id !== currentId ? `
                      ${u.ativo
                        ? `<button class="button secondary small" type="button" data-action="deactivate-user" data-user-id="${u.id}">Desativar</button>`
                        : `<button class="button secondary small" type="button" data-action="activate-user" data-user-id="${u.id}">Reativar</button>`
                      }
                      <button class="button secondary small" type="button" data-action="reset-password" data-user-id="${u.id}">Resetar Senha</button>
                      <button class="button danger small" type="button" data-action="delete-user" data-user-id="${u.id}">Excluir</button>
                    ` : '<span style="font-size:11px;color:#9CA3AF;">—</span>'}
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
          Usuário (login)
          <input id="user-usuario" type="text" placeholder="Ex: joao.silva" />
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
      <div style="margin-top:12px;">
        <div style="display:flex;gap:8px;align-items:center;margin-bottom:8px;">
          <label style="font-size:12px;font-weight:600;color:#374151;">Senha Inicial Temporária</label>
          <button type="button" id="btn-criar-gerar-senha" class="button secondary small">Gerar</button>
        </div>
        <div style="display:flex;gap:8px;align-items:center;">
          <input id="user-senha" type="text" placeholder="Digite ou gere uma senha" style="flex:1;" />
          <button type="button" id="btn-criar-copiar-senha" class="button secondary small" style="display:none;">Copiar</button>
        </div>
        <p style="font-size:11px;color:#6B7280;margin-top:6px;">O usuário deverá alterar esta senha no primeiro acesso. Anote e envie ao usuário.</p>
      </div>
    </form>
  `;

  const _buildResetPasswordModalBody = (userId) => `
    <form id="reset-password-form" data-user-id="${userId}">
      <div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;">
        <button type="button" id="btn-gerar-senha" class="button secondary small">Gerar Senha Aleatória</button>
        <span id="senha-gerada-display" style="font-family:'JetBrains Mono',monospace;font-size:13px;color:#0F9B94;font-weight:600;letter-spacing:0.08em;"></span>
        <button type="button" id="btn-copiar-senha" style="display:none;background:none;border:none;cursor:pointer;color:#6B7280;font-size:11px;text-decoration:underline;">copiar</button>
      </div>
      <div class="form-grid">
        <label class="field">
          Nova senha
          <input id="reset-senha" type="text" placeholder="Mínimo 6 caracteres" />
        </label>
        <label class="field">
          Confirmar nova senha
          <input id="reset-senha-confirm" type="text" placeholder="Confirme a nova senha" />
        </label>
      </div>
      <label class="field" style="margin-top:12px;flex-direction:row;align-items:center;gap:8px;cursor:pointer;">
        <input id="reset-temporaria" type="checkbox" checked style="width:auto;" />
        Marcar como temporária (usuário deve alterar no próximo acesso)
      </label>
    </form>
  `;

  const _buildDeactivateModalBody = (userId, nome) => `
    <form id="deactivate-form" data-user-id="${userId}">
      <p style="margin-bottom:12px;color:#374151;">Desativar usuário <strong>${nome}</strong>:</p>
      <div class="form-grid">
        <label class="field">
          Tipo de inativação
          <select id="deact-tipo">
            <option value="temporaria">Temporária (até uma data)</option>
            <option value="definitiva">Definitiva</option>
          </select>
        </label>
        <label class="field" id="deact-ate-field">
          Inativo até
          <input id="deact-ate" type="date" />
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

    const btnGerar  = document.getElementById('btn-criar-gerar-senha');
    const btnCopiar = document.getElementById('btn-criar-copiar-senha');
    const inputSenha = document.getElementById('user-senha');
    if (btnGerar && inputSenha) {
      btnGerar.addEventListener('click', () => {
        const nova = _gerarSenhaAleatoria();
        inputSenha.value = nova;
        if (btnCopiar) { btnCopiar.style.display = ''; }
      });
    }
    if (btnCopiar && inputSenha) {
      btnCopiar.addEventListener('click', () => {
        const txt = inputSenha.value;
        if (txt) navigator.clipboard?.writeText(txt).then(() => {
          btnCopiar.textContent = 'Copiado!';
          setTimeout(() => { btnCopiar.textContent = 'Copiar'; }, 1500);
        });
      });
    }

    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitUserForm(); };
    }
  };

  const _submitUserForm = async () => {
    const nome    = document.getElementById('user-nome')?.value.trim();
    const email   = document.getElementById('user-email')?.value.trim();
    const usuario = document.getElementById('user-usuario')?.value.trim();
    const senha   = document.getElementById('user-senha')?.value;
    const nivel   = document.getElementById('user-nivel')?.value;

    if (!nome || !email || !usuario || !senha || !nivel)
      return NotificationsManager.danger('Preencha todos os campos obrigatórios');
    if (senha.length < 6)
      return NotificationsManager.danger('Senha deve ter no mínimo 6 caracteres');

    const created = await UsersManager.create({ nome, email, usuario, senha, nivel, senhaTemporaria: true });
    if (!created)
      return NotificationsManager.danger('Falha ao criar usuário. Verifique se usuário ou email já existem.');

    ModalManager.close();
    NotificationsManager.success('Usuário criado. O usuário deverá alterar a senha no primeiro acesso.');
    _renderMainContent('users');
    _attachEventListeners();
  };

  const _gerarSenhaAleatoria = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
    return s;
  };

  const _showResetPasswordModal = (userId) => {
    const user = UsersManager.getById(userId);
    if (!user) return;
    ModalManager.open({
      title: `Resetar Senha — ${user.nome}`,
      body: _buildResetPasswordModalBody(userId),
      confirmText: 'Salvar',
      cancelText: 'Cancelar'
    });

    const btnGerar = document.getElementById('btn-gerar-senha');
    const btnCopiar = document.getElementById('btn-copiar-senha');
    const display = document.getElementById('senha-gerada-display');
    const inputSenha = document.getElementById('reset-senha');
    const inputConfirm = document.getElementById('reset-senha-confirm');

    if (btnGerar) {
      btnGerar.addEventListener('click', () => {
        const nova = _gerarSenhaAleatoria();
        if (display)    { display.textContent = nova; }
        if (btnCopiar)  { btnCopiar.style.display = ''; }
        if (inputSenha)    inputSenha.value = nova;
        if (inputConfirm)  inputConfirm.value = nova;
      });
    }
    if (btnCopiar) {
      btnCopiar.addEventListener('click', () => {
        const txt = display?.textContent || '';
        if (txt) navigator.clipboard?.writeText(txt).then(() => {
          btnCopiar.textContent = 'copiado!';
          setTimeout(() => { btnCopiar.textContent = 'copiar'; }, 1500);
        });
      });
    }

    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitResetPassword(userId); };
    }
  };

  const _submitResetPassword = async (userId) => {
    const senha   = document.getElementById('reset-senha')?.value;
    const confirm = document.getElementById('reset-senha-confirm')?.value;
    const temp    = document.getElementById('reset-temporaria')?.checked !== false;

    if (!senha) return NotificationsManager.danger('Informe a nova senha');
    if (senha.length < 6) return NotificationsManager.danger('Senha deve ter no mínimo 6 caracteres');
    if (senha !== confirm) return NotificationsManager.danger('As senhas não conferem');

    const updated = await UsersManager.update(userId, { senha, senhaTemporaria: temp });
    if (!updated) return NotificationsManager.danger('Falha ao resetar senha');

    ModalManager.close();
    NotificationsManager.success(temp
      ? 'Senha resetada. O usuário deverá alterar no próximo acesso.'
      : 'Senha alterada com sucesso.');
    _renderMainContent('users');
    _attachEventListeners();
  };

  const _showDeactivateModal = (userId) => {
    const user = UsersManager.getById(userId);
    if (!user) return;
    ModalManager.open({
      title: `Desativar Usuário`,
      body: _buildDeactivateModalBody(userId, user.nome),
      confirmText: 'Desativar',
      cancelText: 'Cancelar'
    });
    const tipoSel = document.getElementById('deact-tipo');
    const ateField = document.getElementById('deact-ate-field');
    if (tipoSel && ateField) {
      tipoSel.addEventListener('change', () => {
        ateField.style.display = tipoSel.value === 'temporaria' ? '' : 'none';
      });
    }
    const confirmButton = document.getElementById('stp-modal-root-confirm');
    if (confirmButton) {
      confirmButton.onclick = (e) => { e.preventDefault(); _submitDeactivate(userId); };
    }
  };

  const _submitDeactivate = async (userId) => {
    const tipo = document.getElementById('deact-tipo')?.value;
    const ate  = document.getElementById('deact-ate')?.value;

    if (tipo === 'temporaria' && !ate)
      return NotificationsManager.danger('Informe a data de reativação automática');

    const updated = await UsersManager.setActive(userId, false, {
      inativacaoTipo: tipo,
      inativoAte: tipo === 'temporaria' ? ate : null
    });
    if (!updated) return NotificationsManager.danger('Falha ao desativar usuário');

    ModalManager.close();
    NotificationsManager.success(tipo === 'temporaria'
      ? `Usuário desativado temporariamente até ${new Date(ate).toLocaleDateString('pt-BR')}.`
      : 'Usuário desativado definitivamente.');
    _renderMainContent('users');
    _attachEventListeners();
  };

  const _exportData = () => {
    const bundle = {
      version: 1,
      exportadoEm: new Date().toISOString(),
      methods:  MethodsManager.list(),
      profiles: ProfilesManager.list(),
      groups:   GroupsManager.list(),
      users:    UsersManager.list()
    };
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `speed-dbsync-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    AuditLogManager.record('dados:exportar', 'backup', `methods:${bundle.methods.length} profiles:${bundle.profiles.length} groups:${bundle.groups.length} users:${bundle.users.length}`);
  };

  const _importData = (bundle, mode) => {
    if (mode === 'replace') {
      StorageEngine.set('soap_methods', bundle.methods  || []);
      StorageEngine.set('profiles',     bundle.profiles || []);
      StorageEngine.set('groups',       bundle.groups   || []);
      StorageEngine.set('users',        bundle.users    || []);
    } else {
      const merge = (storeKey, incoming) => {
        const current = StorageEngine.get(storeKey, []);
        const existingIds = new Set(current.map(e => e.id));
        const toAdd = (incoming || []).filter(e => !existingIds.has(e.id));
        if (toAdd.length > 0) StorageEngine.set(storeKey, [...current, ...toAdd]);
      };
      merge('soap_methods', bundle.methods);
      merge('profiles',     bundle.profiles);
      merge('groups',       bundle.groups);
      merge('users',        bundle.users);
    }
    AuditLogManager.record('dados:importar', 'backup', `modo:${mode} methods:${(bundle.methods||[]).length} profiles:${(bundle.profiles||[]).length} groups:${(bundle.groups||[]).length} users:${(bundle.users||[]).length}`);
    NotificationsManager.success('Importação concluída. A página será recarregada.');
    setTimeout(() => window.location.reload(), 1500);
  };

  const _renderSettings = () => {
    const user = state.currentUser || { usuario: '—', nivel: '—' };
    const allResults = ResultsManager.list();
    const allUsers = UsersManager.list();
    const auditEntries = AuditLogManager.list();

    // Agrupar resultados por userId
    const byUser = {};
    allResults.forEach(r => {
      const uid = r.executadoPor || 'desconhecido';
      if (!byUser[uid]) byUser[uid] = { total: 0, sucesso: 0, falha: 0, ultima: null };
      byUser[uid].total++;
      if (r.success) byUser[uid].sucesso++;
      else byUser[uid].falha++;
      if (!byUser[uid].ultima || new Date(r.executadoEm) > new Date(byUser[uid].ultima)) {
        byUser[uid].ultima = r.executadoEm;
      }
    });

    const logRows = Object.entries(byUser).map(([uid, data]) => {
      const u = allUsers.find(u => u.id === uid);
      const nomeUsuario = u ? u.usuario : uid;
      return `
        <tr>
          <td>${nomeUsuario}</td>
          <td>${data.total}</td>
          <td><span class="badge success">${data.sucesso}</span></td>
          <td><span class="badge danger">${data.falha}</span></td>
          <td>${data.ultima ? new Date(data.ultima).toLocaleString('pt-BR') : '—'}</td>
        </tr>
      `;
    });

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
          <div class="stat-card"><div class="stat-label">Total de resultados</div><div class="stat-value">${allResults.length}</div></div>
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Log de Testes por Usuário</h3>
            <p class="section-subtitle">Resumo de execuções agrupadas por usuário responsável.</p>
          </div>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Usuário</th>
                <th>Total</th>
                <th>Sucesso</th>
                <th>Falha</th>
                <th>Última execução</th>
              </tr>
            </thead>
            <tbody>
              ${logRows.length ? logRows.join('') : '<tr><td colspan="5" class="empty-state">Nenhuma execução registrada.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Log de Atividades</h3>
            <p class="section-subtitle">Registro de criações, edições, exclusões e execuções por usuário.</p>
          </div>
          <button class="button danger small" type="button" id="btn-clear-audit">Limpar Log</button>
        </div>
        <div class="table-wrapper">
          <table class="table">
            <thead>
              <tr>
                <th>Tipo</th>
                <th>Alvo</th>
                <th>Usuário</th>
                <th>Detalhes</th>
                <th>Data/Hora</th>
              </tr>
            </thead>
            <tbody>
              ${auditEntries.length ? auditEntries.map(e => `
                <tr>
                  <td><span class="badge secondary" style="font-size:0.78em;">${e.tipo}</span></td>
                  <td>${e.targetNome}</td>
                  <td>${e.usuario}</td>
                  <td style="font-size:0.82em;color:var(--text-muted);">${e.detalhes || '—'}</td>
                  <td>${new Date(e.timestamp).toLocaleString('pt-BR')}</td>
                </tr>
              `).join('') : '<tr><td colspan="5" class="empty-state">Nenhuma atividade registrada ainda.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      ${user.nivel === 'admin' ? `
      <section class="section-card fade-in-up">
        <div class="section-header">
          <div>
            <h3 class="section-title">Exportar / Importar Dados</h3>
            <p class="section-subtitle">Migre Métodos, Testes, Grupos e Usuários entre máquinas. Visível apenas para administradores.</p>
          </div>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;align-items:center;">
          <button class="button primary" type="button" id="btn-export-data">Exportar dados</button>
          <label class="button secondary" style="cursor:pointer;margin:0;">
            Importar dados
            <input type="file" id="input-import-file" accept=".json" style="display:none;" />
          </label>
        </div>
        <div id="import-mode-panel" style="display:none;margin-top:16px;padding:16px;border-radius:8px;background:var(--surface-alt,#F3F4F6);border:1px solid var(--border);">
          <p style="margin:0 0 12px;font-size:0.9rem;font-weight:600;">Arquivo carregado. Como deseja importar?</p>
          <p style="margin:0 0 16px;font-size:0.83rem;color:var(--text-muted);">
            <strong>Mesclar</strong> — adiciona entidades novas (por ID); mantém as existentes intactas.<br>
            <strong>Substituir</strong> — apaga todos os dados atuais e importa os do arquivo.
          </p>
          <div style="display:flex;gap:10px;flex-wrap:wrap;">
            <button class="button primary" type="button" id="btn-import-merge">Mesclar</button>
            <button class="button danger" type="button" id="btn-import-replace">Substituir</button>
            <button class="button secondary" type="button" id="btn-import-cancel">Cancelar</button>
          </div>
        </div>
      </section>
      ` : ''}
    `;
  };

  const _resetChart = (id) => {
    if (state.chartRefs[id]) {
      state.chartRefs[id].destroy();
      delete state.chartRefs[id];
    }
  };

  const _getLastTestResults = () => {
    const allManual = ResultsManager.list()
      .filter(r => r.origem === 'manual')
      .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));
    if (allManual.length === 0) return [];

    // Identificar o último teste: pegar o resultado mais recente e agrupar com os
    // que têm o mesmo profileId dentro de uma janela de 5 minutos
    const last = allManual[allManual.length - 1];
    const lastTime = new Date(last.executadoEm).getTime();
    const WINDOW_MS = 5 * 60 * 1000;

    return allManual.filter(r =>
      (lastTime - new Date(r.executadoEm).getTime()) <= WINDOW_MS
    );
  };

  const _initializeManualCharts = () => {
    const lastTestResults = _getLastTestResults();

    if (document.getElementById('chart-manual-timeline')) {
      _resetChart('manual-timeline');
      if (lastTestResults.length > 0) {
        const _mtDurs = [...lastTestResults.map(r => r.duration || 0)].sort((a, b) => a - b);
        const _mtMid  = Math.floor(_mtDurs.length / 2);
        const _mtMedian = _mtDurs.length % 2 === 0
          ? Math.round((_mtDurs[_mtMid - 1] + _mtDurs[_mtMid]) / 2)
          : _mtDurs[_mtMid];
        const _mtProfileColors = [
          { border: 'rgba(15,155,148,0.9)',  bg: 'rgba(15,155,148,0.12)'  },
          { border: 'rgba(99,102,241,0.9)',  bg: 'rgba(99,102,241,0.12)'  },
          { border: 'rgba(234,88,12,0.9)',   bg: 'rgba(234,88,12,0.12)'   },
          { border: 'rgba(220,38,127,0.9)',  bg: 'rgba(220,38,127,0.12)'  },
          { border: 'rgba(22,163,74,0.9)',   bg: 'rgba(22,163,74,0.12)'   },
          { border: 'rgba(202,138,4,0.9)',   bg: 'rgba(202,138,4,0.12)'   },
        ];
        const _mtProfilesById = {};
        ProfilesManager.list().forEach(p => { _mtProfilesById[p.id] = p.nome; });
        const _mtUniqueIds = [...new Set(lastTestResults.map(r => r.profileId))];
        const _mtHasMultiple = _mtUniqueIds.length > 1;
        const _mtProfileDatasets = _mtUniqueIds.map((pid, ci) => {
          const col = _mtProfileColors[ci % _mtProfileColors.length];
          return {
            label: _mtProfilesById[pid] || pid.slice(0, 8),
            data: lastTestResults.map(r => r.profileId === pid ? r.duration : null),
            borderColor: col.border,
            backgroundColor: col.bg,
            fill: !_mtHasMultiple,
            tension: 0.3,
            pointRadius: lastTestResults.length > 50 ? 2 : 4,
            spanGaps: false,
            order: ci + 1
          };
        });
        state.chartRefs['manual-timeline'] = new Chart(
          document.getElementById('chart-manual-timeline').getContext('2d'), {
            type: 'line',
            data: {
              labels: lastTestResults.map(r =>
                new Date(r.executadoEm).toLocaleTimeString('pt-BR', { hour12: false })
              ),
              datasets: [
                ..._mtProfileDatasets,
                {
                  label: `Mediana: ${_mtMedian}ms`,
                  data: lastTestResults.map(() => _mtMedian),
                  borderColor: 'rgba(100,100,100,0.75)',
                  borderWidth: 1.5,
                  borderDash: [6, 4],
                  pointRadius: 0,
                  fill: false,
                  tension: 0,
                  order: 0
                }
              ]
            },
            options: {
              plugins: {
                tooltip: {
                  filter: (item) => item.parsed.y !== null,
                  callbacks: {
                    label: (ctx) => {
                      const r = lastTestResults[ctx.dataIndex];
                      const dt = r ? new Date(r.executadoEm).toLocaleString('pt-BR') : '';
                      return `${ctx.dataset.label}: ${ctx.parsed.y}ms — ${dt}`;
                    }
                  }
                },
                legend: {
                  display: true,
                  labels: { boxWidth: 24, font: { size: 11 }, color: 'var(--text-muted)' }
                }
              },
              scales: {
                y: { beginAtZero: true, ticks: { color: 'var(--text-muted)' } },
                x: { ticks: { color: 'var(--text-muted)', maxTicksLimit: 20, maxRotation: 45 } }
              },
              responsive: true,
              maintainAspectRatio: false
            }
          }
        );
      }
    }

    if (document.getElementById('chart-manual-freq')) {
      _resetChart('manual-freq');
      if (lastTestResults.length > 0) {
        // Criar buckets adaptativos de duração
        const durations = lastTestResults.map(r => r.duration || 0);
        const maxDur = Math.max(...durations);

        // Definir limites de bucket conforme o range de dados
        let bucketBounds;
        if (maxDur <= 1000) {
          bucketBounds = [0, 100, 200, 300, 500, 750, 1000];
        } else if (maxDur <= 5000) {
          bucketBounds = [0, 500, 1000, 2000, 3000, 5000];
        } else if (maxDur <= 15000) {
          bucketBounds = [0, 1000, 3000, 5000, 8000, 12000, 15000];
        } else {
          bucketBounds = [0, 2000, 5000, 10000, 20000, 30000, maxDur + 1];
        }

        const bucketLabels = [];
        const bucketCounts = [];
        for (let i = 0; i < bucketBounds.length - 1; i++) {
          const lo = bucketBounds[i];
          const hi = bucketBounds[i + 1];
          bucketLabels.push(`${lo}–${hi}ms`);
          bucketCounts.push(durations.filter(d => d >= lo && d < hi).length);
        }

        state.chartRefs['manual-freq'] = new Chart(
          document.getElementById('chart-manual-freq').getContext('2d'), {
            type: 'bar',
            data: {
              labels: bucketLabels,
              datasets: [{
                label: 'Requisições',
                data: bucketCounts,
                backgroundColor: 'rgba(196, 155, 60, 0.65)',
                borderColor: 'transparent'
              }]
            },
            options: {
              plugins: { legend: { display: false } },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: 'var(--text-muted)', stepSize: 1 },
                  title: { display: true, text: 'Qtd requisições', color: 'var(--text-muted)' }
                },
                x: {
                  ticks: { color: 'var(--text-muted)' },
                  title: { display: true, text: 'Faixa de tempo', color: 'var(--text-muted)' }
                }
              },
              responsive: true,
              maintainAspectRatio: false
            }
          }
        );
      }
    }
  };

  const _CHART_PALETTE = [
    { line: 'rgba(15,155,148,0.9)',   fill: 'rgba(15,155,148,0.08)'   },
    { line: 'rgba(196,155,60,0.9)',   fill: 'rgba(196,155,60,0.08)'   },
    { line: 'rgba(59,130,246,0.9)',   fill: 'rgba(59,130,246,0.08)'   },
    { line: 'rgba(220,38,38,0.9)',    fill: 'rgba(220,38,38,0.08)'    },
    { line: 'rgba(139,92,246,0.9)',   fill: 'rgba(139,92,246,0.08)'   },
    { line: 'rgba(236,72,153,0.9)',   fill: 'rgba(236,72,153,0.08)'   },
  ];

  const _median = (arr) => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  };

  const _initializeScheduleChart = (filter = 'day') => {
    if (!document.getElementById('chart-schedule-perf')) return;

    const now = new Date();
    let cutoff;
    if (filter === 'hour')       cutoff = new Date(now - 60 * 60 * 1000);
    else if (filter === 'week')  cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (filter === 'month') cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
    else                         cutoff = new Date(now - 24 * 60 * 60 * 1000);

    const allResults = ResultsManager.list()
      .filter(r => r.origem === 'scheduled' && new Date(r.executadoEm) >= cutoff)
      .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));

    const formatLabel = (iso) => {
      const d = new Date(iso);
      if (filter === 'hour' || filter === 'day') {
        return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
      }
      return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2,'0')}h`;
    };

    // Agrupar por scheduleId
    const scheduleIds = [...new Set(allResults.map(r => r.scheduleId).filter(Boolean))];
    const schedules = SchedulerManager.list();

    // Construir conjunto global de labels (eixo X unificado por timestamp)
    const allLabels = [...new Set(allResults.map(r => formatLabel(r.executadoEm)))];

    const profileNames = {};
    ProfilesManager.list().forEach(p => { profileNames[p.id] = p.nome; });

    const datasets = [];
    let _colorIdx = 0;
    scheduleIds.forEach((sid, idx) => {
      const scheduleResults = allResults.filter(r => r.scheduleId === sid);
      const schedule = schedules.find(s => s.id === sid);
      const scheduleName = schedule ? schedule.nome : `Agendamento ${idx + 1}`;

      const uniqueProfileIds = [...new Set(scheduleResults.map(r => r.profileId).filter(Boolean))];

      uniqueProfileIds.forEach(pid => {
        const color = _CHART_PALETTE[_colorIdx % _CHART_PALETTE.length];
        _colorIdx++;
        const pResults = scheduleResults.filter(r => r.profileId === pid);
        const profileLabel = profileNames[pid] || pid.slice(0, 8);
        const label = uniqueProfileIds.length > 1
          ? `${scheduleName} — ${profileLabel}`
          : scheduleName;
        const medianVal = _median(pResults.map(r => r.duration));

        const _bSum = new Map(), _bCnt = new Map();
        pResults.forEach(r => {
          const lbl = formatLabel(r.executadoEm);
          _bSum.set(lbl, (_bSum.get(lbl) || 0) + r.duration);
          _bCnt.set(lbl, (_bCnt.get(lbl) || 0) + 1);
        });
        const labelMap = new Map();
        _bSum.forEach((sum, lbl) => labelMap.set(lbl, Math.round(sum / _bCnt.get(lbl))));
        datasets.push({
          label: label,
          data: allLabels.map(lbl => labelMap.get(lbl) ?? null),
          spanGaps: true,
          borderColor: color.line, backgroundColor: color.fill,
          fill: false, tension: 0.3,
          pointRadius: pResults.length > 50 ? 2 : 4, borderWidth: 2
        });
        datasets.push({
          label: `${label} (mediana: ${medianVal}ms)`,
          data: allLabels.map(lbl => labelMap.has(lbl) ? medianVal : null),
          spanGaps: false,
          borderColor: color.line, backgroundColor: 'transparent',
          fill: false, tension: 0, pointRadius: 0, borderWidth: 1.5, borderDash: [6, 4]
        });
      });
    });

    _resetChart('schedule-perf');
    state.chartRefs['schedule-perf'] = new Chart(
      document.getElementById('chart-schedule-perf').getContext('2d'), {
        type: 'line',
        data: { labels: allLabels, datasets },
        options: {
          plugins: {
            legend: {
              display: scheduleIds.length > 0,
              labels: {
                color: 'var(--text-muted)',
                font: { size: 11 },
                filter: (item) => !item.text.includes('mediana:') || scheduleIds.length <= 3
              }
            },
            title: {
              display: allResults.length === 0,
              text: 'Nenhuma execução agendada no período selecionado',
              color: 'var(--text-muted)'
            }
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: 'var(--text-muted)' } },
            x: { ticks: { color: 'var(--text-muted)', maxTicksLimit: 15 } }
          },
          responsive: true,
          maintainAspectRatio: false
        }
      }
    );

    ['hour', 'day', 'week', 'month'].forEach(f => {
      const btn = document.getElementById(`chart-filter-${f}`);
      if (!btn) return;
      btn.className = `button small ${f === filter ? 'primary' : 'secondary'}`;
    });
  };

  const _getManualResultsByFilter = (filter = 'last') => {
    if (filter === 'last') return _getLastTestResults();
    const allManual = ResultsManager.list()
      .filter(r => r.origem === 'manual')
      .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));
    if (allManual.length === 0) return [];
    return allManual.slice(-parseInt(filter, 10));
  };

  const _initializeDashboardManualCharts = (filter = 'last') => {
    const lastTestResults = _getManualResultsByFilter(filter);

    const canvasA = document.getElementById('chart-dash-ma');
    if (canvasA) {
      _resetChart('dash-ma');
      if (lastTestResults.length > 0) {
        const _daDurs = [...lastTestResults.map(r => r.duration || 0)].sort((a, b) => a - b);
        const _daMid  = Math.floor(_daDurs.length / 2);
        const _daMedian = _daDurs.length % 2 === 0
          ? Math.round((_daDurs[_daMid - 1] + _daDurs[_daMid]) / 2)
          : _daDurs[_daMid];
        const _daProfileColors = [
          { border: 'rgba(15,155,148,0.9)',  bg: 'rgba(15,155,148,0.12)'  },
          { border: 'rgba(99,102,241,0.9)',  bg: 'rgba(99,102,241,0.12)'  },
          { border: 'rgba(234,88,12,0.9)',   bg: 'rgba(234,88,12,0.12)'   },
          { border: 'rgba(220,38,127,0.9)',  bg: 'rgba(220,38,127,0.12)'  },
          { border: 'rgba(22,163,74,0.9)',   bg: 'rgba(22,163,74,0.12)'   },
          { border: 'rgba(202,138,4,0.9)',   bg: 'rgba(202,138,4,0.12)'   },
        ];
        const _daProfilesById = {};
        ProfilesManager.list().forEach(p => { _daProfilesById[p.id] = p.nome; });
        const _daUniqueIds = [...new Set(lastTestResults.map(r => r.profileId))];
        const _daHasMultiple = _daUniqueIds.length > 1;
        const _daProfileDatasets = _daUniqueIds.map((pid, ci) => {
          const col = _daProfileColors[ci % _daProfileColors.length];
          return {
            label: _daProfilesById[pid] || pid.slice(0, 8),
            data: lastTestResults.map(r => r.profileId === pid ? r.duration : null),
            borderColor: col.border,
            backgroundColor: col.bg,
            fill: !_daHasMultiple,
            tension: 0.3,
            pointRadius: lastTestResults.length > 50 ? 2 : 4,
            spanGaps: false,
            order: ci + 1
          };
        });
        state.chartRefs['dash-ma'] = new Chart(canvasA.getContext('2d'), {
          type: 'line',
          data: {
            labels: lastTestResults.map(r =>
              new Date(r.executadoEm).toLocaleTimeString('pt-BR', { hour12: false })
            ),
            datasets: [
              ..._daProfileDatasets,
              {
                label: `Mediana: ${_daMedian}ms`,
                data: lastTestResults.map(() => _daMedian),
                borderColor: 'rgba(100,100,100,0.75)',
                borderWidth: 1.5,
                borderDash: [6, 4],
                pointRadius: 0,
                fill: false,
                tension: 0,
                order: 0
              }
            ]
          },
          options: {
            plugins: {
              tooltip: {
                filter: (item) => item.parsed.y !== null,
                callbacks: {
                  label: (ctx) => {
                    const r = lastTestResults[ctx.dataIndex];
                    const dt = r ? new Date(r.executadoEm).toLocaleString('pt-BR') : '';
                    return `${ctx.dataset.label}: ${ctx.parsed.y}ms — ${dt}`;
                  }
                }
              },
              legend: {
                display: true,
                labels: { boxWidth: 24, font: { size: 11 }, color: 'var(--text-muted)' }
              }
            },
            scales: {
              y: { beginAtZero: true, ticks: { color: 'var(--text-muted)' } },
              x: { ticks: { color: 'var(--text-muted)', maxTicksLimit: 20, maxRotation: 45 } }
            },
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }

    const canvasB = document.getElementById('chart-dash-mb');
    if (canvasB) {
      _resetChart('dash-mb');
      if (lastTestResults.length > 0) {
        const allDurations = lastTestResults.map(r => r.duration || 0);
        const maxDur = Math.max(...allDurations);
        let bucketBounds;
        if (maxDur <= 1000)       bucketBounds = [0, 100, 200, 300, 500, 750, 1000];
        else if (maxDur <= 5000)  bucketBounds = [0, 500, 1000, 2000, 3000, 5000];
        else if (maxDur <= 15000) bucketBounds = [0, 1000, 3000, 5000, 8000, 12000, 15000];
        else                      bucketBounds = [0, 2000, 5000, 10000, 20000, 30000, maxDur + 1];

        const bucketLabels = [];
        for (let i = 0; i < bucketBounds.length - 1; i++) {
          bucketLabels.push(`${bucketBounds[i]}–${bucketBounds[i + 1]}ms`);
        }

        const _mbProfileColors = [
          { border: 'rgba(15,155,148,0.9)',  bg: 'rgba(15,155,148,0.65)'  },
          { border: 'rgba(99,102,241,0.9)',  bg: 'rgba(99,102,241,0.65)'  },
          { border: 'rgba(234,88,12,0.9)',   bg: 'rgba(234,88,12,0.65)'   },
          { border: 'rgba(220,38,127,0.9)',  bg: 'rgba(220,38,127,0.65)'  },
          { border: 'rgba(22,163,74,0.9)',   bg: 'rgba(22,163,74,0.65)'   },
          { border: 'rgba(202,138,4,0.9)',   bg: 'rgba(202,138,4,0.65)'   },
        ];
        const _mbProfilesById = {};
        ProfilesManager.list().forEach(p => { _mbProfilesById[p.id] = p.nome; });
        const _mbUniqueIds = [...new Set(lastTestResults.map(r => r.profileId))];

        const datasetsB = _mbUniqueIds.map((pid, idx) => {
          const col = _mbProfileColors[idx % _mbProfileColors.length];
          const profileDurations = lastTestResults.filter(r => r.profileId === pid).map(r => r.duration || 0);
          const counts = [];
          for (let i = 0; i < bucketBounds.length - 1; i++) {
            const lo = bucketBounds[i], hi = bucketBounds[i + 1];
            counts.push(profileDurations.filter(d => d >= lo && d < hi).length);
          }
          return {
            label: _mbProfilesById[pid] || pid.slice(0, 8),
            data: counts,
            backgroundColor: col.bg,
            borderColor: 'transparent'
          };
        });

        state.chartRefs['dash-mb'] = new Chart(canvasB.getContext('2d'), {
          type: 'bar',
          data: { labels: bucketLabels, datasets: datasetsB },
          options: {
            plugins: {
              legend: { display: _mbUniqueIds.length > 1, labels: { boxWidth: 18, font: { size: 11 }, color: 'var(--text-muted)' } }
            },
            scales: {
              y: { beginAtZero: true, ticks: { color: 'var(--text-muted)', stepSize: 1 }, title: { display: true, text: 'Qtd requisições', color: 'var(--text-muted)' } },
              x: { ticks: { color: 'var(--text-muted)' }, title: { display: true, text: 'Faixa de tempo', color: 'var(--text-muted)' } }
            },
            responsive: true,
            maintainAspectRatio: false
          }
        });
      }
    }

    // Atualizar botões de filtro
    ['last', '10', '50', '100'].forEach(f => {
      const b = document.getElementById(`dash-manual-filter-${f}`);
      if (b) b.className = `button small ${f === filter ? 'primary' : 'secondary'}`;
    });
  };

  const _initializeDashboardScheduleCharts = (filter = 'day') => {
    // Chart C — Performance dos Agendamentos
    const canvasSA = document.getElementById('chart-dash-sa');
    if (canvasSA) {
      const now = new Date();
      let cutoff;
      if (filter === 'hour')       cutoff = new Date(now - 60 * 60 * 1000);
      else if (filter === 'week')  cutoff = new Date(now - 7 * 24 * 60 * 60 * 1000);
      else if (filter === 'month') cutoff = new Date(now - 30 * 24 * 60 * 60 * 1000);
      else                         cutoff = new Date(now - 24 * 60 * 60 * 1000);

      const allResults = ResultsManager.list()
        .filter(r => r.origem === 'scheduled' && new Date(r.executadoEm) >= cutoff)
        .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));

      const formatLabel = (iso) => {
        const d = new Date(iso);
        if (filter === 'hour' || filter === 'day') return `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
        return `${d.getDate()}/${d.getMonth() + 1} ${String(d.getHours()).padStart(2,'0')}h`;
      };

      const scheduleIds = [...new Set(allResults.map(r => r.scheduleId).filter(Boolean))];
      const schedules = SchedulerManager.list();
      const allLabels = [...new Set(allResults.map(r => formatLabel(r.executadoEm)))];
      const _dashProfileNames = {};
      ProfilesManager.list().forEach(p => { _dashProfileNames[p.id] = p.nome; });
      const datasets = [];
      let _dashColorIdx = 0;
      scheduleIds.forEach((sid, idx) => {
        const sResults = allResults.filter(r => r.scheduleId === sid);
        const sched = schedules.find(s => s.id === sid);
        const scheduleName = sched ? sched.nome : `Agendamento ${idx + 1}`;
        const uniqueProfileIds = [...new Set(sResults.map(r => r.profileId).filter(Boolean))];
        uniqueProfileIds.forEach(pid => {
          const color = _CHART_PALETTE[_dashColorIdx % _CHART_PALETTE.length];
          _dashColorIdx++;
          const pResults = sResults.filter(r => r.profileId === pid);
          const profileLabel = _dashProfileNames[pid] || pid.slice(0, 8);
          const label = uniqueProfileIds.length > 1
            ? `${scheduleName} — ${profileLabel}`
            : scheduleName;
          const medianVal = _median(pResults.map(r => r.duration));
          const _bSum = new Map(), _bCnt = new Map();
          pResults.forEach(r => {
            const lbl = formatLabel(r.executadoEm);
            _bSum.set(lbl, (_bSum.get(lbl) || 0) + r.duration);
            _bCnt.set(lbl, (_bCnt.get(lbl) || 0) + 1);
          });
          const labelMap = new Map();
          _bSum.forEach((sum, lbl) => labelMap.set(lbl, Math.round(sum / _bCnt.get(lbl))));
          datasets.push({
            label: label,
            data: allLabels.map(lbl => labelMap.get(lbl) ?? null),
            spanGaps: true,
            borderColor: color.line, backgroundColor: color.fill, fill: false, tension: 0.3,
            pointRadius: pResults.length > 50 ? 2 : 4, borderWidth: 2
          });
          datasets.push({
            label: `${label} (mediana: ${medianVal}ms)`,
            data: allLabels.map(lbl => labelMap.has(lbl) ? medianVal : null),
            spanGaps: false,
            borderColor: color.line, backgroundColor: 'transparent', fill: false, tension: 0,
            pointRadius: 0, borderWidth: 1.5, borderDash: [6, 4]
          });
        });
      });

      _resetChart('dash-sa');
      state.chartRefs['dash-sa'] = new Chart(canvasSA.getContext('2d'), {
        type: 'line',
        data: { labels: allLabels, datasets },
        options: {
          plugins: {
            legend: {
              display: scheduleIds.length > 0,
              labels: { color: 'var(--text-muted)', font: { size: 11 }, filter: (item) => !item.text.includes('mediana:') || scheduleIds.length <= 3 }
            },
            title: { display: allResults.length === 0, text: 'Nenhuma execução agendada no período', color: 'var(--text-muted)' }
          },
          scales: {
            y: { beginAtZero: true, ticks: { color: 'var(--text-muted)' } },
            x: { ticks: { color: 'var(--text-muted)', maxTicksLimit: 15 } }
          },
          responsive: true,
          maintainAspectRatio: true,
          aspectRatio: 1.6
        }
      });

      // Atualizar botões de filtro do dashboard
      ['hour', 'day', 'week', 'month'].forEach(f => {
        const btn = document.getElementById(`dash-chart-filter-${f}`);
        if (!btn) return;
        btn.className = `button small ${f === filter ? 'primary' : 'secondary'}`;
      });
    }

    // Chart D — Taxa de Sucesso por Endpoint
    const canvasSB = document.getElementById('chart-dash-sb');
    if (canvasSB) {
      const results = ResultsManager.list();
      const uniqueEndpoints = [...new Set(results.map(r => r.endpoint))];
      if (uniqueEndpoints.length > 0) {
        const successRates = uniqueEndpoints.map(endpoint => {
          const ep = results.filter(r => r.endpoint === endpoint);
          const ok = ep.filter(r => r.success).length;
          return ep.length ? Math.round((ok / ep.length) * 100) : 0;
        });
        _resetChart('dash-sb');
        state.chartRefs['dash-sb'] = new Chart(canvasSB.getContext('2d'), {
          type: 'doughnut',
          data: {
            labels: uniqueEndpoints.map((ep, i) => `${ep} (${successRates[i]}%)`),
            datasets: [{ data: successRates, backgroundColor: uniqueEndpoints.map((_, i) => `rgba(15,155,148,${0.85 - i * 0.1})`), borderColor: 'transparent' }]
          },
          options: {
            plugins: {
              legend: { position: 'bottom', labels: { color: 'var(--text-muted)', font: { family: "'Inter', sans-serif", size: 11 }, padding: 8 } },
              tooltip: { callbacks: { label: (ctx) => ` ${ctx.label}` } }
            },
            responsive: true,
            maintainAspectRatio: true,
            aspectRatio: 1.6,
            cutout: '60%'
          }
        });
      }
    }
  };

  const _initializeDashboardCharts = () => {
    _initializeDashboardManualCharts();
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

    // Dashboard: toggle tabs Manuais / Agendados
    const dashTabManual = document.getElementById('dash-tab-manual');
    const dashTabAgendado = document.getElementById('dash-tab-agendado');
    if (dashTabManual && dashTabAgendado) {
      dashTabManual.addEventListener('click', () => {
        document.getElementById('dash-charts-manual').style.display = '';
        document.getElementById('dash-charts-agendado').style.display = 'none';
        dashTabManual.className = 'button primary small';
        dashTabAgendado.className = 'button secondary small';
        setTimeout(_initializeDashboardManualCharts, 50);
      });
      dashTabAgendado.addEventListener('click', () => {
        document.getElementById('dash-charts-manual').style.display = 'none';
        document.getElementById('dash-charts-agendado').style.display = '';
        dashTabManual.className = 'button secondary small';
        dashTabAgendado.className = 'button primary small';
        setTimeout(() => _initializeDashboardScheduleCharts('day'), 50);
      });
    }

    // Dashboard: filtros dos gráficos manuais A e B
    ['last', '10', '50', '100'].forEach(f => {
      const btn = document.getElementById(`dash-manual-filter-${f}`);
      if (btn) btn.addEventListener('click', () => _initializeDashboardManualCharts(f));
    });

    // Dashboard: filtros do gráfico de agendados
    ['hour', 'day', 'week', 'month'].forEach(f => {
      const btn = document.getElementById(`dash-chart-filter-${f}`);
      if (btn) btn.addEventListener('click', () => _initializeDashboardScheduleCharts(f));
    });

    const clearResultsButton = document.getElementById('btn-clear-results');
    if (clearResultsButton) {
      clearResultsButton.addEventListener('click', () => {
        ModalManager.confirm({
          title: 'Limpar todos os registros',
          body: '<p>Todos os resultados de testes serão removidos permanentemente. Deseja continuar?</p>',
          confirmText: 'Limpar',
          cancelText: 'Cancelar',
          onConfirm: () => {
            ResultsManager.clear().then(() => {
              NotificationsManager.success('Registros limpos com sucesso');
              _renderMainContent('results');
              _attachEventListeners();
            });
          }
        });
      });
    }

    const clearAuditBtn = document.getElementById('btn-clear-audit');
    if (clearAuditBtn) {
      clearAuditBtn.addEventListener('click', () => {
        ModalManager.confirm({
          title: 'Limpar log de atividades',
          body: '<p>Todos os registros de auditoria serão removidos permanentemente. Deseja continuar?</p>',
          confirmText: 'Limpar',
          cancelText: 'Cancelar',
          onConfirm: () => {
            AuditLogManager.clear();
            NotificationsManager.success('Log de atividades limpo');
            _renderMainContent('settings');
            _attachEventListeners();
          }
        });
      });
    }

    document.getElementById('btn-export-data')?.addEventListener('click', _exportData);

    let _importBundle = null;
    const importFileInput = document.getElementById('input-import-file');
    if (importFileInput) {
      importFileInput.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            _importBundle = JSON.parse(ev.target.result);
            const panel = document.getElementById('import-mode-panel');
            if (panel) panel.style.display = 'block';
          } catch {
            NotificationsManager.danger('Arquivo inválido. Selecione um JSON exportado pelo Speed Teste.');
          }
        };
        reader.readAsText(file);
        e.target.value = '';
      });
    }

    document.getElementById('btn-import-merge')?.addEventListener('click', () => {
      if (_importBundle) _importData(_importBundle, 'merge');
    });
    document.getElementById('btn-import-replace')?.addEventListener('click', () => {
      if (_importBundle) _importData(_importBundle, 'replace');
    });
    document.getElementById('btn-import-cancel')?.addEventListener('click', () => {
      _importBundle = null;
      const panel = document.getElementById('import-mode-panel');
      if (panel) panel.style.display = 'none';
    });

    // Helper: lê filtros atuais do DOM (preserva estado entre re-renders)
    const _readResultFilters = (overrides = {}) => ({
      profileId: document.getElementById('filter-profile')?.value || '',
      tipo:      document.getElementById('filter-tipo')?.value   || '',
      status:    document.getElementById('filter-status')?.value || '',
      de:        document.getElementById('filter-de')?.value     || '',
      ate:       document.getElementById('filter-ate')?.value    || '',
      page:      document.getElementById('results-page')?.value  || '1',
      ...overrides
    });

    const _applyResultFilters = (filters) => {
      const main = document.getElementById('app-content');
      if (main) { main.innerHTML = _renderResults(filters); _attachEventListeners(); }
    };

    // Filtros de resultados
    document.getElementById('btn-apply-filters')?.addEventListener('click', () => {
      _applyResultFilters(_readResultFilters({ page: '1' }));
    });

    document.getElementById('btn-clear-filters')?.addEventListener('click', () => {
      _applyResultFilters({});
    });

    // Paginação
    document.getElementById('btn-page-prev')?.addEventListener('click', () => {
      const p = Math.max(1, parseInt(_readResultFilters().page, 10) - 1);
      _applyResultFilters(_readResultFilters({ page: String(p) }));
    });

    document.getElementById('btn-page-next')?.addEventListener('click', () => {
      const p = parseInt(_readResultFilters().page, 10) + 1;
      _applyResultFilters(_readResultFilters({ page: String(p) }));
    });

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

    // Reports toggle: Consolidado / Por Teste
    const reportConsolidado = document.getElementById('report-view-consolidado');
    const reportPorTeste    = document.getElementById('report-view-por-teste');
    if (reportConsolidado && reportPorTeste) {
      reportConsolidado.addEventListener('click', () => {
        document.getElementById('report-section-consolidado').style.display = '';
        document.getElementById('report-section-por-teste').style.display = 'none';
        reportConsolidado.className = 'button primary small';
        reportPorTeste.className = 'button secondary small';
      });
      reportPorTeste.addEventListener('click', () => {
        document.getElementById('report-section-consolidado').style.display = 'none';
        document.getElementById('report-section-por-teste').style.display = '';
        reportConsolidado.className = 'button secondary small';
        reportPorTeste.className = 'button primary small';
      });
    }

    const _readReportFilters = () => ({
      de:  document.getElementById('report-filter-de')?.value  || '',
      ate: document.getElementById('report-filter-ate')?.value || ''
    });

    const _applyReportFilters = (filters) => {
      const main = document.getElementById('app-content');
      if (main) { main.innerHTML = _renderReports(filters); _attachEventListeners(); }
    };

    document.getElementById('btn-apply-report-filter')?.addEventListener('click', () => {
      _applyReportFilters(_readReportFilters());
    });

    document.getElementById('btn-clear-report-filter')?.addEventListener('click', () => {
      _applyReportFilters({ de: '', ate: '' });
    });

    const exportExcelButton = document.getElementById('btn-export-excel');
    if (exportExcelButton) {
      exportExcelButton.addEventListener('click', () => {
        try {
          ReportsManager.exportExcel(_readReportFilters());
          NotificationsManager.success('Exportação Excel iniciada');
        } catch (error) {
          NotificationsManager.danger('Falha ao exportar Excel: ' + error.message);
        }
      });
    }

    const exportHTMLButton = document.getElementById('btn-export-html');
    if (exportHTMLButton) {
      exportHTMLButton.addEventListener('click', () => {
        const filterType = document.querySelector('input[name="html-filter"]:checked')?.value || 'all';
        const profileId  = document.getElementById('html-filter-profile-select')?.value || null;
        const groupId    = document.getElementById('html-filter-group-select')?.value || null;
        if (filterType === 'profile' && !profileId)
          return NotificationsManager.warning('Selecione um teste para o relatório HTML.');
        if (filterType === 'group' && !groupId)
          return NotificationsManager.warning('Selecione um grupo para o relatório HTML.');
        try {
          ReportsManager.exportHTML({ type: filterType, profileId, groupId, ..._readReportFilters() });
          NotificationsManager.success('Relatório HTML aberto em nova aba');
        } catch (error) {
          NotificationsManager.danger('Falha ao gerar relatório HTML: ' + error.message);
        }
      });
    }

    document.querySelectorAll('input[name="html-filter"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const currentVal = document.querySelector('input[name="html-filter"]:checked')?.value;
        const profileSel = document.getElementById('html-filter-profile-select');
        const groupSel   = document.getElementById('html-filter-group-select');
        if (profileSel) profileSel.style.display = currentVal === 'profile' ? 'inline-block' : 'none';
        if (groupSel)   groupSel.style.display   = currentVal === 'group'   ? 'inline-block' : 'none';
      });
    });

    const exportCSVButton = document.getElementById('btn-export-csv');
    if (exportCSVButton) {
      exportCSVButton.addEventListener('click', () => {
        try {
          ReportsManager.exportCSV(_readReportFilters());
          NotificationsManager.success('Exportação CSV iniciada');
        } catch (error) {
          NotificationsManager.danger('Falha ao exportar CSV: ' + error.message);
        }
      });
    }

    const importCsvBtn = document.getElementById('btn-import-csv-results');
    const importCsvInput = document.getElementById('import-csv-file-input');
    if (importCsvBtn && importCsvInput) {
      importCsvBtn.addEventListener('click', () => importCsvInput.click());
      importCsvInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const { imported, errors } = ReportsManager.importCSV(ev.target.result);
            if (imported > 0) {
              NotificationsManager.success(`${imported} resultado(s) importado(s) com sucesso${errors > 0 ? ` (${errors} linha(s) ignoradas)` : ''}`);
              _renderMainContent('reports');
              _attachEventListeners();
            } else if (errors > 0) {
              NotificationsManager.danger(`Nenhum resultado importado. Verifique se o arquivo é um CSV exportado por este sistema.`);
            } else {
              NotificationsManager.warning('Arquivo CSV vazio ou sem dados.');
            }
          } catch (err) {
            NotificationsManager.danger('Falha ao ler o arquivo: ' + err.message);
          }
        };
        reader.readAsText(file, 'UTF-8');
        e.target.value = '';
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

    document.querySelectorAll('[data-action="delete-profile"]').forEach(button => {
      button.addEventListener('click', () => {
        const profileId = button.dataset.profileId;
        const profile = ProfilesManager.getById(profileId);
        if (!profile) return;
        ModalManager.confirm({
          title: 'Excluir perfil',
          body: `<p>Deseja excluir o perfil <strong>${profile.nome}</strong>? A ação não pode ser desfeita.</p>`,
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            const pName = ProfilesManager.getById(profileId)?.nome || profileId;
            ProfilesManager.delete_(profileId);
            AuditLogManager.record('teste:excluir', pName);
            NotificationsManager.warning('Perfil excluído');
            _renderMainContent('profiles');
            _attachEventListeners();
          }
        });
      });
    });

    document.querySelectorAll('[data-action="edit-group"]').forEach(button => {
      button.addEventListener('click', () => {
        _showEditGroupModal(button.dataset.groupId);
      });
    });

    document.querySelectorAll('[data-action="delete-group"]').forEach(button => {
      button.addEventListener('click', () => {
        const groupId = button.dataset.groupId;
        const group = GroupsManager.getById(groupId);
        if (!group) return;
        ModalManager.confirm({
          title: 'Excluir grupo',
          body: `<p>Deseja excluir o grupo <strong>${group.nome}</strong>? Os perfis vinculados perderão o grupo.</p>`,
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            const gName = GroupsManager.getById(groupId)?.nome || groupId;
            GroupsManager.delete_(groupId);
            AuditLogManager.record('grupo:excluir', gName);
            NotificationsManager.warning('Grupo excluído');
            _renderMainContent('groups');
            _attachEventListeners();
          }
        });
      });
    });

    document.querySelectorAll('[data-action="view-request"]').forEach(button => {
      button.addEventListener('click', () => {
        const seq = button.dataset.seq;
        const result = ResultsManager.list().find(r => String(r.seq) === String(seq));
        if (!result || !result.requestPayload) {
          return NotificationsManager.info('Request não disponível para este resultado');
        }
        const escaped = result.requestPayload
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        ModalManager.open({
          title: `XML Request — Seq #${seq} · ${result.endpoint}`,
          body: `<pre style="white-space:pre-wrap;word-break:break-all;font-size:0.78em;font-family:monospace;background:var(--surface-alt);padding:16px;border-radius:8px;overflow-y:auto;max-height:520px;margin:0;">${escaped}</pre>`,
          confirmText: 'Fechar',
          cancelText: 'Cancelar',
          width: '760px'
        });
      });
    });

    document.querySelectorAll('[data-action="view-response"]').forEach(button => {
      button.addEventListener('click', () => {
        const seq = button.dataset.seq;
        const result = ResultsManager.list().find(r => String(r.seq) === String(seq));
        if (!result || !result.responseBody) {
          return NotificationsManager.info('Response não disponível para este resultado');
        }
        const escaped = result.responseBody
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;');
        ModalManager.open({
          title: `XML Response — Seq #${seq} · ${result.endpoint}`,
          body: `<pre style="white-space:pre-wrap;word-break:break-all;font-size:0.78em;font-family:monospace;background:var(--surface-alt);padding:16px;border-radius:8px;overflow-y:auto;max-height:520px;margin:0;">${escaped}</pre>`,
          confirmText: 'Fechar',
          cancelText: 'Cancelar',
          width: '760px'
        });
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

    document.querySelectorAll('[data-action="edit-schedule"]').forEach(button => {
      button.addEventListener('click', () => {
        _showEditScheduleModal(button.dataset.scheduleId);
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
            const sName = SchedulerManager.getById(scheduleId)?.nome || scheduleId;
            SchedulerManager.delete_(scheduleId);
            AuditLogManager.record('agendamento:excluir', sName);
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

    // --- Radio toggle Teste / Grupo ---
    const _updateExecMethodInfo = () => {
      const info = document.getElementById('exec-method-info');
      if (!info) return;
      const mode = document.querySelector('input[name="exec-mode"]:checked')?.value || 'teste';
      if (mode === 'grupo') {
        info.style.display = 'flex';
        info.innerHTML = '<span style="color:var(--text-muted);">Cada teste do grupo usará seu próprio método vinculado.</span>';
        return;
      }
      const profileId = document.getElementById('test-profile-select')?.value;
      if (!profileId) {
        info.style.display = 'none';
        info.innerHTML = '';
        return;
      }
      const profile = ProfilesManager.getById(profileId);
      const method = profile?.methodId ? MethodsManager.getById(profile.methodId) : null;
      info.style.display = 'flex';
      info.innerHTML = method
        ? `Método: <strong>${UtilsEngine.escapeXML(method.nome)}</strong>`
        : '<span style="color:#DC2626;">⚠ Nenhum método vinculado. Edite o teste para configurar.</span>';
    };

    document.querySelectorAll('input[name="exec-mode"]').forEach(radio => {
      radio.addEventListener('change', () => {
        const isGrupo = radio.value === 'grupo';
        const labelEl = document.getElementById('exec-target-label-text');
        const profileDiv = document.getElementById('exec-target-profile');
        const groupDiv   = document.getElementById('exec-target-group');
        if (labelEl) labelEl.textContent = isGrupo ? 'Grupo' : 'Teste';
        if (profileDiv) profileDiv.style.display = isGrupo ? 'none' : '';
        if (groupDiv)   groupDiv.style.display   = isGrupo ? '' : 'none';
        _updateExecMethodInfo();
      });
    });

    const profileSel = document.getElementById('test-profile-select');
    if (profileSel) profileSel.addEventListener('change', _updateExecMethodInfo);

    // --- Painel de Execução (aba Testes) ---
    const startTestBtn = document.getElementById('btn-start-test');
    const abortTestBtn = document.getElementById('btn-abort-test');

    if (startTestBtn) {
      startTestBtn.addEventListener('click', async () => {
        const execMode = document.querySelector('input[name="exec-mode"]:checked')?.value || 'teste';

        const limits = RBACManager.getExecutionLimits();
        const rawRequests    = Number(document.getElementById('test-requests')?.value   || 1);
        const rawConcurrency = Number(document.getElementById('test-concurrency')?.value || 1);
        const timeout        = Number(document.getElementById('test-timeout')?.value     || 120);
        const delaySeconds   = Number(document.getElementById('test-delay')?.value       || 0);
        const requests    = Math.min(rawRequests,    limits.maxRequests);
        const concurrency = Math.min(rawConcurrency, limits.maxConcurrency);

        // Construir lista de perfis a executar
        let profilesToRun = [];
        if (execMode === 'grupo') {
          const groupId = document.getElementById('test-group-select')?.value;
          if (!groupId) return NotificationsManager.danger('Selecione um grupo para iniciar o teste');
          profilesToRun = ProfilesManager.list().filter(p => p.groupId === groupId);
          if (profilesToRun.length === 0) return NotificationsManager.danger('O grupo selecionado não possui testes cadastrados');
        } else {
          const profileId = document.getElementById('test-profile-select')?.value;
          if (!profileId) return NotificationsManager.danger('Selecione um teste para iniciar');
          const profile = ProfilesManager.getById(profileId);
          if (!profile) return;
          profilesToRun = [profile];
        }

        startTestBtn.disabled = true;
        if (abortTestBtn) abortTestBtn.disabled = false;

        const progressDiv = document.getElementById('test-progress');
        if (progressDiv) {
          progressDiv.style.display = 'block';
          progressDiv.innerHTML = '<span class="badge info">Iniciando...</span>';
        }

        try {
          let totalSuccess = 0;
          let totalAll = 0;

          for (const profile of profilesToRun) {
            const method = MethodsManager.getById(profile.methodId);
            if (!method) {
              if (profilesToRun.length === 1) {
                NotificationsManager.danger(`Nenhum método vinculado ao teste "${profile.nome}". Edite o teste para vincular um método.`);
                startTestBtn.disabled = false;
                if (abortTestBtn) abortTestBtn.disabled = true;
                return;
              }
              NotificationsManager.warning(`Teste "${profile.nome}" sem método vinculado — pulado.`);
              continue;
            }

            const mergedProfile = {
              ...profile,
              payloadTemplate: method.payloadTemplate,
              xmlTag: method.xmlTag,
              soapAction: method.soapAction
            };

            const results = await RunnerEngine.executeBatch([mergedProfile], {
              requestsPerProfile: requests,
              concurrency,
              timeout,
              delaySeconds
            }, (progress) => {
              if (progressDiv) {
                progressDiv.innerHTML = `<span class="badge info">${UtilsEngine.escapeXML(profile.nome)}: ${progress.completed}/${progress.total} (${progress.successful} ok / ${progress.failed} falhas)</span>`;
              }
            });

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
              executadoEm: r.timestamp,
              origem: 'manual',
              scheduleId: null,
              executadoPor: state.currentUser?.id,
              cenarioId: null
            })));

            totalSuccess += results.filter(r => r.success).length;
            totalAll += results.length;
          }

          if (progressDiv) {
            progressDiv.innerHTML = `<span class="badge success">${totalSuccess}/${totalAll} com sucesso</span>`;
          }
          NotificationsManager.success(`Teste concluído: ${totalSuccess}/${totalAll} com sucesso`);
          AuditLogManager.record('teste:executar', profilesToRun.map(p => p.nome).join(', '), `${requests} req, ${concurrency} conc`);
          setTimeout(_initializeManualCharts, 150);
        } catch (error) {
          if (progressDiv) progressDiv.innerHTML = '<span class="badge danger">Erro ou teste abortado</span>';
          NotificationsManager.danger('Erro durante o teste: ' + (error.message || 'Desconhecido'));
        } finally {
          startTestBtn.disabled = false;
          if (abortTestBtn) abortTestBtn.disabled = true;
        }
      });
    }

    ['hour', 'day', 'week', 'month'].forEach(filter => {
      const btn = document.getElementById(`chart-filter-${filter}`);
      if (btn) btn.addEventListener('click', () => _initializeScheduleChart(filter));
    });

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

    // --- Endpoints ---
    const newEndpointBtn = document.getElementById('btn-new-endpoint');
    if (newEndpointBtn) {
      newEndpointBtn.addEventListener('click', () => _showCreateEndpointModal());
    }

    document.querySelectorAll('[data-action="edit-endpoint"]').forEach(button => {
      button.addEventListener('click', () => _showEditEndpointModal(button.dataset.endpointId));
    });

    document.querySelectorAll('[data-action="delete-endpoint"]').forEach(button => {
      button.addEventListener('click', () => {
        const endpointId = button.dataset.endpointId;
        ModalManager.confirm({
          title: 'Excluir endpoint',
          body: '<p>Deseja realmente excluir este endpoint? Perfis que o usam manterão a URL salva, mas não terão mais o vínculo.</p>',
          confirmText: 'Excluir',
          cancelText: 'Cancelar',
          onConfirm: () => {
            const epName = EndpointsManager.getById(endpointId)?.nome || endpointId;
            EndpointsManager.delete_(endpointId);
            AuditLogManager.record('endpoint:excluir', epName);
            NotificationsManager.warning('Endpoint excluído');
            _renderMainContent('endpoints');
            _attachEventListeners();
          }
        });
      });
    });

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
            const mName = MethodsManager.getById(methodId)?.nome || methodId;
            MethodsManager.delete_(methodId);
            AuditLogManager.record('metodo:excluir', mName);
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

    // --- Ações de Usuário ---
    document.querySelectorAll('[data-action="deactivate-user"]').forEach(button => {
      button.addEventListener('click', () => {
        _showDeactivateModal(button.dataset.userId);
      });
    });

    document.querySelectorAll('[data-action="activate-user"]').forEach(button => {
      button.addEventListener('click', async () => {
        const userId = button.dataset.userId;
        await UsersManager.setActive(userId, true, { inativacaoTipo: null, inativoAte: null });
        NotificationsManager.success('Usuário reativado com sucesso');
        _renderMainContent('users');
        _attachEventListeners();
      });
    });

    document.querySelectorAll('[data-action="reset-password"]').forEach(button => {
      button.addEventListener('click', () => {
        _showResetPasswordModal(button.dataset.userId);
      });
    });

    document.querySelectorAll('[data-action="delete-user"]').forEach(button => {
      button.addEventListener('click', () => {
        const userId = button.dataset.userId;
        const user = UsersManager.getById(userId);
        ModalManager.confirm({
          title: 'Excluir usuário',
          body: `<p>Deseja realmente excluir <strong>${user?.nome || 'este usuário'}</strong>? A ação não pode ser desfeita.</p>`,
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
    header.innerHTML = _buildHeader();
  };

  const _syncTabData = async (tabId) => {
    let changed = false;
    try {
      if      (tabId === 'users')                         changed = !!(await UsersManager.syncFromTurso?.());
      else if (tabId === 'groups')                        changed = !!(await GroupsManager.syncFromTurso?.());
      else if (tabId === 'endpoints')                     changed = !!(await EndpointsManager.syncFromTurso?.());
      else if (tabId === 'methods')                       changed = !!(await MethodsManager.syncFromTurso?.());
      else if (tabId === 'schedules')                     changed = !!(await SchedulerManager.syncFromTurso?.());
      else if (tabId === 'profiles')                      changed = !!(await ProfilesManager.syncFromTurso?.());
      else if (tabId === 'results' || tabId === 'reports') changed = false;
    } catch {}
    if (changed && state.activeTab === tabId) {
      _renderMainContent(tabId);
      _attachEventListeners();
      if (tabId === 'schedules') setTimeout(() => _initializeScheduleChart('day'), 100);
    }
  };

  const _navigate = (tabId) => {
    state.activeTab = tabId;
    SidebarManager.render(state.currentUser, tabId, _navigate);
    _renderMainContent(tabId);
    _renderHeader();
    _attachEventListeners();
    if (tabId === 'dashboard') {
      setTimeout(_initializeDashboardCharts, 100);
    } else if (tabId === 'profiles') {
      setTimeout(_initializeManualCharts, 100);
    } else if (tabId === 'schedules') {
      setTimeout(() => _initializeScheduleChart('day'), 100);
    }
    _syncTabData(tabId);
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

    ScheduleRunner.on('schedule-executed', () => {
      const main = document.getElementById('app-content');
      if (!main) return;
      if (state.activeTab === 'results') {
        // Preservar filtros e página atual no auto-refresh
        const filters = {
          profileId: document.getElementById('filter-profile')?.value || '',
          tipo:      document.getElementById('filter-tipo')?.value   || '',
          status:    document.getElementById('filter-status')?.value || '',
          de:        document.getElementById('filter-de')?.value     || '',
          ate:       document.getElementById('filter-ate')?.value    || '',
          page:      document.getElementById('results-page')?.value  || '1'
        };
        main.innerHTML = _renderResults(filters);
        _attachEventListeners();
      } else if (state.activeTab === 'dashboard') {
        _renderMainContent('dashboard');
        _attachEventListeners();
        setTimeout(_initializeDashboardCharts, 100);
      }
    });

    _navigate(state.activeTab);
  };

  return {
    renderMainApp,
    getCurrentTab: () => state.activeTab
  };
})();
