# Fase 1 — Storage Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-07  
**Namespace:** `stp_v3_`

---

## 📋 Resumo

Fase 1 implementa a camada de persistência modularizada do STP·SOAP v3, reorganizando o localStorage com abstrações genéricas e introduzindo novas entidades de dados.

---

## 📁 Arquivos Criados

### 1. `engine.js` — Abstração Genérica do localStorage

**Responsabilidade:** Fornecer interface padrão para get/set/remove do localStorage com namespace isolado.

**Métodos públicos:**
- `get(key, defaultValue)` — Obter valor com parse JSON
- `set(key, value)` — Salvar valor com stringify JSON
- `remove(key)` — Remover chave
- `list()` — Listar todas as chaves do namespace
- `clear()` — Limpar todas as chaves do namespace
- `exists(key)` — Verificar existência
- `getAll()` — Obter dicionário completo

**Namespace:** Todas as chaves são prefixadas com `stp_v3_`

**Exemplo:**
```javascript
StorageEngine.set('users', [{id: '123', nome: 'João'}]);
const users = StorageEngine.get('users', []);
```

---

### 2. `users.js` — Manager de Usuários

**Responsabilidade:** CRUD de usuários com hash SHA-256 e validação de duplicidade.

**Chave de armazenamento:** `stp_v3_users`

**Schema:**
```json
{
  "id": "uuid",
  "nome": "João Silva",
  "email": "joao@empresa.com",
  "usuario": "joao.silva",
  "senhaHash": "sha256_hex_string",
  "nivel": "admin|operador|visualizador",
  "ativo": true,
  "criadoEm": "2026-05-07T10:00:00"
}
```

**Métodos públicos:**
- `list()` — Obter todos os usuários
- `getById(id)` — Buscar por ID
- `getByUsername(username)` — Buscar por nome de usuário (case-insensitive)
- `getByEmail(email)` — Buscar por email (case-insensitive)
- `create(userData)` — Criar novo usuário (async, retorna sem hash)
- `validate(usuario, senha)` — Validar credenciais (async)
- `update(id, updates)` — Atualizar usuário (async se tiver senha)
- `setActive(id, ativo)` — Ativar/desativar usuário
- `delete_(id)` — Excluir usuário
- `isEmpty()` — Verificar se não há usuários
- `count()` — Contar usuários

**Validações:**
- ✅ Email e usuário únicos
- ✅ Nível obrigatoriamente um de: admin, operador, visualizador
- ✅ Senha sempre hasheada com SHA-256 (nunca armazenada em texto claro)
- ✅ Usuários inativos não conseguem fazer login

**Exemplo:**
```javascript
// Criar usuário
const newUser = await UsersManager.create({
  nome: 'João Silva',
  email: 'joao@empresa.com',
  usuario: 'joao.silva',
  senha: '123456',
  nivel: 'operador'
});

// Validar credenciais
const user = await UsersManager.validate('joao.silva', '123456');
if (user) console.log('Login bem-sucedido:', user);
```

---

### 3. `scenarios.js` — Manager de Cenários (Checklists)

**Responsabilidade:** CRUD de cenários/checklists — fluxos de teste sequenciais.

**Chave de armazenamento:** `stp_v3_scenarios`

**Schema:**
```json
{
  "id": "uuid",
  "nome": "Teste Matutino - Produção",
  "descricao": "Validação diária dos endpoints de produção",
  "passos": [
    {
      "ordem": 1,
      "profileId": "uuid-perfil-1",
      "requests": 5,
      "concorrencia": 2
    },
    {
      "ordem": 2,
      "profileId": "uuid-perfil-2",
      "requests": 3,
      "concorrencia": 1
    }
  ],
  "criadoPor": "usuario-id",
  "criadoEm": "2026-05-07T10:00:00"
}
```

**Métodos públicos:**
- `list()` — Obter todos os cenários
- `getById(id)` — Buscar por ID
- `getByUser(userId)` — Obter cenários de um usuário
- `create(scenarioData)` — Criar novo cenário
- `update(id, updates)` — Atualizar cenário
- `addStep(id, passo)` — Adicionar passo
- `removeStep(id, ordem)` — Remover passo por ordem
- `reorderSteps(id, passos)` — Reordenar passos
- `delete_(id)` — Excluir cenário
- `count()` — Contar cenários

