/**
 * GET /api/app-settings?key=<k> — Lê configuração (qualquer usuário autenticado)
 * PUT /api/app-settings?key=<k> — Salva configuração (apenas admin)
 */

import { getDb, initSchema, getAuthPayload } from './_db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, PUT, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const key = (req.query && req.query.key) || '';
  if (!key) return res.status(400).json({ error: 'Parâmetro key obrigatório' });

  let db;
  try {
    db = getDb();
    await initSchema(db);
  } catch {
    return res.status(503).json({ error: 'Banco de dados indisponível' });
  }

  // ─── GET: retorna valor ───────────────────────────────────────────────────
  if (req.method === 'GET') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(401).json({ error: 'Autenticação obrigatória' });

    try {
      const { rows } = await db.execute({
        sql: 'SELECT value FROM app_settings WHERE key = ?',
        args: [key]
      });
      if (!rows.length) return res.status(200).json({ value: null });
      return res.status(200).json({ value: rows[0].value });
    } catch {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  // ─── PUT: salva valor (admin only) ────────────────────────────────────────
  if (req.method === 'PUT') {
    const payload = getAuthPayload(req);
    if (!payload) return res.status(401).json({ error: 'Autenticação obrigatória' });
    if (payload.nivel !== 'admin') return res.status(403).json({ error: 'Apenas administradores podem alterar configurações' });

    const { value } = req.body || {};
    if (value === undefined) return res.status(400).json({ error: 'Campo value obrigatório' });

    try {
      await db.execute({
        sql: 'INSERT OR REPLACE INTO app_settings (key, value) VALUES (?, ?)',
        args: [key, typeof value === 'string' ? value : JSON.stringify(value)]
      });
      return res.status(200).json({ ok: true });
    } catch {
      return res.status(500).json({ error: 'Erro interno do servidor' });
    }
  }

  return res.status(405).json({ error: 'Método não permitido' });
}
