/**
 * GET  /api/schedules   — Lista agendamentos
 * POST /api/schedules   — Criar agendamento (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToSchedule = (r) => ({
  id: r.id, nome: r.nome, descricao: r.descricao || '',
  cenarioId: r.cenarioId || null,
  profileIds: JSON.parse(r.profileIds || '[]'),
  config: JSON.parse(r.config || '{}'),
  cron: r.cron || null,
  agendamento: r.agendamento ? JSON.parse(r.agendamento) : null,
  ativo: Boolean(Number(r.ativo)),
  proximaExecucao: r.proximaExecucao || null,
  ultimaExecucao: r.ultimaExecucao || null,
  criadoPor: r.criadoPor || '',
  criadoEm: r.criadoEm
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── GET: lista agendamentos ──────────────────────────────────────────────
  if (req.method === 'GET') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    try {
      const { rows } = await db.execute('SELECT * FROM schedules ORDER BY criadoEm ASC');
      return res.status(200).json({ schedules: rows.map(_rowToSchedule) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar agendamento ──────────────────────────────────────────────
  if (req.method === 'POST') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const { id, nome, descricao, cenarioId, profileIds, config, cron, agendamento,
            ativo, proximaExecucao, ultimaExecucao, criadoPor, criadoEm } = req.body || {};
    if (!id || !nome || !profileIds) {
      return res.status(400).json({ error: 'id, nome e profileIds são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO schedules
              (id, nome, descricao, cenarioId, profileIds, config, cron, agendamento,
               ativo, proximaExecucao, ultimaExecucao, criadoPor, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [
          id, nome.trim(), descricao || '', cenarioId || null,
          JSON.stringify(profileIds), JSON.stringify(config || {}),
          cron || null, agendamento ? JSON.stringify(agendamento) : null,
          ativo !== false ? 1 : 0,
          proximaExecucao || null, ultimaExecucao || null,
          criadoPor || payload.userId, criadoEm || new Date().toISOString(),
          new Date().toISOString()
        ]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM schedules WHERE id = ?', args: [id] });
      return res.status(201).json({ schedule: _rowToSchedule(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar agendamento (?id=) ────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    const body = req.body || {};
    const fields = [], args = [];
    const strFields = ['nome', 'descricao', 'cenarioId', 'cron', 'proximaExecucao', 'ultimaExecucao', 'criadoPor'];
    for (const f of strFields) {
      if (body[f] !== undefined) { fields.push(`${f} = ?`); args.push(body[f]); }
    }
    if (body.profileIds !== undefined)  { fields.push('profileIds = ?');  args.push(JSON.stringify(body.profileIds)); }
    if (body.config !== undefined)      { fields.push('config = ?');      args.push(JSON.stringify(body.config)); }
    if (body.agendamento !== undefined) { fields.push('agendamento = ?'); args.push(body.agendamento ? JSON.stringify(body.agendamento) : null); }
    if (body.ativo !== undefined)       { fields.push('ativo = ?');       args.push(body.ativo ? 1 : 0); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?'); args.push(new Date().toISOString()); args.push(id);
    try {
      await db.execute({ sql: `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM schedules WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' });
      return res.status(200).json({ schedule: _rowToSchedule(rows[0]) });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  // ─── PATCH: ações rápidas (?id=) ──────────────────────────────────────────
  if (req.method === 'PATCH') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    const { action, ativo, proximaExecucao, ultimaExecucao } = req.body || {};
    const fields = [], args = [];
    if (action === 'setAtivo' && ativo !== undefined) {
      fields.push('ativo = ?'); args.push(ativo ? 1 : 0);
      if (proximaExecucao !== undefined) { fields.push('proximaExecucao = ?'); args.push(proximaExecucao); }
    } else if (action === 'recordExecution') {
      if (ultimaExecucao !== undefined)  { fields.push('ultimaExecucao = ?');  args.push(ultimaExecucao); }
      if (proximaExecucao !== undefined) { fields.push('proximaExecucao = ?'); args.push(proximaExecucao); }
    } else {
      return res.status(400).json({ error: 'Ação inválida' });
    }
    if (!fields.length) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?'); args.push(new Date().toISOString()); args.push(id);
    try {
      await db.execute({ sql: `UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM schedules WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Agendamento não encontrado' });
      return res.status(200).json({ schedule: _rowToSchedule(rows[0]) });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  // ─── DELETE: excluir agendamento (?id=, apenas admin) ─────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload || payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir agendamentos' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    try {
      await db.execute({ sql: 'DELETE FROM schedules WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