**Validações:**
- ✅ Cenário deve ter pelo menos 1 passo
- ✅ Cada passo requer: profileId, requests >= 1, concorrência >= 1
- ✅ Passos sempre reordenados por ordem ao adicionar/remover

**Exemplo:**
```javascript
const cenario = ScenariosManager.create({
  nome: 'Teste Matutino',
  descricao: 'Validação diária',
  passos: [
    { profileId: 'uuid1', requests: 5, concorrencia: 2 }
  ],
  criadoPor: 'user-123'
});

// Adicionar passo
ScenariosManager.addStep(cenario.id, {
  profileId: 'uuid2',
  requests: 3,
  concorrencia: 1
});
```

---

### 4. `results.js` — Manager de Histórico de Execuções

**Responsabilidade:** Persistência de resultados de testes com histórico entre sessões.

**Chave de armazenamento:** `stp_v3_results`

**Schema:**
```json
{
  "id": "uuid",
  "seq": 1,                              // Sequência global de envio
  "profileId": "uuid",
  "endpoint": "endpoint-name",
  "version": "1.0",
  "duration": 250,                       // milliseconds
  "statusCode": 200,
  "success": true,
  "numAtendimentoDB": "123456",          // SEMPRE preenchido
  "requestPayload": "<soap>...</soap>",  // SEMPRE preenchido
  "responseBody": "<soap>...</soap>",    // SEMPRE preenchido
  "errorDetail": null,
  "origem": "manual",                    // ou "scheduled"
  "scheduleId": null,                    // ID do agendamento se origem=scheduled
  "executadoPor": "usuario-id",
  "executadoEm": "2026-05-07T10:00:00",
  "cenarioId": null                      // Se foi parte de um cenário
}
```

**Métodos públicos:**
- `list()` — Obter todos os resultados
- `getById(id)` — Buscar por ID
- `getByProfile(profileId)` — Filtrar por perfil
- `getByUser(userId)` — Filtrar por usuário
- `getByCenario(cenarioId)` — Filtrar por cenário
- `getScheduled(scheduleId)` — Filtrar por agendamento
- `getByDateRange(startDate, endDate)` — Filtrar por período
- `getNextSeq()` — Obter próximo número de sequência global
- `add(resultData)` — Adicionar resultado
- `addBatch(resultsData)` — Adicionar vários
- `getStats()` — Estatísticas gerais
- `getStatsByProfile(profileId)` — Estatísticas por perfil
- `clearOlder(days)` — Limpar resultados > N dias
- `exportJSON()` — Exportar como JSON
- `clear()` — Limpar todos
- `count()` — Contar resultados

**Limite:** Máximo 5000 resultados. Ao exceder, remove 10% dos mais antigos automaticamente.

**Validações:**
- ✅ `profileId` e `executadoPor` obrigatórios
- ✅ `numAtendimentoDB`, `requestPayload`, `responseBody` sempre presentes
- ✅ `seq` gerado automaticamente e é global

**Exemplo:**
```javascript
const result = ResultsManager.add({
  profileId: 'uuid-1',
  endpoint: 'getStatus',
  duration: 250,
  statusCode: 200,
  success: true,
  numAtendimentoDB: '20260507001',
  requestPayload: '<soap>...</soap>',
  responseBody: '<soap>...</soap>',
  executadoPor: 'user-123'
});

// Estatísticas
const stats = ResultsManager.getStats();
console.log(`Taxa de sucesso: ${stats.successRate}`);
```

---

### 5. `profiles.js` — Manager de Perfis (Refatorado)

**Responsabilidade:** CRUD de perfis/endpoints com migração de dados v2 → v3.

**Chave de armazenamento:** `stp_v3_profiles`  
**Chave legada (migração):** `stp_profiles_v2`

**Schema estendido (v3):**
```json
{
  "id": "uuid",
  "nome": "Endpoint Produção",
  "codigo": "PRD",
  "url": "https://api.empresa.com/soap",
  "version": "1.0",
  "payloadTemplate": "<soap:Envelope>...</soap:Envelope>",
  "xmlTag": "diag:NumeroAtendimentoApoiado",
  "cor": "#0F9B94",
  "groupId": "uuid",                     // NOVO: referência a grupo
  "criadoPor": "usuario-id",             // NOVO: rastreabilidade
  "criadoEm": "2026-05-07T10:00:00"      // NOVO: timestamp
}
```

