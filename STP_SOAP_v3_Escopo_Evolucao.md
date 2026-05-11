# STP·SOAP v3 — Escopo de Evolução de Projeto
## Documento de Modelação por Fases

**Projeto Base:** STP·SOAP v2 (Monitor de Performance SOAP)  
**Versão Alvo:** v3.0.0  
**Data:** 2026-05-07  
**Plataforma:** Vercel (Serverless) + Client-side (localStorage)  

---

## Resumo Executivo

Este documento define o escopo técnico completo de evolução do STP·SOAP v2 para v3, organizado em **fases de modelação sequenciais**. Cada fase especifica o que deve ser **CRIADO**, **ALTERADO** ou **EXCLUÍDO**, com justificativa técnica e dependências entre fases.

---

## Fase 1 — Modelagem de Dados e Armazenamento (Storage Layer)

> **Objetivo:** Reorganizar a persistência local, modularizando os managers e introduzindo novas entidades.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/js/storage/engine.js` | Abstração genérica do localStorage (get, set, remove, list, clear) com prefixo de namespace `stp_v3_` | Elimina duplicação de código entre managers e permite migração futura para IndexedDB ou backend |
| `assets/js/storage/users.js` | Manager de usuários: CRUD completo, hash SHA-256 de senhas, validação de duplicidade (usuário/email), flag `ativo` | Base para o sistema RBAC. Schema: `{id, nome, email, usuario, senhaHash, nivel, ativo, criadoEm}` |
| `assets/js/storage/scenarios.js` | Manager de cenários/checklists: CRUD de fluxos de teste fixos com passos ordenados | Nova funcionalidade core. Schema: `{id, nome, descricao, passos[], criadoPor, criadoEm}` |
| `assets/js/storage/results.js` | Manager de histórico de execuções: persistência de resultados com metadados de execução | Desacoplar resultados da variável em memória `S.results`, permitindo histórico entre sessões |
| Chave `stp_users_v3` | Namespace isolado para usuários no localStorage | Evitar conflito com dados legados v2 |
| Chave `stp_scenarios_v3` | Namespace isolado para cenários | Isolamento de dados |
| Chave `stp_results_v3` | Namespace isolado para histórico de execuções | Isolamento de dados |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| `assets/js/storage/profiles.js` (ex-PM) | Lógica inline no HTML com `localStorage` direto | Manager modular usando `storage/engine.js` | Padronização da camada de persistência |
| `assets/js/storage/groups.js` (ex-GM) | Lógica inline no HTML com `localStorage` direto | Manager modular usando `storage/engine.js` | Padronização da camada de persistência |
| Schema de Perfil | Campos legados sem `criadoPor` | Adicionar `criadoPor` (referência ao userId) | Rastreabilidade mínima para controle de acesso (Operador vê apenas seus) |
| Schema de Grupo | Campos legados sem `criadoPor` | Adicionar `criadoPor` (referência ao userId) | Rastreabilidade mínima |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Variável global `S.profiles` como fonte de verdade | Substituída por `storage/profiles.js` com cache controlado |
| Variável global `S.groups` como fonte de verdade | Substituída por `storage/groups.js` |
| Variável global `S.results` como persistência única | Resultados devem ser persistidos em `storage/results.js` para histórico |
| Chaves legadas `stp_profiles_v2` e `stp_groups_v2` | Migrar dados na primeira carga e remover (ou manter como backup read-only) |

### Dependências
- **Bloqueia:** Fase 2 (Auth), Fase 5 (Scheduler)
- **Depende de:** Nenhuma (fase inicial)

---

## Fase 2 — Modelagem de Autenticação e Autorização (Auth Layer)

> **Objetivo:** Implementar controle de acesso multi-usuário com níveis de permissão.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/js/auth/session.js` | Gestão de sessão: login, logout, verificação de expiração (sessionStorage), recuperação de usuário atual | Estado de autenticação centralizado |
| `assets/js/auth/rbac.js` | Regras de permissão: funções `canCreate()`, `canEdit()`, `canExecute()`, `canManageUsers()`, `canExport()` baseadas no nível do usuário | Single Source of Truth para permissões em toda a aplicação |
| Tela "Primeiro Acesso" | Formulário de criação do primeiro administrador quando `users.js` está vazio | Bootstrap do sistema sem configuração manual |
| Tela "Gestão de Usuários" | Tabela CRUD de usuários, acessível apenas por Admin | Administração de usuários e permissões |
| Modal "Novo/Editar Usuário" | Campos: Nome, Email, Usuário, Senha, Confirmar Senha, Nível (select) | Cadastro controlado |
| `api/login.js` (evoluído) | Validar credenciais contra `storage/users.js` em vez de variáveis de ambiente únicas | Suporte a múltiplos usuários |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| Tela de Login atual | Validação contra `process.env.LOGIN_USUARIO/SENHA` | Validação contra `users.js` + hash SHA-256 | Multi-usuário |
| Estrutura de sessão | `sessionStorage.setItem('stp_auth','1')` binário | `sessionStorage.setItem('stp_session', JSON.stringify({userId, usuario, nivel, loginAt}))` | Rich session para RBAC |
| Todas as ações de UI | Sem verificação de permissão | Verificação via `rbac.js` antes de renderizar botões/habilitar ações | Segurança de interface |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Variáveis de ambiente `LOGIN_USUARIO` e `LOGIN_SENHA` no `.env` | Autenticação passa a ser baseada em dados no localStorage |
| Lógica de login único hardcoded | Substituída por sistema multi-usuário |

