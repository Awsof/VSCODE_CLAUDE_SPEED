# Fase 5 — Features Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-10  
**Dependência:** Fases 1-4 (Storage, Auth, UI, Engine)

---

## 📋 Resumo

Fase 5 implementa recursos avançados de execução:
- ✅ Executor de cenários com passos sequenciais
- ✅ Agendador de testes com CRON
- ✅ Monitor de agendamentos em background
- ✅ Sistema de eventos para rastrear execução

---

## 📁 Arquivos Criados

### Storage

#### `assets/js/storage/schedules.js` — SchedulerManager

**Responsabilidade:** Gerenciar agendamentos de testes programados.

**Schema de agendamento:**
```json
{
  "id": "uuid",
  "nome": "Teste Diário Produção",
  "descricao": "Executa todos os dias às 6h",
  "cenarioId": "uuid ou null",
  "profileIds": ["prof-1", "prof-2"],
  "config": {
    "requestsPerProfile": 10,
    "concurrency": 3,
    "rampUp": 0,
    "timeout": 120
  },
  "cron": "0 6 * * *",
  "ativo": true,
  "proximaExecucao": "2026-05-11T06:00:00Z",
  "ultimaExecucao": "2026-05-10T06:00:00Z",
  "criadoPor": "uuid",
  "criadoEm": "2026-05-10T00:00:00Z"
}
```

**Métodos públicos:**

| Método | Descrição |
|--------|-----------|
| `create(scheduleData)` | Criar novo agendamento |
| `list(userId)` | Listar agendamentos (filtrado por usuário opcional) |
| `getById(scheduleId)` | Obter agendamento por ID |
| `update(scheduleId, updates)` | Atualizar agendamento |
| `delete_(scheduleId)` | Deletar agendamento |
| `setActive(scheduleId, ativo)` | Ativar/desativar |
| `recordExecution(scheduleId)` | Registrar última execução |
| `getDue()` | Obter agendamentos vencidos |
| `count()` | Contar agendamentos |

**Exemplo:**
```javascript
// Criar agendamento
const schedule = SchedulerManager.create({
  nome: 'Teste Diário',
  descricao: 'Executa todos os dias às 6h',
  profileIds: ['prof-1', 'prof-2'],
  cenarioId: null,
  cron: '0 6 * * *', // 6h todo dia
  config: {
    requestsPerProfile: 10,
    concurrency: 5,
    rampUp: 0,
    timeout: 120
  }
});

// Listar agendamentos ativos
const schedules = SchedulerManager.list();

// Obter agendamentos devido (próximos 5 minutos)
const dueSchedules = SchedulerManager.getDue();

// Desativar agendamento
SchedulerManager.setActive(schedule.id, false);
```

---

### Features

#### `assets/js/features/executor.js` — ScenarioExecutor

**Responsabilidade:** Executar cenários com passos sequenciais.

**Fluxo:**
1. Validar cenário existe
2. Para cada passo do cenário:
   - Obter perfis do passo
   - Executar batch de requisições
   - Coletar resultados
   - Emitir eventos de progresso
3. Retornar todos os resultados agregados

**Métodos públicos:**

| Método | Descrição |
|--------|-----------|
| `execute(scenarioId)` | Executar cenário (assíncrono) |
| `abort()` | Cancelar execução |
| `getStatus()` | Obter status atual |
| `on(eventType, callback)` | Registrar listener de eventos |

**Eventos:**
- `scenario-start` — Cenário iniciou
- `step-start` — Passo iniciou
- `step-complete` — Passo completou
- `scenario-complete` — Cenário completou com stats
- `scenario-error` — Erro geral
- `scenario-aborted` — Cancelado

**Exemplo:**
```javascript
// Registrar listeners
ScenarioExecutor.on('scenario-start', (event) => {
  console.log(`Iniciando cenário: ${event.scenario.nome}`);
});

ScenarioExecutor.on('step-complete', (event) => {
  const stats = {
    passo: event.stepIndex,
    total: event.results.length,
    sucesso: event.results.filter(r => r.success).length
  };
  console.log(`Passo ${stats.passo}: ${stats.sucesso}/${stats.total} OK`);
});

ScenarioExecutor.on('scenario-complete', (event) => {
  console.log(`Cenário concluído: ${event.stats.successful}/${event.stats.total}`);
  console.log(`Taxa de sucesso: ${event.stats.successRate}%`);
});

// Executar
const results = await ScenarioExecutor.execute(scenarioId);

// Cancelar (se necessário)
// ScenarioExecutor.abort();
```

