/**
 * GET    /api/profiles        — Lista perfis (público)
 * POST   /api/profiles        — Criar perfil (JWT obrigatório)
 * PUT    /api/profiles?id=:id — Atualizar perfil (JWT obrigatório)
 * DELETE /api/profiles?id=:id — Excluir perfil (JWT obrigatório)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToProfile = (r) => ({
  id: r.id, nome: r.nome, codigo: r.codigo,
  url: r.url, version: r.version || '1.0',
  payloadTemplate: r.payloadTemplate || null,
  xmlTag: r.xmlTag || 'diag:NumeroAtendimentoApoiado',
  soapAction: r.soapAction || null,
  codigoApoiado: r.codigoApoiado || null,
  codigoSenha: r.codigoSenha || null,
  cor: r.cor || '#0F9B94',
  groupId: r.groupId || null,
  methodId: r.methodId || null,
  criadoPor: r.criadoPor || '',
  criadoEm: r.criadoEm
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── GET: lista perfis ────────────────────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await db.execute('SELECT * FROM profiles ORDER BY criadoEm ASC');
      return res.status(200).json({ profiles: rows.map(_rowToProfile) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar perfil ───────────────────────────────────────────────────
  if (req.method === 'POST') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const { id, nome, codigo, url, version, payloadTemplate, xmlTag, soapAction,
            codigoApoiado, codigoSenha, cor, groupId, methodId, criadoPor, criadoEm } = req.body || {};

    if (!id || !nome || !codigo || !url) {
      return res.status(400).json({ error: 'id, nome, codigo e url são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO profiles
              (id, nome, codigo, url, version, payloadTemplate, xmlTag, soapAction,
               codigoApoiado, codigoSenha, cor, groupId, methodId, criadoPor, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [id, nome.trim(), codigo.trim().toUpperCase(), url.trim(),
               version || '1.0', payloadTemplate || null,
               xmlTag || 'diag:NumeroAtendimentoApoiado', soapAction || null,
               codigoApoiado || null, codigoSenha || null, cor || '#0F9B94',
               groupId || null, methodId || null,
               criadoPor || payload.userId, criadoEm || new Date().toISOString(),
               new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [id] });
      return res.status(201).json({ profile: _rowToProfile(rows[0]) });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) return res.status(409).json({ error: 'Perfil já existe' });
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar perfil (?id=) ─────────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });

    const body = req.body || {};
    const { nome, codigo, url, version, payloadTemplate, xmlTag, soapAction,
            codigoApoiado, codigoSenha, cor, groupId, methodId } = body;

    const fields = [];
    const args = [];
    if (nome !== undefined)            { fields.push('nome = ?');            args.push(nome.trim()); }
    if (codigo !== undefined)          { fields.push('codigo = ?');          args.push(codigo.trim().toUpperCase()); }
    if (url !== undefined)             { fields.push('url = ?');             args.push(url.trim()); }
    if (version !== undefined)         { fields.push('version = ?');         args.push(version); }
    if (payloadTemplate !== undefined) { fields.push('payloadTemplate = ?'); args.push(payloadTemplate); }
    if (xmlTag !== undefined)          { fields.push('xmlTag = ?');          args.push(xmlTag); }
    if (soapAction !== undefined)      { fields.push('soapAction = ?');      args.push(soapAction); }
    if (codigoApoiado !== undefined)   { fields.push('codigoApoiado = ?');   args.push(codigoApoiado); }
    if (codigoSenha !== undefined)     { fields.push('codigoSenha = ?');     args.push(codigoSenha); }
    if (cor !== undefined)             { fields.push('cor = ?');             args.push(cor); }
    if (groupId !== undefined)         { fields.push('groupId = ?');         args.push(groupId); }
    if (methodId !== undefined)        { fields.push('methodId = ?');        args.push(methodId); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });
    fields.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    try {
      await db.execute({ sql: `UPDATE profiles SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM profiles WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Perfil não encontrado' });
      return res.status(200).json({ profile: _rowToProfile(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: excluir perfil (?id=) ────────────────────────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });

    try {
      await db.execute({ sql: 'DELETE FROM profiles WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
