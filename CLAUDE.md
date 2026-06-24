# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Speed Teste DBSync** is a web-based performance monitoring SPA for SOAP/WCF endpoints used internally by Grupo DB — Medicina Diagnóstica. It is a pure vanilla JavaScript application with no build step, deployed on Vercel via serverless functions.

## Development & Deployment

No build step is required — the project consists of static files served directly.

**Local development:** Serve the root directory with any HTTP server:
```powershell
npx serve .
```

**Deploy to Vercel:**
```powershell
vercel deploy --prod
```

The project is linked via `.vercel/project.json` to `prj_S3QnovpAMPc6AhG2QwG8cnfPrN42` (team `team_fXvudOFwpx9qWUISlm1cwaao`). The production alias is `grupodb-speed.vercel.app`. GitHub pushes to `main` also trigger auto-deploy. Required env vars in Vercel: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `JWT_SECRET`.

No lint, test, or transpilation commands are configured (`package.json` has no scripts).

## Architecture

### Module Structure

```
assets/js/
├── app.js               # Bootstrap: validates all globals, initializes modules in order
├── storage/             # Phase 1 — localStorage CRUD (engine.js + 7 domain managers + audit-log.js)
├── auth/                # Phase 2 — session.js (30min inactivity timeout) + rbac.js (78 permissions)
├── ui/                  # Phase 3 — renderer.js, sidebar.js, modals.js, notifications.js, login-screen.js
├── engine/              # Phase 4 — runner.js, xml.js, utils.js, config.js
├── features/            # Phase 5 — executor.js (scenarios), scheduler.js (CRON, 60s interval)
└── reports/             # Phase 6 — reports.js (XLSX/CSV; PDF pending)
```

**Module pattern:** Every JS file is an IIFE exposing a single global on `window`. Modules are loaded via `<script>` tags in `index.html` in dependency order. `app.js` validates all required globals exist before initializing.

**Data flow:**
```
Browser SPA → localStorage (StorageEngine)  ← all entities except results
             → IndexedDB (ResultsManager)   ← execution results (up to 10,000)
             → /api/proxy.js (Vercel)       → External SOAP/WCF endpoints
```

All SOAP requests go through `/api/proxy.js` to bypass CORS. The proxy accepts `{targetUrl, headers, payload, timeoutMs}` and returns `{success, statusCode, duration, errorDetail, responseBody}`. API functions use ESM (`export default async function handler(req, res)`).

**Shared API module `api/_db.js`** exports: `getDb()` (Turso client), `sha256(str)`, `signJWT(payload)`, `verifyJWT(token)`, `getAuthPayload(req)` (extracts JWT from `Authorization: Bearer`), and `initSchema(db)` (idempotent `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE` migrations). All handlers import from this file.

### Window Globals Reference

Each module registers itself on `window`. These are the actual global names:

| Global | File | Key Methods |
|--------|------|-------------|
| `StorageEngine` | `storage/engine.js` | `get, set, remove, list, clear, exists` |
| `UsersManager` | `storage/users.js` | `create, list, getById, update, delete, validate` |
| `ProfilesManager` | `storage/profiles.js` | `create, list, getById, update, delete, count` |
| `GroupsManager` | `storage/groups.js` | `create, list, getById, update, delete` |
| `ScenariosManager` | `storage/scenarios.js` | `create, list, getById, update, delete` |
| `ResultsManager` | `storage/results.js` | `init (async), add, addBatch, list, getById, getStats, clear (async), count` |
| `SchedulerManager` | `storage/schedules.js` | `create, list, getById, update, delete, getDue` |
| `MethodsManager` | `storage/methods.js` | `list, getById, create, update, delete_, count` |
| `AuditLogManager` | `storage/audit-log.js` | `log, list, getByUser` |
| `SessionManager` | `auth/session.js` | `login, logout, getSession, getCurrentUser, isAuthenticated` |
| `RBACManager` | `auth/rbac.js` | `canCurrent, can, isAdmin, getPermissionsForLevel` |
| `LoginScreenManager` | `ui/login-screen.js` | `show` |
| `SidebarManager` | `ui/sidebar.js` | `render` |
| `ModalManager` | `ui/modals.js` | `open, close, confirm` |
| `NotificationsManager` | `ui/notifications.js` | `success, error, warning, info` |
| `Renderer` | `ui/renderer.js` | `renderMainApp, renderTab, getCurrentTab` |
| `ConfigEngine` | `engine/config.js` | `get, set, all` |
| `XMLEngine` | `engine/xml.js` | `parse, extractTag, hasFault, extractFaultString` |
| `UtilsEngine` | `engine/utils.js` | `sleep, fms, escape, hashSHA256, formatAttendanceNumber` |
| `RunnerEngine` | `engine/runner.js` | `run, executeRequest, on` |
| `ScenarioExecutor` | `features/executor.js` | `execute, cancel, on` |
| `ScheduleRunner` | `features/scheduler.js` | `start, stop, on` |
| `ReportsManager` | `reports/reports.js` | `getSummary(filters), getRows(filters), exportExcel(filters), exportCSV(filters), exportHTML(options), importCSV` |

