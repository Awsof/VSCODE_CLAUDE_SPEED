/**
 * GET  /api/methods   — Lista métodos SOAP
 * POST /api/methods   — Criar método (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToMethod = (r) => ({
  id: r.id, nome: r.nome, operacao: r.operacao || r.nome,
  soapAction: r.soapAction, payloadTemplate: r.payloadTemplate,
  xmlTag: r.xmlTag || 'diag:NumeroAtendimentoApoiado',
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

  // ─── GET: lista métodos ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await db.execute('SELECT * FROM methods ORDER BY criadoEm ASC');
      return res.status(200).json({ methods: rows.map(_rowToMethod) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar método ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const { id, nome, operacao, soapAction, payloadTemplate, xmlTag, descricao, criadoPor, criadoEm } = req.body || {};
    if (!id || !nome || !soapAction || !payloadTemplate) {
      return res.status(400).json({ error: 'id, nome, soapAction e payloadTemplate são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO methods
              (id, nome, operacao, soapAction, payloadTemplate, xmlTag, descricao, criadoPor, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, nome.trim(), (operacao || nome).trim(), soapAction.trim(), payloadTemplate.trim(),
               (xmlTag || 'diag:NumeroAtendimentoApoiado').trim(), descricao || '',
               criadoPor || payload.userId, criadoEm || new Date().toISOString(),
               new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM methods WHERE id = ?', args: [id] });
      return res.status(201).json({ method: _rowToMethod(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar método (?id=) ─────────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    const { nome, operacao, soapAction, payloadTemplate, xmlTag, descricao } = req.body || {};
    const fields = [], args = [];
    if (nome !== undefined)            { fields.push('nome = ?');            args.push(nome.trim()); }
    if (operacao !== undefined)        { fields.push('operacao = ?');        args.push(operacao.trim()); }
    if (soapAction !== undefined)      { fields.push('soapAction = ?');      args.push(soapAction.trim()); }
    if (payloadTemplate !== undefined) { fields.push('payloadTemplate = ?'); args.push(payloadTemplate.trim()); }
    if (xmlTag !== undefined)          { fields.push('xmlTag = ?');          args.push(xmlTag.trim()); }
    if (descricao !== undefined)       { fields.push('descricao = ?');       args.push(descricao); }
    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?'); args.push(new Date().toISOString()); args.push(id);
    try {
      await db.execute({ sql: `UPDATE methods SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM methods WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Método não encontrado' });
      return res.status(200).json({ method: _rowToMethod(rows[0]) });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  // ─── DELETE: excluir método (?id=, apenas admin) ──────────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload || payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir métodos' });
    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });
    try {
      await db.execute({ sql: 'DELETE FROM methods WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) { return res.status(500).json({ error: 'Erro interno do servidor' }); }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
