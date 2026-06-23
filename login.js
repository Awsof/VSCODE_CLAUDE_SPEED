/**
 * DEPRECATED: Use /api/login instead
 * This file is kept for backward compatibility only
 */

module.exports = function handler(req, res) {
  // Redirecionar para /api/login
  res.setHeader('Location', '/api/login');
  res.setHeader('Access-Control-Allow-Origin', '*');
  return res.status(301).end();
};