### Storage Layer

All localStorage keys use the `stp_v3_` prefix (prevents conflicts with legacy v2 data). `StorageEngine` is the generic abstraction; domain managers wrap it with entity-specific validation.

**Results are stored in IndexedDB** (`stp_results_v1` database, object store `results`, keyPath `id`, index `by_seq`), not in localStorage. `ResultsManager` uses an **in-memory cache** pattern: `init()` (async, called once at startup) opens IDB, migrates any legacy `stp_v3_results` from localStorage, and loads all records into `_cache`. All reads (`list()`, `getById()`, etc.) operate synchronously on `_cache`; writes (`add()`) update `_cache` immediately and persist to IDB fire-and-forget. Maximum **10,000** results; oldest 10% are pruned when the limit is reached.

**`MethodsManager` exception:** `storage/methods.js` is loaded in `index.html` and stores SOAP method definitions, but it is intentionally absent from `app.js`'s `_validateModules` list — a missing `methods.js` will not abort bootstrap. Its SOAP method schema includes `soapAction`, `payloadTemplate`, and `xmlTag` fields used by the execution engine.

### Authentication & RBAC

Three user roles: `admin`, `operador`, `visualizador`. The correct permission check is `RBACManager.canCurrent(resource)` — 78 permission resources are defined in `auth/rbac.js`. Passwords are SHA-256 hashed client-side. Sessions expire after **30 minutes of inactivity** (tracked via `lastActivity` timestamp, updated on every user action).

First-access bootstrap: if no users exist, a first-admin creation screen appears via `LoginScreenManager.show()`.

### SOAP Execution Engine

`engine/runner.js` handles concurrent request batches using AbortController for timeouts. Concurrency is configurable (1–20). Payload templates support `{{NUM_ATENDIMENTO}}`, `{{LOGIN}}`, `{{SENHA}}` placeholders. SOAP Fault detection and namespace-aware XML parsing live in `engine/xml.js` — always use `XMLEngine.extractTag()` for consistency (handles namespace fallback and returns `null` not `undefined`).

**Attendance number format:** `{CODIGO}{YYYYMMDD}{SEQ:003}` — counters auto-reset per day (stored in localStorage as `cnt_{CODIGO}_{YYYYMMDD}`).

**Event-driven:** `RunnerEngine`, `ScenarioExecutor`, and `ScheduleRunner` expose `.on(eventType, callback)`. Events fire one-way; UI registers listeners without creating circular dependencies.

### CRON Scheduler

`features/scheduler.js` checks every 60 seconds while the browser tab is open. A schedule fires when: current date is in `[dataInicio, dataFim]`, current day is in `diasSemana`, current time is in `[horaInicio, horaFim]`, and elapsed time since `ultimaExecucao` ≥ `frequenciaMinutos`. On tab reopen, missed executions within the current time window are caught up immediately.

**Session keep-alive:** On each 60s tick, if any schedule has `ativo === true`, `_checkAndExecuteDue()` calls `SessionManager.updateActivity()` to prevent the 30-minute inactivity timeout from firing while scheduled tasks are pending.

### Dashboard Charts

The manual charts section (tab "Manuais") has four filter buttons that control both Chart A and Chart B simultaneously:

| Button ID | Filter | Data returned |
|-----------|--------|---------------|
| `dash-manual-filter-last` | `'last'` | All results from the last execution batch (within a 5-minute window) |
| `dash-manual-filter-10` | `'10'` | Last 10 manual results sorted by time |
| `dash-manual-filter-50` | `'50'` | Last 50 manual results |
| `dash-manual-filter-100` | `'100'` | Last 100 manual results |

`_getManualResultsByFilter(filter)` is the data-source function. `_initializeDashboardManualCharts(filter = 'last')` renders both charts and updates button styles. Adding a new filter requires: a new button in `_renderDashboard()`, a listener in `_attachEventListeners()`, and a `slice(-N)` case in `_getManualResultsByFilter`.

**Chart B (histogram)** renders one bar-dataset per profile using `_daProfileColors`, so profiles with different response-time distributions are visually distinct. The x-axis bucket bounds are shared across all profiles and scaled to the global `maxDur`.

