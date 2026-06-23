# Fase 6 — Reports Layer — Documentação

**Status:** ✅ CONCLUÍDA  
**Data:** 2026-05-10 (atualizado: 2026-05-23)  
**Dependência:** Fases 1-5 (Storage, Auth, UI, Engine, Features)

---

## 📋 Resumo

Fase 6 entrega o módulo de relatórios do STP·SOAP v3 com:
- ✅ Exportação para Excel (.xlsx)
- ✅ Exportação para HTML (relatório visual com gráficos, otimizado para impressão via browser)
- ✅ Exportação para CSV (.csv)
- ✅ Resumo por teste (`byTest`, agrupado por `profileId` → nome do teste)
- ✅ UI dedicada para relatórios
- ✅ Integração com `ResultsManager`

---

## 📁 Arquivo

### `assets/js/reports/reports.js`

**Responsabilidade:** Gerar e exportar relatórios de resultados armazenados.

**Opções de exportação:**
- `exportExcel(filename)` — gera arquivo `XLSX`
- `exportHTML(options)` — abre relatório HTML em nova aba (Blob URL)
- `exportCSV(filename)` — gera arquivo `CSV`

**Dados usados:**
- `ResultsManager.list()`
- `ProfilesManager.list()` — para resolução do nome do teste por `profileId`

---

## 🚀 Funcionalidades

### 1. Sumário de resultados

`ReportsManager.getSummary()` retorna:
- total de execuções, sucessos, falhas, taxa, duração média
- `byTest` — array agrupado por teste (profileId → nome)
- `byStatus` — contagem por status HTTP

### 2. Exportação para Excel

`ReportsManager.exportExcel()` gera workbook com colunas:
`Seq`, `Teste`, `Endpoint`, `Status`, `StatusCode`, `DuracaoMs`, `NumAtendimentoDB`, `UsuarioNome`, `TipoLabel`, `Origem`, `ScheduleId`, `ExecutadoPor`, `ExecutadoEm`

### 3. Exportação para HTML

`ReportsManager.exportHTML(options)` gera relatório HTML aberto em nova aba com:
- **KPIs** — Execuções, Sucesso, Falhas, Duração Média
- **Gráfico A** — Linha de tempo com data/hora no eixo X (últimas 200 execuções)
- **Gráfico B** — Histograma de distribuição de tempo de resposta
- **Gráfico C** — Barras de tempo médio por teste
- **Gráfico D** — Barras de taxa de sucesso por teste (verde/amarelo/vermelho)
- **Tabela Por Teste** — agrupada por nome do teste
- **Resultados Detalhados** — todos os envios com nome do teste e data/hora

Usa Chart.js 4.4.0 via CDN. Botão "Imprimir / Salvar PDF" usa `window.print()`.

`options` aceita: `{ type: 'all'|'profile'|'group', profileId, groupId }`

### 4. Exportação para CSV

`ReportsManager.exportCSV()` gera CSV compatível com Excel e sistemas de BI.

---

## 🔧 Integração com UI

### Botões da tela de relatórios
- `Exportar Excel` (ID: `btn-export-excel`)
- `Exportar HTML` (ID: `btn-export-html`)
- `Exportar CSV` (ID: `btn-export-csv`)

### Filtro HTML
- Radio `name="html-filter"`: `all`, `profile`, `group`
- Selects: `html-filter-profile-select`, `html-filter-group-select`

### Permissões
- Apenas `admin` e `operador` podem acessar a aba de relatórios

---

## 💡 Exemplos de uso

```javascript
const fileName = ReportsManager.exportExcel();

ReportsManager.exportHTML({ type: 'group', groupId: 'uuid-do-grupo' });

const csvFile = ReportsManager.exportCSV();
```

---

## ✅ Checklist de Validação Fase 6

- ✅ `ReportsManager.exportExcel()` funciona
- ✅ `ReportsManager.exportHTML()` funciona (abre em nova aba)
- ✅ `ReportsManager.exportCSV()` funciona
- ✅ Gráfico A com data/hora no eixo X
- ✅ Gráfico D em barras (taxa de sucesso por teste)
- ✅ Tabela "Por Teste" agrupada por profileId
- ✅ Nova aba `Relatórios` integrada
