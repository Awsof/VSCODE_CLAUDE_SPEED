# Fase 4 — Engine Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-10  
**Dependência:** Fases 1, 2, 3 (Storage, Auth, UI)

---

## 📋 Resumo

Fase 4 implementa a engine de execução de testes SOAP, com:
- ✅ Executor de requisições HTTP/SOAP com controle de concorrência
- ✅ Parser e extrator de dados XML
- ✅ Utilitários para formatação e geração de dados
- ✅ Configurações centralizadas
- ✅ Sistema de eventos para monitoramento de progresso

---

## 📁 Arquivos Criados

### 1. `config.js` — ConfigEngine

**Responsabilidade:** Centralizador de configurações e constantes.

**Propriedades:**

| Constante | Valor | Descrição |
|-----------|-------|-----------|
| `DEFAULT_REQUEST_TIMEOUT` | 120000 ms | Timeout padrão por requisição |
| `DEFAULT_CONNECTION_TIMEOUT` | 30000 ms | Timeout de conexão |
| `DEFAULT_CONCURRENCY` | 3 | Requisições simultâneas padrão |
| `MAX_CONCURRENCY` | 20 | Máximo de requisições simultâneas |
| `DEFAULT_RAMP_UP` | 0 | Ramp-up desativado por padrão |
| `MAX_RAMP_UP` | 300 | Máximo ramp-up em segundos |
| `SOAP_CONTENT_TYPE` | `text/xml; charset=utf-8` | Content-Type para SOAP |

**Métodos públicos:**
- `get(key)` — Obter valor de configuração
- `set(key, value)` — Alterar valor de configuração
- `all()` — Obter todas as configurações

**Exemplo:**
```javascript
// Aumentar timeout
ConfigEngine.set('DEFAULT_REQUEST_TIMEOUT', 180000);

// Obter configuração
const timeout = ConfigEngine.get('DEFAULT_REQUEST_TIMEOUT');
```

---

### 2. `xml.js` — XMLEngine

**Responsabilidade:** Parse, extração e validação de XML/SOAP.

**Métodos públicos:**

#### `parse(xmlString)`
Parse de XML string para Document objeto.
```javascript
const doc = XMLEngine.parse(soapResponse);
```

#### `extractTag(xmlString, tagName, defaultValue)`
Extrair valor de uma tag XML (suporta namespaces).
```javascript
// Simples
const valor = XMLEngine.extractTag(xml, 'NumeroAtendimento');

// Com namespace
const valor = XMLEngine.extractTag(xml, 'diag:NumeroAtendimentoApoiado');
```

#### `hasFault(xmlString)`
Verificar se XML contém SOAP Fault.
```javascript
if (XMLEngine.hasFault(response)) {
  console.log('Falha SOAP detectada');
}
```

#### `extractFaultString(xmlString)`
Extrair mensagem de erro de SOAP Fault.
```javascript
const errorMsg = XMLEngine.extractFaultString(response);
// Retorna: "Invalid credentials" ou null
```

#### `isValid(xmlString)`
Validar se XML é bem-formado.
```javascript
if (XMLEngine.isValid(response)) {
  // Processar resposta
}
```

**Exemplo completo:**
```javascript
const response = await fetch(url, { method: 'POST', body: payload });
const body = await response.text();

if (XMLEngine.hasFault(body)) {
  const error = XMLEngine.extractFaultString(body);
  console.error('Erro:', error);
} else {
  const numDB = XMLEngine.extractTag(body, 'diag:NumeroAtendimentoApoiado');
  console.log('Número DB:', numDB);
}
```

---

### 3. `utils.js` — UtilsEngine

**Responsabilidade:** Funções utilitárias para execução de testes.

**Métodos públicos:**

#### `generateAttendanceNumber(profileCode)`
Gerar número de atendimento único por perfil.
- Formato: `{CODIGO}{YYYYMMDD}{SEQ:003}`
- Exemplo: `PRO20260510001`

```javascript
const num = UtilsEngine.generateAttendanceNumber('PRO');
// → "PRO20260510001"
```

#### `sleep(ms)`
Delay assíncrono.
```javascript
await UtilsEngine.sleep(1000); // Aguardar 1 segundo
```

