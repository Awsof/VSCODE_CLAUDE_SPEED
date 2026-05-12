# Speed Teste DBSync — Resumo do Projeto

**Empresa:** Grupo DB — Medicina Diagnóstica Ltda  
**Plataforma:** Vercel Serverless + Vanilla JavaScript  
**Data do resumo:** 12/05/2026  
**Versão atual:** v3 (STP·SOAP v3)

---

## 1. Visão Geral

O **Speed Teste DBSync** é uma aplicação web de monitoramento de performance para endpoints SOAP corporativos. Seu objetivo é permitir que equipes técnicas executem testes de carga, testes manuais e agendamentos automáticos contra serviços WCF/SOAP, registrando resultados, duração, status HTTP e faults SOAP em um histórico persistido em `localStorage`.

A aplicação é uma SPA (Single Page Application) inteiramente em JavaScript vanilla, sem frameworks front-end, hospedada no Vercel com funções serverless para contornar restrições de CORS nos endpoints SOAP.

---

## 2. Arquitetura

```
Speed_TESTE_NEW/
├── index.html                  # SPA entry point
├── vercel.json                 # Roteamento e headers CORS
├── api/
│   ├── proxy.js                # Serverless: proxy SOAP (contorna CORS)
│   └── login.js                # Serverless: autenticação via env vars
├── assets/
│   ├── css/
│   │   ├── reset.css
│   │   ├── variables.css       # Design tokens (cores, fontes, espaçamentos)
│   │   ├── layout.css          # Grid principal + modo auth-mode
│   │   ├── components.css      # Cards, tabelas, badges, botões, modais
│   │   ├── charts.css          # Layout dos gráficos
│   │   └── animations.css      # fade-in-up e transições
│   ├── logo.svg
│   └── js/
│       ├── app.js              # Bootstrap da aplicação
│       ├── storage/            # Fase 1 — Camada de dados (localStorage)
│       ├── auth/               # Fase 2 — Sessão e controle de acesso
│       ├── ui/                 # Fase 3 — Interface
│       ├── engine/             # Fase 4 — Motor de execução SOAP
│       ├── features/           # Fase 5 — Agendamentos e cenários
│       └── reports/            # Fase 6 — Exportação de relatórios
```

### Fluxo de dados

```
Browser (SPA)
    │
    ├─► localStorage  ←→  StorageEngine (CRUD genérico)
    │
    └─► fetch('/api/proxy')
            │
            └─► Vercel Serverless (api/proxy.js)
                    │
                    └─► Endpoint SOAP externo (WCF)
```

---

## 3. Módulos e Funções

### 3.1 Fase 1 — Storage (`assets/js/storage/`)

| Módulo | Chave localStorage | Responsabilidade |
|---|---|---|
| `StorageEngine` | — | CRUD genérico com `get/set/remove` |
| `UsersManager` | `users` | CRUD de usuários, hash SHA-256 de senhas, validação de credenciais |
| `ProfilesManager` | `profiles` | CRUD de perfis SOAP (URL, payload template, SOAPAction, xmlTag) |
| `GroupsManager` | `groups` | Agrupamento de perfis |
| `ScenariosManager` | `scenarios` | Cenários com passos sequenciais |
| `SchedulesManager` | `schedules` | Configuração de agendamentos (período, frequência, dias da semana) |
| `ResultsManager` | `results` | Histórico de execuções com limite de 5.000 registros |

**Schema do Perfil (v3):**
```json
{
  "id": "uuid",
  "nome": "DBSYNC PRD",
  "codigo": "PRD",
  "url": "https://endpoint.empresa.com/soap",
  "version": "1.0",
  "soapAction": "http://tempuri.org/IService/Operacao",
  "payloadTemplate": "<soapenv:Envelope>...</soapenv:Envelope>",
  "xmlTag": "diag:NumeroAtendimentoApoiado",
  "cor": "#0F9B94",
  "groupId": null,
  "criadoPor": "admin",
  "criadoEm": "2026-05-12T10:00:00"
}
```

**Placeholders suportados no payload:**
- `{{NUM_ATENDIMENTO}}` — número gerado automaticamente
- `{{LOGIN}}` — login configurado no perfil
- `{{SENHA}}` — senha configurada no perfil

---

### 3.2 Fase 2 — Auth (`assets/js/auth/`)