The schedule charts section (tab "Agendados") has four filter buttons (1h / 24h / 7d / 30d) controlling `_initializeDashboardScheduleCharts(filter)` (dashboard) and `_initializeScheduleChart(filter)` (Agendamentos tab). Both functions produce one line-dataset per schedule/profile pair using `_CHART_PALETTE`.

**X-axis ordering:** datasets use **arrays aligned to a shared `allLabels`** — not `{x,y}` objects with `parsing`. This prevents Chart.js from inserting labels out of order when two schedules run at different timestamps.

**Bucket aggregation (average):** each time bucket shows the **average** duration of all results in that bucket, not just the last one. This ensures the Y-axis scale is comparable across Hora/Dia/Semana/Mês filters.

**Reports date filter:** `getSummary(filters)`, `getRows(filters)`, `exportExcel(filters)`, `exportCSV(filters)`, and `exportHTML(options)` all accept `{ de: 'YYYY-MM-DD', ate: 'YYYY-MM-DD' }`. The renderer reads these from `#report-filter-de` / `#report-filter-ate` inputs via `_readReportFilters()` and passes them to both the on-screen tables and all export functions. `importCSV` accepts exported CSV files and saves results with `origem: 'imported'`, restoring original `executadoEm` timestamps.

**`spanGaps: true`** on main execution line datasets — connects the line across null entries caused by interleaved timestamps from other schedules. The dashed median dataset keeps `spanGaps: false`.

```js
// Built immediately after allResults is sorted chronologically:
const allLabels = [...new Set(allResults.map(r => formatLabel(r.executadoEm)))];

// Each dataset built via average per bucket:
const _bSum = new Map(), _bCnt = new Map();
pResults.forEach(r => {
  const lbl = formatLabel(r.executadoEm);
  _bSum.set(lbl, (_bSum.get(lbl) || 0) + r.duration);
  _bCnt.set(lbl, (_bCnt.get(lbl) || 0) + 1);
});
const labelMap = new Map();
_bSum.forEach((sum, lbl) => labelMap.set(lbl, Math.round(sum / _bCnt.get(lbl))));
data: allLabels.map(lbl => labelMap.get(lbl) ?? null), spanGaps: true
```

The median is calculated from **all raw `pResults`**, not from `labelMap` — it is unaffected by the bucket aggregation.

Do **not** add `parsing: { xAxisKey, yAxisKey }` to these charts — it is intentionally absent; Chart.js uses `labels` directly.

### CSS Responsiveness

`.app-workspace` has `min-width: 0; overflow-x: hidden;` to prevent the `1fr` grid column from overflowing at any browser zoom level. `.wide-panel > *` has `min-width: 0` for the same reason inside the chart grid.

## Design System

Mandatory color palette — do not deviate:

| Role | Hex | Usage |
|------|-----|-------|
| Primary (Navy) | `#003761` | Sidebar, header |
| Background | `#F8F9FA` | Main workspace |
| Action (Teal) | `#0F9B94` | Buttons, success states |
| Accent (Gold) | `#C49B3C` | Separators, alerts |

CSS load order: `reset.css → variables.css → layout.css → components.css → charts.css → animations.css`. All design tokens are CSS variables in `variables.css`.

Typography: UI uses **Inter** (labels/titles); technical data (URLs, response times, XML) uses **JetBrains Mono**.

## Key Conventions

- **RBAC checks are mandatory** before any destructive UI action — call `RBACManager.canCurrent(resource)` and hide/disable controls for unauthorized roles.
- **Two persistence layers:** `StorageEngine` (localStorage, `stp_v3_` prefix) for all entities except results; `ResultsManager` (IndexedDB, `stp_results_v1`) for execution results. Do not write results to localStorage.
- **Proxy required for all SOAP calls** — direct browser-to-endpoint requests will fail due to CORS; always route through `/api/proxy.js`.
- **Module globals** — when adding a new module, register it on `window` and add it to the validation list in `app.js`.
- **Result schema** must include `origem` field (`"manual"`, `"schedule"`, or `"scenario"`) and `executadoPor` (user UUID). This field drives UI filtering.
- **Scenario steps are strictly sequential** — each step runs to full completion before the next begins; parallelism only applies within a single step's concurrent requests.

## Debugging

`window.STP_DEBUG` is available in the browser console:

```javascript
STP_DEBUG.session()    // Current session info
STP_DEBUG.rbac()       // Current permissions for active user
STP_DEBUG.storage()    // Count of all stored entities
STP_DEBUG.logout()     // Force logout
```

## Cache-Bust Versions (current)

After editing any JS or CSS file, increment its `?v=N` in `index.html` and redeploy.

