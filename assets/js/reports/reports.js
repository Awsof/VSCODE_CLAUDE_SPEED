/**
 * ReportsManager — Geração de relatórios de resultados
 */
const ReportsManager = (() => {
  const _getResults = () => ResultsManager.list();

  const getSummary = () => {
    const results = _getResults();
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((sum, r) => sum + (r.duration || 0), 0) / total)
      : 0;

    const byEndpoint = results.reduce((acc, result) => {
      if (!acc[result.endpoint]) {
        acc[result.endpoint] = { total: 0, success: 0, failed: 0, avgDuration: 0, durations: [] };
      }
      const bucket = acc[result.endpoint];
      bucket.total += 1;
      bucket.success += result.success ? 1 : 0;
      bucket.failed += result.success ? 0 : 1;
      bucket.durations.push(result.duration || 0);
      return acc;
    }, {});

    const endpoints = Object.entries(byEndpoint).map(([endpoint, data]) => {
      const avg = data.durations.length > 0
        ? Math.round(data.durations.reduce((sum, v) => sum + v, 0) / data.durations.length)
        : 0;
      return {
        endpoint,
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
      byEndpoint: endpoints,
      byStatus
    };
  };

  const getRows = () => {
    const users = typeof UsersManager !== 'undefined' ? UsersManager.list() : [];
    const getUser = (id) => users.find(u => u.id === id);
    return _getResults().map(result => {
      const u = getUser(result.executadoPor);
      return {
        Seq: result.seq,
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
    if (typeof XLSX === 'undefined') {
      throw new Error('XLSX não carregado');
    }

    const rows = getRows();
    const worksheet = XLSX.utils.json_to_sheet(rows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Resultados');

    const file = filename || `speed-teste-dbsync-relatorio-${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(workbook, file);
    return file;
  };

  const exportPDF = (filename = null) => {
    const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFConstructor) {
      throw new Error('jsPDF não carregado');
    }

    const stats = getSummary();
    const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const margin = 40;
    let y = 50;

    doc.setFontSize(20);
    doc.text('Relatório Speed Teste DBSync', margin, y);
    y += 30;

    doc.setFontSize(12);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y);
    y += 24;

    doc.setFontSize(14);
    doc.text('Resumo Geral', margin, y);
    y += 20;

    const summaryLines = [
      `Total de execuções: ${stats.total}`,
      `Sucesso: ${stats.successful}`,
      `Falhas: ${stats.failed}`,
      `Taxa de sucesso: ${stats.successRate}`,
      `Duração média: ${stats.avgDuration} ms`
    ];

    summaryLines.forEach(line => {
      doc.setFontSize(11);
      doc.text(line, margin, y);
      y += 16;
    });

    y += 10;
    doc.setFontSize(14);
    doc.text('Distribuição por Endpoint', margin, y);
    y += 18;

    const headers = ['Endpoint', 'Total', 'Sucesso', 'Falhas', 'Taxa', 'Avg ms'];
    doc.setFontSize(10);
    doc.text(headers.join('  '), margin, y);
    y += 16;

    stats.byEndpoint.forEach(item => {
      if (y > 520) {
        doc.addPage();
        y = 50;
      }
      const row = [
        item.endpoint,
        String(item.total),
        String(item.success),
        String(item.failed),
        item.successRate,
        String(item.avgDuration)
      ];
      doc.text(row.join('  '), margin, y);
      y += 14;
    });

    const file = filename || `speed-teste-dbsync-relatorio-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(file);
    return file;
  };

  const exportCSV = (filename = null) => {
    const rows = getRows();
    if (rows.length === 0) {
      return null;
    }

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
    exportPDF,
    exportCSV
  };
})();