| Módulo | Função |
|---|---|
| `SessionManager` | Login/logout, tempo de sessão, `getCurrentUser()`, `getCurrentLevel()` |
| `RBACManager` | Matriz de permissões por nível (admin / operador / visualizador) |

**Níveis de acesso:**

| Nível | Perfis | Grupos | Cenários | Agendamentos | Resultados | Usuários | Configurações |
|---|---|---|---|---|---|---|---|
| Admin | ✓ Total | ✓ Total | ✓ Total | ✓ Total | ✓ Total | ✓ Total | ✓ |
| Operador | ✓ Próprios | ✓ | ✓ | ✓ | ✓ | ✗ | ✗ |
| Visualizador | Leitura | ✗ | ✗ | ✗ | Leitura | ✗ | ✗ |

---

### 3.3 Fase 3 — Interface (`assets/js/ui/`)

| Módulo | Função |
|---|---|
| `LoginScreenManager` | Telas de login e primeiro acesso; cria admin padrão se não há usuários |
| `SidebarManager` | Navegação lateral filtrada por permissão RBAC |
| `ModalManager` | Modal genérico com suporte a `confirm()` |
| `NotificationsManager` | Toast de sucesso / aviso / erro |
| `Renderer` | Renderiza todas as abas da aplicação + event listeners |

**Abas da aplicação:**

| Aba | ID | Permissão mínima | Descrição |
|---|---|---|---|
| Dashboard | `dashboard` | Nenhuma | Visão geral, gráficos de taxa de sucesso e duração média |
| Testes | `profiles` | `profiles:list` | Lista de perfis SOAP + Painel de Execução |
| Grupos | `groups` | `groups:list` | Organização de perfis em grupos |
| Cenários | `scenarios` | `scenarios:list` | Passos sequenciais de teste |
| Agendamentos | `schedules` | `scheduler:list` | Execução automática por período e frequência |
| Resultados | `results` | `results:list` | Histórico das últimas execuções com status e detalhe de erro |
| Relatórios | `reports` | `export:results` | Exportação em Excel, PDF e CSV |
| Usuários | `users` | `users:manage` | Gestão de usuários (apenas admin) |
| Configurações | `settings` | `settings:view` | Status de sessão e dados do usuário |

---

### 3.4 Fase 4 — Engine (`assets/js/engine/`)

| Módulo | Função |
|---|---|
| `ConfigEngine` | Constantes globais (timeouts, concorrência máxima, content-type SOAP) |
| `XMLEngine` | Detecção de SOAP faults, extração de tags XML do response |
| `UtilsEngine` | Geração de número de atendimento, validação de URL, sleep |
| `RunnerEngine` | Executor de requisições SOAP via proxy; gerencia concorrência e batch |

**Fluxo do `RunnerEngine.executeRequest()`:**
```
1. Valida URL do perfil
2. Monta headers: Content-Type + SOAPAction (se configurado)
3. POST /api/proxy → { targetUrl, headers, payload, timeoutMs }
4. Proxy chama o endpoint SOAP e retorna { success, statusCode, duration, errorDetail, responseBody }
5. Extrai numDB via XMLEngine.extractTag()
6. Emite evento 'request-complete' ou 'request-error'
7. Retorna objeto de resultado padronizado
```

**`RunnerEngine.executeBatch()`:**
- Controla concorrência com `Set` de Promises ativas
- Suporta ramp-up configurável
- Emite progresso via callback `onProgress`
- Aborta via `AbortController` ao chamar `RunnerEngine.abort()`

---

### 3.5 Fase 5 — Features (`assets/js/features/`)

| Módulo | Função |
|---|---|
| `ScenarioExecutor` | Executa passos sequenciais de um cenário com delay de 200ms entre passos |
| `ScheduleRunner` | Monitor em background (interval 60s); executa agendamentos vencidos automaticamente |

**`ScheduleRunner`** verifica agendamentos ao iniciar a aplicação e a cada 60 segundos. Compara data/hora atual com `proximaExecucao` de cada agendamento ativo.

---

### 3.6 Fase 6 — Reports (`assets/js/reports/`)

| Módulo | Função |
|---|---|
| `ReportsManager` | `getSummary()` por endpoint; `exportExcel()`, `exportPDF()`, `exportCSV()` |

---

### 3.7 API Serverless (`api/`)

| Endpoint | Método | Função |
|---|---|---|
| `POST /api/proxy` | POST | Proxy SOAP: recebe `{ targetUrl, headers, payload, timeoutMs }`, encaminha ao endpoint, retorna `{ success, statusCode, duration, errorDetail, responseBody }` |
| `POST /api/login` | POST | Autenticação via variáveis de ambiente Vercel (fallback para teste) |

