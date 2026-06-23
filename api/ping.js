export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(200).json({
    hasTursoUrl:   !!process.env.TURSO_DATABASE_URL,
    urlLen:         (process.env.TURSO_DATABASE_URL  || '').length,
    hasTursoToken: !!process.env.TURSO_AUTH_TOKEN,
    tokenLen:       (process.env.TURSO_AUTH_TOKEN    || '').length,
    hasJwtSecret:  !!process.env.JWT_SECRET,
    jwtLen:         (process.env.JWT_SECRET          || '').length,
    hasLoginUser:  !!process.env.LOGIN_USUARIO,
    vercelEnv:      process.env.VERCEL_ENV  || 'n/a',
    node:           process.version
  });
}
