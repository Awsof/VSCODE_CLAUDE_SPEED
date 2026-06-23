/**
 * GET  /api/users         — Lista usuários (público, sem senhaHash)
 * POST /api/users         — Criar usuário (JWT admin, ou primeiro usuário sem auth)
 * POST /api/users?migrate — Migração em lote do localStorage (sem auth, apenas quando tabela vazia)
 */

import { getDb, initSchema, getAuthPayload } from './db.js';

const _rowToUser = (r) => ({
  id: r.id, nome: r.nome, email: r.email,
  usuario: r.usuario, nivel: r.nivel,
  ativo: Boolean(Number(r.ativo)), criadoEm: r.criadoEm
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
    return res.status(503).json({ error: 'Banco de dados indisponível', detail: err.message });
  }

  // ─── GET: lista usuários (público) ───────────────────────────────────────
  if (req.method === 'GET') {
    try {
      const { rows } = await db.execute('SELECT * FROM users ORDER BY criadoEm ASC');
      return res.status(200).json({ users: rows.map(_rowToUser) });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  // ─── POST: criar usuário ou migrar em lote ───────────────────────────────
  if (req.method === 'POST') {
    const body = req.body || {};

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
        return res.status(500).json({ error: err.message });
      }
    }

    // Criar usuário único — requer admin JWT, EXCETO quando tabela está vazia
    const payload = getAuthPayload(req);
    const { rows: countRows } = await db.execute('SELECT COUNT(*) as cnt FROM users');
    const tableEmpty = Number(countRows[0].cnt) === 0;

    if (!tableEmpty && (!payload || payload.nivel !== 'admin')) {
      return res.status(tableEmpty ? 200 : 403).json({ error: 'Permissão negada' });
    }

    const { id, usuario, nome, email, senhaHash, nivel, criadoEm } = body;
    if (!id || !usuario || !senhaHash) {
      return res.status(400).json({ error: 'id, usuario e senhaHash são obrigatórios' });
    }

    try {
      await db.execute({
        sql: `INSERT OR REPLACE INTO users (id, usuario, nome, email, senhaHash, nivel, ativo, criadoEm, updatedAt)
              VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?)`,
        args: [id, usuario.toLowerCase(), nome || '', email || '', senhaHash,
               nivel || 'visualizador', criadoEm || new Date().toISOString(),
               new Date().toISOString()]
      });
      const { rows } = await db.execute({ sql: 'SELECT * FROM users WHERE id = ?', args: [id] });
      return res.status(201).json({ user: _rowToUser(rows[0]) });
    } catch (err) {
      if (err.message?.includes('UNIQUE')) {
        return res.status(409).json({ error: 'Usuário já existe' });
      }
      return res.status(500).json({ error: err.message });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