---

## 4. Painel de Execução (Aba Testes)

Adicionado na versão v3. Permite executar testes de carga diretamente da interface:

| Campo | Descrição |
|---|---|
| Perfil | Select com todos os perfis cadastrados |
| Requisições | Número total de requisições a enviar |
| Concorrência | Número máximo de requisições simultâneas |
| Timeout | Tempo limite em segundos por requisição |
| Iniciar Teste | Dispara `RunnerEngine.executeBatch()` e exibe progresso em tempo real |
| Abortar | Chama `RunnerEngine.abort()` via `AbortController` |

---

## 5. Testes Realizados

### 5.1 Testes funcionais
- Login com credencial admin/admin (padrão criado automaticamente se não há usuários)
- Criação de perfis SOAP com URL, payload e SOAPAction
- Envio manual via botão "Enviar agora" (aba Testes)
- Execução via Painel de Execução com 1 requisição e concorrência 1
- Agendamento automático (frequência de 6 minutos) verificado via ScheduleRunner
- Criação de usuários com nível operador e visualizador
- Navegação entre abas com controle de permissão RBAC

### 5.2 Testes de integração
- Proxy Vercel → Endpoint SOAP WCF (DBSync)
- Persistência de resultados no localStorage após execução
- Exportação de resultados em JSON via botão "Exportar"

---

## 6. Bugs Identificados e Corrigidos

### Bug 1 — `ReferenceError: timeoutHandle is not defined` (CORRIGIDO)
- **Arquivo:** `assets/js/engine/runner.js`
- **Causa:** `const timeoutHandle` declarado dentro do bloco `try`, inacessível no bloco `catch`.
- **Correção:** Movido para `let timeoutHandle` antes do bloco `try`.

### Bug 2 — Layout quebrado na tela de login (CORRIGIDO)
- **Arquivos:** `assets/css/layout.css`, `assets/js/ui/login-screen.js`, `assets/js/ui/renderer.js`
- **Causa:** O `#app` tem `display: grid; grid-template-columns: 280px 1fr` permanente, deformando o formulário de login.
- **Correção:** Adicionada classe `auth-mode` ao `#app` durante o login (`display: block`) e removida ao carregar o app principal.

### Bug 3 — Logo ausente na sidebar (CORRIGIDO)
- **Arquivo:** `assets/js/ui/sidebar.js`
- **Causa:** Sidebar usava `<span class="app-logo-dot">` em vez do logo real.
- **Correção:** Substituído por `<img src="assets/logo.svg" class="app-logo-image" />`.

### Bug 4 — Requisições SOAP sem roteamento via proxy (CORRIGIDO)
- **Arquivo:** `assets/js/engine/runner.js`
- **Causa:** `executeRequest` fazia `fetch(profile.url, ...)` direto do browser, causando falhas de CORS contra endpoints SOAP corporativos.
- **Correção:** Roteamento via `fetch('/api/proxy', { body: JSON.stringify({ targetUrl, headers, payload, timeoutMs }) })`. O proxy server-side bypassa CORS.

### Bug 5 — SOAP fault: `Action '' — ContractFilter incorreto` (EM CORREÇÃO)
- **Causa:** O header HTTP `SOAPAction` não era enviado ao endpoint WCF. Sem ele, o ContractFilter do WCF não consegue despachar a mensagem para a operação correta, retornando fault com `Action ''`.
- **Correção implementada:**
  - Campo `SOAPAction` adicionado ao modal de criação/edição de perfil
  - `ProfilesManager.create()` e `update()` passaram a persistir `soapAction`
  - `RunnerEngine` já passa `profile.soapAction` como header quando presente
  - Cards de perfil exibem indicador visual (⚠ vermelho) quando SOAPAction não está configurado
  - Botão "Editar" adicionado em cada card para corrigir perfis existentes
- **Pendente:** Usuário precisa editar o perfil e preencher o SOAPAction com o valor do WSDL.

### Bug 6 — Cache de browser (CORRIGIDO)
- **Arquivo:** `index.html`
- **Causa:** Scripts carregados sem query de versão; browser servia JS antigo após atualizações.
- **Correção:** Adicionado `?v=2` em todos os `<script src="...">`.

---

## 7. Evolução do Projeto

