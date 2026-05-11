# STP·SOAP v3 — Documento Técnico de Especificação
## Versão: 3.0.0 | Data: 2026-05-07 | Status: APROVADO PARA IMPLEMENTAÇÃO

---

## 1. VISÃO GERAL

Evolução do STP·SOAP v2 para uma aplicação de monitoramento de webservices SOAP com design profissional, modularização completa, sistema de usuários com RBAC, fluxos de teste sequenciais (Checklist) e envio automático agendado.

**Deploy:** Vercel (Serverless Functions)  
**Armazenamento:** localStorage (navegador) — sem banco de dados  
**Público-alvo:** Até 5 usuários simultâneos, ambiente interno de testes de estabilidade  
**LGPD:** Não se aplica (dados sintéticos de teste, sem dados reais de pacientes)

---

## 2. DESIGN SYSTEM

### 2.1 Paleta de Cores (obrigatória)

| Percentual | Cor | Hex | Aplicação |
|------------|-----|-----|-----------|
| 30% | Azul Marinho | `#003761` | Sidebar (navegação) e Header. Moldura de autoridade e solidez. |
| 60% | Cinza Claríssimo | `#F8F9FA` | Fundo da área principal (workspace). Reduz cansaço visual. |
| 8% | Verde-Água | `#0F9B94` | Botões de ação primária (Enviar, Salvar, Exportar, Iniciar Teste) e status ativos/sucesso. "Caminho de sucesso" visual. |
| 2% | Dourado | `#C49B3C` | Linhas de separação finas (1px) entre header e conteúdo; ícones de alerta/destaque; toques de refinamento. |

### 2.2 Cores de Estado

| Estado | Cor | Uso |
|--------|-----|-----|
| Sucesso | `#0F9B94` (Verde-Água) | Requisição OK, status positivo, progresso completo |
| Erro | `#DC2626` (Vermelho) | Falha na requisição, validação, erro crítico |
| Alerta | `#C49B3C` (Dourado) | Timeout, avisos, banner file:// |
| Informativo | `#003761` (Azul Marinho) | Labels secundárias, metadados |
| Texto Principal | `#1F2937` (Gray-800) | Títulos, conteúdo sobre fundo cinza |
| Texto Secundário | `#6B7280` (Gray-500) | Descrições, placeholders, timestamps |
| Borda | `#E5E7EB` (Gray-200) | Cards, inputs, separadores sutis |

### 2.3 Tipografia

| Função | Fonte | Peso | Tamanho |
|--------|-------|------|---------|
| Logo / Brand | Inter | 700 | 18px |
| Títulos de Seção | Inter | 600 | 14px |
| Labels / Botões | Inter | 500 | 12–13px |
| Dados Técnicos | JetBrains Mono | 400–500 | 11–12px |
| Timestamps / Metadados | JetBrains Mono | 400 | 10px |

### 2.4 Componentes Visuais

- **Cards:** Fundo branco `#FFFFFF`, borda `1px solid #E5E7EB`, border-radius `8px`, sombra `0 1px 3px rgba(0,0,0,0.04)`
- **Inputs:** Fundo `#FFFFFF`, borda `1px solid #D1D5DB`, border-radius `6px`, focus `2px solid #0F9B94`
- **Botões Primários:** Fundo `#0F9B94`, texto branco, border-radius `6px`, hover `#0D8A84`
- **Botões Secundários:** Fundo transparente, borda `1px solid #0F9B94`, texto `#0F9B94`
- **Botões Destrutivos:** Fundo transparente, borda `1px solid #DC2626`, texto `#DC2626`
- **Sidebar:** Fundo `#003761`, texto branco com opacidade 0.9, itens ativos com barra lateral `#0F9B94` 4px
- **Header:** Fundo `#003761`, altura 56px, separação do conteúdo por linha dourada `1px solid #C49B3C`
- **Logo:** Imagem fornecida pelo usuário (SVG/PNG), posicionada à esquerda do header com altura 32px

---

## 3. ARQUITETURA DE ARQUIVOS

