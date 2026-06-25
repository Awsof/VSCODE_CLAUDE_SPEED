# Padrão de Detecção de Campos em Templates XML/SOAP

Documentação do mecanismo que lê um template XML colado pelo usuário e extrai automaticamente os campos que deverão virar inputs editáveis na criação de registros dependentes.

---

## Visão geral do fluxo

```
Usuário cola XML → clica "Detectar" → frontend chama extractTags() / extractVariables()
  → lista de { name, type } gerada → salva junto com o template
  → na criação de registros filhos, esses campos viram inputs preenchíveis
```

---

## Dois formatos de template suportados

### Formato novo — tags vazias

O template contém tags XML abertas e fechadas sem conteúdo:

```xml
<Envelope>
  <Body>
    <Codigo></Codigo>
    <Senha></Senha>
    <NumeroAtendimento></NumeroAtendimento>
    <DataHoje></DataHoje>
    <CampoCustomizado></CampoCustomizado>
  </Body>
</Envelope>
```

A função `extractTags()` detecta essas tags e gera os campos.

### Formato legado — placeholders `{{variavel}}`

O template usa chaves duplas para marcar posições variáveis:

```xml
<Envelope>
  <Body>
    <Codigo>{{Codigo}}</Codigo>
    <Senha>{{Senha}}</Senha>
    <NumeroAtendimento>{{NumeroAtendimento}}</NumeroAtendimento>
  </Body>
</Envelope>
```

A função `extractVariables()` extrai os nomes dentro de `{{ }}`.

> O frontend tenta `extractTags()` primeiro; se não encontrar nada, cai para `extractVariables()`.

---

## Função 1: `extractTags(xmlTemplate)`

**Onde:** `services/soap-builder.js`

**O que faz:** Varre o XML por tags vazias (`<Tag></Tag>`) e devolve uma lista tipada de campos.

```js
export function extractTags(xmlTemplate) {
  const emptyTagRegex = /<([\w][\w:.-]*)(\s[^>]*)?>(\s*)<\/\1>/g;
  const seen = {};
  const tags = [];

  for (const [, rawTag] of xmlTemplate.matchAll(emptyTagRegex)) {
    // Remove prefixo de namespace: "ns1:Codigo" → "Codigo"
    const local = rawTag.includes(':') ? rawTag.split(':').pop() : rawTag;

    // Conta repetições para disambiguar: Codigo, Codigo_2, Codigo_3…
    seen[local] = (seen[local] || 0) + 1;
    const seq  = seen[local];

    // Classifica a tag pelo nome local
    const type = SPECIAL_TAG_TYPES[local] || 'custom';

    tags.push({
      name:       seq > 1 ? `${local}_${seq}` : local,  // chave usada nos inputs
      xmlTagName: rawTag,                                  // nome original com prefixo
      localName:  local,                                   // nome sem prefixo
      type,
      seq,
    });
  }
  return tags;
}
```

**Saída para o exemplo acima:**

```json
[
  { "name": "Codigo",             "type": "global"         },
  { "name": "Senha",              "type": "global"         },
  { "name": "NumeroAtendimento",  "type": "atendimento"    },
  { "name": "DataHoje",           "type": "execution_auto" },
  { "name": "CampoCustomizado",   "type": "custom"         }
]
```

---

## Função 2: `extractVariables(xmlTemplate)`

**Onde:** `services/soap-builder.js`  
**Também exposta via:** `api/validate-method.js` (endpoint POST que valida o XML antes de salvar)

**O que faz:** Extrai todos os tokens `{{nome}}` únicos e os classifica.

```js
export function extractVariables(xmlTemplate) {
  const matches = [...xmlTemplate.matchAll(/\{\{([^}]+)\}\}/g)];
  const names   = [...new Set(matches.map(m => m[1].trim()))];

  const global    = ['Codigo', 'Senha'];
  const execution = ['NumeroAtendimento', 'prev.NumeroAtendimento',
                     'prev.NumeroAtendimentoDB', 'DataHoje', 'TimestampAgora'];

  return names.map(name => ({
    name,
    type: global.includes(name)    ? 'global'
        : execution.includes(name) ? 'execution'
        : 'custom',
  }));
}
```

---

## Tabela de tipos e o que significam

| `type`              | Significado                                              | Comportamento esperado na UI         |
|---------------------|----------------------------------------------------------|--------------------------------------|
| `global`            | Credenciais globais (Codigo, Senha)                     | Preenchido automaticamente do perfil |
| `execution`         | Valores calculados em runtime (datas, sequências)       | Readonly / gerado automaticamente    |
| `execution_auto`    | Igual a `execution` — variante para tags vazias         | Readonly / gerado automaticamente    |
| `atendimento_apoiado` | Número de atendimento de um teste de apoio            | Selecionável via lookup              |
| `atendimento_db`    | ID retornado pelo servidor após persistência            | Readonly — vem da resposta           |
| `date_range`        | Intervalo de datas (dtInicial / dtFinal)                | Date picker com defaults             |
| `custom`            | Qualquer outro campo não mapeado                        | Input de texto livre editável        |

