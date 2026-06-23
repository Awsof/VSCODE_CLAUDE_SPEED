import { getDb, initSchema } from './db.js';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const envCheck = {
    hasTursoUrl:   !!process.env.TURSO_DATABASE_URL,
    urlLen:         (process.env.TURSO_DATABASE_URL  || '').length,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    tokenLen:       (process.env.TURSO_AUTH_TOKEN    || '').length,
    hasJwtSecret:  !!process.env.JWT_SECRET,
    vercelEnv:      process.env.VERCEL_ENV || 'n/a',
    node:           process.version
  };

  let db = { ok: false, error: null, resultCount: null };
  try {
    const client = getDb();
    await initSchema(client);
    const { rows } = await client.execute('SELECT COUNT(*) as cnt FROM results');
    db = { ok: true, resultCount: Number(rows[0].cnt) };
  } catch (err) {
    db = { ok: false, error: err.message };
  }

  return res.status(200).json({ ...envCheck, db });
}
