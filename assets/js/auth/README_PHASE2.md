# Fase 2 — Auth Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-07  
**Dependência:** Fase 1 (Storage Layer)

---

## 📋 Resumo

Fase 2 implementa o sistema de autenticação, autorização (RBAC) e gerenciamento de sessão do STP·SOAP v3. Inclui:
- ✅ Gerenciador de sessão (login/logout)
- ✅ Sistema RBAC com 3 níveis (admin, operador, visualizador)
- ✅ Telas de login e primeiro acesso (UI renderizada)
- ✅ Bootstrap da aplicação

---

## 📁 Arquivos Criados

### 1. `session.js` — Gerenciador de Sessão

**Responsabilidade:** Gerenciar o estado de autenticação e dados da sessão.

**Armazenamento:** `sessionStorage` (volátil, apenas para a sessão ativa)

**Schema da sessão:**
```json
{
  "userId": "uuid",
  "usuario": "joao.silva",
  "nivel": "admin|operador|visualizador",
  "loginAt": "2026-05-07T10:00:00",
  "token": "random_string_32_chars"
}
```

**Métodos públicos:**
- `getSession()` — Obter dados da sessão (valida timeout)
- `getCurrentUser()` — Obter usuário atual: `{id, usuario, nivel}`
- `getCurrentLevel()` — Obter nível: "admin", "operador", "visualizador", ou null
- `isAuthenticated()` — Verificar se há sessão ativa
- `login(user)` — Fazer login (dispara evento `session:login`)
- `logout()` — Fazer logout (dispara evento `session:logout`)
- `refresh()` — Renovar token da sessão
- `isNearTimeout(minutes)` — Verificar se session vence em N minutos
- `getTimeRemaining()` — Tempo restante em minutos
- `getDebugInfo()` — Informações para debug

**Timeout:** 8 horas por padrão (SESSION_TIMEOUT)

**Eventos customizados:**
- `session:login` — Disparado ao fazer login bem-sucedido
- `session:logout` — Disparado ao fazer logout

**Exemplo:**
```javascript
// Login
const user = await UsersManager.validate('joao.silva', 'senha123');
if (user) {
  SessionManager.login(user);
  console.log(SessionManager.getCurrentUser()); // {id, usuario, nivel}
}

// Verificar permissão por timeout
if (SessionManager.isNearTimeout(5)) {
  console.log('Sessão vence em 5 minutos!');
}

// Logout
SessionManager.logout();
```

---

### 2. `rbac.js` — Controle de Acesso Baseado em Papéis

**Responsabilidade:** Definir e verificar permissões por nível de usuário.

**Níveis:**
- **admin**: Acesso completo (usuários, perfis, grupos, cenários, agendamentos, export)
- **operador**: Acesso parcial (criar/editar recursos próprios, executar testes)
- **visualizador**: Apenas leitura de resultados

**Matriz de permissões (60+ recursos):**

| Recurso | Admin | Operador | Visualizador |
|---------|-------|----------|--------------|
| `users:*` | ✅ | ❌ | ❌ |
| `profiles:create` | ✅ | ✅ | ❌ |
| `profiles:edit` | ✅ | ✅* | ❌ |
| `tests:execute_manual` | ✅ | ✅ | ❌ |
| `results:list` | ✅ | ✅ | ✅ |
| `results:export` | ✅ | ✅ | ❌ |
| `scheduler:*` | ✅ | ✅ | ❌ |

*\*Operador edita apenas seus próprios recursos*

**Métodos públicos:**
- `can(nivel, recurso)` — Verificar se um nível tem permissão
- `canCurrent(recurso)` — Verificar permissão do usuário atual
- `requireAll(nivel, recursos)` — AND lógico (todas as permissões)
- `requireAny(nivel, recursos)` — OR lógico (qualquer permissão)
- `getPermissionsForLevel(nivel)` — Obter mapa completo de permissões
- `isAdmin(nivel)` — Verificar se é admin
- `isOperator(nivel)` — Verificar se é operador ou admin
- `isViewer(nivel)` — Verificar se é visualizador (qualquer nível)
- `getLevelDescription(nivel)` — Descrição legível do nível
- `getLevels()` — Array: `['admin', 'operador', 'visualizador']`
- `isValidLevel(nivel)` — Validar se é um nível válido
- `getDebugInfo()` — Informações para debug

**Exemplo:**
```javascript
// Verificar permissão
if (RBACManager.canCurrent('profiles:create')) {
  console.log('Usuário pode criar perfis');
}

// Verificar múltiplas (AND)
if (RBACManager.requireAll('admin', ['users:create', 'users:delete'])) {
  console.log('Admin pode fazer tudo');
}

// Obter descrição
console.log(RBACManager.getLevelDescription('operador'));
// "Operador — Criar e gerenciar recursos próprios"
```

---

### 3. `login-screen.js` — UI de Login e Primeiro Acesso

**Responsabilidade:** Renderizar telas de autenticação e validar credenciais.

**Telas renderizadas:**

#### **A) Tela de Login** (usuários existentes)
- Campo: Usuário
- Campo: Senha
- Botão: Entrar
- Mensagem de erro (credenciais inválidas)
- Spinner de carregamento