```
stp-soap-v3/
├── index.html                          # Shell mínimo: container + login screen
├── assets/
│   ├── css/
│   │   ├── variables.css               # Tokens de cor, fonte, espaçamento
│   │   ├── reset.css                   # Reset básico
│   │   ├── layout.css                  # Grid, sidebar, header, main workspace
│   │   ├── components.css              # Cards, modais, tabelas, botões, inputs
│   │   ├── charts.css                  # Containers dos gráficos Chart.js
│   │   └── animations.css              # Transições, fadeIn, pulse
│   ├── js/
│   │   ├── app.js                      # Bootstrap, inicialização, event listeners globais
│   │   ├── config.js                   # Constantes, URLs, paleta, defaults
│   │   ├── utils.js                    # Helpers: sleep, fms, esc, localISO, localDate, dl
│   │   ├── auth/
│   │   │   ├── session.js              # Login, logout, sessão ativa
│   │   │   └── rbac.js                 # Verificação de permissões por nível
│   │   ├── storage/
│   │   │   ├── engine.js               # Abstração localStorage (get/set/remove)
│   │   │   ├── users.js                # CRUD usuários + hash SHA-256
│   │   │   ├── profiles.js             # CRUD perfis (antigo PM)
│   │   │   ├── groups.js               # CRUD grupos (antigo GM)
│   │   │   ├── scenarios.js            # CRUD checklists/cenários (novo)
│   │   │   └── results.js              # Histórico de execuções
│   │   ├── engine/
│   │   │   ├── runner.js               # Execução de requisições SOAP (antigo Engine)
│   │   │   ├── scheduler.js            # Agendador de envios automáticos
│   │   │   └── xml.js                  # Parser, pretty-print, extração de tags
│   │   ├── ui/
│   │   │   ├── renderer.js             # Renderização geral e estado da UI
│   │   │   ├── sidebar.js              # Lista de perfis, grupos, cenários
│   │   │   ├── modals.js               # Gestão de modais (abrir/fechar/overlay)
│   │   │   ├── notifications.js        # Toasts, badges de status
│   │   │   └── login-screen.js         # Tela de login e primeiro acesso
│   │   ├── charts/
│   │   │   ├── timeline.js             # CORREÇÃO: ordenado por seq global
│   │   │   ├── percentiles.js          # Distribuição de percentis
│   │   │   ├── histogram.js            # Histograma de latência
│   │   │   └── success.js              # Taxa de sucesso por endpoint
│   │   └── export/
│   │       ├── xlsx.js                 # Exportação Excel
│   │       └── csv.js                  # Exportação CSV
│   └── logo.svg                        # Logo fornecido pelo usuário
├── api/                                # Vercel Serverless Functions
│   ├── proxy.js                        # Mantido: CORS proxy para SOAP
│   └── login.js                        # Evoluído: valida contra users.js
└── vercel.json                         # Configuração de rotas API
```

---

## 4. CORREÇÕES TÉCNICAS

### 4.1 Gráfico "Latência por Requisição" fora de ordem

**Problema:** O dataset atual agrupa por endpoint, perdendo a sequência temporal real de envio.

**Solução:**
- Criar um único dataset ordenado pelo campo `seq` (sequência global de envio).
- Eixo X: índice sequencial `#001`, `#002`, `#003`...
- Cada ponto de dados terá cor do endpoint correspondente (cor do perfil).
- Tooltip exibirá: endpoint, versão, numAtendimento, duração.
- Chart.js `type: 'line'` com `showLine: false` (scatter conectado visualmente) ou `type: 'bar'` fino por requisição.

**Implementação:**
```javascript
// Dataset único, ordenado por seq
const sorted = [...results].sort((a,b) => a.seq - b.seq);
const labels = sorted.map(r => `#${String(r.seq).padStart(3,'0')}`);
const dataPoints = sorted.map(r => ({
  x: r.seq,
  y: r.duration,
  endpoint: r.endpoint,
  color: r.color
}));
```

### 4.2 TAG de resposta não gravada corretamente

**Problema:** Inconsistência entre `viaProxy` e `direct` na extração da tag XML. O fallback no proxy pode sobrescrever a tag do perfil.

**Solução:**
- Padronizar função `extractXmlTag(xml, tag)` em `xml.js`.
- Fluxo: `tag = (profile.xmlTag || '').trim() || 'diag:NumeroAtendimentoApoiado'`
- Aplicar em **ambos** os caminhos (proxy e direct) de forma idêntica.
- Garantir que `numAtendimentoDB` seja sempre atribuído ao objeto resultado, mesmo que `null`.
- No modal Request/Response, adicionar badge exibindo a tag utilizada e o valor extraído.

**Validação:**
```javascript
const xmlTag = (profile.xmlTag || '').trim() || 'diag:NumeroAtendimentoApoiado';
const numDB = extractXmlTag(responseBody, xmlTag);
// numDB deve estar presente em S.results[i].numAtendimentoDB em 100% dos casos
```

---

## 5. EVOLUÇÕES

### 5.1 Sistema de Usuários e RBAC

**Armazenamento:** `localStorage` — chave `stp_users_v3`

**Schema do Usuário:**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "usuario": "joao.silva",
  "senhaHash": "sha256_hex",
  "nivel": "admin|operador|visualizador",
  "ativo": true,
  "criadoEm": "2026-05-07T10:00:00"
}
```

**Níveis de Permissão:**