#### `measureTime(fn)` / `measureTimeAsync(fn)`
Medir tempo de execução de função.
```javascript
const { result, duration } = await UtilsEngine.measureTimeAsync(async () => {
  return await fetch(url);
});
console.log(`Requisição levou ${duration}ms`);
```

#### `escapeXML(str)`
Escapar caracteres especiais XML.
```javascript
UtilsEngine.escapeXML('<tag>') // → "&lt;tag&gt;"
```

#### `isValidURL(urlString)`
Validar se string é URL válida.
```javascript
if (UtilsEngine.isValidURL(profile.url)) {
  // Executar requisição
}
```

#### `formatDuration(ms)`
Formatar duração em string legível.
```javascript
UtilsEngine.formatDuration(123000) // → "2.1m"
UtilsEngine.formatDuration(500) // → "500ms"
```

---

### 4. `runner.js` — RunnerEngine

**Responsabilidade:** Executor de requisições SOAP com controle de concorrência e eventos.

**Eventos:**
- `request-complete` — Uma requisição completou com sucesso
- `request-error` — Uma requisição falhou
- `batch-start` — Batch de requisições iniciou
- `batch-complete` — Batch completou
- `batch-error` — Erro geral no batch
- `batch-aborted` — Batch foi cancelado

**Métodos públicos:**

#### `on(eventType, callback)`
Registrar listener para evento.
```javascript
RunnerEngine.on('request-complete', (result) => {
  console.log(`Requisição #${result.requestId} completou em ${result.duration}ms`);
});

RunnerEngine.on('batch-complete', (event) => {
  const stats = event.stats;
  console.log(`Taxa de sucesso: ${stats.successfulRequests}/${stats.completedRequests}`);
});
```

#### `executeRequest(profile, attendanceNumber, payload, config)`
Executar uma requisição SOAP individual (assíncrono).

**Retorno:**
```javascript
{
  requestId: 1,
  profileId: 'uuid',
  profileName: 'Produção',
  profileCode: 'PRO',
  attendanceNumber: 'PRO20260510001',
  numDB: '123456', // Extraído do XML de resposta
  duration: 245,
  statusCode: 200,
  success: true,
  isTimeout: false,
  errorDetail: null,
  requestPayload: '<?xml...>',
  responseBody: '<?xml...>',
  timestamp: '2026-05-10T10:00:00Z'
}
```

#### `executeBatch(profiles, config, onProgress)`
Executar batch de requisições com controle de concorrência.

**config:**
```javascript
{
  requestsPerProfile: 10,    // Requisições por perfil
  concurrency: 3,             // Simultâneas
  rampUp: 0,                  // Ramp-up em segundos
  timeout: 120                // Timeout em segundos
}
```

**onProgress callback:**
```javascript
RunnerEngine.on('batch-start', (event) => {
  console.log(`Iniciando ${event.totalRequests} requisições`);
});

const results = await RunnerEngine.executeBatch(profiles, config, (progress) => {
  console.log(`Progresso: ${progress.completed}/${progress.total} · ${progress.successful} OK`);
});
```

#### `abort()`
Cancelar execução em andamento.
```javascript
RunnerEngine.abort();
```

#### `getStatus()`
Obter status atual da execução.
```javascript
const status = RunnerEngine.getStatus();
// {
//   isRunning: true,
//   totalRequests: 30,
//   completedRequests: 12,
//   successfulRequests: 11,
//   failedRequests: 1,
//   successRate: "91.7"
// }
```

---

## 🔄 Fluxo de Execução

```
User clica [INICIAR TESTE]
    ↓
Renderer.executionController.start()
    ↓
RunnerEngine.executeBatch(profiles, config)
    ↓
Para cada profile:
  ├─ Gerar attendanceNumber (UtilsEngine)
  ├─ Preencher payload (placeholders)
  ├─ Executar requisição HTTP (RunnerEngine.executeRequest)
  │  ├─ Validar URL
  │  ├─ Fazer fetch com timeout
  │  ├─ Parser XML response (XMLEngine)
  │  ├─ Extrair dados (numDB, erros)
  │  └─ Retornar resultado
  └─ Emitir eventos de progresso
    ↓
Salvar resultados em ResultsManager
    ↓
