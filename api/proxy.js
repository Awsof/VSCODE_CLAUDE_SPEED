/**
 * API Proxy Handler — Vercel Serverless Function
 * 
 * Encaminha requisições SOAP para targets externos
 * Usado para contornar CORS no navegador
 */

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { targetUrl, headers = {}, payload, timeoutMs = 120000 } = req.body || {};
  
  if (!targetUrl || !payload) {
    return res.status(400).json({ 
      error: 'targetUrl e payload obrigatórios' 
    });
  }

  const start = Date.now();
  try {
    console.log('[API/proxy] Encaminhando requisição para:', targetUrl);
    
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), timeoutMs);
    
    const r = await fetch(targetUrl, { 
      method: 'POST', 
      headers, 
      body: payload, 
      signal: ctrl.signal 
    });
    
    clearTimeout(t);

    const text = await r.text();
    const dur = Date.now() - start;

    const fault = text.includes('<soap:Fault') || text.includes('<faultcode') || text.includes(':Fault>');
    const ok = r.ok && !fault;

    let errDetail = null;
    if (fault) {
      const m = text.match(/<faultstring[^>]*>([^<]+)<\/faultstring>/i);
      errDetail = m ? m[1].trim() : 'SOAP Fault';
    } else if (!r.ok) {
      errDetail = 'HTTP ' + r.status;
    }

    console.log('[API/proxy] Resposta recebida em', dur, 'ms');

    return res.status(200).json({
      success: ok,
      statusCode: r.status,
      duration: dur,
      errorDetail: errDetail,
      responseBody: text,
    });
  } catch (e) {
    const isTimeout = e.name === 'AbortError';
    console.warn('[API/proxy] Erro:', isTimeout ? 'TIMEOUT' : e.message);
    
    return res.status(200).json({
      success: false,
      duration: Date.now() - start,
      isTimeout,
      errorDetail: isTimeout ? 'TIMEOUT' : e.message,
      responseBody: null,
    });
  }
}
