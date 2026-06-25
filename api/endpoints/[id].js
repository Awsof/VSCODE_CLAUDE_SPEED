/**
 * PUT    /api/endpoints/:id  — Atualizar endpoint (JWT obrigatório)
 * DELETE /api/endpoints/:id  — Excluir endpoint (JWT obrigatório, admin)
 */

import { getDb, initSchema, getAuthPayload } from '../_db.js';

const _rowToEndpoint = (r) => ({
  id: r.id, nome: r.nome, url: r.url,
  descricao: r.descricao || '',
  criadoPor: r.criadoPor || '',
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

  // ─── PUT: atualizar endpoint ──────────────────────────────────────────────
  if (req.method === 'PUT') {
    const { nome, url, descricao } = req.body || {};
    const fields = [];
    const args = [];

    if (nome !== undefined)      { fields.push('nome = ?');     args.push(nome.trim()); }
    if (url !== undefined)       { fields.push('url = ?');      args.push(url.trim()); }
    if (descricao !== undefined) { fields.push('descricao = ?');args.push(descricao); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    fields.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    try {
      await db.execute({ sql: `UPDATE endpoints SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM endpoints WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Endpoint não encontrado' });
      return res.status(200).json({ endpoint: _rowToEndpoint(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: excluir endpoint (apenas admin) ──────────────────────────────
  if (req.method === 'DELETE') {
    if (payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir endpoints' });
    try {
      await db.execute({ sql: 'DELETE FROM endpoints WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