### Dependências
- **Bloqueia:** Todas as fases seguintes (UI, Engine, Scheduler precisam de auth)
- **Depende de:** Fase 1 (Storage)

---

## Fase 3 — Modelagem de Interface e Design System (UI/UX Layer)

> **Objetivo:** Aplicar identidade visual profissional, modularizar CSS/JS da UI e integrar logo.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/css/variables.css` | Tokens de design: cores (Azul Marinho `#003761`, Cinza `#F8F9FA`, Verde-Água `#0F9B94`, Dourado `#C49B3C`), fontes, espaçamentos, border-radius, sombras | Single Source of Truth para o design system |
| `assets/css/reset.css` | Reset CSS minimalista, preservando acessibilidade | Base limpa para os componentes |
| `assets/css/layout.css` | Grid principal, sidebar (#003761), header (#003761), main workspace (#F8F9FA), linha dourada de separação | Estrutura visual da aplicação |
| `assets/css/components.css` | Cards, modais, tabelas, botões, inputs, chips, badges, dropdowns, toggle switches | Biblioteca de componentes reutilizáveis |
| `assets/css/charts.css` | Containers dos gráficos Chart.js com altura fixa e responsividade | Isolamento de estilos específicos de charts |
| `assets/css/animations.css` | Transições, fadeIn, pulse do logo, slide de modais | Experiência fluida |
| `assets/js/ui/login-screen.js` | Renderização e controle da tela de login/primeiro acesso | Separação de responsabilidades |
| `assets/js/ui/sidebar.js` | Renderização da sidebar com abas: Perfis, Grupos, Cenários, Agenda, Usuários (condicional) | Navegação modular |
| `assets/js/ui/modals.js` | Sistema genérico de modais: abrir, fechar, overlay click, escape key | Reutilização para todos os modais |
| `assets/js/ui/notifications.js` | Sistema de toasts e badges de status (sucesso, erro, alerta) | Feedback ao usuário padronizado |
| `assets/js/ui/renderer.js` | Renderização geral: chips selecionados, preview de numeração, estado da UI | Centralização da lógica de render |
| `assets/logo.svg` | Logo fornecido pelo usuário (placeholder até envio) | Identidade visual |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| Paleta de cores completa | Tema dark (fundo `#07090f`, verde neon `#00e87a`) | Tema claro profissional (fundo `#F8F9FA`, azul marinho `#003761`, verde-água `#0F9B94`) | Alinhamento com identidade corporativa |
| Tipografia | Chakra Petch + JetBrains Mono | Inter (UI) + JetBrains Mono (dados técnicos) | Legibilidade profissional |
| Header | Texto "STP·SOAP v2" sem logo | Logo SVG + "STP Monitor" + linha dourada 1px abaixo | Identidade visual |
| Sidebar | Fundo escuro `#0c0f1d` | Fundo azul marinho `#003761`, itens com barra ativa verde-água | Nova identidade |
| Botão "Iniciar Teste" | Fundo verde neon | Fundo verde-água `#0F9B94`, hover `#0D8A84` | Nova identidade |
| Cards de resultado | Fundo `#111525`, borda escura | Fundo branco `#FFFFFF`, borda cinza clara, sombra sutil | Contraste sobre fundo cinza |
| Tabela de detalhes | Fundo escuro com texto claro | Fundo branco, header cinza claro, texto escuro `#1F2937` | Legibilidade |
| Modais | Tema dark | Tema claro com bordas sutis, mantendo profundidade com sombra | Consistência |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Todas as regras CSS inline no `<style>` do HTML | Substituídas por arquivos CSS modularizados |
| Fonte "Chakra Petch" | Substituída por "Inter" |
| Variáveis CSS legadas do tema dark (ex: `--bg:#07090f`, `--accent:#00e87a`) | Substituídas pelas novas variáveis do design system |
| Animação `pulse` no logo-dot verde neon | Substituída por animação sutil no logo SVG |

### Dependências
- **Bloqueia:** Fase 4, 5, 6 (todas dependem da UI base)
- **Depende de:** Fase 2 (Auth define o que cada usuário vê na UI)

---

## Fase 4 — Modelagem de Funcionalidades Core (Engine Layer)

> **Objetivo:** Modularizar a lógica de execução, manter comportamento atual e preparar para cenários sequenciais.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/js/engine/runner.js` | Lógica de execução de requisições SOAP: `run()`, `exec()`, `viaProxy()`, `direct()` | Separação da lógica de execução do HTML |
| `assets/js/engine/xml.js` | Parser XML, pretty-print, extração de tags (`extractXmlTag`), validação de SOAP Fault | Centralização do processamento XML |
| `assets/js/config.js` | Constantes: `PROXY_URL`, `IS_FILE`, `IS_LOCAL`, `DEFAULT_XML_TAG`, `PALETTE`, `SESSION_KEY` | Configuração centralizada |
| `assets/js/utils.js` | Helpers: `sleep()`, `fms()`, `esc()`, `localISO()`, `localDate()`, `dl()`, `hashSHA256()` | Reutilização de funções utilitárias |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| Lógica de execução `Engine` | Objeto monolítico inline no HTML | Classe/Module `Runner` em `engine/runner.js` com métodos desacoplados | Manutenibilidade |
| Extração de tag XML | Duplicada entre `viaProxy` e `direct` com lógica diferente | Única função `extractXmlTag()` em `xml.js` chamada por ambos | Correção do Bug 3: consistência |
| Contador `CM` (Counter Manager) | Lógica inline | Módulo reutilizável em `utils.js` ou storage | Desacoplamento |
| Estatísticas `Stats` | Objeto inline | Módulo `stats.js` em engine ou utils | Reutilização |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Código JavaScript inline no HTML (exceto bootstrap mínimo) | Toda a lógica migrada para módulos `.js` |
| Duplicação de lógica `extractXmlTag` | Unificada em `xml.js` |
| Fallback hardcoded de tag no `viaProxy` | Tag sempre vem do perfil, com default único em `config.js` |

### Dependências
- **Bloqueia:** Fase 5 (Scheduler usa o Runner)
- **Depende de:** Fase 1 (Storage fornece perfis), Fase 3 (UI mostra progresso)

---

## Fase 5 — Modelagem de Funcionalidades Novas (Features Layer)

> **Objetivo:** Implementar Checklist (cenários sequenciais) e Scheduler (envio automático agendado).

### CRIAR

#### 5.1 Checklist / Cenários de Teste

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/js/ui/scenarios.js` | Renderização da lista de cenários na sidebar e modal de criação/edição | UI da nova funcionalidade |
| Modal "Cenário" | Formulário: Nome, Descrição, Tabela de Passos (ordem, perfil, requests, concorrência) | Cadastro de fluxos fixos |
| Controle de passos | Botões ↑↓ para reordenar, + para adicionar, × para remover | UX simples sem drag-and-drop complexo |
| Execução sequencial | Loop: para cada passo, executar N requests do perfil, aguardar conclusão, pausa 2s, próximo passo | Requisito: depende de interação humana entre passos |
| Log por cenário | Log visual identificando o passo atual ("Passo 1/3: Perfil X") | Clareza na execução longa |

#### 5.2 Scheduler (Agendador)

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `assets/js/engine/scheduler.js` | Motor de agendamento: verifica a cada 30s se há execução pendente baseada em data, hora, frequência, dias da semana | Envio automático periódico |
| `assets/js/storage/schedules.js` | Manager de agendamentos: CRUD com schema `{id, nome, cenarioId/profileIds, config, agendamento{dataInicio,dataFim,horaInicio,horaFim,frequenciaMinutos,diasSemana}, ativo}` | Persistência dos agendamentos |
| Tela "Agendamentos" | Lista de agendamentos com: nome, próxima execução, toggle ativo/inativo, botões editar/excluir | Gestão visual |
| Modal "Novo Agendamento" | 3 abas: (1) Seleção (cenário ou perfis), (2) Configuração (requests, concorrência, timeout), (3) Período (datas, horas, frequência, checkboxes de dias) | Wizard de criação |
| Lógica de catch-up | Ao reabrir a aba, verificar se houve execuções perdidas no window e executar imediatamente | Compensação de fechamento do navegador |
| Badge "Scheduler Ativo" | Indicador no header quando há agendamentos em execução | Feedback visual |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| Painel de configuração | Apenas configuração manual de teste | Adicionar seção "Modo Contínuo" com checkbox e campos de agendamento rápido | Acesso rápido ao scheduler |
| Log de execução | Apenas log manual | Diferenciar logs manuais de logs agendados (flag `scheduled: true`) | Rastreabilidade |
| Resultados | Sem distinção de origem | Adicionar campo `origem: 'manual' \| 'scheduled'` e `scheduleId` | Filtragem futura |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Nenhum — funcionalidades são aditivas | — |

### Dependências
- **Bloqueia:** Nenhuma (última fase funcional)
- **Depende de:** Fase 1 (Storage de scenarios/schedules), Fase 2 (RBAC — apenas Admin/Operador criam agendamentos), Fase 4 (Runner é chamado pelo Scheduler)

---

## Fase 6 — Modelagem de Correções Técnicas (Bugfix Layer)

> **Objetivo:** Corrigir bugs identificados na v2 antes e durante a evolução.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| Testes de regressão manuais | Checklist de validação: gráfico ordenado, tag extraída, exportação funcional, login multi-usuário | Garantia de qualidade |
| Badge "Tag Extraída" no modal RR | Exibir no modal Request/Response: tag utilizada e valor extraído | Debug e validação da correção |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| Gráfico `ctimeline` | Dataset agrupado por endpoint, ordem perdida | Dataset único ordenado por `seq`, eixo X sequencial, cor por endpoint | Correção: ordem de envio |
| `extractXmlTag` no `viaProxy` | Fallback para tag fixa que pode sobrescrever perfil | Tag sempre do perfil, default único em `config.js`, aplicado em `viaProxy` e `direct` | Correção: consistência |
| Persistência de `numAtendimentoDB` | Ocasionalmente `null` no resultado | Garantir atribuição em 100% dos casos, mesmo que extração retorne `null` | Correção: dados completos |
| `responseBody` no resultado | Presente apenas em alguns caminhos | Garantir que `responseBody` e `requestPayload` estejam sempre no objeto resultado | Correção: auditoria completa |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Código comentado como "Bug 3 fix" | Substituído por solução definitiva em `xml.js` |

### Dependências
- **Bloqueia:** Nenhuma (pode ocorrer em paralelo com Fase 3-5)
- **Depende de:** Fase 4 (Engine modularizado para aplicar correções)

---

## Fase 7 — Modelagem de Deploy e Integração (DevOps Layer)

> **Objetivo:** Preparar a aplicação para deploy na Vercel, garantindo compatibilidade e continuidade.

### CRIAR

| Item | Descrição | Justificativa |
|------|-----------|---------------|
| `vercel.json` (atualizado) | Rotas para `/api/proxy` e `/api/login`, headers de CORS | Configuração de deploy |
| `package.json` (atualizado) | Dependências mínimas (se houver) | Manutenção |
| Documentação `README.md` | Instruções de deploy, configuração de env, uso do sistema | Onboarding de novos devs |
| Script de migração de dados v2→v3 | Na primeira carga, detectar `stp_profiles_v2`/`stp_groups_v2` e migrar para novos namespaces | Preservação de dados do usuário |

### ALTERAR

| Item | De | Para | Justificativa |
|------|-----|------|---------------|
| `api/login.js` | Validação contra `process.env` | Validação contra `users.js` (via leitura do body, mantendo CORS) | Multi-usuário |
| `api/proxy.js` | Mantido como está | Verificar compatibilidade com novo formato de payload | Garantia de continuidade |
| `index.html` | Monolito HTML+CSS+JS | Shell mínimo: importação de CSS e JS modulares | Modularização |

### EXCLUÍR

| Item | Justificativa |
|------|---------------|
| Código legado v2 no HTML | Totalmente migrado para módulos |
| Variáveis de ambiente de login único | Substituídas pelo sistema de usuários |

### Dependências
- **Bloqueia:** Nenhuma (fase final)
- **Depende de:** Todas as fases anteriores concluídas

---

## Matriz de Dependências entre Fases

```
Fase 1 (Storage)
    │
    ▼
Fase 2 (Auth) ──► Fase 3 (UI)
    │                  │
    ▼                  ▼
Fase 4 (Engine) ◄──────┘
    │
    ▼
Fase 5 (Features: Checklist + Scheduler)
    │
    ▼
Fase 6 (Bugfix) ──► Fase 7 (Deploy)
```

**Observação:** Fase 6 (Bugfix) pode ser executada em paralelo com Fase 3-5, desde que a Fase 4 (Engine) esteja estabilizada.

---

## Checklist de Entregas por Fase

### Fase 1 — Storage
- [ ] `engine.js` funcional com namespace `stp_v3_`
- [ ] `users.js`, `scenarios.js`, `results.js` criados e testados
- [ ] `profiles.js` e `groups.js` refatorados para usar `engine.js`
- [ ] Migração de dados v2→v3 funcional

### Fase 2 — Auth
- [ ] Tela "Primeiro Acesso" renderizando quando não há usuários
- [ ] Login validando contra `users.js`
- [ ] Sessão rica com `nivel`
- [ ] `rbac.js` bloqueando ações não autorizadas
- [ ] Tela "Gestão de Usuários" funcional (Admin apenas)

### Fase 3 — UI/UX
- [ ] Todas as variáveis CSS aplicadas conforme paleta
- [ ] Logo integrado no header
- [ ] Sidebar com abas funcionais
- [ ] Modais reutilizáveis via `modals.js`
- [ ] Toasts/notificações funcionais
- [ ] Zero CSS/JS inline no HTML

### Fase 4 — Engine
- [ ] `runner.js` executando requisições SOAP corretamente
- [ ] `xml.js` extraindo tags consistentemente
- [ ] `config.js` e `utils.js` funcionais
- [ ] Estatísticas calculadas corretamente

### Fase 5 — Features
- [ ] CRUD de Cenários funcionando
- [ ] Execução sequencial de cenários funcionando
- [ ] CRUD de Agendamentos funcionando
- [ ] Scheduler disparando no horário correto
- [ ] Catch-up após fechamento de aba funcionando

### Fase 6 — Bugfix
- [ ] Gráfico timeline ordenado por `seq`
- [ ] `numAtendimentoDB` sempre presente no resultado
- [ ] `responseBody` e `requestPayload` sempre presentes
- [ ] Exportação XLSX/CSV funcionando com novos campos

### Fase 7 — Deploy
- [ ] Deploy na Vercel sem erros
- [ ] `/api/proxy` respondendo corretamente
- [ ] `/api/login` respondendo corretamente
- [ ] CORS funcionando para origens permitidas

---

## Glossário

| Termo | Significado |
|-------|-------------|
| **RBAC** | Role-Based Access Control — controle de acesso baseado em papéis |
| **Checklist** | Fluxo de teste fixo com passos sequenciais (Cenário) |
| **Scheduler** | Agendador de execuções automáticas periódicas |
| **Catch-up** | Execução imediata de tarefas perdidas durante fechamento do navegador |
| **Namespace** | Prefixo isolador de chaves no localStorage (`stp_v3_`) |
| **Proxy CORS** | Serverless function que faz fetch no servidor para contornar restrições de CORS |

---

*Documento gerado em 2026-05-07. Aprovação para implementação pendente.*