| Recurso | Admin | Operador | Visualizador |
|---------|-------|----------|--------------|
| Criar/Editar/Excluir Usuários | ✅ | ❌ | ❌ |
| Criar/Editar/Excluir Perfis | ✅ | ✅ (próprios) | ❌ |
| Criar/Editar/Excluir Grupos | ✅ | ✅ (próprios) | ❌ |
| Criar/Editar/Excluir Cenários | ✅ | ✅ (próprios) | ❌ |
| Executar Testes Manuais | ✅ | ✅ | ❌ |
| Executar Scheduler | ✅ | ✅ | ❌ |
| Visualizar Resultados | ✅ | ✅ | ✅ |
| Exportar Dados | ✅ | ✅ | ❌ |
| Importar/Exportar Config | ✅ | ✅ | ❌ |

**Primeiro Acesso:**
- Ao carregar o sistema, se `stp_users_v3` estiver vazio, exibir tela "Primeiro Acesso" em vez de login.
- O primeiro usuário cadastrado recebe nível `admin` automaticamente.
- A partir daí, apenas admins podem criar novos usuários via tela de gestão.

**Tela de Gestão de Usuários:**
- Acessível apenas para Admin via menu sidebar.
- Tabela com: Nome, Usuário, Nível, Status, Ações (editar, ativar/desativar, resetar senha).
- Modal de criação/edição com campos: Nome, Email, Usuário, Senha, Nível (select).

### 5.2 Checklist (Fluxos de Teste Fixos / Cenários)

**Conceito:** Cenário é uma sequência ordenada de passos. Cada passo define um perfil e quantidade de requests.

**Schema do Cenário:**
```json
{
  "id": "uuid",
  "nome": "Teste Matutino - Produção",
  "descricao": "Validação diária dos endpoints de produção",
  "passos": [
    { "ordem": 1, "profileId": "uuid-perfil-1", "requests": 5, "concorrencia": 2 },
    { "ordem": 2, "profileId": "uuid-perfil-2", "requests": 3, "concorrencia": 1 }
  ],
  "criadoPor": "usuario-id",
  "criadoEm": "2026-05-07T10:00:00"
}
```

**Execução:**
- Sequencial: passo 1 completo (todas as requests) → passo 2 → passo 3...
- Entre passos: pausa de 2 segundos para estabilização.
- Progresso exibido por passo (barra individual + log).
- Ao final, relatório consolidado com métricas por passo e total.

**UI:**
- Sidebar terá abas: "Perfis", "Cenários".
- Na aba Cenários: lista com nome, quantidade de passos, botão play (executar).
- Modal de criação: nome, descrição, tabela de passos (drag-and-drop para reordenar, ou botões ↑↓).
- Cada passo: select do perfil, input requests, input concorrência.

### 5.3 Scheduler (Envio Automático Agendado)

**Funcionalidade:** Permitir agendar execuções automáticas com controle de período, quantidade e frequência.

**Schema do Agendamento:**
```json
{
  "id": "uuid",
  "nome": "Monitoramento Noturno",
  "cenarioId": "uuid-cenario",        // ou null para perfis selecionados
  "profileIds": ["uuid1", "uuid2"],   // usado se cenarioId for null
  "config": {
    "requests": 5,
    "concorrencia": 2,
    "timeout": 120
  },
  "agendamento": {
    "dataInicio": "2026-06-01",
    "dataFim": "2026-06-05",
    "horaInicio": "08:00",
    "horaFim": "18:00",
    "frequenciaMinutos": 5,
    "diasSemana": [1,2,3,4,5]         // 0=dom, 6=sab
  },
  "ativo": true,
  "criadoPor": "usuario-id"
}
```

**Comportamento:**
- O scheduler verifica a cada 30 segundos se há execução pendente.
- Critérios para executar:
  1. Data atual entre `dataInicio` e `dataFim`
  2. Dia da semana atual está em `diasSemana`
  3. Hora atual entre `horaInicio` e `horaFim`
  4. Última execução + `frequenciaMinutos` <= agora
- Ao executar: dispara o runner normalmente, registra resultado com flag `scheduled: true`.
- Log visual mostra: próxima execução, contador de ciclos hoje, status (ativo/pausado).
- Botões: Ativar/Desativar, Editar, Excluir.
- **Limitação:** Funciona apenas enquanto a aba do navegador estiver aberta. Ao fechar, o scheduler para. Ao reabrir, verifica se há execuções perdidas e executa imediatamente se estiver dentro do window (catch-up).

**UI:**
- Nova aba "Agendamentos" na sidebar.
- Modal de criação com abas: (1) Seleção (cenário ou perfis), (2) Configuração (requests, concorrência), (3) Período (datas, horas, frequência, dias).
- Lista mostrando: nome, próxima execução, status toggle switch.

---

## 6. FLUXOS DE TELA

