/**
 * POST /api/login — Autenticação via Turso DB com JWT
 * Retorna { ok, user, token, mode } em sucesso
 * Fallback: env vars LOGIN_USUARIO/LOGIN_SENHA (legado)
 */

import { getDb, initSchema, sha256, signJWT } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { usuario, senha } = req.body || {};
  if (!usuario || !senha)
    return res.status(400).json({ ok: false, error: 'Campos obrigatórios' });

  // Turso DB — sempre tenta primeiro
  try {
    const db = getDb();
    await initSchema(db);

    const hash = sha256(senha);
    const { rows } = await db.execute({
      sql: 'SELECT * FROM users WHERE usuario = ?',
      args: [String(usuario).trim().toLowerCase()]
    });

    // Verificar bloqueio por tentativas excessivas
    if (rows.length) {
      const u0 = rows[0];
      if (u0.lockedUntil && new Date(u0.lockedUntil) > new Date()) {
        const minLeft = Math.ceil((new Date(u0.lockedUntil) - new Date()) / 60000);
        return res.status(429).json({ ok: false, error: `Conta bloqueada por excesso de tentativas. Tente em ${minLeft} min.` });
      }
    }

    // Bloquear usuário inativo antes de verificar senha
    if (rows.length && !Number(rows[0].ativo)) {
      return res.status(403).json({ ok: false, error: 'Usuário desativado', code: 'INACTIVE' });
    }

    if (!rows.length || rows[0].senhaHash !== hash) {
      // Incrementar contador de falhas se usuário existe
      if (rows.length) {
        const failures = (Number(rows[0].loginFailures) || 0) + 1;
        const lockedUntil = failures >= 5
          ? new Date(Date.now() + 15 * 60 * 1000).toISOString()
          : null;
        try {
          await db.execute({
            sql: 'UPDATE users SET loginFailures = ?, lockedUntil = ? WHERE id = ?',
            args: [failures, lockedUntil, rows[0].id]
          });
          if (lockedUntil) console.warn('[api/login] Conta bloqueada: ' + rows[0].usuario + ' (5 falhas)');
        } catch {}
      }

      // Verificar fallback de env vars (suporte legado ao admin)
      if (process.env.LOGIN_USUARIO && process.env.LOGIN_SENHA) {
        const envMatch =
          usuario.trim().toLowerCase() === process.env.LOGIN_USUARIO.trim().toLowerCase()
          && senha === process.env.LOGIN_SENHA.trim();
        if (envMatch) {
          // Auto-corrigir hash no Turso para sincronizar com env var
          if (rows.length) {
            try {
              await db.execute({
                sql: 'UPDATE users SET senhaHash = ?, loginFailures = 0, lockedUntil = NULL, updatedAt = ? WHERE id = ?',
                args: [hash, new Date().toISOString(), rows[0].id]
              });
              console.log('[api/login] Hash do admin corrigido no Turso via env-sync');
            } catch {}
          }
          const u = rows[0];
          const userForToken = u
            ? { id: u.id, usuario: u.usuario, nivel: u.nivel }
            : { id: 'env-admin', usuario: usuario.trim().toLowerCase(), nivel: 'admin' };
          const userObj = u
            ? { id: u.id, nome: u.nome, email: u.email, usuario: u.usuario, nivel: u.nivel,
                ativo: true, criadoEm: u.criadoEm, senhaTemporaria: false }
            : { id: 'env-admin', nome: usuario, email: '', usuario: usuario.trim().toLowerCase(),
                nivel: 'admin', ativo: true, criadoEm: new Date().toISOString(), senhaTemporaria: false };
          const token = signJWT(userForToken);
          return res.status(200).json({ ok: true, user: userObj, token, mode: 'env-sync' });
        }
      }
      return res.status(401).json({ ok: false, error: 'Credenciais inválidas', mode: 'turso' });
    }

    const u = rows[0];

    // Login bem-sucedido: resetar contador de falhas
    try {
      await db.execute({
        sql: 'UPDATE users SET loginFailures = 0, lockedUntil = NULL WHERE id = ?',
        args: [u.id]
      });
    } catch {}

    const userObj = {
      id: u.id, nome: u.nome, email: u.email,
      usuario: u.usuario, nivel: u.nivel,
      ativo: Boolean(u.ativo), criadoEm: u.criadoEm,
      senhaTemporaria: Boolean(Number(u.senhaTemporaria || 0))
    };

    const token = signJWT({ userId: u.id, usuario: u.usuario, nivel: u.nivel });
    console.log('[api/login] Login OK: ' + u.usuario + ' (' + u.nivel + ')');
    return res.status(200).json({ ok: true, user: userObj, token, mode: 'turso' });

  } catch (err) {
    console.error('[api/login] Turso indisponível:', err.message);

    // Fallback de emergência: env vars (quando Turso está fora)
    if (process.env.LOGIN_USUARIO && process.env.LOGIN_SENHA) {
      const ok = usuario.trim().toLowerCase() === process.env.LOGIN_USUARIO.trim().toLowerCase()
              && senha === process.env.LOGIN_SENHA.trim();
      if (ok) {
        const envUser = { id: 'env-' + usuario, nome: usuario, usuario, nivel: 'admin', email: '' };
        const token = signJWT({ userId: envUser.id, usuario, nivel: 'admin' });
        return res.status(200).json({ ok: true, user: envUser, token, mode: 'env-fallback' });
      }
    }

    return res.status(500).json({ ok: false, error: 'Banco de dados indisponível', mode: 'error' });
  }
}
