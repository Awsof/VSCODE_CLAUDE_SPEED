# Fase 3 — UI/UX Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-10  
**Dependência:** Fases 1 e 2 (Storage + Auth)

---

## 📋 Resumo

Fase 3 implementa a interface de usuário completa do STP·SOAP v3 com:
- ✅ Sistema de design com 6 arquivos CSS modularizados
- ✅ Renderização dinâmica da UI principal
- ✅ Componentes reutilizáveis (modais, notificações, sidebar)
- ✅ Integração com RBAC para ocultar recursos sem permissão
- ✅ Dashboard com estatísticas e gráficos

---

## 🎨 Design System

### Paleta de Cores

| Variável | Hex | Uso |
|----------|-----|-----|
| `--primary` | `#0F9B94` | Botões primários, ações principais |
| `--primary-dark` | `#003761` | Logo, títulos principais |
| `--accent` | `#C49B3C` | Destaques, avisos |
| `--success` | `#16A34A` | Status positivo |
| `--warning` | `#F59E0B` | Avisos, timeout próximo |
| `--danger` | `#DC2626` | Erros, deletar |
| `--bg` | `#F8F9FA` | Background principal |
| `--surface` | `#FFFFFF` | Cards, containers |
| `--border` | `#D1D5DB` | Divisões, linhas |

### Tipografia

- **UI**: `Inter` (sans-serif) — 400, 500, 600, 700
- **Monospace**: `JetBrains Mono` — para dados técnicos e codificação

### Spacing & Radius

- `--radius`: `16px` (cards, modais)
- `--radius-sm`: `10px` (botões, inputs)
- Gap padrão: `16px` ou `20px`
- Padding padrão: `20px` a `24px`

---

## 📁 Arquivos Criados

### CSS (`assets/css/`)

#### 1. `variables.css`
Define as variáveis CSS globais (cores, tipografia, espaçamento, sombras).

**Uso:**
```css
background: var(--surface);
color: var(--text);
border-radius: var(--radius);
```

#### 2. `reset.css`
Normaliza estilos do navegador, remove margens/paddings padrão.

#### 3. `layout.css`
Define grid/flexbox layout, sidebar, header, workspace.

**Principais containers:**
- `#app` — Grid 2 colunas (sidebar + workspace)
- `.app-sidebar` — Navegação lateral
- `.app-header` — Cabeçalho com logo e controles
- `.app-content` — Área principal de conteúdo

#### 4. `components.css`
Componentes reutilizáveis:
- `.section-card` — Cards com sombra
- `.stat-card` — Cartões de estatísticas
- `.badge` — Badges com cores
- `.button` — Botões (primary, secondary, danger)
- `.field` — Inputs e labels
- `.table` — Tabelas
- `.card-list` — Listas de cartões
- `.modal-*` — Componentes de modal

#### 5. `charts.css`
Estilos para gráficos Chart.js:
- `.chart-card` — Container do gráfico
- `.chart-title` — Título do gráfico
- `.chart-canvas` — Canvas do gráfico

#### 6. `animations.css`
Animações reutilizáveis:
- `fadeInUp` — Entrada suave de cima para baixo

---

### JavaScript (`assets/js/ui/`)

#### 1. `modals.js` — ModalManager

**Responsabilidade:** Gerenciar diálogos modais.

**Métodos públicos:**
- `open(options)` — Abrir modal customizado
  - `title` (string)
  - `body` (string HTML)
  - `confirmText` (string, padrão "Confirmar")
  - `cancelText` (string, padrão "Cancelar")
  - `onConfirm` (função callback)
  - `onCancel` (função callback)
  - `width` (string, padrão "520px")
- `close()` — Fechar modal
- `confirm(options)` — Atalho para modal de confirmação

**Exemplo:**
```javascript
ModalManager.confirm({
  title: 'Confirmar exclusão',
  body: 'Tem certeza que deseja excluir este perfil?',
  confirmText: 'Excluir',
  cancelText: 'Cancelar',
  onConfirm: () => {
    ProfilesManager.delete_(profileId);
    NotificationsManager.success('Perfil excluído');
  }
});
```

#### 2. `notifications.js` — NotificationsManager

**Responsabilidade:** Exibir toasts de notificação.

**Métodos públicos:**
- `notify(message, type, duration)` — Exibir notificação
  - `type`: 'info' (padrão), 'success', 'warning', 'danger'
  - `duration`: ms (padrão 4200)
- `info(message, duration)` — Atalho para notificação info
- `success(message, duration)` — Atalho para sucesso
- `warning(message, duration)` — Atalho para aviso
- `danger(message, duration)` — Atalho para erro

**Exemplo:**
```javascript
NotificationsManager.success('Perfil salvo com sucesso!', 3000);
NotificationsManager.warning('Sessão expira em 5 minutos');
NotificationsManager.danger('Erro ao conectar ao servidor');
```

#### 3. `sidebar.js` — SidebarManager

