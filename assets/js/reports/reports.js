/**
 * ReportsManager — Geração de relatórios de resultados
 */
const ReportsManager = (() => {
  const _getResults = () => ResultsManager.list();

  const _esc = (s) =>
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const _getProfileName = (profileId, profiles) => {
    const p = profiles.find(p => p.id === profileId);
    return p ? p.nome : (profileId || '—');
  };

  const getSummary = () => {
    const results = _getResults();
    const profiles = typeof ProfilesManager !== 'undefined' ? ProfilesManager.list() : [];
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;

    const byTestMap = results.reduce((acc, r) => {
      const key = r.profileId || '__unknown__';
      if (!acc[key]) {
        acc[key] = {
          name: _getProfileName(key, profiles),
          total: 0, success: 0, failed: 0, durations: []
        };
      }
      acc[key].total += 1;
      acc[key].success += r.success ? 1 : 0;
      acc[key].failed += r.success ? 0 : 1;
      acc[key].durations.push(r.duration || 0);
      return acc;
    }, {});

    const byTest = Object.values(byTestMap).map(data => {
      const avg = data.durations.length > 0
        ? Math.round(data.durations.reduce((sum, v) => sum + v, 0) / data.durations.length)
        : 0;
      return {
        name: data.name,
        total: data.total,
        success: data.success,
        failed: data.failed,
        successRate: data.total > 0 ? `${Math.round((data.success / data.total) * 100)}%` : '0%',
        avgDuration: avg
      };
    });

    const byStatus = results.reduce((acc, result) => {
      const status = result.statusCode || 'unknown';
      acc[status] = (acc[status] || 0) + 1;
      return acc;
    }, {});

    return {
      total,
      successful,
      failed,
      successRate: total > 0 ? `${Math.round((successful / total) * 100)}%` : 'N/A',
      avgDuration,
      byTest,
      byStatus
    };
  };

  const getRows = () => {
    const users = typeof UsersManager !== 'undefined' ? UsersManager.list() : [];
    const profiles = typeof ProfilesManager !== 'undefined' ? ProfilesManager.list() : [];
    const getUser = (id) => users.find(u => u.id === id);
    return _getResults().map(result => {
      const u = getUser(result.executadoPor);
      return {
        Seq: result.seq,
        Teste: _getProfileName(result.profileId, profiles),
        Endpoint: result.endpoint,
        Status: result.success ? 'OK' : 'ERRO',
        StatusCode: result.statusCode || 'N/A',
        DuracaoMs: result.duration,
        NumAtendimentoDB: result.numAtendimentoDB || 'N/A',
        UsuarioNome: u ? (u.nome || u.usuario) : (result.executadoPor || '—'),
        TipoLabel: result.origem === 'scheduled' ? 'Agendado' : 'Manual',
        Origem: result.origem,
        ScheduleId: result.scheduleId || 'N/A',
        ExecutadoPor: result.executadoPor,
        ExecutadoEm: new Date(result.executadoEm).toLocaleString('pt-BR')
      };
    });
  };

  const exportExcel = (filename = null) => {
    if (typeof XLSX === 'undefined') throw new Error('XLSX não carregado');
    const rows = getRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
    const file = filename || `speed-teste-dbsync-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, file);
    return file;
  };

  const exportHTML = (options = {}) => {
    // --- Filtrar resultados ---
    let results = _getResults();
    let filterLabel = 'Todos os resultados';

    if (options.type === 'profile' && options.profileId) {
      results = results.filter(r => r.profileId === options.profileId);
      const p = ProfilesManager.getById(options.profileId);
      filterLabel = `Teste: ${p ? p.nome : options.profileId}`;
    } else if (options.type === 'group' && options.groupId) {
      const groupProfiles = ProfilesManager.list().filter(p => p.groupId === options.groupId);
      const ids = new Set(groupProfiles.map(p => p.id));
      results = results.filter(r => ids.has(r.profileId));
      const g = GroupsManager.getById(options.groupId);
      filterLabel = `Grupo: ${g ? g.nome : options.groupId}`;
    }

    const users = UsersManager.list();
    const profiles = ProfilesManager.list();
    const getUser = id => users.find(u => u.id === id);

    // --- Stats globais ---
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((s, r) => s + (r.duration || 0), 0) / total)
      : 0;

    // --- Por Teste ---
    const byTestMap = {};
    results.forEach(r => {
      const key = r.profileId || '__unknown__';
      if (!byTestMap[key]) {
        byTestMap[key] = {
          name: _getProfileName(key, profiles),
          total: 0, success: 0, failed: 0, durations: []
        };
      }
      byTestMap[key].total++;
      byTestMap[key].success += r.success ? 1 : 0;
      byTestMap[key].failed += r.success ? 0 : 1;
      byTestMap[key].durations.push(r.duration || 0);
    });
    const testStats = Object.values(byTestMap).map(t => ({
      name: t.name,
      total: t.total,
      success: t.success,
      failed: t.failed,
      successRate: t.total > 0 ? Math.round((t.success / t.total) * 100) : 0,
      avgDuration: t.durations.length > 0
        ? Math.round(t.durations.reduce((s, v) => s + v, 0) / t.durations.length)
        : 0
    }));

    // --- Dados Chart A (linha, até 200, ordenados por tempo) ---
    const chartAData = [...results]
      .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm))
      .slice(-200)
      .map(r => {
        const d = new Date(r.executadoEm);
        const label = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} `
          + `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
        return { d: r.duration || 0, t: label, full: new Date(r.executadoEm).toLocaleString('pt-BR'), ok: r.success };
      });

    // --- Dados Chart B (histograma) ---
    const buckets = [
      { label: '0–500ms', min: 0,    max: 500 },
      { label: '500–1s',  min: 500,  max: 1000 },
      { label: '1–2s',    min: 1000, max: 2000 },
      { label: '2–3s',    min: 2000, max: 3000 },
      { label: '3–5s',    min: 3000, max: 5000 },
      { label: '>5s',     min: 5000, max: Infinity }
    ];
    const chartBData = buckets.map(b => ({
      label: b.label,
      count: results.filter(r => (r.duration || 0) >= b.min && (r.duration || 0) < b.max).length
    }));

    // --- Linhas da tabela detalhada ---
    const sorted = [...results].sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
    const detailRowsHtml = sorted.map((r, idx) => {
      const u = getUser(r.executadoPor);
      const userName = u ? (u.nome || u.usuario) : '—';
      const testName = _getProfileName(r.profileId, profiles);
      const dt = new Date(r.executadoEm).toLocaleString('pt-BR');
      const statusCell = r.success
        ? '<span style="color:#0f9b94;font-weight:700">OK</span>'
        : '<span style="color:#dc2626;font-weight:700">ERRO</span>';
      const bg = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
      return `<tr style="background:${bg}">
        <td>${r.seq || idx + 1}</td>
        <td>${_esc(testName)}</td>
        <td>${statusCell}</td>
        <td>${r.statusCode || 'N/A'}</td>
        <td>${r.duration || 0} ms</td>
        <td style="font-size:11px;color:#475569">${_esc(r.numAtendimentoDB || '—')}</td>
        <td style="font-size:11px">${_esc(userName)}</td>
        <td style="font-size:11px;white-space:nowrap">${dt}</td>
      </tr>`;
    }).join('');

    // --- Linhas da tabela Por Teste ---
    const testTableRowsHtml = testStats.map((t, idx) => {
      const bg = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
      const rateColor = t.successRate >= 99 ? '#0f9b94' : t.successRate >= 80 ? '#f59e0b' : '#dc2626';
      return `<tr style="background:${bg}">
        <td>${_esc(t.name)}</td>
        <td>${t.total}</td>
        <td style="color:#0f9b94;font-weight:600">${t.success}</td>
        <td style="color:${t.failed > 0 ? '#dc2626' : 'inherit'};font-weight:${t.failed > 0 ? 600 : 400}">${t.failed}</td>
        <td style="color:${rateColor};font-weight:700">${t.successRate}%</td>
        <td>${t.avgDuration} ms</td>
      </tr>`;
    }).join('');

    const noDataMsg = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px">Nenhum resultado encontrado para o filtro selecionado.</div>';

    const chartsSection = total > 0 ? `
    <div class="charts-grid">
      <div class="chart-box">
        <div class="chart-title">A &mdash; Tempo de resposta por requisição (ms)</div>
        <canvas id="chartA" height="180"></canvas>
      </div>
      <div class="chart-box">
        <div class="chart-title">B &mdash; Distribuição de tempo de resposta</div>
        <canvas id="chartB" height="180"></canvas>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-box">
        <div class="chart-title">C &mdash; Tempo médio por teste (ms)</div>
        <canvas id="chartC" height="180"></canvas>
      </div>
      <div class="chart-box">
        <div class="chart-title">D &mdash; Taxa de sucesso por teste (%)</div>
        <canvas id="chartD" height="180"></canvas>
      </div>
    </div>` : '';

    const testTableSection = total > 0 ? `
    <table>
      <thead><tr>
        <th>Teste</th><th>Total</th><th>Sucesso</th><th>Falhas</th><th>Taxa</th><th>Avg ms</th>
      </tr></thead>
      <tbody>${testTableRowsHtml}</tbody>
    </table>` : noDataMsg;

    const detailSection = total > 0 ? `
    <table>
      <thead><tr>
        <th>#</th><th>Teste</th><th>Status</th><th>Cód.</th>
        <th>Duração</th><th>Num. Atend.</th><th>Usuário</th><th>Data/Hora</th>
      </tr></thead>
      <tbody>${detailRowsHtml}</tbody>
    </table>` : noDataMsg;

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relatório Speed Teste DBSync</title>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;color:#0f172a;font-size:13px;line-height:1.5}
.header{background:#003761;color:#fff;padding:24px 32px 20px}
.header h1{font-size:20px;font-weight:800;margin-bottom:4px}
.header .meta{font-size:11px;opacity:.75;margin-top:4px}
.content{padding:24px 32px;max-width:1200px;margin:0 auto}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:24px}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px}
.kpi-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.kpi-value{font-size:24px;font-weight:800;color:#003761;margin-top:2px}
.kpi-value.ok{color:#0f9b94}.kpi-value.err{color:#dc2626}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:24px}
.chart-box{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
.chart-title{font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
.section-title{font-size:14px;font-weight:700;color:#003761;margin:24px 0 10px;border-left:3px solid #0f9b94;padding-left:10px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;font-size:12px;margin-bottom:24px}
thead tr{background:#003761;color:#fff}
th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
.print-btn{position:fixed;top:16px;right:16px;background:#0f9b94;color:#fff;border:none;padding:10px 20px;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;box-shadow:0 2px 8px rgba(0,0,0,.2);z-index:100}
.print-btn:hover{background:#0d8880}
@media print{
  body{background:#fff;font-size:11px}
  .print-btn{display:none}
  .charts-grid{break-inside:avoid}
  .kpi-row{break-inside:avoid}
  .section-title{break-after:avoid}
  .page-break{break-before:page}
  table{font-size:10px}
  th,td{padding:5px 8px}
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
<div class="header">
  <h1>Relatório Speed Teste DBSync</h1>
  <div class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}&nbsp;&nbsp;|&nbsp;&nbsp;Filtro: ${filterLabel}</div>
</div>
<div class="content">
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Execuções</div><div class="kpi-value">${total}</div></div>
    <div class="kpi"><div class="kpi-label">Sucesso</div><div class="kpi-value ok">${successful}</div></div>
    <div class="kpi"><div class="kpi-label">Falhas</div><div class="kpi-value ${failed > 0 ? 'err' : ''}">${failed}</div></div>
    <div class="kpi"><div class="kpi-label">Duração Média</div><div class="kpi-value">${avgDuration} ms</div></div>
  </div>
  ${chartsSection}
  <div class="section-title">Por Teste</div>
  ${testTableSection}
  <div class="section-title page-break">Resultados Detalhados</div>
  ${detailSection}
</div>
<script>
(function(){
  const A=${JSON.stringify(chartAData)};
  const B=${JSON.stringify(chartBData)};
  const T=${JSON.stringify(testStats)};

  function mkChart(id,cfg){var el=document.getElementById(id);if(el)new Chart(el,cfg);}

  // Chart A — linha com data/hora no eixo X
  mkChart('chartA',{type:'line',data:{
    labels:A.map(function(r){return r.t;}),
    datasets:[{data:A.map(function(r){return r.d;}),
      borderColor:'#0f9b94',backgroundColor:'rgba(15,155,148,0.07)',
      tension:0.25,pointRadius:A.length<=80?3:0,pointHoverRadius:5,
      borderWidth:1.5,fill:true}]},
    options:{responsive:true,plugins:{legend:{display:false},
      tooltip:{callbacks:{
        title:function(items){return A[items[0].dataIndex]?A[items[0].dataIndex].full:'';},
        label:function(item){return item.raw+' ms';}}}},
      scales:{
        x:{ticks:{maxTicksLimit:8,maxRotation:35,font:{size:9}},grid:{color:'#f1f5f9'}},
        y:{ticks:{font:{size:9},callback:function(v){return v+'ms';}},
           grid:{color:'#f1f5f9'},beginAtZero:true}}}});

  // Chart B — histograma de distribuição
  mkChart('chartB',{type:'bar',data:{
    labels:B.map(function(b){return b.label;}),
    datasets:[{data:B.map(function(b){return b.count;}),
      backgroundColor:'#c49b3c',borderRadius:4}]},
    options:{responsive:true,plugins:{legend:{display:false},
      tooltip:{callbacks:{label:function(i){return i.raw+' execuções';}}}},
      scales:{x:{ticks:{font:{size:9}},grid:{display:false}},
        y:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'},beginAtZero:true}}}});

  // Chart C — tempo médio por teste (barras horizontais se >4 testes)
  var axisC=T.length>4?'y':'x';
  mkChart('chartC',{type:'bar',data:{
    labels:T.map(function(t){return t.name;}),
    datasets:[{data:T.map(function(t){return t.avgDuration;}),
      backgroundColor:'#0f9b94',borderRadius:4}]},
    options:{responsive:true,indexAxis:axisC,
      plugins:{legend:{display:false},
        tooltip:{callbacks:{label:function(i){return i.raw+' ms';}}}},
      scales:{x:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'},beginAtZero:true},
        y:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'}}}}});

  // Chart D — taxa de sucesso por teste (barras, verde/amarelo/vermelho)
  var axisD=T.length>4?'y':'x';
  mkChart('chartD',{type:'bar',data:{
    labels:T.map(function(t){return t.name;}),
    datasets:[{data:T.map(function(t){return t.successRate;}),
      backgroundColor:T.map(function(t){
        return t.successRate>=99?'#0f9b94':t.successRate>=80?'#f59e0b':'#dc2626';}),
      borderRadius:4}]},
    options:{responsive:true,indexAxis:axisD,
      plugins:{legend:{display:false},
        tooltip:{callbacks:{label:function(i){return i.raw+'%';}}}},
      scales:{
        x:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'},beginAtZero:true,max:100},
        y:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'}}}}});
})();
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    if (!win) {
      NotificationsManager.warning('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
    }
    return 'relatório HTML aberto';
  };

  const exportCSV = (filename = null) => {
    const rows = getRows();
    if (rows.length === 0) return null;

    const header = Object.keys(rows[0]);
    const csvRows = [header.join(',')];
    rows.forEach(row => {
      const values = header.map(key => {
        const escaped = String(row[key] || '').replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    });

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.href = url;
    const file = filename || `speed-teste-dbsync-relatorio-${new Date().toISOString().slice(0, 10)}.csv`;
    link.download = file;
    link.click();
    URL.revokeObjectURL(url);
    return file;
  };

  return {
    getSummary,
    getRows,
    exportExcel,
    exportHTML,
    exportCSV
  };
})();
