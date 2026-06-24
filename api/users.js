/**
 * GET    /api/users        — Lista usuários (JWT obrigatório, sem senhaHash)
 * POST   /api/users        — Criar usuário (JWT admin, ou primeiro usuário sem auth)
 * PUT    /api/users?id=    — Atualizar usuário (JWT admin ou própria conta)
 * DELETE /api/users?id=    — Excluir usuário (JWT admin)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

const _rowToUser = (r) => ({
  id: r.id, nome: r.nome, email: r.email,
  usuario: r.usuario, nivel: r.nivel,
  ativo: Boolean(Number(r.ativo)), criadoEm: r.criadoEm,
  senhaTemporaria: Boolean(Number(r.senhaTemporaria || 0)),
  inativacaoTipo: r.inativacaoTipo || null,
  inativoAte: r.inativoAte || null
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

  // ─── GET: lista usuários ─────────────────────────────────────────────────
  if (req.method === 'GET') {
    const authGet = getAuthPayload(req);
    if (!authGet) return res.status(401).json({ error: 'Não autenticado' });
    try {
      const { rows } = await db.execute('SELECT * FROM users ORDER BY criadoEm ASC');
      return res.status(200).json({ users: rows.map(_rowToUser) });
    } catch (err) {
      console.error('[api/users] GET error:', err);
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── POST: criar usuário ou migrar em lote ───────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};

    // Troca de senha temporária — não exige JWT, apenas verifica senhaTemporaria=1 no Turso
    if (body._selfChange) {
      const { userId, senhaHash } = body;
      if (!userId || !senhaHash) return res.status(400).json({ error: 'userId e senhaHash são obrigatórios' });
      try {
        // Só permite se o usuário realmente está em modo de troca obrigatória
        const { rows: chk } = await db.execute({
          sql: 'SELECT id FROM users WHERE id = ? AND senhaTemporaria = 1',
          args: [userId]
        });
        if (!chk.length) return res.status(403).json({ error: 'Troca não autorizada ou já realizada' });
        await db.execute({
          sql: 'UPDATE users SET senhaHash = ?, senhaTemporaria = 0, updatedAt = ? WHERE id = ?',
          args: [senhaHash, new Date().toISOString(), userId]
        });
        console.log('[api/users] senhaTemporaria desativada para userId:', userId);
        return res.status(200).json({ ok: true });
      } catch (err) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }

    // Migração em lote (apenas quando tabela está vazia)
    if (body._migrate && Array.isArray(body.users)) {
      try {
        const { rows: countRows } = await db.execute('SELECT COUNT(*) as cnt FROM users');
        const cnt = Number(countRows[0].cnt);
        if (cnt > 0) {
          return res.status(409).json({ error: 'Migração não permitida: tabela já possui usuários' });
        }
        for (const u of body.users) {
          if (!u.id || !u.usuario || !u.senhaHash) continue;
          await db.execute({
            sql: `INSERT OR IGNORE INTO users (id, usuario, nome, email, senhaHash, nivel, ativo, criadoEm)
                  VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            args: [u.id, u.usuario.toLowerCase(), u.nome || '', u.email || '',
                   u.senhaHash, u.nivel || 'visualizador', u.ativo !== false ? 1 : 0,
                   u.criadoEm || new Date().toISOString()]
          });
        }
        const { rows } = await db.execute('SELECT * FROM users ORDER BY criadoEm ASC');
        return res.status(200).json({ migrated: rows.length, users: rows.map(_rowToUser) });
      } catch (err) {
        return res.status(500).json({ error: 'Erro interno do servidor' });
      }
    }

    // Criar usuário único — requer admin JWT, EXCETO quando tabela está vazia
    const payload = getAuthPayload(req);
    const { rows: countRows } = await db.execute('SELECT COUNT(*) as cnt FROM users');
    const tableEmpty = Number(countRows[0].cnt) === 0;

    if (!tableEmpty && (!payload || payload.nivel !== 'admin')) {
      return res.status(tableEmpty ? 200 : 403).json({ error: 'Permissão negada' });
    }

    const { id, usuario, nome, email, senhaHash, nivel, criadoEm, senhaTemporaria } = body;
    if (!id || !usuario || !senhaHash) {
      return res.status(400).json({ error: 'id, usuario e senhaHash são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO users
              (id, usuario, nome, email, senhaHash, nivel, ativo, senhaTemporaria, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)`,
        args: [id, usuario.toLowerCase(), nome || '', email || '', senhaHash,
               nivel || 'visualizador', senhaTemporaria ? 1 : 0,
               criadoEm || new Date().toISOString(), new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      return res.status(201).json({ user: _rowToUser(rows[0]) });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Usuário já existe' });
      }
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: atualizar usuário (?id=) ─────────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });

    const isAdmin = payload.nivel === 'admin';
    const isSelf  = payload.userId === id;

    if (!isAdmin && !isSelf) return res.status(403).json({ error: 'Permissão negada' });

    const body = req.body || {};

    if (!isAdmin && isSelf) {
      const forbidden = Object.keys(body).filter(k => !['senhaHash', 'senhaTemporaria'].includes(k) && body[k] !== undefined);
      if (forbidden.length > 0) return res.status(403).json({ error: 'Permissão negada para campos: ' + forbidden.join(', ') });
    }

    const { nome, email, usuario, senhaHash, nivel, ativo, senhaTemporaria,
            inativacaoTipo, inativoAte } = body;
    const fields = [], args = [];

    if (nome !== undefined)            { fields.push('nome = ?');            args.push(nome); }
    if (email !== undefined)           { fields.push('email = ?');            args.push(email); }
    if (usuario !== undefined)         { fields.push('usuario = ?');          args.push(usuario.toLowerCase()); }
    if (senhaHash !== undefined)       { fields.push('senhaHash = ?');        args.push(senhaHash); }
    if (nivel !== undefined)           { fields.push('nivel = ?');            args.push(nivel); }
    if (ativo !== undefined)           { fields.push('ativo = ?');            args.push(ativo ? 1 : 0); }
    if (senhaTemporaria !== undefined) { fields.push('senhaTemporaria = ?');  args.push(senhaTemporaria ? 1 : 0); }
    if (inativacaoTipo !== undefined)  { fields.push('inativacaoTipo = ?');   args.push(inativacaoTipo); }
    if (inativoAte !== undefined)      { fields.push('inativoAte = ?');       args.push(inativoAte); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    fields.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    try {
      await db.execute({ sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`, args });
      const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
      console.log('[api/users] PUT OK: id=' + id);
      return res.status(200).json({ user: _rowToUser(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: excluir usuário (?id=) ─────────────────────────────────────────
  if (req.method === 'DELETE') {
    const payload = getAuthPayload(req);
    if (!payload || payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem excluir usuários' });

    const id = req.query.id;
    if (!id) return res.status(400).json({ error: 'ID obrigatório' });

    try {
      await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