**Responsabilidade:** Renderizar a navegação lateral com RBAC.

**Métodos públicos:**
- `render(user, activeId, onNavigate)` — Renderizar sidebar
  - `user`: objeto do usuário autenticado
  - `activeId`: ID da aba ativa
  - `onNavigate`: callback ao clicar em item

**Itens de navegação:**
- Dashboard (sempre visível)
- Perfis (`profiles:list`)
- Grupos (`groups:list`)
- Cenários (`scenarios:list`)
- Resultados (`results:list`)
- Configurações (`settings:view`)

**Exemplo:**
```javascript
SidebarManager.render(user, 'dashboard', (tabId) => {
  Renderer.navigate(tabId);
});
```

#### 4. `renderer.js` — Renderer

**Responsabilidade:** Renderizar a interface completa da aplicação.

**Métodos públicos:**
- `renderMainApp(user)` — Renderizar a app com usuário autenticado
- `getCurrentTab()` — Obter aba ativa

**Abas principais:**
1. **Dashboard** — Visão geral com estatísticas e gráficos
2. **Perfis** — Listar e gerenciar perfis
3. **Grupos** — Listar e gerenciar grupos
4. **Cenários** — Listar e gerenciar cenários
5. **Resultados** — Histórico de execuções
6. **Configurações** — Status da sessão e dados do usuário

**Dashboard:**
- 4 cartões com: Perfis, Grupos, Cenários, Resultados
- Tabela dos últimos 5 resultados
- Gráficos: Taxa de sucesso (rosca), Duração média (barras)

**Exemplo:**
```javascript
// Na app.js, após login
const user = SessionManager.getCurrentUser();
Renderer.renderMainApp(user);
```

---

## 🏗️ Estrutura da Interface

```
┌─────────────────────────────────────────┐
│  Logo  │  STP·SOAP v3  │  ⏱ Tempo │ [Sair] │  ← Header
├─────────┬───────────────────────────────┤
│         │                               │
│  Nav    │                               │
│  Perfis │      Conteúdo da Aba Ativa   │
│ Grupos  │    (Dashboard, Perfis, etc)  │
│ Cenários│                               │
│ Resultados│                             │
│ Configs │                               │
│         │                               │
└─────────┴───────────────────────────────┘
        ↓ Toasts (canto inferior direito)
```

---

## 🔐 Integração com RBAC

A UI oculta automaticamente itens de navegação com base nas permissões:

| Nível | Visível |
|-------|---------|
| admin | Todos os itens |
| operador | Perfis, Grupos, Cenários, Resultados |
| visualizador | Dashboard, Resultados |

**Controle em tempo real:**
```javascript
// No SidebarManager
const visibleItems = NAV_ITEMS.filter(item => {
  if (!item.permission) return true; // Sempre visível
  return RBACManager.canCurrent(item.permission);
});
```

---

## 📊 Exemplos de Uso

### Exibir notificação ao salvar
```javascript
try {
  await ProfilesManager.create(profileData);
  NotificationsManager.success('Perfil criado com sucesso!');
  Renderer.navigate('profiles');
} catch (error) {
  NotificationsManager.danger('Erro ao criar perfil: ' + error.message);
}
```

### Confirmar antes de deletar
```javascript
ModalManager.confirm({
  title: 'Excluir Grupo',
  body: 'Os perfis do grupo ficarão sem grupo. Continuar?',
  onConfirm: () => {
    GroupsManager.delete_(groupId);
    NotificationsManager.success('Grupo excluído');
    Renderer.navigate('groups');
  }
});
```

### Monitorar timeout de sessão
```javascript
// Já feito em app.js
setInterval(() => {
  if (SessionManager.isNearTimeout(5)) {
    NotificationsManager.warning('Sua sessão expira em menos de 5 minutos');
  }
}, 60000);
```

---

## 🔗 Integração com Fases Anteriores

- **Phase 1 (Storage):** Renderer lê dados de `ProfilesManager`, `GroupsManager`, etc
- **Phase 2 (Auth):** Renderer valida permissões via `RBACManager.canCurrent()`
- **Session:** `SessionManager.getTimeRemaining()` mostra tempo na header

---

## 🚀 Próximos Passos (Fase 4+)

- **Fase 4 — Engine Layer:** Executar testes SOAP reais
- **Fase 5 — Features Layer:** Agendamento de testes, cenários sequenciais
- **Fase 6 — Reports Layer:** Relatórios PDF/Excel detalhados
- **Fase 7 — DevOps Layer:** Deploy, CI/CD, monitoramento

---

## 📝 Checklist de Validação

- ✅ CSS carregado corretamente (sem FOUC)
- ✅ Modais funcionam (abrir/fechar)
- ✅ Notificações desaparecem após timeout
- ✅ Sidebar reflete RBAC do usuário
- ✅ Gráficos renderizam com dados
- ✅ Navegação entre abas funciona
- ✅ Responsividade em mobile (sidebar colapsável)
