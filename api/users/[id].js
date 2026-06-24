/**
 * PUT    /api/users/:id  — Atualizar usuário (JWT admin)
 * DELETE /api/users/:id  — Excluir usuário (JWT admin)
 */

import { getDb, initSchema, getAuthPayload } from '../_db.js';

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
  res.setHeader('Access-Control-Allow-Methods', 'PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const payload = getAuthPayload(req);
  if (!payload) return res.status(403).json({ error: 'Autenticação obrigatória' });

  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'ID obrigatório' });

  const isAdmin = payload.nivel === 'admin';
  const isSelf  = payload.userId === id;

  // Não-admin só pode alterar a própria senha (reset forçado)
  if (!isAdmin && !isSelf) {
    return res.status(403).json({ error: 'Permissão negada' });
  }

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch (err) {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── PUT: atualizar usuário ───────────────────────────────────────────────
  if (req.method === 'PUT') {
    const body = req.body || {};

    // Não-admin só pode atualizar a própria senha (troca forçada)
    if (!isAdmin && isSelf) {
      const forbidden = Object.keys(body).filter(k => !['senhaHash', 'senhaTemporaria'].includes(k) && body[k] !== undefined);
      if (forbidden.length > 0) {
        return res.status(403).json({ error: 'Permissão negada para campos: ' + forbidden.join(', ') });
      }
    }

    const { nome, email, usuario, senhaHash, nivel, ativo, senhaTemporaria,
            inativacaoTipo, inativoAte } = body;
    const fields = [];
    const args = [];

    if (nome !== undefined)           { fields.push('nome = ?');           args.push(nome); }
    if (email !== undefined)          { fields.push('email = ?');           args.push(email); }
    if (usuario !== undefined)        { fields.push('usuario = ?');         args.push(usuario.toLowerCase()); }
    if (senhaHash !== undefined)      { fields.push('senhaHash = ?');       args.push(senhaHash); }
    if (nivel !== undefined)          { fields.push('nivel = ?');           args.push(nivel); }
    if (ativo !== undefined)          { fields.push('ativo = ?');           args.push(ativo ? 1 : 0); }
    if (senhaTemporaria !== undefined){ fields.push('senhaTemporaria = ?'); args.push(senhaTemporaria ? 1 : 0); }
    if (inativacaoTipo !== undefined) { fields.push('inativacaoTipo = ?'); args.push(inativacaoTipo); }
    if (inativoAte !== undefined)     { fields.push('inativoAte = ?');     args.push(inativoAte); }

    if (fields.length === 0) return res.status(400).json({ error: 'Nenhum campo para atualizar' });

    fields.push('updatedAt = ?');
    args.push(new Date().toISOString());
    args.push(id);

    try {
      await db.execute({
        sql: `UPDATE users SET ${fields.join(', ')} WHERE id = ?`,
        args
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      if (!rows.length) return res.status(404).json({ error: 'Usuário não encontrado' });
      return res.status(200).json({ user: _rowToUser(rows[0]) });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── DELETE: excluir usuário (apenas admin) ──────────────────────────────
  if (req.method === 'DELETE') {
    if (!isAdmin) return res.status(403).json({ error: 'Apenas administradores podem excluir usuários' });
    try {
      await db.execute({ sql: 'DELETE FROM users WHERE id = ?', args: [id] });
      return res.status(200).json({ ok: true });
    } catch (err) {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
