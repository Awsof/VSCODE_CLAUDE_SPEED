/**
 * GET  /api/groups   — Lista grupos
 * POST /api/groups   — Criar grupo (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToGroup = (r) => ({
  id: r.id, nome: r.nome, cor: r.cor || '#0F9B94',
  descricao: r.descricao || '', criadoPor: r.criadoPor || '',
  criadoEm: r.criadoEm
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── GET: lista grupos ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await db.execute('SELECT * FROM groups ORDER BY criadoEm ASC');
      return res.status(200).json({ groups: rows.map(_rowToGroup) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar grupo ────────────────────────────────────────────────────
  if (req.method === 'POST') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const { id, nome, cor, descricao, criadoPor, criadoEm } = req.body || {};
    if (!id || !nome) return res.status(400).json({ error: 'id e nome são obrigatórios' });

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO groups (id, nome, cor, descricao, criadoPor, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, nome.trim(), cor || '#0F9B94', descricao || '',
               criadoPor || payload.userId, criadoEm || new Date().toISOString(),
               new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [id] });
      return res.status(201).json({ group: _rowToGroup(rows[0]) });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Grupo já existe' });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar grupo (?id=) ──────────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    const { nome, cor, descricao } = req.body || {};
    const fields = [], args = [];
    if (nome !== undefined)      { fields.push('nome = ?');      args.push(nome.trim()); }
    if (cor !== undefined)       { fields.push('cor = ?');       args.push(cor); }
    if (descricao !== undefined) { fields.push('descricao = ?'); args.push(descricao); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?'); args.push(new Date().toISOString()); args.push(id);
    try {
      await db.execute({ sql: `UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Grupo não encontrado' });
      return res.status(200).json({ group: _rowToGroup(rows[0]) });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  // ─── DELETE: excluir grupo (?id=, apenas admin) ───────────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload || payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir grupos' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    try {
      await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