Design: Tema claro, cards brancos, botão verde-água (#0F9B94)

#### **B) Tela de Primeiro Acesso** (sem usuários cadastrados)
- Campo: Nome Completo
- Campo: Email
- Campo: Nome de Usuário
- Campo: Senha
- Campo: Confirmar Senha
- Botão: Criar Conta Administradora
- Validações inline

Design: Gradiente azul-marinho/verde-água, cards brancos

**Métodos públicos:**
- `show()` — Mostrar tela apropriada (login ou primeiro acesso)
- `renderLoginScreen()` — Renderizar tela de login manualmente
- `renderFirstAccessScreen()` — Renderizar tela de primeiro acesso manualmente

**Fluxo:**
1. `LoginScreenManager.show()` é chamado
2. Se `UsersManager.isEmpty()` → mostra Primeiro Acesso
3. Se há usuários → mostra Login
4. Ao submeter:
   - Login: valida contra `UsersManager.validate()`
   - Primeiro Acesso: cria admin com `UsersManager.create()` e faz login automático
5. Ao sucesso → `SessionManager.login()` → redirect para app principal

**Exemplo:**
```javascript
// Mostrar a tela apropriada
LoginScreenManager.show();

// Ou renderizar manualmente
LoginScreenManager.renderLoginScreen();
LoginScreenManager.renderFirstAccessScreen();
```

---

### 4. `app.js` — Bootstrap da Aplicação

**Responsabilidade:** Orquestrar a inicialização da aplicação.

**Fluxo de inicialização:**
1. ✅ Validar que todos os módulos obrigatórios estão carregados
2. ✅ Carregar dados do localStorage (storage managers)
3. ✅ Verificar sessão ativa
4. ✅ Se autenticado → carregar interface principal (placeholder Fase 3)
5. ✅ Se não autenticado → mostrar LoginScreenManager
6. ✅ Setup de event listeners globais
7. ✅ Setup de monitoramento e debug

**Métodos públicos:**
- `start()` — Iniciar app (detecta DOMContentLoaded automaticamente)
- `init()` — Executar inicialização manualmente

**Comportamentos:**
- Event listeners para `session:login` e `session:logout` (reload automático)
- Monitoramento de timeout de sessão (aviso em 5 minutos antes)
- Debug global via `window.STP_DEBUG` (acessível no console)

**Debug Console:**
```javascript
// Acessível no console do navegador
window.STP_DEBUG.session()    // Info de sessão
window.STP_DEBUG.rbac()       // Info de permissões
window.STP_DEBUG.storage()    // Counts de dados
window.STP_DEBUG.logout()     // Fazer logout
window.STP_DEBUG.login(u, p)  // Login manual (async)
```

---

## ✅ Checklist de Validação — Fase 2

- [x] Tela "Primeiro Acesso" renderiza quando não há usuários
- [x] Login valida contra `UsersManager.validate()`
- [x] Sessão rica com `{userId, usuario, nivel}`
- [x] RBAC bloqueia ações não autorizadas
- [x] SessionManager com timeout (8 horas)
- [x] Eventos customizados (session:login, session:logout)
- [x] Bootstrap automático (AppBootstrap.start)
- [x] API login.js atualizada (fallback mode + client-side)
- [x] UI de login e primeiro acesso responsiva
- [x] Debug console disponível

---

## 🔗 Integração com Fase 1

**Dependências:**
- ✅ UsersManager (validate, create, count, isEmpty)
- ✅ SessionManager (getSession, login, logout)
- ✅ LoginScreenManager (show, render)

---

## 📝 Fluxo de Autenticação

```
Carregamento do index.html
  ↓
Carregar módulos Storage (Fase 1)
  ↓
Carregar módulos Auth (Fase 2)
  ↓
Carregar módulos UI (Fase 2)
  ↓
AppBootstrap.start()
  ├─ Se sessionStorage tem session ativa
  │  └─ Carregar app principal (Fase 3)
  └─ Se não há session
     ├─ Se UsersManager.isEmpty()
     │  └─ LoginScreenManager.renderFirstAccessScreen()
     │     ├─ Validar dados
     │     ├─ UsersManager.create() → admin automático
     │     ├─ SessionManager.login()
     │     └─ Redirect app
     └─ Se há usuários
        └─ LoginScreenManager.renderLoginScreen()
           ├─ Usuário entra credenciais
           ├─ UsersManager.validate()
           ├─ SessionManager.login()
           └─ Redirect app
```

---

## 🔐 Segurança

**Implementado:**
- ✅ Senhas hasheadas com SHA-256 (nunca em texto claro)
- ✅ Validação de duplicidade (email e usuário únicos)
- ✅ SessionStorage (não localStorage) para sessão
- ✅ Timeout de sessão (8 horas)
- ✅ RBAC granular (60+ recursos)
- ✅ Eventos de logout limpa dados

**Não implementado (fora do escopo v3):**
- ❌ HTTPS enforcing (handled by Vercel)
- ❌ JWT tokens (usando token simples)
- ❌ Rate limiting de login
- ❌ 2FA/MFA

---

## 🚀 Próximo Passo

**Fase 3 — UI/UX Layer**: Implementar design system e interface principal (sidebar, modais, componentes)

---

*Implementado em 2026-05-07 | Auth Layer v1.0*
