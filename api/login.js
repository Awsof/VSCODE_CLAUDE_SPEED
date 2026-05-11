/**
 * API Login Handler — Vercel Serverless Function
 * 
 * Aceita admin/admin para testes
 * Valida contra variáveis de ambiente se definidas
 */

export default function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, message: 'Method not allowed' });
  }

  const { usuario, senha } = req.body || {};

  console.log('[API/login] Tentativa de login com usuário:', usuario);

  // Validação: credenciais não podem estar vazias
  if (!usuario || !senha) {
    console.log('[API/login] Usuário ou senha vazios');
    return res.status(200).json({ 
      ok: false, 
      message: 'Usuário e senha são obrigatórios' 
    });
  }

  // Modo 1: Env vars do Vercel (LOGIN_USUARIO, LOGIN_SENHA)
  if (process.env.LOGIN_USUARIO && process.env.LOGIN_SENHA) {
    const ok = usuario === process.env.LOGIN_USUARIO &&
               senha === process.env.LOGIN_SENHA;

    console.log('[API/login] Validando contra env vars:', ok);
    return res.status(200).json({ 
      ok,
      mode: 'env-fallback',
      message: ok ? 'Login bem-sucedido' : 'Credenciais inválidas'
    });
  }

  // Modo 2: Fallback hardcoded para testes (admin/admin)
  // Sempre aceita admin/admin durante desenvolvimento
  const ok = usuario === 'admin' && senha === 'admin';
  console.log('[API/login] Modo test-fallback, admin/admin:', ok);
  
  return res.status(200).json({ 
    ok,
    mode: 'test-fallback',
    message: ok ? 'Login bem-sucedido' : 'Credenciais inválidas'
  });
}

