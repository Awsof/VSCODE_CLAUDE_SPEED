# Guia Técnico — Speed Teste DBSync v3

**Público-alvo:** Analistas e desenvolvedores responsáveis pela manutenção e evolução do sistema  
**Projeto:** Monitor de Performance para endpoints SOAP/WCF — Grupo DB · Medicina Diagnóstica  
**Última atualização:** 2026-05-20

---

## Índice

1. [Visão Geral](#1-visão-geral)
2. [Stack Tecnológica](#2-stack-tecnológica)
3. [Configuração do Ambiente Local](#3-configuração-do-ambiente-local)
4. [Arquitetura em 6 Fases](#4-arquitetura-em-6-fases)
5. [Padrão de Módulos (IIFE Revealing Module)](#5-padrão-de-módulos-iife-revealing-module)
6. [Tabela de Globals (window.*)](#6-tabela-de-globals-window)
7. [Camada de Storage](#7-camada-de-storage)
8. [Autenticação e RBAC](#8-autenticação-e-rbac)
9. [Pipeline de Execução SOAP](#9-pipeline-de-execução-soap)
10. [Scheduler CRON](#10-scheduler-cron)
11. [Sistema de Eventos](#11-sistema-de-eventos)
12. [Design System CSS](#12-design-system-css)
13. [API do Proxy Serverless](#13-api-do-proxy-serverless)
14. [Debugging em Produção](#14-debugging-em-produção)
15. [Tarefas de Manutenção Comuns](#15-tarefas-de-manutenção-comuns)
16. [Convenções Críticas](#16-convenções-críticas)
17. [Deploy e Cache-Bust](#17-deploy-e-cache-bust)

---

## 1. Visão Geral

O **Speed Teste DBSync v3** é uma SPA (Single Page Application) para monitoramento de performance de endpoints SOAP/WCF utilizados internamente pelo Grupo DB. O sistema permite:

- Cadastrar perfis de endpoint SOAP com templates de payload
- Executar testes de carga com controle de concorrência (1–20 requisições simultâneas)
- Agendar execuções automáticas com regras de data/hora/frequência
- Visualizar resultados em gráficos Chart.js com histórico persistido
- Exportar relatórios em Excel, CSV e HTML (com gráficos interativos, otimizado para impressão via browser)
- Controle de acesso granular por papel (admin / operador / visualizador)

**O sistema é 100% client-side.** Não existe banco de dados — toda a persistência é feita via `localStorage`. O único componente server-side é a função serverless `/api/proxy.js` (Vercel), que serve exclusivamente como proxy CORS para as chamadas SOAP.

---

## 2. Stack Tecnológica

| Camada | Tecnologia | Versão |
|--------|-----------|--------|
| Frontend | Vanilla JavaScript (ES6+) | — |
| Persistência | `localStorage` (browser) | — |
| Charts | Chart.js (CDN) | 4.4.0 |
| Export Excel | SheetJS/XLSX (CDN) | 0.18.5 |
| Export HTML/PDF | Geração nativa via Blob + `window.print()` | — |
| Hosting | Vercel (static + serverless) | — |
| Proxy | Vercel Serverless Function (Node.js) | — |
| Fontes | Google Fonts (Inter + JetBrains Mono) | — |

**Sem build step.** Não há webpack, vite, babel, npm scripts, transpilação ou bundling. Os arquivos são servidos diretamente como estáticos. Isso significa:

- Não existe `node_modules` a instalar para o frontend
- Mudanças em JS/CSS são imediatamente refletidas ao recarregar (com cache-bust — veja §17)
- Toda a compatibilidade de sintaxe deve ser garantida manualmente (ES6+ é suficiente para Chrome/Edge modernos)

---

## 3. Configuração do Ambiente Local

### Servir o projeto localmente

```powershell
# Opção 1: npx serve (sem instalação prévia)
npx serve .

# Opção 2: Live Server (extensão VS Code)
# Clique com botão direito em index.html → "Open with Live Server"

# Opção 3: Python (se disponível)
python -m http.server 8080
```

O projeto deve ser acessado por HTTP (não `file://`). O arquivo `file://` não funciona porque o browser bloqueia requisições ao proxy por questões de segurança.

### Deploy para Vercel

```powershell
vercel deploy
# ou para production
vercel deploy --prod
```

### Requisitos mínimos

- Browser moderno (Chrome/Edge/Firefox — últimas 2 versões)
- Acesso à internet (para carregar fontes e bibliotecas CDN)
- Nenhuma variável de ambiente é necessária no cliente

---

## 4. Arquitetura em 6 Fases

### Estrutura de diretórios

```
Speed_TESTE_NEW/
├── index.html                        # Shell da SPA — carrega todos os módulos em ordem
├── api/
│   └── proxy.js                      # Vercel Serverless — proxy CORS para SOAP
├── assets/
│   ├── css/
│   │   ├── reset.css                 # Normalização de browser
│   │   ├── variables.css             # Design tokens (CSS variables)
│   │   ├── layout.css                # Grid 2-colunas, sidebar, header
│   │   ├── components.css            # Buttons, cards, badges, modals, tables
│   │   ├── charts.css                # Chart.js layout e chart-card
│   │   └── animations.css            # Keyframes, fade, pulse
│   └── js/
│       ├── app.js                    # Bootstrap: valida globals, inicializa módulos
│       ├── storage/                  # Fase 1 — Persistência localStorage
│       │   ├── engine.js             #   StorageEngine — CRUD genérico
│       │   ├── users.js              #   UsersManager
│       │   ├── profiles.js           #   ProfilesManager
│       │   ├── groups.js             #   GroupsManager
│       │   ├── scenarios.js          #   ScenariosManager
│       │   ├── results.js            #   ResultsManager
│       │   ├── schedules.js          #   SchedulerManager
│       │   ├── methods.js            #   MethodsManager
│       │   └── audit-log.js          #   AuditLogManager
│       ├── auth/                     # Fase 2 — Autenticação e autorização
│       │   ├── session.js            #   SessionManager (30min inatividade)
│       │   └── rbac.js               #   RBACManager (78 permissões)
│       ├── ui/                       # Fase 3 — Interface
│       │   ├── login-screen.js       #   LoginScreenManager
│       │   ├── modals.js             #   ModalManager
│       │   ├── notifications.js      #   NotificationsManager
│       │   ├── sidebar.js            #   SidebarManager
│       │   └── renderer.js           #   Renderer (9 abas + gráficos)
│       ├── engine/                   # Fase 4 — Executor SOAP
│       │   ├── config.js             #   ConfigEngine — constantes
│       │   ├── xml.js                #   XMLEngine — parse e extração
│       │   ├── utils.js              #   UtilsEngine — helpers
│       │   └── runner.js             #   RunnerEngine — executor concorrente
│       ├── features/                 # Fase 5 — Funcionalidades avançadas
│       │   ├── executor.js           #   ScenarioExecutor
│       │   └── scheduler.js          #   ScheduleRunner
│       └── reports/                  # Fase 6 — Exportação
│           └── reports.js            #   ReportsManager
```

### Ordem de carregamento em `index.html`

A ordem dos `<script>` tags é **crítica** — cada módulo depende dos anteriores já estarem em `window.*`:

```
Chart.js, XLSX (CDN)
  ↓
storage/engine.js
  ↓
storage/users.js, profiles.js, groups.js, scenarios.js, results.js, schedules.js, methods.js, audit-log.js
  ↓
auth/session.js, auth/rbac.js
  ↓
ui/login-screen.js
  ↓
ui/modals.js, notifications.js, sidebar.js, renderer.js
  ↓
engine/config.js, xml.js, utils.js, runner.js
  ↓
features/executor.js, scheduler.js
  ↓
reports/reports.js
  ↓
app.js  ← inicializa tudo
```

Se um módulo for adicionado fora de ordem, o `app.js` vai reportar erro de validação no console ao inicializar.

---

## 5. Padrão de Módulos (IIFE Revealing Module)

Todos os 21 módulos JavaScript seguem **exatamente** este padrão:

```javascript
const MeuModulo = (() => {
  // --- Estado privado ---
  const state = {
    dado: null,
    listeners: []
  };

  // --- Funções privadas (prefixadas com _) ---
  const _funcaoInterna = () => {
    // lógica privada
  };

  // --- API pública ---
  const metodoPublico = (param) => {
    _funcaoInterna();
    return param;
  };

  // --- Registro de eventos (quando aplicável) ---
  const on = (eventType, callback) => {
    state.listeners.push({ eventType, callback });
  };

  return {
    metodoPublico,
    on
  };
})();

// Registrar no namespace global
window.MeuModulo = MeuModulo;
```

**Por que IIFE?** Encapsula estado privado sem poluir o escopo global. O único símbolo global por módulo é o registrado explicitamente em `window.*`.

### Adicionando um novo módulo

1. Criar o arquivo em `assets/js/<fase>/novo-modulo.js` seguindo o padrão acima
2. Adicionar `<script src="assets/js/<fase>/novo-modulo.js?v=1"></script>` em `index.html` **na posição correta de dependência**
3. Em `app.js`, adicionar o nome do global à lista de validação em `_validateModules()`:
   ```javascript
   const required = [
     'StorageEngine', 'UsersManager', /* ... */ 'NovoModulo'
   ];
   ```

---

## 6. Tabela de Globals (window.*)

| Global | Arquivo | Responsabilidade | Métodos principais |
|--------|---------|------------------|--------------------|
| `StorageEngine` | `storage/engine.js` | CRUD genérico no localStorage com prefixo `stp_v3_` | `get(key, default)`, `set(key, value)`, `remove(key)`, `list()`, `clear()`, `exists(key)` |
| `UsersManager` | `storage/users.js` | Gestão de usuários com hash SHA-256 | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)`, `validate(usuario, senha)` |
| `ProfilesManager` | `storage/profiles.js` | Endpoints SOAP e templates de payload | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)`, `count()` |
| `GroupsManager` | `storage/groups.js` | Agrupamento de perfis | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)` |
| `ScenariosManager` | `storage/scenarios.js` | Cenários de teste com passos sequenciais | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)` |
| `ResultsManager` | `storage/results.js` | Histórico de execuções (max 5.000) | `save(result)`, `list()`, `getById(id)`, `getStats()`, `cleanup()` |
| `SchedulerManager` | `storage/schedules.js` | Persistência de agendamentos | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)`, `getDue()`, `recordExecution(id)` |
| `MethodsManager` | `storage/methods.js` | Métodos SOAP reutilizáveis | `create(data)`, `list()`, `getById(id)`, `update(id, data)`, `delete(id)` |
| `AuditLogManager` | `storage/audit-log.js` | Log de auditoria de ações | `log(action, detail)`, `list()`, `getByUser(userId)` |
| `SessionManager` | `auth/session.js` | Controle de sessão (30min inatividade) | `login(user)`, `logout()`, `getSession()`, `getCurrentUser()`, `isAuthenticated()`, `updateActivity()`, `isNearTimeout(minutes)` |
| `RBACManager` | `auth/rbac.js` | Verificação de 78 permissões por papel | `canCurrent(resource)`, `can(userId, resource)`, `isAdmin()`, `getPermissionsForLevel(nivel)` |
| `LoginScreenManager` | `ui/login-screen.js` | Tela de login e primeiro acesso | `show()` |
| `SidebarManager` | `ui/sidebar.js` | Navegação lateral com filtro RBAC | `render(currentUser)` |
| `ModalManager` | `ui/modals.js` | Ciclo de vida de modais | `open(id)`, `close(id)`, `confirm(msg, onConfirm)` |
| `NotificationsManager` | `ui/notifications.js` | Toasts com auto-dismiss | `success(msg)`, `error(msg)`, `warning(msg)`, `info(msg)` |
| `Renderer` | `ui/renderer.js` | Render das 9 abas e gráficos Chart.js | `renderMainApp(user)`, `renderTab(tabId)`, `getCurrentTab()` |
| `ConfigEngine` | `engine/config.js` | Constantes de timeout, concorrência, ramp-up | `get(key)`, `set(key, value)`, `all()` |
| `XMLEngine` | `engine/xml.js` | Parse XML, extração de tags, detecção SOAP Fault | `parse(xmlString)`, `extractTag(xml, tag)`, `hasFault(xml)`, `extractFaultString(xml)` |
| `UtilsEngine` | `engine/utils.js` | Helpers gerais | `sleep(ms)`, `fms(ms)`, `escape(str)`, `hashSHA256(str)`, `formatAttendanceNumber(codigo, seq)` |
| `RunnerEngine` | `engine/runner.js` | Executor SOAP concorrente com AbortController | `run(profile, config)`, `executeBatch(profiles, config)`, `on(eventType, cb)` |
| `ScenarioExecutor` | `features/executor.js` | Execução sequencial de cenários | `execute(scenario)`, `cancel()`, `on(eventType, cb)` |
| `ScheduleRunner` | `features/scheduler.js` | Monitor CRON em background (60s interval) | `start()`, `stop()`, `on(eventType, cb)` |
| `ReportsManager` | `reports/reports.js` | Exportação de dados | `exportExcel()`, `exportCSV()`, `exportHTML(options)`, `getSummary()`, `getRows()` |

---

## 7. Camada de Storage

### StorageEngine — Abstração Base

Todas as leituras/escritas no `localStorage` passam pelo `StorageEngine`. **Nunca acesse `localStorage` diretamente** fora desta camada.

```javascript
// Chaves reais no localStorage:
// stp_v3_users, stp_v3_profiles, stp_v3_groups, stp_v3_scenarios,
// stp_v3_results, stp_v3_schedules, stp_v3_methods, stp_v3_audit_log

StorageEngine.get('users', [])         // Lê stp_v3_users (default = [])
StorageEngine.set('users', arrayData)  // Serializa e salva
StorageEngine.remove('users')          // Remove a chave
StorageEngine.list()                   // Retorna todas as chaves stp_v3_*
StorageEngine.exists('profiles')       // boolean
```

### Schemas das Entidades

#### Usuário
```javascript
{
  id: "uuid-v4",
  nome: "João Silva",
  email: "joao@grupoDb.com.br",
  usuario: "joao.silva",           // login único
  senhaHash: "sha256_hex_string",
  nivel: "admin" | "operador" | "visualizador",
  ativo: true,
  criadoPor: "uuid-do-criador",
  criadoEm: "2026-01-15T10:00:00.000Z"
}
```

#### Perfil (Endpoint SOAP)
```javascript
{
  id: "uuid-v4",
  nome: "Produção — GetAtendimento",
  url: "https://api.grupoDb.com.br/soap/atendimento",
  soapAction: "GetAtendimento",
  xmlTag: "diag:NumeroAtendimentoApoiado",  // tag a extrair da resposta
  template: "<?xml version=\"1.0\"?>...",    // payload com placeholders
  groupId: "uuid-do-grupo" | null,
  criadoPor: "uuid",
  criadoEm: "2026-01-15T10:00:00.000Z"
}
```

**Placeholders no template:** `{{NUM_ATENDIMENTO}}`, `{{LOGIN}}`, `{{SENHA}}`

#### Grupo
```javascript
{
  id: "uuid-v4",
  nome: "Produção",
  descricao: "Endpoints de produção",
  criadoPor: "uuid",
  criadoEm: "2026-01-15T10:00:00.000Z"
}
```

#### Cenário (Teste multi-passo)
```javascript
{
  id: "uuid-v4",
  nome: "Validação Matutina",
  descricao: "Testa todos os endpoints principais",
  passos: [
    { ordem: 1, profileId: "uuid", requests: 10, concorrencia: 3 },
    { ordem: 2, profileId: "uuid", requests: 5,  concorrencia: 1 }
  ],
  criadoPor: "uuid",
  criadoEm: "2026-01-15T10:00:00.000Z"
}
```

#### Resultado de Execução
```javascript
{
  id: "uuid-v4",
  seq: 1042,                           // número sequencial global
  profileId: "uuid",
  profileNome: "Produção — GetAtendin", // snapshot do nome no momento
  attendanceNumber: "DBSYN20260115042",
  success: true,
  duration: 234,                        // ms
  statusCode: 200,
  requestPayload: "<soapenv:Envelope>...",
  responseBody: "<soapenv:Envelope>...",
  numAtendimentoDB: "20260115000042",   // valor extraído da xmlTag
  origem: "manual" | "schedule" | "scenario",  // OBRIGATÓRIO
  executadoPor: "uuid-do-usuario",             // OBRIGATÓRIO
  scheduleId: "uuid" | null,
  executadoEm: "2026-01-15T10:05:34.221Z"
}
```

> **Atenção:** Os campos `origem` e `executadoPor` são **obrigatórios** em todo resultado. A UI filtra e exibe resultados separados por origem.

#### Agendamento
```javascript
{
  id: "uuid-v4",
  nome: "Monitor Noturno",
  descricao: "Verificação a cada 5 minutos",
  cenarioId: "uuid" | null,    // se null, usa profileIds abaixo
  profileIds: ["uuid1", "uuid2"],
  config: {
    requestsPerProfile: 5,
    concurrency: 2,
    rampUp: 0,
    timeout: 120
  },
  agendamento: {
    dataInicio: "2026-06-01",
    dataFim: "2026-06-30",
    horaInicio: "08:00",
    horaFim: "18:00",
    frequenciaMinutos: 5,
    diasSemana: [1, 2, 3, 4, 5]  // 0=Dom, 1=Seg, ..., 6=Sáb
  },
  ativo: true,
  proximaExecucao: "2026-06-01T08:05:00.000Z",  // calculado automaticamente
  ultimaExecucao: "2026-06-01T08:00:00.000Z" | null,
  criadoPor: "uuid",
  criadoEm: "2026-01-15T10:00:00.000Z"
}
```

### Regra de Cleanup de Resultados

O `ResultsManager.save()` verifica automaticamente se o total de resultados ultrapassou **5.000 registros**. Se ultrapassar, remove os registros mais antigos até voltar ao limite. O cleanup é **automático e silencioso** — não requer chamada manual.

### Migração v2 → v3

Na inicialização, o `StorageEngine` verifica se existem dados com prefixo `stp_` (v2) e os migra automaticamente para `stp_v3_`. Isso ocorre **uma única vez** e é transparente ao usuário.

---

## 8. Autenticação e RBAC

### Fluxo de Autenticação

```
Usuário digita login/senha
  ↓
UsersManager.validate(usuario, senha)
  → SHA-256(senha) === user.senhaHash?
  ↓ (sim)
SessionManager.login(user)
  → Salva em sessionStorage: { userId, usuario, nivel, loginAt, lastActivity }
  → Dispara CustomEvent 'session:login'
  ↓
app.js recarrega a página → Renderer.renderMainApp(user)
  ↓
ScheduleRunner.start() — inicia monitor CRON
```

### Sessão e Timeout

- **Armazenamento:** `sessionStorage` (não localStorage — apaga ao fechar o browser)
- **Timeout:** **30 minutos de inatividade** (`SESSION_TIMEOUT = 30 * 60 * 1000` ms)
- **Verificação:** Lazy — feita dentro de `SessionManager.getSession()`. Não há timer ativo; a inatividade é detectada na próxima ação do usuário
- **Reset de inatividade:** Qualquer interação do usuário (mousemove, keydown, click, scroll, touchstart) chama `SessionManager.updateActivity()` com debounce de 5 segundos
- **Aviso:** 5 minutos antes do timeout, um toast de warning é exibido (verificado a cada 60s em `app.js`)

```javascript
// Verificar sessão atual
const session = SessionManager.getSession();  // null se expirado
const user = SessionManager.getCurrentUser(); // { userId, usuario, nivel }

// Forçar logout programaticamente
SessionManager.logout();  // dispara 'session:logout' → recarrega a página
```

### Estrutura do RBAC

Três papéis com capacidades crescentes:

| Papel | Capacidades |
|-------|------------|
| `visualizador` | Ver resultados, exportar relatórios |
| `operador` | + Criar/editar perfis, grupos, cenários; executar testes |
| `admin` | + Gerenciar usuários, configurações, agendamentos |

**Sempre verificar permissão antes de renderizar ações destrutivas:**

```javascript
// API correta — use canCurrent(), não hasPermission()
if (RBACManager.canCurrent('profiles:delete')) {
  // Exibir botão "Excluir"
}

if (RBACManager.canCurrent('users:create')) {
  // Exibir formulário de novo usuário
}
```

### Adicionando uma Nova Permissão

Em `assets/js/auth/rbac.js`, adicionar no objeto `PERMISSIONS`:

```javascript
'minha-funcionalidade:acao': {
  admin: true,
  operador: true,
  visualizador: false
}
```

Em seguida, usar na UI:

```javascript
if (RBACManager.canCurrent('minha-funcionalidade:acao')) {
  // Renderizar controle
}
```

### Primeiro Acesso

Se `UsersManager.list()` retornar array vazio (sistema novo), a tela de primeiro acesso é exibida automaticamente pelo `LoginScreenManager.show()`, solicitando criação do usuário administrador inicial.

---

## 9. Pipeline de Execução SOAP

### Sequência completa

```
1. Usuário configura: perfil, quantidade de requisições, concorrência, timeout
        ↓
2. RunnerEngine.run(profile, config)
        ↓
3. Geração do número de atendimento (UtilsEngine.formatAttendanceNumber)
   Formato: {CODIGO}{YYYYMMDD}{SEQ:003}
   Exemplo: DBSYN20260115042
   Contadores: localStorage key = cnt_{CODIGO}_{YYYYMMDD} (reset automático à meia-noite)
        ↓
4. Fill do template do payload
   {{NUM_ATENDIMENTO}} → número gerado
   {{LOGIN}} → login do perfil ou usuário logado
   {{SENHA}} → senha configurada no perfil
        ↓
5. POST para /api/proxy.js (requisição ao proxy Vercel)
   { targetUrl, headers: { SOAPAction, Content-Type }, payload, timeoutMs }
        ↓
6. Proxy encaminha para o endpoint SOAP real e retorna:
   { success, statusCode, duration, responseBody, errorDetail }
        ↓
7. XMLEngine.extractTag(responseBody, profile.xmlTag)
   → Extrai o valor da tag configurada (ex: diag:NumeroAtendimentoApoiado)
   → Sempre retorna null se não encontrado (nunca undefined)
        ↓
8. ResultsManager.save(result) — persiste com origem e executadoPor
        ↓
9. RunnerEngine emite eventos → UI atualiza progresso em tempo real
```

### Concorrência e AbortController

O `RunnerEngine` controla a concorrência via semáforo interno. Para um lote de 20 requisições com concorrência 5, mantém exatamente 5 em voo ao mesmo tempo. Cada requisição individual usa `AbortController` com o timeout configurado (padrão: 120s).

### Detecção de SOAP Fault

```javascript
if (XMLEngine.hasFault(responseBody)) {
  const mensagem = XMLEngine.extractFaultString(responseBody);
  // result.success = false, result.errorDetail = mensagem
}
```

---

## 10. Scheduler CRON

### Como funciona

O `ScheduleRunner` opera exclusivamente **enquanto a aba do browser está aberta**. Não é um CRON do sistema operacional.

```
ScheduleRunner.start()
  ↓
_checkAndExecuteDue() — imediato (Promise.resolve)
  ↓
setInterval(_checkAndExecuteDue, 60000)  // a cada 60 segundos
```

### Condições para um agendamento disparar

Todas as 4 condições devem ser verdadeiras simultaneamente:

1. `schedule.ativo === true`
2. Data atual está entre `dataInicio` e `dataFim`
3. Dia da semana atual está em `diasSemana`
4. `schedule.proximaExecucao <= now` (timestamp calculado internamente)

### Cálculo do próximo horário

Após cada execução, `SchedulerManager.recordExecution(id)` recalcula `proximaExecucao` considerando:
- A frequência em minutos (`frequenciaMinutos`)
- A janela de horário (`horaInicio` / `horaFim`)
- Os dias permitidos (`diasSemana`)

O cálculo usa `proximaExecucao` anterior como âncora (sem drift acumulativo).

### Recuperação de execuções perdidas

Ao reabrir a aba, `_checkAndExecuteDue()` roda imediatamente e detecta quaisquer agendamentos com `proximaExecucao` no passado. Eles são executados na ordem de vencimento.

### Sessão e agendamento

Para garantir que a sessão não expire enquanto há agendamentos ativos, o scheduler deve chamar `SessionManager.updateActivity()` em cada tick quando existem agendamentos ativos. Caso a sessão expire, a página recarrega e o scheduler para. Veja §15 para a implementação da correção.

---

## 11. Sistema de Eventos

Três módulos expõem um sistema de eventos via `.on(eventType, callback)`:

```javascript
// RunnerEngine
RunnerEngine.on('request-complete', ({ result, index, total }) => {
  // chamado após cada requisição individual
});
RunnerEngine.on('batch-complete', ({ results, profile }) => {
  // chamado quando o lote inteiro termina
});
RunnerEngine.on('batch-error', ({ error, profile }) => {
  // chamado em caso de erro catastrófico no lote
});

// ScenarioExecutor
ScenarioExecutor.on('step-start', ({ step, index }) => { });
ScenarioExecutor.on('step-complete', ({ step, results }) => { });
ScenarioExecutor.on('scenario-complete', ({ scenario, allResults }) => { });
ScenarioExecutor.on('scenario-cancelled', () => { });

// ScheduleRunner
ScheduleRunner.on('schedule-executing', ({ schedule }) => { });
ScheduleRunner.on('schedule-executed', ({ schedule, results }) => { });
ScheduleRunner.on('runner-start', () => { });
ScheduleRunner.on('runner-stop', () => { });
```

**Eventos fluem em sentido único:** módulos emitem, listeners da UI reagem. Nunca há dependência circular (UI não é importada pelos módulos do engine).

### Implementando emissão de eventos em um novo módulo

```javascript
const NovoModulo = (() => {
  const state = { listeners: [] };

  const _emit = (eventType, data) => {
    state.listeners
      .filter(l => l.eventType === eventType)
      .forEach(l => { try { l.callback(data); } catch (e) { console.error(e); } });
  };

  const on = (eventType, callback) => {
    state.listeners.push({ eventType, callback });
  };

  const minhaAcao = () => {
    // ... lógica ...
    _emit('minha-acao-concluida', { dado: 'valor' });
  };

  return { minhaAcao, on };
})();
window.NovoModulo = NovoModulo;
```

---

## 12. Design System CSS

### Paleta obrigatória — não desviar

| Papel | Variável CSS | Hex | Uso |
|-------|-------------|-----|-----|
| Primary Navy | `--primary-dark` | `#003761` | Sidebar, header, textos de destaque |
| Background | `--bg` | `#F8F9FA` | Workspace principal |
| Action Teal | `--primary` | `#0F9B94` | Botões primários, estados de sucesso |
| Accent Gold | `--accent` | `#C49B3C` | Separadores, alertas, avisos |
| Danger | `--danger` | `#DC2626` | Erros, exclusões |
| Success | `--success` | `#16A34A` | Confirmações, OK |

### Variáveis CSS completas (`variables.css`)

```css
:root {
  /* Superfícies */
  --bg: #F8F9FA;
  --surface: #FFFFFF;
  --surface-soft: #F1F5F9;
  --surface-alt: #E9EDF1;

  /* Bordas */
  --border: #D1D5DB;
  --border-strong: #9CA3AF;

  /* Textos */
  --text: #0F172A;
  --text-muted: #475569;
  --text-soft: #64748B;

  /* Cores de ação */
  --primary: #0F9B94;
  --primary-dark: #003761;
  --accent: #C49B3C;
  --success: #16A34A;
  --warning: #F59E0B;
  --danger: #DC2626;

  /* Espaçamento e estilo */
  --shadow: 0 24px 60px rgba(15, 23, 42, 0.08);
  --radius: 16px;
  --radius-sm: 10px;
  --transition: 200ms ease;

  /* Tipografia */
  --font-sans: 'Inter', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

### Regras de tipografia

- **Interface (labels, títulos, menus):** `font-family: var(--font-sans)` — Inter
- **Dados técnicos (URLs, payloads XML, timestamps, tempos de resposta):** `font-family: var(--font-mono)` — JetBrains Mono

### Ordem de cascata dos CSS

```
reset.css       → zera margens/padding, box-sizing: border-box
variables.css   → tokens de design
layout.css      → grid app, sidebar, header, workspace
components.css  → buttons, cards, badges, modals, tables, forms
charts.css      → chart-card, wide-panel
animations.css  → keyframes, fade-in-up, pulse
```

### Layout principal

```css
#app {
  display: grid;
  grid-template-columns: 280px 1fr;  /* sidebar fixa + workspace flexível */
  min-height: 100vh;
}

/* Responsivo: colapsa sidebar abaixo de 1040px */
@media (max-width: 1040px) {
  #app { grid-template-columns: 1fr; }
}
```

---

## 13. API do Proxy Serverless

**Arquivo:** `/api/proxy.js` (Vercel Serverless Function)

**Propósito exclusivo:** Proxy CORS para requisições SOAP. O browser não pode fazer chamadas diretas a endpoints externos por restrições CORS. Todo SOAP passa pelo proxy.

### Request (browser → proxy)

```javascript
POST /api/proxy
Content-Type: application/json

{
  "targetUrl": "https://api.grupoDb.com.br/soap/endpoint",
  "headers": {
    "SOAPAction": "NomeDoMetodo",
    "Content-Type": "text/xml; charset=utf-8"
  },
  "payload": "<?xml version=\"1.0\"?>...",
  "timeoutMs": 120000
}
```

### Response (proxy → browser)

```javascript
// Sucesso HTTP (mesmo que SOAP Fault):
{
  "success": true,
  "statusCode": 200,
  "duration": 234,          // ms medido no servidor
  "responseBody": "<?xml...",
  "errorDetail": null
}

// Falha (timeout, conexão recusada, erro de rede):
{
  "success": false,
  "statusCode": null,
  "duration": 120000,
  "responseBody": null,
  "errorDetail": "Request timeout after 120000ms"
}
```

> **Nota:** Um SOAP Fault retorna `success: true` porque o HTTP foi bem-sucedido. Use `XMLEngine.hasFault(responseBody)` para detectar falhas SOAP no conteúdo.

---

## 14. Debugging em Produção

O objeto `window.STP_DEBUG` está disponível no console do browser em qualquer ambiente:

```javascript
// Informações da sessão atual
STP_DEBUG.session()
// → { userId, usuario, nivel, loginAt, lastActivity, expiresIn: "18m 32s" }

// Permissões do usuário logado
STP_DEBUG.rbac()
// → { nivel: "operador", permissions: { "profiles:create": true, "users:create": false, ... } }

// Contagem de entidades no localStorage
STP_DEBUG.storage()
// → { users: 3, profiles: 12, groups: 2, scenarios: 5, results: 847, schedules: 4 }

// Forçar logout (útil em debugging)
STP_DEBUG.logout()

// Verificar próximos agendamentos
STP_DEBUG.schedules()
// → lista com nome, proximaExecucao, ativo
```

### Inspecionar dados brutos do localStorage

```javascript
// No console:
JSON.parse(localStorage.getItem('stp_v3_results')).length  // quantos resultados
JSON.parse(localStorage.getItem('stp_v3_profiles'))        // todos os perfis
```

### Limpar dados de teste

```javascript
// Remover todos os resultados:
localStorage.removeItem('stp_v3_results')

// Limpar tudo (reset completo):
Object.keys(localStorage)
  .filter(k => k.startsWith('stp_v3_'))
  .forEach(k => localStorage.removeItem(k))
location.reload()
```

---

## 15. Tarefas de Manutenção Comuns

### Adicionar nova permissão RBAC

```javascript
// 1. Em assets/js/auth/rbac.js, adicionar em PERMISSIONS:
'minha-entidade:acao': { admin: true, operador: false, visualizador: false }

// 2. Na UI, verificar antes de renderizar:
if (RBACManager.canCurrent('minha-entidade:acao')) {
  html += `<button ...>Ação</button>`;
}
```

### Adicionar novo módulo de storage

1. Criar `assets/js/storage/nova-entidade.js` (copiar estrutura de `profiles.js`)
2. Definir a chave em `StorageEngine`: ex. `'nova_entidade'` (será `stp_v3_nova_entidade` no localStorage)
3. Adicionar `<script src="assets/js/storage/nova-entidade.js?v=1">` em `index.html` antes de `auth/session.js`
4. Registrar `window.NovaEntidadeManager = NovaEntidadeManager`
5. Adicionar `'NovaEntidadeManager'` à lista em `app.js._validateModules()`

### Adicionar nova aba no Dashboard

```javascript
// 1. Em renderer.js, adicionar item no SidebarManager

// 2. Em Renderer._renderMainContent(tabId):
case 'minha-aba':
  return _renderMinhaAba();

// 3. Implementar _renderMinhaAba():
const _renderMinhaAba = () => {
  return `
    <section class="section-card fade-in-up">
      <div class="section-header">
        <h2 class="section-title">Minha Aba</h2>
      </div>
      <!-- conteúdo -->
    </section>
  `;
};

// 4. Em _attachEventListeners(), adicionar listeners da nova aba
```

### Emitir eventos customizados

```javascript
// No módulo que emite:
const _emit = (type, data) => {
  state.listeners.filter(l => l.eventType === type).forEach(l => l.callback(data));
};
_emit('meu-evento', { payload: 'valor' });

// No listener (geralmente em renderer.js ou app.js):
MeuModulo.on('meu-evento', (data) => {
  console.log(data.payload);
});
```

### Corrigir o problema de sessão expirando com agendamentos ativos

Em `assets/js/features/scheduler.js`, no início de `_checkAndExecuteDue()`:

```javascript
const _checkAndExecuteDue = async () => {
  // Mantém sessão viva enquanto há agendamentos ativos
  const hasActiveSchedules = SchedulerManager.list().some(s => s.ativo);
  if (hasActiveSchedules && typeof SessionManager !== 'undefined') {
    SessionManager.updateActivity();
  }

  const due = SchedulerManager.getDue();
  // ... restante do código
};
```

---

## 16. Convenções Críticas

### RBAC antes de qualquer ação destrutiva

```javascript
// CORRETO
if (RBACManager.canCurrent('profiles:delete')) {
  ProfilesManager.delete(id);
}

// ERRADO — nunca chame ações destrutivas sem verificar permissão
ProfilesManager.delete(id);
```

### Origem e executadoPor em resultados

Todo resultado salvo **deve** ter:

```javascript
ResultsManager.save({
  // ... outros campos ...
  origem: 'manual',                          // "manual" | "schedule" | "scenario"
  executadoPor: SessionManager.getCurrentUser().userId
});
```

### XMLEngine retorna null, nunca undefined

```javascript
const valor = XMLEngine.extractTag(responseBody, 'diag:NumAtendimento');
if (valor !== null) {
  // tag foi encontrada e tem valor
}
// NUNCA: if (valor) — pois "0" é falsy mas válido
// NUNCA: if (valor !== undefined) — a função não retorna undefined
```

### Proxy é obrigatório para SOAP

Requisições SOAP **nunca** devem ser feitas diretamente do browser:

```javascript
// CORRETO
const response = await fetch('/api/proxy', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ targetUrl, headers, payload, timeoutMs })
});

// ERRADO — vai falhar por CORS
const response = await fetch('https://endpoint-soap-externo.com/...', { ... });
```

### Módulos registrados na ordem correta

Se `window.MeuModulo` for `undefined` quando outro módulo tentar usá-lo, ocorrerá falha silenciosa. A ordem em `index.html` é a única forma de garantir dependências. Sempre verificar a sequência ao adicionar novos módulos.

---

## 17. Deploy e Cache-Bust

### Por que o cache-bust existe

Os browsers cacheiam arquivos JS e CSS agressivamente. Para garantir que usuários recebam o código atualizado após um deploy, todos os `<script>` e `<link>` em `index.html` têm um parâmetro de versão:

```html
<script src="assets/js/ui/renderer.js?v=11"></script>
<link rel="stylesheet" href="assets/css/layout.css?v=9">
```

### Procedimento ao modificar qualquer arquivo JS ou CSS

1. Editar o arquivo
2. Incrementar o `?v=N` correspondente em `index.html`
3. Fazer deploy com `vercel deploy --prod`

```html
<!-- Antes -->
<script src="assets/js/ui/renderer.js?v=11"></script>

<!-- Depois de modificar renderer.js -->
<script src="assets/js/ui/renderer.js?v=12"></script>
```

### Mapeamento atual de versões (referência)

| Arquivo | Versão atual |
|---------|-------------|
| `storage/engine.js` | v=9 |
| `storage/schedules.js` | v=10 |
| `ui/renderer.js` | v=11 |
| `reports/reports.js` | v=10 |
| Demais JS | v=9 |
| Todos os CSS | v=9 |

---

## Referências Cruzadas

| Documento | Conteúdo |
|-----------|----------|
| `CLAUDE.md` | Guia de instruções para o assistente Claude Code |
| `ROADMAP.md` | Status de conclusão por fase |
| `STP_SOAP_v3_Especificacao_Tecnica.md` | Especificação técnica completa original |
| `STP_SOAP_v3_Escopo_Evolucao.md` | Escopo detalhado fase a fase |
| `assets/js/storage/README_PHASE1.md` | Documentação detalhada da camada de storage |
| `assets/js/auth/README_PHASE2.md` | Documentação detalhada de auth/RBAC |
| `assets/js/ui/README_PHASE3.md` | Documentação detalhada da UI |
| `assets/js/engine/README_PHASE4.md` | Documentação detalhada do engine SOAP |
| `assets/js/features/README_PHASE5.md` | Documentação detalhada do scheduler |