| File | Version |
|------|---------|
| `assets/css/layout.css` | v=10 |
| `assets/css/charts.css` | v=10 |
| `assets/js/app.js` | v=15 |
| `assets/js/ui/renderer.js` | v=24 |
| `assets/js/ui/login-screen.js` | v=18 |
| `assets/js/features/scheduler.js` | v=10 |
| `assets/js/storage/schedules.js` | v=13 |
| `assets/js/storage/results.js` | v=14 |
| `assets/js/storage/users.js` | v=14 |
| `assets/js/storage/profiles.js` | v=10 |
| `assets/js/storage/groups.js` | v=12 |
| `assets/js/storage/methods.js` | v=12 |
| `assets/js/reports/reports.js` | v=20 |
| `assets/js/auth/session.js` | v=14 |
| All other JS/CSS | v=9 |

## Turso DB — Entidades sincronizadas

Todas as entidades abaixo são persistidas no Turso (libSQL/SQLite) em `libsql://speedtestdb-awsof.aws-us-east-1.turso.io`:

| Entidade | Tabela | API | Manager | Sync |
|----------|--------|-----|---------|------|
| Usuários | `users` | `api/users.js`, `api/users/[id].js` | `UsersManager` | `init()` no boot + ao navegar para aba Usuários |
| Resultados | `results` | `api/results.js` | `ResultsManager` | `syncFromTurso()` no boot |
| Grupos | `groups` | `api/groups.js`, `api/groups/[id].js` | `GroupsManager` | ao navegar para aba Grupos |
| Perfis | `profiles` | `api/profiles.js` | `ProfilesManager` | ao navegar para aba Perfis |
| Métodos SOAP | `methods` | `api/methods.js`, `api/methods/[id].js` | `MethodsManager` | ao navegar para aba Métodos |
| Agendamentos | `schedules` | `api/schedules.js`, `api/schedules/[id].js` | `SchedulerManager` | ao navegar para aba Agendamentos |

**Cenários** permanecem apenas em localStorage (sem Turso).

**Comportamento do sync:** Cada manager tem `syncFromTurso()`. O `_navigate()` do renderer dispara o sync ao mudar de aba — renderiza com dados locais imediatamente, depois re-renderiza se Turso trouxer novidades. Não há polling periódico.

**`requestPayload` e `responseBody` NÃO são armazenados no Turso** — esses campos ficam apenas no IndexedDB local (muito grandes para sync). `_rowToResult()` em `api/results.js` sempre retorna `null` para esses campos.

**Auth:** `POST /api/login` retorna JWT (7 dias); `SessionManager.getToken()` injeta em todas as chamadas autenticadas como `Authorization: Bearer <token>`. Fallback de emergência: env vars `LOGIN_USUARIO`/`LOGIN_SENHA` — usadas quando Turso está indisponível ou para auto-corrigir hash divergente (modo `env-sync`).

**Não-admins** só podem alterar a própria `senhaHash`/`senhaTemporaria` via `PUT /api/users?id=`. Qualquer outro campo retorna 403.

**Senha temporária:** admin pode marcar `senhaTemporaria: true` ao criar/resetar usuário. No boot, se `session.senhaTemporaria === true`, `LoginScreenManager.renderForcePasswordChange()` é exibida antes do app carregar. A troca chama `POST /api/users` com `{ _selfChange: true, userId, senhaHash }` — não exige JWT, mas valida que o usuário realmente tem `senhaTemporaria=1` no Turso.

**Migração em lote:** `POST /api/users` com `{ _migrate: true, users: [...] }` importa usuários do localStorage para o Turso — só permitido quando a tabela está vazia.

**`PATCH /api/schedules?id=`** aceita ações rápidas sem reenviar o objeto completo:
- `{ action: 'setAtivo', ativo: bool, proximaExecucao?: ISO }` — liga/desliga
- `{ action: 'recordExecution', ultimaExecucao: ISO, proximaExecucao: ISO }` — pós-execução

**Campos de usuário:** `senhaTemporaria INTEGER DEFAULT 0`, `inativacaoTipo TEXT` (`'temporaria'|'definitiva'`), `inativoAte TEXT` (data ISO p/ inativação temporária). Adicionados via `ALTER TABLE` em `initSchema()` (migração idempotente).

## Documentation

Detailed specs and scope are in the root-level `.md` files:
- `GUIA_TECNICO.md` — comprehensive technical reference for developers (schemas, pipelines, maintenance tasks)
- `STP_SOAP_v3_Especificacao_Tecnica.md` — original full technical specification
- `STP_SOAP_v3_Escopo_Evolucao.md` — phase-by-phase scope
- `ROADMAP.md` — current completion status
- Each `assets/js/<module>/` folder contains a phase-specific README
