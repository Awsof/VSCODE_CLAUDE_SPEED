/**
 * Turso DB client, JWT helpers e schema init
 * Importado pelos handlers de API: login.js, users.js, results.js
 */

import { createClient } from '@libsql/client';
import crypto from 'crypto';

export const getDb = () => {
  if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
    throw new Error('TURSO_DATABASE_URL e TURSO_AUTH_TOKEN devem estar configurados');
  }
  return createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN
  });
};

export const sha256 = (str) =>
  crypto.createHash('sha256').update(str, 'utf8').digest('hex');

const _secret = () => process.env.JWT_SECRET || 'stp-dev-secret-altere-em-producao';

export const signJWT = (payload) => {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
  const body = Buffer.from(JSON.stringify({
    ...payload,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor(Date.now() / 1000) + 86400 * 7 // 7 dias
  })).toString('base64url');
  const sig = crypto.createHmac('sha256', _secret())
    .update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
};

export const verifyJWT = (token) => {
  try {
    const parts = (token || '').split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expected = crypto.createHmac('sha256', _secret())
      .update(`${header}.${body}`).digest('base64url');
    if (sig !== expected) return null;
    const payload = JSON.parse(Buffer.from(body, 'base64url').toString());
    if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) return null;
    return payload;
  } catch { return null; }
};

export const getAuthPayload = (req) => {
  const auth = req.headers.authorization || '';
  if (!auth.startsWith('Bearer ')) return null;
  return verifyJWT(auth.slice(7));
};

export const initSchema = async (db) => {
  await db.execute(`CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    usuario TEXT UNIQUE NOT NULL,
    nome TEXT,
    email TEXT,
    senhaHash TEXT NOT NULL,
    nivel TEXT NOT NULL DEFAULT 'visualizador',
    ativo INTEGER NOT NULL DEFAULT 1,
    criadoEm TEXT NOT NULL,
    updatedAt TEXT
  )`);
  await db.execute(`CREATE TABLE IF NOT EXISTS results (
    id TEXT PRIMARY KEY,
    seq INTEGER,
    profileId TEXT,
    endpoint TEXT,
    version TEXT,
    duration INTEGER,
    statusCode INTEGER,
    success INTEGER NOT NULL DEFAULT 0,
    numAtendimentoDB TEXT,
    errorDetail TEXT,
    origem TEXT,
    scheduleId TEXT,
    executadoPor TEXT,
    executadoEm TEXT NOT NULL,
    cenarioId TEXT
  )`);
};
