---
name: anv-geracao-distribuicao
description: Procedimento para reconstrução e exportação de todos os produtos derivados do acervo (Grafo de relações JSON, Visualizador HTML standalone e Banco SQLite com busca FTS).
---

# Skill: Geração e Distribuição de Dados

Esta skill orienta a geração determinística dos formatos de consulta e distribuição pública a partir dos arquivos Markdown do acervo.

## 1. Fluxo de Geração Completo

Se você quiser regerar toda a camada derivada sem rodar um novo scraper:

```bash
# Passo 1: Reconstrói o grafo de relações e estatísticas
node scripts/grafo.js

# Passo 2: Reconstrói o visualizador web offline com os dados embutidos
node scripts/gerar-visualizador.js

# Passo 3: Exporta bancos consolidados (SQLite, JSON completo e CSV)
node scripts/exportar-bancos.js
```
*(Ou use o atalho: `npm run test:integrity`)*

---

## 2. Artefatos Gerados e Verificação

Após o processo, valide a existência e tamanho dos arquivos gerados:

1. **Grafo de Dependências e Métricas:**
   - `data/grafo/relacoes.json` (nós e arestas para renderização de redes)
   - `data/grafo/estatisticas.json` (contagem por tipo, ano e situação)
2. **Visualizador Web Standalone:**
   - `visualizador.html` na raiz do projeto (deve abrir direto no navegador sem necessidade de servidor backend).
3. **Bancos Exportados:**
   - `data/bancos/anvisa-normas.db` (banco SQLite com tabela `normas` e FTS5 para busca textual ultra-rápida).
   - `data/bancos/normas-consolidado.json` (array JSON com todos os frontmatters).