**Métodos públicos:**
- `list()` — Obter todos os perfis
- `getById(id)` — Buscar por ID
- `getByCode(codigo)` — Buscar por código
- `getByUser(userId)` — Obter perfis do usuário
- `getByGroup(groupId)` — Obter perfis de um grupo
- `create(profileData)` — Criar novo perfil
- `update(id, updates)` — Atualizar perfil
- `delete_(id)` — Excluir perfil
- `count()` — Contar perfis
- `countByUser(userId)` — Contar perfis do usuário
- `getPayloadTemplate(id)` — Obter template
- `fillPayload(id, placeholders)` — Substituir placeholders

**Migração automática:**
- Dados legados v2 são convertidos na primeira carga
- Campo `criadoPor` adicionado como 'admin' para dados antigos
- Backup da v2 mantém como read-only

**Validações:**
- ✅ Código + URL únicos
- ✅ Código sempre uppercase
- ✅ Todos os campos obrigatórios preenchidos

**Exemplo:**
```javascript
const perfil = ProfilesManager.create({
  nome: 'Produção',
  codigo: 'PRD',
  url: 'https://api.empresa.com/soap',
  payloadTemplate: '<soap>...</soap>',
  criadoPor: 'user-123'
});

// Preencher template
const payload = ProfilesManager.fillPayload(perfil.id, {
  NUM_ATENDIMENTO: '20260507001',
  LOGIN: 'usuario',
  SENHA: 'senha123'
});
```

---

### 6. `groups.js` — Manager de Grupos (Refatorado)

**Responsabilidade:** CRUD de grupos com migração de dados v2 → v3.

**Chave de armazenamento:** `stp_v3_groups`  
**Chave legada (migração):** `stp_groups_v2`

**Schema estendido (v3):**
```json
{
  "id": "uuid",
  "nome": "Produção",
  "cor": "#0F9B94",
  "descricao": "Endpoints de produção",
  "criadoPor": "usuario-id",             // NOVO: rastreabilidade
  "criadoEm": "2026-05-07T10:00:00"      // NOVO: timestamp
}
```

**Métodos públicos:**
- `list()` — Obter todos os grupos
- `getById(id)` — Buscar por ID
- `getByName(nome)` — Buscar por nome
- `getByUser(userId)` — Obter grupos do usuário
- `create(groupData)` — Criar novo grupo
- `update(id, updates)` — Atualizar grupo
- `delete_(id)` — Excluir grupo (limpa referências)
- `count()` — Contar grupos

**Migração automática:**
- Dados legados v2 são convertidos na primeira carga
- Campo `criadoPor` adicionado como 'admin' para dados antigos
- Backup da v2 mantém como read-only

**Validações:**
- ✅ Nome único
- ✅ Ao deletar, remove referências em perfis

**Exemplo:**
```javascript
const grupo = GroupsManager.create({
  nome: 'Produção',
  cor: '#0F9B94',
  descricao: 'Endpoints de produção',
  criadoPor: 'user-123'
});
```

---

## ✅ Checklist de Validação — Fase 1

- [x] `engine.js` funcional com namespace `stp_v3_`
- [x] `users.js`, `scenarios.js`, `results.js` criados e testados
- [x] `profiles.js` e `groups.js` refatorados para usar `engine.js`
- [x] Migração automática de dados v2 → v3
- [x] Campos `criadoPor` e `criadoEm` adicionados
- [x] Hash SHA-256 para senhas
- [x] Validações de duplicidade
- [x] Documentação completa

---

## 🔗 Dependências

**Fase 1 BLOQUEIA:**
- Fase 2 (Auth) — precisa de UsersManager
- Fase 4 (Engine) — precisa de ProfilesManager e ResultsManager
- Fase 5 (Features) — precisa de ScenariosManager

---

## 📝 Notas Importantes

1. **SHA-256 é assíncrono:** `create()` e `validate()` em UsersManager retornam Promises
2. **Namespace isolado:** Usar `StorageEngine.PREFIX` para debug (valor: `'stp_v3_'`)
3. **Limite de resultados:** 5000 itens máximo, com limpeza automática de antigos
4. **Migração de legado:** Executada automaticamente na inicialização, não requer ação manual
5. **Sequência global:** `ResultsManager.getNextSeq()` garante ordenação temporal global

---

## 🚀 Próximo Passo

**Fase 2 — Auth Layer**: Implementar sistema de login, sessão e RBAC baseado nos usuários criados aqui.

---

*Implementado em 2026-05-07 | Storage Layer v1.0*