---

#### `assets/js/features/scheduler.js` — ScheduleRunner

**Responsabilidade:** Monitor de agendamentos que roda em background.

**Funcionalidade:**
- Verifica a cada 60s se há agendamentos vencidos
- Executa agendamentos automaticamente
- Salva resultados em `ResultsManager`
- Atualiza próxima execução

**Métodos públicos:**

| Método | Descrição |
|--------|-----------|
| `start()` | Iniciar monitor |
| `stop()` | Parar monitor |
| `forceExecute(scheduleId)` | Forçar execução imediata |
| `getStatus()` | Obter status |
| `on(eventType, callback)` | Registrar listener |

**Eventos:**
- `runner-start` — Monitor iniciou
- `runner-stop` — Monitor parou
- `schedule-executing` — Começando execução
- `schedule-executed` — Execução completou
- `schedule-error` — Erro durante execução

**Exemplo:**
```javascript
// Iniciar monitor (roda em background)
ScheduleRunner.start();

// Registrar listener
ScheduleRunner.on('schedule-executed', (event) => {
  console.log(`Agendamento "${event.schedule.nome}" executado`);
  console.log(`Taxa de sucesso: ${event.successCount}/${event.totalCount}`);
});

ScheduleRunner.on('schedule-error', (event) => {
  NotificationsManager.danger(
    `Erro ao executar "${event.schedule.nome}": ${event.error}`
  );
});

// Forçar execução imediata
ScheduleRunner.forceExecute(scheduleId);

// Parar monitor
ScheduleRunner.stop();

// Status
const status = ScheduleRunner.getStatus();
// { isRunning: true, checkInterval: 60000, ... }
```

---

## 🔄 Fluxo de Execução

### Cenários Sequenciais

```
┌─ User seleciona cenário "Full Test"
│
├─ ScenarioExecutor.execute(scenarioId)
│
├─ Passo 1: Perfil "HAP"
│  ├─ RunnerEngine.executeBatch([HAP], config)
│  ├─ 10 requisições seriais
│  └─ Resultados coletados
│
├─ Delay 200ms
│
├─ Passo 2: Perfil "SUL"
│  ├─ RunnerEngine.executeBatch([SUL], config)
│  ├─ 10 requisições seriais
│  └─ Resultados coletados
│
├─ Delay 200ms
│
├─ Passo 3: Ambos (HAP + SUL)
│  ├─ RunnerEngine.executeBatch([HAP, SUL], config)
│  ├─ 20 requisições simultâneas (concorrência 3)
│  └─ Resultados coletados
│
└─ Retornar: 30 requisições total, stats agregadas
```

### Agendamentos em Background

```
┌─ App inicia
│
├─ ScheduleRunner.start()
│  └─ Cria intervalo de 60s
│
└─ A cada 60s:
   ├─ SchedulerManager.getDue()
   ├─ Para cada agendamento vencido:
   │  ├─ Verificar se é cenário ou profiles
   │  ├─ Executar ScenarioExecutor ou RunnerEngine
   │  ├─ Salvar resultados em ResultsManager
   │  └─ SchedulerManager.recordExecution()
   └─ Recalcular próxima execução (CRON)
```

---

## 📊 Exemplo Completo

### Criar Cenário com 3 Passos

```javascript
// Criar cenário
const scenario = ScenariosManager.create({
  nome: 'Smoke Test Full',
  descricao: 'Testa endpoints principais em sequência',
  criadoPor: SessionManager.getCurrentUser().id
});

// Adicionar passos
ScenariosManager.addStep(scenario.id, {
  ordem: 1,
  profileId: 'prof-hap',
  requests: 10,
  concorrencia: 2
});

ScenariosManager.addStep(scenario.id, {
  ordem: 2,
  profileId: 'prof-sul',
  requests: 10,
  concorrencia: 2
});

ScenariosManager.addStep(scenario.id, {
  ordem: 3,
  profileId: 'prof-amil',
  requests: 5,
  concorrencia: 1
});
```