### v1 / v2 (legado)
- Protótipo com dados em `stp_profiles_v2` no localStorage
- Execução direta via `fetch()` do browser (sem proxy)
- Interface básica sem controle de acesso

### v3 (atual)
**Fase 1 — Storage**
- `StorageEngine` genérico
- Módulos separados por entidade (users, profiles, groups, scenarios, schedules, results)
- Migração automática de dados v2 → v3

**Fase 2 — Autenticação**
- `SessionManager` com TTL configurável
- `RBACManager` com matriz de permissões granulares

**Fase 3 — Interface**
- SPA com roteamento por abas
- Modal genérico reutilizável
- Notificações toast
- Sidebar filtrada por RBAC

**Fase 4 — Engine**
- `RunnerEngine` com controle de concorrência, ramp-up e abort
- Roteamento via proxy Vercel (CORS bypass)
- Extração de campos XML do response

**Fase 5 — Features**
- `ScenarioExecutor` com passos sequenciais
- `ScheduleRunner` com monitor em background a cada 60s

**Fase 6 — Reports**
- Exportação Excel (xlsx), PDF (jsPDF), CSV, JSON

**Ajustes v3 — Sprint atual**
- Renomeação "Perfis" → "Testes" na sidebar
- Painel de Execução embutido na aba Testes
- Tela de Gestão de Usuários (admin only)
- Campo SOAPAction no perfil
- Botão Editar nos cards de perfil
- Coluna "Detalhe" na tabela de Resultados
- Logs de diagnóstico no console via `[RunnerEngine]`
- Cache busting `?v=2` no index.html

---

## 8. Escopo Funcional

### Dentro do escopo
- Testes de performance contra endpoints SOAP/WCF
- Controle de acesso por perfil (admin, operador, visualizador)
- Execução manual, em lote e agendada
- Histórico de resultados com detalhe de erro
- Exportação de relatórios
- Proxy server-side para bypass de CORS

### Fora do escopo (atual)
- Autenticação OAuth / SSO corporativo
- Suporte a endpoints REST (apenas SOAP)
- Interface mobile nativa
- Persistência em banco de dados remoto (usa localStorage)
- Dashboard em tempo real com WebSockets
- Alertas por email/Slack ao falhar agendamento

---

## 9. Dependências Externas

| Biblioteca | Versão | Uso |
|---|---|---|
| Chart.js | 4.4.0 | Gráficos do Dashboard (doughnut e bar) |
| xlsx (SheetJS) | 0.18.5 | Exportação Excel |
| jsPDF | 2.5.1 | Exportação PDF |
| Google Fonts | — | Inter + JetBrains Mono |

Todas as dependências são carregadas via CDN (sem bundler/build step).

---

## 10. Configurações Relevantes

### ConfigEngine (valores padrão)
| Parâmetro | Valor | Descrição |
|---|---|---|
| `DEFAULT_REQUEST_TIMEOUT` | 120.000 ms | Timeout padrão por requisição |
| `DEFAULT_CONCURRENCY` | 3 | Concorrência padrão |
| `MAX_CONCURRENCY` | 20 | Limite máximo de requisições simultâneas |
| `SOAP_CONTENT_TYPE` | `text/xml; charset=utf-8` | Header Content-Type enviado ao endpoint |
| `MAX_RESULTS` | 5.000 | Limite de resultados no histórico |

### vercel.json
- Rewrite `/:path*` → `index.html` (SPA routing)
- Headers CORS liberados para `/api/*`

---

## 11. Pendências e Próximos Passos

| Prioridade | Item | Descrição |
|---|---|---|
| 🔴 Alta | Configurar SOAPAction | Editar perfil DBSYNC e preencher o valor do WSDL para resolver o fault WCF |
| 🟡 Média | Testar com SOAPAction correto | Validar envio bem-sucedido e extração do numDB |
| 🟡 Média | Adicionar campo login/senha ao perfil | Formulário de criação não expõe campos `login` e `senha` usados nos placeholders `{{LOGIN}}` e `{{SENHA}}` |
| 🟢 Baixa | Persistência remota | Migrar localStorage para banco de dados (ex: Vercel KV ou Supabase) para multi-browser e multi-usuário real |
| 🟢 Baixa | Alertas de falha | Notificação por webhook/email quando agendamento falhar consecutivamente |
| 🟢 Baixa | Edição de Cenários e Agendamentos | Só há criação; edição requer exclusão e recriação |
