# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Speed Teste DBSync** is a web-based performance monitoring SPA for SOAP/WCF endpoints used internally by Grupo DB — Medicina Diagnóstica. It is a pure vanilla JavaScript application with no build step, deployed on Vercel via serverless functions.

## Development & Deployment

No build step is required — the project consists of static files served directly.

**Local development:** Serve the root directory with any HTTP server:
```powershell
# Using VS Code Live Server, Python, or npx serve
npx serve .
```

**Deploy to Vercel:**
```powershell
vercel deploy
```

No lint, test, or transpilation commands are configured (`package.json` has no scripts).

## Architecture

### Six-Phase Modular Structure

```
assets/js/
├── app.js               # Bootstrap: loads all modules in dependency order
├── storage/             # Phase 1 — localStorage CRUD (engine.js + 7 domain managers)
├── auth/                # Phase 2 — session.js (8h timeout) + rbac.js (60+ permissions)
├── ui/                  # Phase 3 — renderer.js (main dashboard), sidebar, modals, notifications
├── engine/              # Phase 4 — runner.js (concurrent SOAP executor), xml.js, config.js
├── features/            # Phase 5 — executor.js (scenarios), scheduler.js (CRON)
└── reports/             # Phase 6 — Excel/PDF/CSV export
```

**Module pattern:** All JS files use IIFE with the revealing module pattern, exposing globals (e.g., `window.StorageEngine`, `window.AuthSession`, `window.UIRenderer`). Modules are loaded via `<script>` tags in `index.html` in dependency order — `app.js` initializes everything.

**Data flow:**
```
Browser SPA → localStorage (StorageEngine) → /api/proxy.js (Vercel serverless) → External SOAP/WCF endpoints
```

All SOAP requests go through `/api/proxy.js` to bypass browser CORS restrictions. The proxy accepts `{targetUrl, headers, payload, timeoutMs}` and returns `{success, statusCode, duration, errorDetail, responseBody}`.

### Storage Layer

All localStorage keys are namespaced with `stp_v3_` prefix. `StorageEngine` in `storage/engine.js` is the generic abstraction; the 7 domain managers (`users.js`, `profiles.js`, `groups.js`, `scenarios.js`, `results.js`, `schedules.js`, `methods.js`) each wrap it with entity-specific validation and logic.

Maximum 5,000 execution results are stored; auto-cleanup removes oldest records beyond that.

### Authentication & RBAC

Three user roles: `admin`, `operador`, `visualizador`. Permissions are checked via `window.AuthRBAC.hasPermission(action)`. Passwords are SHA-256 hashed client-side (not production-safe). Sessions expire after 8 hours with a 5-minute pre-expiry warning toast.

First-access bootstrap: if no users exist, a first-admin creation screen appears.

### SOAP Execution Engine

`engine/runner.js` handles concurrent request batches using AbortController for timeouts. Concurrency is configurable (1–20). Payload templates support `{{NUM_ATENDIMENTO}}`, `{{LOGIN}}`, `{{SENHA}}` placeholders. SOAP Fault detection and namespace-aware XML parsing live in `engine/xml.js`. Constants (timeout defaults, concurrency limits, ramp-up) are in `engine/config.js`.

### CRON Scheduler

`features/scheduler.js` runs background scheduling only while the browser tab is open. Schedules store a `proximaExecucao` ISO timestamp and are checked on an interval.

## Design System

Mandatory color palette — do not deviate:

| Role | Hex | Usage |
|------|-----|-------|
| Primary (Navy) | `#003761` | Sidebar, header |
| Background | `#F8F9FA` | Main workspace |
| Action (Teal) | `#0F9B94` | Buttons, success states |
| Accent (Gold) | `#C49B3C` | Separators, alerts |

CSS is split into `reset.css → variables.css → layout.css → components.css → charts.css → animations.css`. All design tokens are CSS variables defined in `variables.css`.

Typography: UI uses **Inter** (labels/titles); technical data (URLs, response times, XML) uses **JetBrains Mono**.

## Key Conventions

- **RBAC checks are mandatory** before any destructive UI action — call `AuthRBAC.hasPermission()` and hide/disable controls for unauthorized roles.
- **StorageEngine is the only persistence layer** — there is no backend database; all state lives in `localStorage`.
- **Proxy required for all SOAP calls** — direct browser-to-endpoint requests will fail due to CORS; always route through `/api/proxy.js`.
- **Module globals** — each module registers itself on `window` (e.g., `window.UINotifications.show(...)`); check `app.js` for initialization order when adding new modules.
- **Result schema** must include `origem` field (`"manual"`, `"schedule"`, or `"scenario"`) and `executadoPor` (user UUID).

## Documentation

Detailed specs and scope are in the root-level `.md` files:
- `STP_SOAP_v3_Especificacao_Tecnica.md` — full technical specification
- `STP_SOAP_v3_Escopo_Evolucao.md` — phase-by-phase scope
- `ROADMAP.md` — current completion status
- Each `assets/js/<module>/` folder contains a phase-specific README