### 6.1 Primeiro Acesso (sem usuários cadastrados)
```
Tela "Bem-vindo ao STP Monitor"
  └── Form: Nome, Email, Usuário, Senha, Confirmar Senha
      └── [Criar Conta Administradora]
          └── Redireciona para App (logado como Admin)
```

### 6.2 Login (usuários existentes)
```
Tela de Login
  └── Form: Usuário, Senha
      └── [Entrar]
          └── Valida contra localStorage
              └── Sucesso → App
              └── Falha → Mensagem de erro
```

### 6.3 App Principal (após login)
```
+----------------------------------------------------------+
| [LOGO]  STP Monitor                    [Usuário ▼] [Sair] |  Header #003761
|----------------------------------------------------------|  Linha #C49B3C 1px
| Sidebar |  Área Principal (Workspace #F8F9FA)            |
| #003761 |                                                |
|         |  Abas: Resumo | Detalhes | Gráficos            |
| Perfis  |                                                |
| Grupos  |  [Conteúdo dinâmico]                         |
| Cenários|                                                |
| Agenda  |                                                |
| Usuários|                                                |  (apenas Admin)
|         |                                                |
+----------------------------------------------------------+
```

### 6.4 Execução de Teste
```
1. Usuário seleciona perfis (ou cenário) na sidebar
2. Configura requests, concorrência, timeout no painel esquerdo
3. Clica [Iniciar Teste] — botão #0F9B94
4. Sistema exibe:
   - Barra geral de progresso
   - Barras por perfil
   - Log em tempo real (geral + por perfil)
5. Ao concluir:
   - Resultados aparecem nas abas Resumo/Detalhes/Gráficos
   - Botão Exportar habilitado
```

---

## 7. REGRAS DE NEGÓCIO

### 7.1 Numeração de Atendimento
- Mantido: `{CODIGO}{YYYYMMDD}{SEQ:003}`
- Contador por código, por dia, em localStorage (`cnt_{CODIGO}_{YYYYMMDD}`)
- Reset automático às 00:00 (novo dia gera nova chave)

### 7.2 Payload Template
- Placeholders: `{{NUM_ATENDIMENTO}}`, `{{LOGIN}}`, `{{SENHA}}`
- Substituição síncrona antes do envio
- Mantido o campo `xmlTag` para extração do response

### 7.3 Proxy CORS
- Mantido `proxy.js` na Vercel
- Endpoint: `/api/proxy`
- Timeout configurável (padrão 120s)
- Retorno padronizado: `{ success, statusCode, duration, errorDetail, responseBody }`

### 7.4 Tratamento de Falha
- Em caso de erro (timeout, SOAP Fault, HTTP error):
  - Registrar no resultado com `success: false`
  - Logar no painel em tempo real
  - **Não interromper** o fluxo — seguir para próxima requisição
  - Ao final, contabilizar no resumo (coluna Erros)

---

## 8. REQUISITOS NÃO-FUNCIONAIS

| Requisito | Especificação |
|-----------|---------------|
| Performance | Interface responsiva em até 1s para renderização de 1000 resultados |
| Compatibilidade | Chrome, Firefox, Edge (últimas 2 versões) |
| Responsividade | Desktop prioritário (1366px+). Tablet aceitável. Mobile não obrigatório. |
| Disponibilidade | 24/7 via Vercel (infraestrutura serverless) |
| Segurança | Senhas hasheadas SHA-256. Sem dados sensíveis reais. |
| Backup | Exportação/Importação JSON de toda a configuração (perfis, grupos, cenários, usuários) |

---

## 9. CHECKLIST DE IMPLEMENTAÇÃO

- [ ] Estrutura de diretórios e arquivos CSS/JS modularizados
- [ ] Design system aplicado (cores, fontes, componentes)
- [ ] Logo integrado no header
- [ ] Sistema de usuários (CRUD + RBAC)
- [ ] Primeiro acesso = Admin automático
- [ ] Tela de gestão de usuários (apenas Admin)
- [ ] Correção: Gráfico timeline ordenado por `seq`
- [ ] Correção: Extração e gravação consistente de `numAtendimentoDB`
- [ ] Módulo Checklist/Cenários (CRUD + execução sequencial)
- [ ] Módulo Scheduler (agendamento por período + frequência)
- [ ] Exportação XLSX/CSV mantida e funcional
- [ ] Proxy CORS mantido sem alterações de comportamento
- [ ] Testes manuais de validação

---

## 10. PRÓXIMO PASSO

**Status:** Documento aprovado.  
**Ação:** Implementação completa do código fonte.  
**Entregável:** Pasta `/mnt/agents/output/stp-soap-v3/` pronta para deploy na Vercel.

---

*Documento gerado em 2026-05-07. Aprovação implícita pelo usuário após fornecimento das respostas de alinhamento.*
