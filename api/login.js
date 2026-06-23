/**
 * POST /api/login — Autenticação via Turso DB com JWT
 * Retorna { ok, user, token, mode } em sucesso
 * Fallback: env vars LOGIN_USUARIO/LOGIN_SENHA (legado)
 */

import { getDb, initSchema, sha256, signJWT } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { usuario, senha } = req.body || {};
  if (!usuario || !senha)
    return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });

  // Modo legado: env vars simples (LOGIN_USUARIO / LOGIN_SENHA)
  if (process.env.LOGIN_USUARIO && process.env.LOGIN_SENHA) {
    const ok = usuario.trim().toLowerCase() === process.env.LOGIN_USUARIO.trim().toLowerCase()
            && senha === process.env.LOGIN_SENHA.trim();
    if (ok) {
      const envUser = { id: 'env-' + usuario, nome: usuario, usuario, nivel: 'admin', email: '' };
      const token = signJWT({ userId: envUser.id, usuario, nivel: 'admin' });
      return res.status(200).json({ ok: true, user: envUser, token, mode: 'env-fallback' });
    }
    return res.status(401).json({ ok: false, error: 'Credenciais inválidas', mode: 'env-fallback' });
  }

  // Turso DB
  try {
    const db = getDb();
    await initSchema(db);

    const hash = sha256(senha);
    const { rows } = await db.execute({
      sql: 'SELECT * FROM users WHERE usuario = ? AND ativo = 1',
      args: [String(usuario).trim().toLowerCase()]
    });

    if (!rows.length || rows[0].senhaHash !== hash) {
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas', mode: 'turso' });
    }

    const u = rows[0];
    const userObj = {
      id: u.id, nome: u.nome, email: u.email,
      usuario: u.usuario, nivel: u.nivel,
      ativo: Boolean(u.ativo), criadoEm: u.criadoEm
    };

    const token = signJWT({ userId: u.id, usuario: u.usuario, nivel: u.nivel });
    console.log('[api/login] Login OK: ' + u.usuario + ' (' + u.nivel + ')');
    return res.status(200).json({ ok: true, user: userObj, token, mode: 'turso' });

  } catch (err) {
    console.error('[api/login] Erro:', err.message);
    // Dev fallback quando Turso nao esta configurado
    if (usuario === 'admin' && senha === 'admin') {
      return res.status(200).json({ ok: true, mode: 'dev-fallback' });
    }
    return res.status(500).json({ ok: false, error: 'Erro interno', mode: 'error' });
  }
}