### Agendar Cenário Diário

```javascript
// Criar agendamento
const schedule = SchedulerManager.create({
  nome: 'Smoke Test Diário',
  descricao: 'Roda todos os dias às 6h da manhã',
  cenarioId: scenario.id,
  profileIds: [], // Usar cenário, não profiles
  cron: '0 6 * * *', // 6h todo dia
  config: {
    requestsPerProfile: 1,
    concurrency: 3,
    rampUp: 0,
    timeout: 120
  }
});

// Iniciar monitor
ScheduleRunner.start();

// Status
console.log(ScheduleRunner.getStatus());
// { 
//   isRunning: true,
//   checkInterval: 60000,
//   nextCheck: "em 60000ms"
// }
```

### Executar Cenário Manualmente

```javascript
// Registrar listeners para acompanhar
ScenarioExecutor.on('step-start', (event) => {
  console.log(`▶ Passo ${event.stepIndex}: ${event.step.profileId}`);
});

ScenarioExecutor.on('step-complete', (event) => {
  const ok = event.results.filter(r => r.success).length;
  console.log(`✓ Passo ${event.stepIndex}: ${ok}/${event.results.length}`);
});

ScenarioExecutor.on('scenario-complete', (event) => {
  console.log(`
  ╔═ Cenário Concluído ═╗
  ║ Total: ${event.stats.total}
  ║ Sucesso: ${event.stats.successful}
  ║ Falhas: ${event.stats.failed}
  ║ Taxa: ${event.stats.successRate}%
  ║ Duração: ${UtilsEngine.formatDuration(event.stats.totalDuration)}
  ╚═══════════════════════╝
  `);
  
  // Salvar em storage
  event.results.forEach(result => {
    ResultsManager.add({
      profileId: result.profileId,
      endpoint: result.profileName,
      duration: result.duration,
      statusCode: result.statusCode,
      success: result.success,
      numAtendimentoDB: result.numDB,
      origem: 'manual',
      cenarioId: event.scenario.id,
      executadoPor: SessionManager.getCurrentUser().id
    });
  });
});

// Executar
const results = await ScenarioExecutor.execute(scenario.id);
```

---

## 🚀 Integração com Fase 3 (UI)

**Plano para UI (Renderer):**

1. **Tab "Cenários"** → Lista com botões:
   - [Executar Agora]
   - [Agendar]
   - [Editar]
   - [Deletar]

2. **Tab "Agendamentos"** → Lista com:
   - Nome, descrição, CRON
   - Última execução
   - Próxima execução
   - [Forçar Execução Agora]
   - [Desativar]

3. **Modal de Agendamento** → Formulário com:
   - Nome
   - Perfis (multi-select)
   - Config (requests, concurrency, rampUp)
   - CRON (com helper para expressões comuns)

4. **Dashboard** → Adicionar widget:
   - Próximos agendamentos (3 próximos)
   - Agendamentos executados hoje

---

## 📝 Expressões CRON Suportadas

| Expressão | Descrição |
|-----------|-----------|
| `0 0 * * *` | Todo dia à meia-noite |
| `0 6 * * *` | Todo dia às 6h |
| `0 12 * * MON-FRI` | Segunda a sexta às 12h |
| `0 */2 * * *` | A cada 2 horas |
| `0 0 1 * *` | 1º dia de cada mês |
| `0 0 * * 0` | Domingo à meia-noite |

---

## ✅ Checklist de Validação Fase 5

- ✅ SchedulerManager persiste agendamentos em storage
- ✅ ScenarioExecutor executa passos em sequência
- ✅ ScheduleRunner monitora em background
- ✅ Resultados salvos automaticamente
- ✅ Próxima execução recalcula após cada run
- ✅ Eventos disparam corretamente
- ✅ Cancelamento (abort) funciona
- ✅ CRON parsing correto
- ✅ Integração com ResultsManager

---

## 🔗 Próximos Passos (Fases 6+)

- **Fase 6 — Reports Layer:** Relatórios PDF/Excel detalhados
- **Fase 7 — DevOps Layer:** Docker, CI/CD, monitoramento
- **Fase 8 — Analytics:** Dashboard com tendências e insights
