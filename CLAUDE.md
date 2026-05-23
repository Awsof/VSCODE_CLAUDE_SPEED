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
vercel deploy
```

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
Browser SPA → localStorage (StorageEngine) → /api/proxy.js (Vercel serverless) → External SOAP/WCF endpoints
```

All SOAP requests go through `/api/proxy.js` to bypass CORS. The proxy accepts `{targetUrl, headers, payload, timeoutMs}` and returns `{success, statusCode, duration, errorDetail, responseBody}`.

### Window Globals Reference

Each module registers itself on `window`. These are the actual global names:

| Global | File | Key Methods |
|--------|------|-------------|
| `StorageEngine` | `storage/engine.js` | `get, set, remove, list, clear, exists` |
| `UsersManager` | `storage/users.js` | `create, list, getById, update, delete, validate` |
| `ProfilesManager` | `storage/profiles.js` | `create, list, getById, update, delete, count` |
| `GroupsManager` | `storage/groups.js` | `create, list, getById, update, delete` |
| `ScenariosManager` | `storage/scenarios.js` | `create, list, getById, update, delete` |
| `ResultsManager` | `storage/results.js` | `save, list, getById, getStats, cleanup` |
| `SchedulerManager` | `storage/schedules.js` | `create, list, getById, update, delete, getDue` |
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
| `ReportsManager` | `reports/reports.js` | `exportExcel, exportCSV, exportHTML, getSummary, getRows` |

### Storage Layer

All localStorage keys use the `stp_v3_` prefix (prevents conflicts with legacy v2 data). `StorageEngine` is the generic abstraction; domain managers wrap it with entity-specific validation.

Maximum 5,000 execution results are stored; auto-cleanup removes oldest records on each `save()` call beyond the limit.

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
- **StorageEngine is the only persistence layer** — there is no backend database; all state lives in `localStorage`.
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
| `assets/js/ui/renderer.js` | v=13 |
| `assets/js/features/scheduler.js` | v=10 |
| `assets/js/storage/schedules.js` | v=10 |
| `assets/js/reports/reports.js` | v=11 |
| All other JS/CSS | v=9 |

## Documentation

Detailed specs and scope are in the root-level `.md` files:
- `GUIA_TECNICO.md` — comprehensive technical reference for developers (schemas, pipelines, maintenance tasks)
- `STP_SOAP_v3_Especificacao_Tecnica.md` — original full technical specification
- `STP_SOAP_v3_Escopo_Evolucao.md` — phase-by-phase scope
- `ROADMAP.md` — current completion status
- Each `assets/js/<module>/` folder contains a phase-specific README
