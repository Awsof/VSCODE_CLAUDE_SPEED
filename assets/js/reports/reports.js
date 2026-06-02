/**
 * ReportsManager — Geração de relatórios de resultados
 */
const ReportsManager = (() => {
  const _getResults = () => ResultsManager.list();

  const _applyDateFilter = (results, filters = {}) => {
    let r = results;
    if (filters.de) {
      const start = new Date(filters.de + 'T00:00:00').getTime();
      r = r.filter(x => new Date(x.executadoEm).getTime() >= start);
    }
    if (filters.ate) {
      const end = new Date(filters.ate + 'T23:59:59').getTime();
      r = r.filter(x => new Date(x.executadoEm).getTime() <= end);
    }
    return r;
  };

  const _parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
      const c = line[i];
      if (c === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else inQuotes = !inQuotes;
      } else if (c === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += c;
      }
    }
    result.push(current);
    return result;
  };

  // Gera ID estável a partir do nome do perfil para agrupar resultados importados
  const _nameToId = (name) => {
    let h = 0;
    for (let i = 0; i < name.length; i++) h = (Math.imul(31, h) + name.charCodeAt(i)) | 0;
    return 'imp-' + Math.abs(h).toString(16).padStart(8, '0');
  };

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

  const getSummary = (filters = {}) => {
    const results = _applyDateFilter(_getResults(), filters);
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

  const getRows = (filters = {}) => {
    const users = typeof UsersManager !== 'undefined' ? UsersManager.list() : [];
    const profiles = typeof ProfilesManager !== 'undefined' ? ProfilesManager.list() : [];
    const getUser = (id) => users.find(u => u.id === id);
    return _applyDateFilter(_getResults(), filters).map(result => {
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
        TipoLabel: result.origem === 'scheduled' ? 'Agendado' : result.origem === 'imported' ? 'Importado' : 'Manual',
        Origem: result.origem,
        ScheduleId: result.scheduleId || 'N/A',
        ExecutadoPor: result.executadoPor,
        ExecutadoEm: new Date(result.executadoEm).toLocaleString('pt-BR')
      };
    });
  };

  const exportExcel = (filters = {}, filename = null) => {
    if (typeof XLSX === 'undefined') throw new Error('XLSX não carregado');
    const rows = getRows(filters);
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');
    const file = filename || `speed-teste-dbsync-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, file);
    return file;
  };

  const exportHTML = (options = {}) => {
    const COLORS = ['#0f9b94','#7c3aed','#f59e0b','#3b82f6','#10b981','#ef4444','#f97316','#8b5cf6'];

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

    // --- Filtro de data ---
    results = _applyDateFilter(results, options);
    if (options.de || options.ate) {
      const parts = [];
      if (options.de)  parts.push(`De: ${options.de}`);
      if (options.ate) parts.push(`Até: ${options.ate}`);
      filterLabel += (filterLabel === 'Todos os resultados' ? '' : ' — ') + parts.join(', ');
    }

    const users = UsersManager.list();
    const profiles = ProfilesManager.list();
    const getUser = id => users.find(u => u.id === id);

    const fmtPeriod = (ms) => {
      if (!ms || !isFinite(ms)) return '—';
      const d = new Date(ms);
      return `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} `
        + `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
    };

    // --- Stats globais ---
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((s, r) => s + (r.duration || 0), 0) / total)
      : 0;

    // --- Por Teste (com período e min/max duração) ---
    const byTestMap = {};
    results.forEach(r => {
      const key = r.profileId || '__unknown__';
      const ts = new Date(r.executadoEm).getTime();
      const dur = r.duration || 0;
      if (!byTestMap[key]) {
        byTestMap[key] = {
          profileId: key,
          name: _getProfileName(key, profiles),
          total: 0, success: 0, failed: 0, durations: [],
          minTime: ts, maxTime: ts,
          minDuration: dur, maxDuration: dur
        };
      }
      const b = byTestMap[key];
      b.total++;
      b.success += r.success ? 1 : 0;
      b.failed += r.success ? 0 : 1;
      b.durations.push(dur);
      if (ts < b.minTime) b.minTime = ts;
      if (ts > b.maxTime) b.maxTime = ts;
      if (dur < b.minDuration) b.minDuration = dur;
      if (dur > b.maxDuration) b.maxDuration = dur;
    });

    const testStats = Object.values(byTestMap).map(t => ({
      profileId: t.profileId,
      name: t.name,
      total: t.total,
      success: t.success,
      failed: t.failed,
      successRate: t.total > 0 ? Math.round((t.success / t.total) * 100) : 0,
      avgDuration: t.durations.length > 0
        ? Math.round(t.durations.reduce((s, v) => s + v, 0) / t.durations.length)
        : 0,
      minDuration: isFinite(t.minDuration) ? t.minDuration : 0,
      maxDuration: isFinite(t.maxDuration) ? t.maxDuration : 0,
      inicio: fmtPeriod(t.minTime),
      fim: fmtPeriod(t.maxTime)
    }));

    // Período global do grupo
    const allMinTimes = Object.values(byTestMap).map(t => t.minTime).filter(v => isFinite(v));
    const allMaxTimes = Object.values(byTestMap).map(t => t.maxTime).filter(v => isFinite(v));
    const groupStart = allMinTimes.length > 0 ? fmtPeriod(Math.min.apply(null, allMinTimes)) : '—';
    const groupEnd   = allMaxTimes.length > 0 ? fmtPeriod(Math.max.apply(null, allMaxTimes)) : '—';

    // --- Chart A: uma linha por teste, ordenada por tempo ---
    const chartAPerTest = testStats.map((t, i) => {
      const testResults = results
        .filter(r => r.profileId === t.profileId)
        .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm));
      return {
        name: t.name,
        color: COLORS[i % COLORS.length],
        data: testResults.map(r => {
          const d = new Date(r.executadoEm);
          const lbl = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')} `
            + `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}:${d.getSeconds().toString().padStart(2,'0')}`;
          return { d: r.duration || 0, t: lbl, full: new Date(r.executadoEm).toLocaleString('pt-BR') };
        })
      };
    });

    // --- Chart B: histograma agrupado por teste ---
    const buckets = [
      { label: '0–500ms', min: 0,    max: 500 },
      { label: '500–1s',  min: 500,  max: 1000 },
      { label: '1–2s',    min: 1000, max: 2000 },
      { label: '2–3s',    min: 2000, max: 3000 },
      { label: '3–5s',    min: 3000, max: 5000 },
      { label: '>5s',     min: 5000, max: Infinity }
    ];
    const chartBData = {
      labels: buckets.map(b => b.label),
      datasets: testStats.map((t, i) => {
        const testResults = results.filter(r => r.profileId === t.profileId);
        return {
          label: t.name,
          color: COLORS[i % COLORS.length],
          counts: buckets.map(b =>
            testResults.filter(r => (r.duration || 0) >= b.min && (r.duration || 0) < b.max).length
          )
        };
      })
    };

    // --- Chart D: Mín / Méd / Máx por teste ---
    const chartDData = {
      labels: testStats.map(t => t.name),
      datasets: [
        { label: 'Mín', data: testStats.map(t => t.minDuration), color: '#93c5fd' },
        { label: 'Méd', data: testStats.map(t => t.avgDuration), color: '#0f9b94' },
        { label: 'Máx', data: testStats.map(t => t.maxDuration), color: '#fca5a5' }
      ]
    };

    // --- HTML: seção "Por Teste" colapsável ---
    const porTesteRows = testStats.map((t, idx) => {
      const bg = idx % 2 === 0 ? '#f8f9fa' : '#ffffff';
      const rateColor = t.successRate >= 99 ? '#0f9b94' : t.successRate >= 80 ? '#f59e0b' : '#dc2626';
      return `<tr style="background:${bg}">
        <td>${_esc(t.name)}</td>
        <td>${t.total}</td>
        <td style="color:#0f9b94;font-weight:600">${t.success}</td>
        <td style="color:${t.failed > 0 ? '#dc2626' : 'inherit'}">${t.failed}</td>
        <td style="color:${rateColor};font-weight:700">${t.successRate}%</td>
        <td>${t.avgDuration} ms</td>
        <td style="font-size:11px;color:#475569;white-space:nowrap">${t.inicio}</td>
        <td style="font-size:11px;color:#475569;white-space:nowrap">${t.fim}</td>
      </tr>`;
    }).join('');

    const porTesteSection = `
    <details class="por-teste-box" open>
      <summary class="por-teste-summary">Por Teste &nbsp;&middot;&nbsp; ${testStats.length} teste${testStats.length !== 1 ? 's' : ''} &nbsp;&middot;&nbsp; Per&iacute;odo: ${groupStart} &ndash; ${groupEnd}</summary>
      <div>
        <table>
          <thead><tr>
            <th>Teste</th><th>Total</th><th>Sucesso</th><th>Falhas</th><th>Taxa</th><th>Avg ms</th><th>In&iacute;cio</th><th>Fim</th>
          </tr></thead>
          <tbody>${porTesteRows || '<tr><td colspan="8" style="text-align:center;padding:16px;color:#94a3b8">Nenhum resultado</td></tr>'}</tbody>
        </table>
      </div>
    </details>`;

    // --- HTML: Resultados Detalhados colapsáveis por teste ---
    const detailSections = testStats.map((t, idx) => {
      const testResults = results
        .filter(r => r.profileId === t.profileId)
        .sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));

      const rows = testResults.map((r, ri) => {
        const u = getUser(r.executadoPor);
        const userName = u ? (u.nome || u.usuario) : '—';
        const dt = new Date(r.executadoEm).toLocaleString('pt-BR');
        const statusCell = r.success
          ? '<span style="color:#0f9b94;font-weight:700">OK</span>'
          : '<span style="color:#dc2626;font-weight:700">ERRO</span>';
        const bg = ri % 2 === 0 ? '#f8f9fa' : '#ffffff';
        return `<tr style="background:${bg}">
          <td>${r.seq || ri + 1}</td>
          <td>${statusCell}</td>
          <td>${r.statusCode || 'N/A'}</td>
          <td>${r.duration || 0} ms</td>
          <td style="font-size:11px;color:#475569">${_esc(r.numAtendimentoDB || '—')}</td>
          <td style="font-size:11px">${_esc(userName)}</td>
          <td style="font-size:11px;white-space:nowrap">${dt}</td>
        </tr>`;
      }).join('');

      const periodStr = t.inicio !== '—' ? ` &middot; ${t.inicio} &ndash; ${t.fim}` : '';
      const isOpen = idx === 0 ? ' open' : '';
      return `<details class="test-detail-group"${isOpen}>
        <summary>${_esc(t.name)} &mdash; ${t.total} resultado${t.total !== 1 ? 's' : ''}${periodStr}</summary>
        <table>
          <thead><tr>
            <th>#</th><th>Status</th><th>C&oacute;d.</th><th>Dura&ccedil;&atilde;o</th>
            <th>Num. Atend.</th><th>Usu&aacute;rio</th><th>Data/Hora</th>
          </tr></thead>
          <tbody>${rows || '<tr><td colspan="7" style="text-align:center;padding:16px;color:#94a3b8">Nenhum resultado</td></tr>'}</tbody>
        </table>
      </details>`;
    }).join('');

    const chartsSection = total > 0 ? `
    <div class="charts-grid">
      <div class="chart-box">
        <div class="chart-title">A &mdash; Tempo de resposta por requisi&ccedil;&atilde;o (ms)</div>
        <canvas id="chartA" height="180"></canvas>
      </div>
      <div class="chart-box">
        <div class="chart-title">B &mdash; Distribui&ccedil;&atilde;o de tempo de resposta</div>
        <canvas id="chartB" height="180"></canvas>
      </div>
    </div>
    <div class="charts-grid">
      <div class="chart-box">
        <div class="chart-title">C &mdash; Tempo m&eacute;dio por teste (ms)</div>
        <canvas id="chartC" height="180"></canvas>
      </div>
      <div class="chart-box">
        <div class="chart-title">D &mdash; M&iacute;n / M&eacute;d / M&aacute;x por teste (ms)</div>
        <canvas id="chartD" height="180"></canvas>
      </div>
    </div>` : '';

    const noDataMsg = '<div style="text-align:center;padding:40px;color:#94a3b8;font-size:14px">Nenhum resultado encontrado para o filtro selecionado.</div>';

    const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Relat&oacute;rio Speed Teste DBSync</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{font-family:'Segoe UI',Arial,sans-serif;background:#f8f9fa;color:#0f172a;font-size:13px;line-height:1.5}
.header{background:#003761;color:#fff;padding:24px 32px 20px}
.header h1{font-size:20px;font-weight:800;margin-bottom:4px}
.header .meta{font-size:11px;opacity:.75;margin-top:4px}
.content{padding:24px 32px;max-width:1200px;margin:0 auto}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:20px}
.kpi{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:14px 18px}
.kpi-label{font-size:10px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;font-weight:600}
.kpi-value{font-size:24px;font-weight:800;color:#003761;margin-top:2px}
.kpi-value.ok{color:#0f9b94}.kpi-value.err{color:#dc2626}
details.por-teste-box{background:#fff;border:1px solid #e2e8f0;border-radius:8px;margin-bottom:20px;overflow:hidden}
details.por-teste-box>summary{padding:11px 16px;cursor:pointer;font-size:13px;font-weight:700;color:#003761;background:#f8f9fa;border-bottom:1px solid #e2e8f0;list-style:none;user-select:none}
details.por-teste-box>summary::marker,details.por-teste-box>summary::-webkit-details-marker{display:none}
details.por-teste-box>summary::before{content:'▶';font-size:9px;margin-right:8px;display:inline-block;transition:transform .18s}
details.por-teste-box[open]>summary::before{transform:rotate(90deg)}
details.por-teste-box>div>table{border-radius:0;border:none;border-top:1px solid #f1f5f9;margin-bottom:0}
.charts-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px}
.chart-box{background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:16px}
.chart-title{font-size:11px;color:#475569;font-weight:700;text-transform:uppercase;letter-spacing:.05em;margin-bottom:12px}
.section-title{font-size:14px;font-weight:700;color:#003761;margin:20px 0 10px;border-left:3px solid #0f9b94;padding-left:10px}
table{width:100%;border-collapse:collapse;background:#fff;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0;font-size:12px;margin-bottom:0}
thead tr{background:#003761;color:#fff}
th{padding:9px 12px;text-align:left;font-size:10px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;white-space:nowrap}
td{padding:8px 12px;border-bottom:1px solid #f1f5f9;vertical-align:middle}
details.test-detail-group{margin-bottom:10px;border:1px solid #e2e8f0;border-radius:8px;overflow:hidden}
details.test-detail-group>summary{padding:10px 14px;cursor:pointer;font-size:12px;font-weight:700;color:#003761;background:#f8f9fa;list-style:none;user-select:none}
details.test-detail-group>summary::marker,details.test-detail-group>summary::-webkit-details-marker{display:none}
details.test-detail-group>summary::before{content:'▶';font-size:9px;margin-right:8px;display:inline-block;transition:transform .18s}
details.test-detail-group[open]>summary::before{transform:rotate(90deg)}
details.test-detail-group[open]>summary{border-bottom:1px solid #e2e8f0}
details.test-detail-group table{border-radius:0;border:none}
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
  details{display:block!important}
  details>summary{display:none!important}
  details.test-detail-group{margin-bottom:16px}
}
</style>
</head>
<body>
<button class="print-btn" onclick="window.print()">Imprimir / Salvar PDF</button>
<button class="print-btn" style="top:56px" onclick="downloadReport()">&#128190; Salvar como HTML</button>
<div class="header">
  <h1>Relat&oacute;rio Speed Teste DBSync</h1>
  <div class="meta">Gerado em: ${new Date().toLocaleString('pt-BR')}&nbsp;&nbsp;|&nbsp;&nbsp;Filtro: ${filterLabel}</div>
</div>
<div class="content">
  <div class="kpi-row">
    <div class="kpi"><div class="kpi-label">Execu&ccedil;&otilde;es</div><div class="kpi-value">${total}</div></div>
    <div class="kpi"><div class="kpi-label">Sucesso</div><div class="kpi-value ok">${successful}</div></div>
    <div class="kpi"><div class="kpi-label">Falhas</div><div class="kpi-value ${failed > 0 ? 'err' : ''}">${failed}</div></div>
    <div class="kpi"><div class="kpi-label">Dura&ccedil;&atilde;o M&eacute;dia</div><div class="kpi-value">${avgDuration} ms</div></div>
  </div>
  ${total > 0 ? porTesteSection : noDataMsg}
  ${chartsSection}
  <div class="section-title page-break">Resultados Detalhados</div>
  ${total > 0 ? detailSections : noDataMsg}
</div>
<script src="https://cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.0/chart.umd.min.js"><\/script>
<script>
(function(){
  var A=${JSON.stringify(chartAPerTest)};
  var B=${JSON.stringify(chartBData)};
  var T=${JSON.stringify(testStats)};
  var D=${JSON.stringify(chartDData)};

  function mkChart(id,cfg){var el=document.getElementById(id);if(el&&window.Chart)new Chart(el,cfg);}

  // Chart A — uma linha por teste
  (function(){
    var maxLen=A.reduce(function(m,t){return Math.max(m,t.data.length);},0);
    if(!maxLen)return;
    var labels=Array.from({length:maxLen},function(_,i){return String(i+1);});
    mkChart('chartA',{type:'line',data:{
      labels:labels,
      datasets:A.map(function(t){
        var pts=t.data.map(function(p){return p.d;});
        while(pts.length<maxLen)pts.push(null);
        return{label:t.name,data:pts,
          borderColor:t.color,backgroundColor:t.color+'18',
          tension:0.25,fill:false,spanGaps:false,
          pointRadius:t.data.length<=60?2:0,pointHoverRadius:4,borderWidth:1.5};
      })},
      options:{responsive:true,
        plugins:{
          legend:{display:A.length>1,position:'top',labels:{boxWidth:12,font:{size:10}}},
          tooltip:{callbacks:{
            title:function(items){
              var ds=A[items[0].datasetIndex];
              if(!ds||!ds.data[items[0].dataIndex])return'';
              return ds.name+' — '+ds.data[items[0].dataIndex].full;},
            label:function(item){
              return item.raw!==null?item.raw+' ms':'—';}}}},
        scales:{
          x:{ticks:{maxTicksLimit:10,font:{size:9}},grid:{color:'#f1f5f9'}},
          y:{ticks:{font:{size:9},callback:function(v){return v+'ms';}},
             grid:{color:'#f1f5f9'},beginAtZero:true}}}});
  })();

  // Chart B — histograma agrupado por teste
  mkChart('chartB',{type:'bar',data:{
    labels:B.labels,
    datasets:B.datasets.map(function(d){
      return{label:d.label,data:d.counts,backgroundColor:d.color,borderRadius:3};})},
    options:{responsive:true,
      plugins:{
        legend:{display:B.datasets.length>1,position:'top',labels:{boxWidth:12,font:{size:10}}},
        tooltip:{callbacks:{label:function(i){return i.dataset.label+': '+i.raw+' execuções';}}}},
      scales:{x:{ticks:{font:{size:9}},grid:{display:false}},
        y:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'},beginAtZero:true}}}});

  // Chart C — tempo médio por teste
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

  // Chart D — Mín / Méd / Máx por teste
  var axisD=D.labels.length>4?'y':'x';
  mkChart('chartD',{type:'bar',data:{
    labels:D.labels,
    datasets:D.datasets.map(function(ds){
      return{label:ds.label,data:ds.data,backgroundColor:ds.color,borderRadius:3};})},
    options:{responsive:true,indexAxis:axisD,
      plugins:{
        legend:{display:true,position:'top',labels:{boxWidth:12,font:{size:10}}},
        tooltip:{callbacks:{label:function(i){return i.dataset.label+': '+i.raw+' ms';}}}},
      scales:{x:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'},beginAtZero:true},
        y:{ticks:{font:{size:9}},grid:{color:'#f1f5f9'}}}}});
})();
function downloadReport(){
  if(window.opener&&window.opener._downloadReportHTML){
    window.opener._downloadReportHTML();
  }else{
    var h='<!DOCTYPE html>\\n'+document.documentElement.outerHTML;
    var b=new Blob([h],{type:'text/html;charset=utf-8'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(b);
    a.download='relatorio-stp-'+new Date().toISOString().slice(0,10)+'.html';
    document.body.appendChild(a);a.click();
    setTimeout(function(){document.body.removeChild(a);URL.revokeObjectURL(a.href);},1000);
  }
}
<\/script>
</body>
</html>`;

    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const win = window.open(url, '_blank');
    setTimeout(() => URL.revokeObjectURL(url), 120000);
    window._downloadReportHTML = () => {
      const b2 = new Blob([html], { type: 'text/html;charset=utf-8' });
      const u2 = URL.createObjectURL(b2);
      const a2 = document.createElement('a');
      a2.href = u2;
      a2.download = `relatorio-stp-${new Date().toISOString().slice(0, 10)}.html`;
      document.body.appendChild(a2);
      a2.click();
      setTimeout(() => { document.body.removeChild(a2); URL.revokeObjectURL(u2); }, 2000);
    };
    if (!win) {
      NotificationsManager.warning('Pop-up bloqueado. Permita pop-ups para este site e tente novamente.');
    }
    return 'relatório HTML aberto';
  };

  const exportCSV = (filters = {}, filename = null) => {
    const rows = getRows(filters);
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

  const importCSV = (csvText) => {
    const lines = csvText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim().split('\n');
    if (lines.length < 2) return { imported: 0, errors: 0 };

    const headers = _parseCSVLine(lines[0]);
    let imported = 0;
    let errors = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      try {
        const values = _parseCSVLine(line);
        const row = {};
        headers.forEach((h, idx) => { row[h.trim()] = (values[idx] || '').trim(); });

        const profileName = row['Teste'] || row['Endpoint'] || 'Importado';

        // Converter data pt-BR "DD/MM/YYYY, HH:mm:ss" ou "DD/MM/YYYY HH:mm:ss" → ISO
        let executadoEm = new Date().toISOString();
        const rawDate = row['ExecutadoEm'] || '';
        const m = rawDate.match(/(\d{2})\/(\d{2})\/(\d{4})[,\s]+(\d{2}):(\d{2}):(\d{2})/);
        if (m) {
          const parsed = new Date(+m[3], +m[2] - 1, +m[1], +m[4], +m[5], +m[6]);
          if (!isNaN(parsed.getTime())) executadoEm = parsed.toISOString();
        }

        const duration = parseInt(row['DuracaoMs'], 10);
        const statusCode = row['StatusCode'] && row['StatusCode'] !== 'N/A' ? parseInt(row['StatusCode'], 10) || null : null;
        const numAtend = row['NumAtendimentoDB'] && row['NumAtendimentoDB'] !== 'N/A' ? row['NumAtendimentoDB'] : null;
        const scheduleId = row['ScheduleId'] && row['ScheduleId'] !== 'N/A' ? row['ScheduleId'] : null;

        const result = ResultsManager.add({
          profileId: _nameToId(profileName),
          endpoint: profileName,
          version: 'v3',
          duration: isNaN(duration) ? 0 : duration,
          statusCode,
          success: row['Status'] === 'OK',
          numAtendimentoDB: numAtend,
          requestPayload: null,
          responseBody: null,
          errorDetail: null,
          origem: 'imported',
          scheduleId,
          executadoPor: 'imported',
          executadoEm,
          cenarioId: null
        });

        if (result) imported++; else errors++;
      } catch (_) {
        errors++;
      }
    }

    return { imported, errors };
  };

  return {
    getSummary,
    getRows,
    exportExcel,
    exportHTML,
    exportCSV,
    importCSV
  };
})();
