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

  const exportPDF = (options = {}) => {
    const jsPDFConstructor = window.jspdf?.jsPDF || window.jsPDF;
    if (!jsPDFConstructor) throw new Error('jsPDF não carregado');

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
    const getUser = id => users.find(u => u.id === id);

    // --- Stats ---
    const total = results.length;
    const successful = results.filter(r => r.success).length;
    const failed = total - successful;
    const avgDuration = total > 0
      ? Math.round(results.reduce((s, r) => s + (r.duration || 0), 0) / total) : 0;
    const successRate = total > 0 ? `${Math.round((successful / total) * 100)}%` : 'N/A';

    // --- Setup ---
    const doc = new jsPDFConstructor({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const margin = 40;
    const pageW = doc.internal.pageSize.getWidth();
    const pageH = doc.internal.pageSize.getHeight();
    const usableW = pageW - margin * 2;
    let y = 50;

    // --- Cabeçalho ---
    doc.setFontSize(20); doc.setTextColor(0, 55, 97);
    doc.text('Relatório Speed Teste DBSync', margin, y); y += 26;
    doc.setFontSize(10); doc.setTextColor(100);
    doc.text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, margin, y); y += 14;
    doc.text(`Filtro: ${filterLabel}`, margin, y); y += 22;

    // --- Resumo ---
    doc.setFontSize(12); doc.setTextColor(30);
    doc.text('Resumo', margin, y); y += 16;
    doc.setFontSize(10); doc.setTextColor(60);
    doc.text(`Execuções: ${total}    Sucesso: ${successful}    Falhas: ${failed}`, margin, y); y += 14;
    doc.text(`Taxa de sucesso: ${successRate}    Duração média: ${avgDuration} ms`, margin, y); y += 22;

    // --- Gráficos (lado a lado) ---
    const chartResults = [...results]
      .sort((a, b) => new Date(a.executadoEm) - new Date(b.executadoEm))
      .slice(-40);

    const buckets = [
      { label: '0–500ms', min: 0,    max: 500 },
      { label: '500–1s',  min: 500,  max: 1000 },
      { label: '1–2s',    min: 1000, max: 2000 },
      { label: '2–3s',    min: 2000, max: 3000 },
      { label: '3–5s',    min: 3000, max: 5000 },
      { label: '>5s',     min: 5000, max: Infinity }
    ];
    const counts = buckets.map(b =>
      results.filter(r => (r.duration || 0) >= b.min && (r.duration || 0) < b.max).length
    );
    const maxCount = Math.max(...counts, 1);

    const cH = 120;
    const chartTopY = y;
    const halfW = usableW / 2 - 10;

    // Gráfico A — Linha (esquerda)
    const cX = margin, cW = halfW;
    const cBaseY = chartTopY + 14 + cH;
    doc.setFontSize(8); doc.setTextColor(70);
    doc.text('A — Tempo de resposta por requisição (ms)', cX, chartTopY);

    if (chartResults.length > 0) {
      const durations = chartResults.map(r => r.duration || 0);
      const maxDur = Math.max(...durations, 1);

      doc.setDrawColor(200); doc.setLineWidth(0.5);
      doc.line(cX, chartTopY + 14, cX, cBaseY);
      doc.line(cX, cBaseY, cX + cW, cBaseY);

      doc.setFontSize(6.5); doc.setTextColor(130);
      doc.text(`${maxDur}ms`, cX - 2, chartTopY + 18, { align: 'right' });
      doc.text('0', cX - 2, cBaseY, { align: 'right' });

      doc.setDrawColor(15, 155, 148); doc.setLineWidth(1.5);
      let prevPx = null, prevPy = null;
      durations.forEach((d, i) => {
        const px = cX + (durations.length === 1 ? cW / 2 : (i / (durations.length - 1)) * cW);
        const py = chartTopY + 14 + cH - (d / maxDur) * cH * 0.88;
        if (prevPx !== null) doc.line(prevPx, prevPy, px, py);
        doc.setFillColor(15, 155, 148);
        doc.circle(px, py, 2, 'F');
        prevPx = px; prevPy = py;
      });
      doc.setFontSize(6.5); doc.setTextColor(130);
      doc.text('#1', cX, cBaseY + 9);
      doc.text(`#${durations.length}`, cX + cW, cBaseY + 9, { align: 'right' });
    } else {
      doc.setFontSize(8); doc.setTextColor(160);
      doc.text('Sem dados', cX + cW / 2, chartTopY + 14 + cH / 2, { align: 'center' });
    }

    // Gráfico B — Barras (direita)
    const bX = margin + halfW + 20, bW = halfW;
    const bBaseY = chartTopY + 14 + cH;
    doc.setFontSize(8); doc.setTextColor(70);
    doc.text('B — Distribuição de tempo de resposta (ms)', bX, chartTopY);

    doc.setDrawColor(200); doc.setLineWidth(0.5);
    doc.line(bX, chartTopY + 14, bX, bBaseY);
    doc.line(bX, bBaseY, bX + bW, bBaseY);

    const slotW = bW / buckets.length;
    counts.forEach((c, i) => {
      const barW = slotW * 0.65;
      const bBarX = bX + i * slotW + slotW * 0.175;
      const bBarH = c > 0 ? Math.max((c / maxCount) * cH * 0.88, 3) : 0;
      if (bBarH > 0) {
        doc.setFillColor(210, 180, 120);
        doc.rect(bBarX, bBaseY - bBarH, barW, bBarH, 'F');
        doc.setFontSize(7); doc.setTextColor(60);
        doc.text(String(c), bBarX + barW / 2, bBaseY - bBarH - 3, { align: 'center' });
      }
      doc.setFontSize(6); doc.setTextColor(110);
      doc.text(buckets[i].label, bBarX + barW / 2, bBaseY + 9, { align: 'center' });
    });

    y = Math.max(cBaseY, bBaseY) + 24;

    // --- Tabela de Resultados (nova página) ---
    doc.addPage();
    y = 50;

    doc.setFontSize(12); doc.setTextColor(0, 55, 97);
    doc.text('Resultados detalhados', margin, y); y += 18;

    const cols = [
      { key: 'seq',      label: 'SEQ',       w: 35  },
      { key: 'endpoint', label: 'Endpoint',   w: 230 },
      { key: 'status',   label: 'Status',     w: 45  },
      { key: 'tag',      label: 'TAG',        w: 90  },
      { key: 'dur',      label: 'Duração',    w: 65  },
      { key: 'user',     label: 'Usuário',    w: 85  },
      { key: 'date',     label: 'Data/Hora',  w: 125 }
    ];

    // Cabeçalho da tabela
    doc.setFontSize(8.5); doc.setFillColor(0, 55, 97); doc.setTextColor(255, 255, 255);
    let cx = margin;
    cols.forEach(c => {
      doc.rect(cx, y, c.w, 16, 'F');
      doc.text(c.label, cx + 4, y + 11);
      cx += c.w;
    });
    y += 16;

    // Linhas de resultado (mais recentes primeiro)
    const sorted = [...results].sort((a, b) => new Date(b.executadoEm) - new Date(a.executadoEm));
    sorted.forEach((r, idx) => {
      if (y > pageH - 50) {
        doc.addPage();
        y = 50;
        // Repetir cabeçalho
        doc.setFontSize(8.5); doc.setFillColor(0, 55, 97); doc.setTextColor(255, 255, 255);
        cx = margin;
        cols.forEach(c => {
          doc.rect(cx, y, c.w, 16, 'F');
          doc.text(c.label, cx + 4, y + 11);
          cx += c.w;
        });
        y += 16;
      }

      const u = getUser(r.executadoPor);
      const row = {
        seq:      String(r.seq || ''),
        endpoint: r.endpoint || '—',
        status:   r.success ? 'OK' : 'ERRO',
        tag:      r.numAtendimentoDB || '—',
        dur:      `${r.duration || 0} ms`,
        user:     u ? (u.nome || u.usuario) : (r.executadoPor || '—'),
        date:     new Date(r.executadoEm).toLocaleString('pt-BR')
      };

      if (idx % 2 === 0) doc.setFillColor(244, 246, 250);
      else               doc.setFillColor(255, 255, 255);
      const rowW = cols.reduce((s, c) => s + c.w, 0);
      doc.rect(margin, y, rowW, 14, 'F');

      doc.setFontSize(8);
      if (r.success) doc.setTextColor(30, 30, 30);
      else           doc.setTextColor(180, 30, 30);

      cx = margin;
      cols.forEach(c => {
        let val = String(row[c.key] || '');
        if (c.key === 'endpoint' && val.length > 36) val = val.slice(0, 35) + '…';
        if (c.key === 'user'     && val.length > 14) val = val.slice(0, 13) + '…';
        doc.text(val, cx + 4, y + 10);
        cx += c.w;
      });
      y += 14;
    });

    if (sorted.length === 0) {
      doc.setFontSize(10); doc.setTextColor(160);
      doc.text('Nenhum resultado encontrado para o filtro selecionado.', margin, y);
    }

    const tag = options.type === 'profile' ? '-teste' : options.type === 'group' ? '-grupo' : '';
    const file = `speed-dbsync-relatorio${tag}-${new Date().toISOString().slice(0, 10)}.pdf`;
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
