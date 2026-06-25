/**
 * GET  /api/endpoints   — Lista endpoints SOAP
 * POST /api/endpoints   — Criar endpoint (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToEndpoint = (r) => ({
  id: r.id, nome: r.nome, url: r.url,
  descricao: r.descricao || '',
  criadoPor: r.criadoPor || '',
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

  // ─── GET: lista endpoints ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    try {
      const { rows } = await db.execute('SELECT * FROM endpoints ORDER BY criadoEm ASC');
      return res.status(200).json({ endpoints: rows.map(_rowToEndpoint) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar endpoint ─────────────────────────────────────────────────
  if (req.method === 'POST') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const { id, nome, url, descricao, criadoPor, criadoEm } = req.body || {};
    if (!id || !nome || !url) {
      return res.status(400).json({ error: 'id, nome e url são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO endpoints
              (id, nome, url, descricao, criadoPor, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?)`,
        args: [id, nome.trim(), url.trim(), descricao || '',
               criadoPor || payload.userId, criadoEm || new Date().toISOString(),
               new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM endpoints WHERE id = ?', args: [id] });
      return res.status(201).json({ endpoint: _rowToEndpoint(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar endpoint (?id=) ──────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    const { nome, url, descricao } = req.body || {};
    const fields = [], args = [];
    if (nome !== undefined)     { fields.push('nome = ?');     args.push(nome.trim()); }
    if (url !== undefined)      { fields.push('url = ?');      args.push(url.trim()); }
    if (descricao !== undefined){ fields.push('descricao = ?');args.push(descricao); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?'); args.push(new Date().toISOString()); args.push(id);
    try {
      await db.execute({ sql: `UPDATE endpoints SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM endpoints WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Endpoint não encontrado' });
      return res.status(200).json({ endpoint: _rowToEndpoint(rows[0]) });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  // ─── DELETE: excluir endpoint (?id=, apenas admin) ───────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload || payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir endpoints' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    try {
      await db.execute({ sql: 'DELETE FROM endpoints WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
