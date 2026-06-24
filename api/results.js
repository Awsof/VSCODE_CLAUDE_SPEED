/**
 * GET    /api/results         — Listar resultados (JWT obrigatório)
 * POST   /api/results         — Salvar resultado (JWT obrigatório)
 * DELETE /api/results         — Limpar todos os resultados (JWT admin)
 *
 * Nota: requestPayload e responseBody NÃO são armazenados no Turso
 * (campos grandes — ficam apenas no IndexedDB local)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToResult = (r) => ({
  id: r.id,
  seq: r.seq ? Number(r.seq) : null,
  profileId: r.profileId,
  endpoint: r.endpoint,
  version: r.version,
  duration: r.duration ? Number(r.duration) : 0,
  statusCode: r.statusCode ? Number(r.statusCode) : null,
  success: Boolean(Number(r.success)),
  numAtendimentoDB: r.numAtendimentoDB,
  requestPayload: null,
  responseBody: null,
  errorDetail: r.errorDetail,
  origem: r.origem || 'manual',
  scheduleId: r.scheduleId,
  executadoPor: r.executadoPor,
  executadoEm: r.executadoEm,
  cenarioId: r.cenarioId
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── GET: listar resultados ───────────────────────────────────────────────
  if (req.method === 'GET') {
    const limit = Math.min(Number(req.query.limit) || 5000, 10000);
    const since = req.query.since || null; // ISO timestamp — para sync incremental

    try {
      let sql = 'SELECT * FROM results';
      const args = [];
      if (since) { sql += ' WHERE executadoEm > ?'; args.push(since); }
      sql += ' ORDER BY executadoEm ASC LIMIT ?';
      args.push(limit);
      const { rows } = await db.execute({ sql, args });
      return res.status(200).json({ results: rows.map(_rowToResult) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: salvar resultado ───────────────────────────────────────────────
  if (req.method === 'POST') {
    const r = req.body || {};
    if (!r.id || !r.executadoEm || !r.profileId) {
      return res.status(400).json({ error: 'id, profileId e executadoEm são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR IGNORE INTO results
              (id, seq, profileId, endpoint, version, duration, statusCode, success,
               numAtendimentoDB, errorDetail, origem, scheduleId, executadoPor, executadoEm, cenarioId)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          r.id, r.seq || null, r.profileId, r.endpoint || 'unknown', r.version || '1.0',
          r.duration || 0, r.statusCode || null, r.success ? 1 : 0,
          r.numAtendimentoDB || null, r.errorDetail || null,
          r.origem || 'manual', r.scheduleId || null, r.executadoPor || null,
          r.executadoEm, r.cenarioId || null
        ]
      });
      return res.status(201).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: limpar todos ─────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    if (payload.nivel !== 'admin') {
      return res.status(403).json({ error: 'Permissão negada' });
    }
    try {
      await db.execute('DELETE FROM results');
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
