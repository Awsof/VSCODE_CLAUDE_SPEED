/**
 * API Login Handler — Vercel Serverless Function
 * 
 * Modo v3 (novo):
 * - Autenticação principal: client-side via UsersManager.validate()
 * - Esta API: serve como fallback para desenvolvimento ou validação de token
 * 
 * Modo v2 (legado):
 * - Se LOGIN_USUARIO e LOGIN_SENHA estão definidas, valida contra elas
 * - Mantém compatibilidade com proxy SOAP
 */

module.exports = function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ ok: false });

  const { usuario, senha } = req.body || {};

  // Validação: credenciais não podem estar vazias
  if (!usuario || !senha) {
    return res.status(200).json({ 
      ok: false, 
      message: 'Usuário e senha são obrigatórios' 
    });
  }

  // Modo fallback (v2): usar env vars se definidas
  // Isso mantém compatibilidade com testes e deploy initial
  if (process.env.LOGIN_USUARIO && process.env.LOGIN_SENHA) {
    const ok = usuario === process.env.LOGIN_USUARIO &&
               senha === process.env.LOGIN_SENHA;

    return res.status(200).json({ 
      ok,
      mode: 'fallback', // Indica que está usando env vars
      message: ok ? 'Login bem-sucedido (modo fallback)' : 'Credenciais inválidas'
    });
  }

  // Modo v3: autenticação é client-side
  // Esta API apenas retorna um erro indicando que deve usar client-side
  return res.status(200).json({ 
    ok: false, 
    mode: 'client-side',
    message: 'Autenticação deve ser feita client-side com UsersManager'
  });
};