Renderizar na interface (gráficos, tabelas)
```

---

## 📊 Exemplo Completo de Uso

```javascript
// 1. Preparar profiles para teste
const selectedProfiles = [
  {
    id: 'prof-1',
    nome: 'Produção HAPVIDA',
    codigo: 'HAP',
    url: 'https://soap.hapvida.com.br/ws',
    payloadTemplate: '<soapenv:Envelope...>{{NUM_ATENDIMENTO}}...</soapenv:Envelope>',
    soapAction: 'http://soap.hapvida.com.br/RecebeAtendimento',
    xmlTag: 'diag:NumeroAtendimentoApoiado',
    login: 'usuario',
    senha: 'senha'
  }
];

// 2. Configurar execução
const testConfig = {
  requestsPerProfile: 10,
  concurrency: 3,
  rampUp: 0,
  timeout: 120
};

// 3. Registrar listeners
RunnerEngine.on('batch-start', (event) => {
  console.log(`Iniciando teste: ${event.totalRequests} requisições`);
});

RunnerEngine.on('request-complete', (result) => {
  if (result.success) {
    console.log(`✓ Requisição #${result.requestId}: ${result.duration}ms`);
  } else {
    console.log(`✗ Requisição #${result.requestId}: ${result.errorDetail}`);
  }
});

RunnerEngine.on('batch-complete', (event) => {
  const stats = event.stats;
  console.log(`Teste concluído: ${stats.successfulRequests}/${stats.completedRequests} OK`);
  
  // Salvar resultados
  event.results.forEach(result => {
    ResultsManager.add({
      profileId: result.profileId,
      endpoint: result.profileName,
      version: 'v3',
      duration: result.duration,
      statusCode: result.statusCode,
      success: result.success,
      numAtendimentoDB: result.numDB,
      requestPayload: result.requestPayload,
      responseBody: result.responseBody,
      errorDetail: result.errorDetail,
      origem: 'manual',
      executadoPor: SessionManager.getCurrentUser().id
    });
  });
});

// 4. Executar teste
const results = await RunnerEngine.executeBatch(selectedProfiles, testConfig, (progress) => {
  console.log(`Progresso: ${progress.completed}/${progress.total}`);
  // Atualizar UI com progresso
});

// 5. Cancelar (se necessário)
// RunnerEngine.abort();
```

---

## 🚀 Integração com Fase 3 (UI)

**Plano de integração com Renderer:**

1. Adicionar UI para "Executar Teste" (seleção de perfis, config)
2. Chamar `RunnerEngine.executeBatch()` ao clicar botão
3. Mostrar progresso em tempo real via listeners
4. Salvar resultados em `ResultsManager`
5. Atualizar gráficos/tabelas

```javascript
// Na Fase 3 (Renderer), novo módulo: executionController.js
const ExecutionController = (() => {
  const start = async (profiles, config) => {
    try {
      const results = await RunnerEngine.executeBatch(profiles, config);
      
      // Salvar em storage
      results.forEach(r => ResultsManager.add(/* ... */));
      
      // Notificar sucesso
      NotificationsManager.success(`Teste concluído: ${results.length} requisições`);
      
      // Atualizar UI
      Renderer.navigate('results');
    } catch (error) {
      NotificationsManager.danger('Erro ao executar teste: ' + error.message);
    }
  };
  
  return { start };
})();
```

---

## 🔗 Próximos Passos (Fase 5+)

- **Fase 5 — Features Layer:** 
  - Cenários sequenciais
  - Agendamento de testes
  - Dependência entre requisições
- **Fase 6 — Reports Layer:**
  - PDF detalhado
  - Excel com gráficos
  - Email de resultados
- **Fase 7 — DevOps Layer:**
  - Docker
  - CI/CD
  - Monitoramento em produção

---

## ✅ Checklist de Validação Fase 4

- ✅ XMLEngine faz parse de SOAP responses
- ✅ RunnerEngine controla concorrência corretamente
- ✅ Timeouts funcionam (AbortController)
- ✅ Eventos são disparados em ordem
- ✅ Resultados são salvos no storage
- ✅ Taxa de sucesso calcula corretamente
- ✅ Cancelamento (abort) funciona
- ✅ Ramp-up distribui requisições uniformemente
