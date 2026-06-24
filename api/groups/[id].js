/**
 * PUT    /api/groups/:id  — Atualizar grupo (JWT obrigatório)
 * DELETE /api/groups/:id  — Excluir grupo (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from '../_db.js';

const _rowToGroup = (r) => ({
  id: r.id, nome: r.nome, cor: r.cor || '#0F9B94',
  descricao: r.descricao || '', criadoPor: r.criadoPor || '',
  criadoEm: r.criadoEm
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = getAuthPayload(req);
  if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'ID obrigatório' });

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── PUT: atualizar grupo ─────────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { nome, cor, descricao } = req.body || {};
    const fields = [];
    const args = [];

    if (nome !== undefined)      { fields.push('nome = ?');     args.push(nome.trim()); }
    if (cor !== undefined)       { fields.push('cor = ?');      args.push(cor); }
    if (descricao !== undefined) { fields.push('descricao = ?'); args.push(descricao); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    fields.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    try {
      await db.execute({ sql: `UPDATE groups SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM groups WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Grupo não encontrado' });
      return res.status(200).json({ group: _rowToGroup(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: excluir grupo ────────────────────────────────────────────────
  if (req.method === 'DELETE') {
    try {
      await db.execute({ sql: 'DELETE FROM groups WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
