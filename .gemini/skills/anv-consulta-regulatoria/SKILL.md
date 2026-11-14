---
name: anv-consulta-regulatoria
description: Instruções para consulta e análise de inteligência regulatória sobre as normas da Anvisa presentes no repositório, incluindo rastreamento de vigência, cadeia de revogações e conexões no grafo.
---

# Skill: Consulta e Análise Regulatória

Esta skill guia o agente na consulta rápida e precisa do acervo local de normas da Anvisa sem necessidade de ler manualmente centenas de arquivos.

## 1. Localização Direta de Normas

O repositório é indexado de forma determinística:
- Se você busca por uma norma específica (ex: **RDC 834 de 2024**):
  - Caminho: `data/normas/RDC/2024/RDC-834.md`
- Leia o arquivo Markdown diretamente para inspecionar tanto o **frontmatter YAML** (situação, ementa, revogada_por, etc.) quanto o texto integral.

---

## 2. Rastreamento de Cadeia Regulatória pelo Grafo

Para descobrir conexões, atos que alteraram ou revogaram uma norma, consulte `data/grafo/relacoes.json`:

```javascript
// Exemplo de inspeção rápida via Node.js
const grafo = require('./data/grafo/relacoes.json');

const idAlvo = 'RDC-834';
const arestas = grafo.links.filter(l => l.source === idAlvo || l.target === idAlvo);
console.log('Conexões regulatórias de', idAlvo, ':', arestas);
```

### Tipos de Relações:
- **`revoga`**: A norma `source` revogou expressamente `target`.
- **`altera`**: A norma `source` alterou artigos ou redação de `target`.
- **`leis_base`**: A norma baseia-se em Lei Federal formal (ex: Lei 6.360/1976 ou Lei 9.782/1999).
- **`relacionadas`**: Atos que se correlacionam ou são citados textualmente.

---

## 3. Busca Textual Rápida no SQLite

Para buscas temáticas por termos regulatórios (ex: "estabilidade", "ensaio clínico", "cosméticos"), você pode consultar `data/bancos/anvisa-normas.db` ou utilizar busca direta no JSON consolidado `data/bancos/normas-consolidado.json`.