O mapa de tipos especiais vive em `SPECIAL_TAG_TYPES` (também em `soap-builder.js`):

```js
export const SPECIAL_TAG_TYPES = {
  NomeTagAqui: 'tipo_aqui',
  // adicionar conforme o domínio do novo projeto
};
```

---

## Camada de API: `POST /api/validate-method`

Antes de salvar, o frontend pode acionar este endpoint para validar o XML:

```js
// api/validate-method.js
import { parseStringPromise } from 'xml2js';
import { extractVariables }   from '../services/soap-builder.js';

export default async function handler(req, res) {
  const { xmlTemplate } = req.body;
  const errors = [];
  let valid = true;

  try {
    await parseStringPromise(xmlTemplate, { strict: true });
  } catch (e) {
    valid = false;
    errors.push(`XML inválido: ${e.message}`);
  }

  const variables = extractVariables(xmlTemplate);
  res.status(200).json({ valid, variables, errors });
}
```

**Retorno:**

```json
{
  "valid": true,
  "variables": [
    { "name": "Codigo", "type": "global" },
    { "name": "CampoX", "type": "custom" }
  ],
  "errors": []
}
```

---

## Integração no frontend (fluxo do botão "Detectar")

```js
// Ao clicar em "Detectar campos":
const xml = textarea.value.trim();

let vars = extractTags(xml);          // tenta novo formato primeiro
if (!vars.length) vars = extractVariables(xml);  // fallback para {{var}}

// Renderiza badges visuais por tipo
const badges = vars.map(v => `<span class="badge ${VAR_COLORS[v.type]}">${v.name}</span>`).join(' ');
previewEl.innerHTML = badges;

// Persiste no dataset do modal para usar ao salvar
modal.dataset.vars = JSON.stringify(vars);

// ── Ao salvar: ──────────────────────────────────────────────
let variables = JSON.parse(modal.dataset.vars || '[]');

// Se o usuário não clicou em Detectar, roda automático ao salvar
if (!variables.length) {
  variables = extractTags(xml);
  if (!variables.length) variables = extractVariables(xml);
}

await db.templates.put({ ...record, variables });
```

---

## Como adaptar para outro projeto

### 1. Copiar as duas funções de extração

`extractTags` e `extractVariables` são independentes de framework e de domínio. Copie-as para o seu `services/template-parser.js` (ou equivalente).

### 2. Ajustar `SPECIAL_TAG_TYPES`

Substitua pelas tags que têm comportamento especial no seu domínio:

```js
const SPECIAL_TAG_TYPES = {
  UsuarioId:   'auto_filled',
  DataCriacao: 'execution_auto',
  Token:       'global',
  // …
};
```

### 3. Remover ou substituir o endpoint de validação

Se não usa Vercel Functions, adapte `validate-method.js` para sua camada de servidor (Express, Fastify, etc.). O núcleo é sempre:

```
parseXML(template)         → valida estrutura
extractVariables(template) → lista os campos
```

### 4. Mapear tipos para UI

Defina como cada `type` se comporta nos formulários dependentes:

```js
const FIELD_RENDERERS = {
  global:        () => /* input readonly / auto-preenchido */,
  execution_auto:() => /* label "gerado em runtime" */,
  custom:        () => /* input texto livre */,
};
```

### 5. Persistir junto com o template

Salve o array `variables` no mesmo registro do template para não precisar re-parsear o XML a cada uso:

```json
{
  "id": "abc123",
  "nome": "MeuTemplate",
  "xmlTemplate": "<...>",
  "variables": [
    { "name": "CampoA", "type": "custom" },
    { "name": "Token",  "type": "global" }
  ]
}
```

---

## Diagrama de decisão da detecção

```
xmlTemplate recebido
        │
        ▼
extractTags()  ──── encontrou tags vazias? ──── SIM ──→ usa resultado de extractTags()
        │
       NÃO
        │
        ▼
extractVariables()  ──── encontrou {{var}}? ──── SIM ──→ usa resultado de extractVariables()
        │
       NÃO
        │
        ▼
   lista vazia → avisar o usuário que nenhum campo dinâmico foi detectado
```

---

## Referência de arquivos neste projeto

| Arquivo | Papel |
|---------|-------|
| [services/soap-builder.js](../services/soap-builder.js) | `extractTags`, `extractVariables`, `SPECIAL_TAG_TYPES`, `buildSoapXml` |
| [api/validate-method.js](../api/validate-method.js) | Endpoint que valida XML e retorna variáveis via `extractVariables` |
| [frontend/js/pages/methods.js](../frontend/js/pages/methods.js) | Botão "Detectar", preview de badges, lógica de save com fallback |
