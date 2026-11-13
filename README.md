# 🏛️ Acervo Aberto de Normas da Anvisa em Markdown & SQLite

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Update Pipeline](https://img.shields.io/badge/pipeline-GitHub%20Actions-green.svg)](.github/workflows/atualiza.yml)
[![Visualizador Online](https://img.shields.io/badge/visualizador-online-blueviolet.svg)](https://jadsonsanches.github.io/anvisa-normas/)
[![SQLite Ready](https://img.shields.io/badge/database-SQLite%203-003B57.svg)](data/dist/anvisa.db)
[![AI-Ready](https://img.shields.io/badge/format-Markdown%20%2B%20YAML-orange.svg)](#-formato-de-cada-norma)
[![Graph](https://img.shields.io/badge/grafo-relacoes.json-purple.svg)](data/grafo/relacoes.json)

> **Todo o acervo normativo da Agência Nacional de Vigilância Sanitária (Anvisa) convertido em texto simples (Markdown), metadados estruturados (YAML Frontmatter), grafo determinístico de relações e bancos consolidados em SQLite, JSON e CSV com atualização automática contínua.**

Inspirado pelo trabalho do [ctresb/leis](https://github.com/ctresb/leis) (Legislação Federal) e do [Bruno Moniz](https://github.com/BrunooMoniz/normas-bcb) (normas do Banco Central e CVM).

---

## 🎯 Por que este repositório existe?

Quem atua com **Assuntos Regulatórios, Jurídico, Compliance, Indústria Farmacêutica, Cosméticos, Alimentos e HealthTechs** no Brasil perde horas navegando em portais fragmentados, PDFs com formatações antigas e buscando saber se uma norma ainda vale, por quem foi alterada ou em qual lei ela se fundamenta.

Além disso, **agentes de Inteligência Artificial e sistemas de RAG precisam de texto puro estruturado** para responder dúvidas com precisão jurídica, citando artigos e fontes oficiais sem alucinações.

### O que este projeto entrega:
* **Texto Oficial em Markdown:** Cada ato normativo (RDC, Instrução Normativa, Portaria, RE) em um arquivo `.md` padronizado e higienizado.
* **Metadados Ricos (YAML Frontmatter):** Situação oficial (`vigente`/`revogada`), ementa, datas distintas (**Data do Ato** vs **Data de Publicação no DOU**), leis de base e referências.
* **Bancos Consolidados Prontos:** Distribuição direta em **SQLite (`anvisa.db`)**, **JSON** e **CSV** para consumo imediato em Python, Pandas, R ou qualquer banco.
* **Grafo de Relações Determinístico (`relacoes.json`):** Mapeamento exato de revogações, alterações e citações oficiais sem alucinação de IA.
* **Atualização Automática (GitHub Actions):** Robô roda a cada 6 horas coletando os atos publicados nas últimas horas e commitando no repositório.
* **Visualizador Interativo Online:** Interface web com grafo de física em Canvas, busca instantânea e filtros por período em [jadsonsanches.github.io/anvisa-normas](https://jadsonsanches.github.io/anvisa-normas/).

---

## 💾 Bancos Consolidados (Downloads Diretos)

Para cientistas de dados, desenvolvedores de RAG e pesquisadores, disponibilizamos a base consolidada atualizada a cada commit na pasta [`data/dist/`](data/dist):

| Formato | Arquivo | Descrição |
| :--- | :--- | :--- |
| **SQLite 3** | [`data/dist/anvisa.db`](data/dist/anvisa.db) | Banco relacional completo com tabelas `normas` e `relacoes`. |
| **JSON** | [`data/dist/normas.json`](data/dist/normas.json) | Array consolidado de todas as normas com textos integrais e metadados. |
| **CSV** | [`data/dist/normas.csv`](data/dist/normas.csv) | Planilha estruturada com ementas, datas e status para análise rápida. |

### Exemplo em Python (Carregar em 3 linhas):

```python
import sqlite3
import pandas as pd

# Conectar diretamente ao banco SQLite do acervo
conn = sqlite3.connect("data/dist/anvisa.db")

# Consultar todas as normas vigentes por tipo
df = pd.read_sql_query("""
    SELECT tipo, numero, ano, data_ato, data_publicacao_dou, ementa 
    FROM normas 
    WHERE situacao = 'vigente'
    ORDER BY ano DESC
""", conn)

print(df.head())
```

---

## 📂 Estrutura do Repositório

```text
anvisa-normas/
├── data/
│   ├── dist/                     # 💾 Bancos de dados consolidados
│   │   ├── anvisa.db             # Banco SQLite 3 relacional
│   │   ├── normas.json           # JSON consolidado completo
│   │   └── normas.csv            # Tabela CSV para Pandas/Excel
│   ├── normas/                   # 📄 Normas individuais em Markdown
│   │   ├── portaria/2026/
│   │   ├── re/2026/
│   │   ├── rdc/
│   │   └── in/
│   └── grafo/
│       ├── relacoes.json         # Nós e arestas do grafo completo
│       └── estatisticas.json     # Contadores e métricas de cobertura
├── scripts/
│   ├── parser.js                # Higienização de HTML e conversão para Markdown
│   ├── scraper.js               # Coletor integrado à busca oficial da Anvisa
│   ├── grafo.js                 # Construtor do grafo determinístico
│   ├── exportar-bancos.js       # Exportador consolidado (SQLite, JSON, CSV)
│   ├── gerar-visualizador.js    # Compilador do visualizador web estático
│   └── pipeline.js              # Orquestrador geral de atualização
├── index.html                   # Visualizador interativo publicado no GitHub Pages
└── .github/
    └── workflows/
        └── atualiza.yml         # Automação periódica (cron)
```

---

## 📑 Formato de Cada Norma

Cada arquivo na pasta `data/normas/` segue rigorosamente o padrão:

```markdown
---
tipo: "PORTARIA"
numero: "1294"
ano: "2026"
data_ato: "11/11/2026"
data_promulgacao: "11/11/2026"
data_publicacao_dou: "12/11/2026"
situacao: "vigente"
ementa: "Autoriza o afastamento do país de servidor da Anvisa..."
leis_base: []
relacionadas: ["RDC 585/2021"]
fonte: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?..."
---

# PORTARIA nº 1294, de 11/11/2026

MINISTÉRIO DA SAÚDE
AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA

PORTARIA Nº 1.294, DE 11 DE NOVEMBRO DE 2026

O DIRETOR-PRESIDENTE DA AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA...
```

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 20 ou superior)

### Instalação
```bash
git clone https://github.com/jadsonsanches/anvisa-normas.git
cd anvisa-normas
npm install
```

### Comandos Disponíveis
```bash
# Executa a verificação diária e atualiza todos os bancos e visualizadores
npm run pipeline

# Coleta uma data específica (DD/MM/AAAA)
node scripts/pipeline.js --data 12/11/2026

# Coleta um ano específico
node scripts/pipeline.js --ano 2026

# Exporta apenas os bancos consolidados (SQLite, JSON, CSV)
npm run exportar:bancos

# Regenera o visualizador web
npm run gerar:visualizador
```

---

## ⚖️ Aviso Legal e Licença

* **Código-fonte:** Licenciado sob a [MIT License](LICENSE).
* **Textos Normativos:** Conforme o art. 8º, inciso IV da Lei Federal nº 9.610/1998 (Lei de Direitos Autorais), os atos normativos, resoluções e regulamentos oficiais são de **domínio público**.
* **Isenção:** Este repositório é uma iniciativa independente de dados abertos, de caráter estritamente informativo e educacional. Não substitui as publicações oficiais no Diário Oficial da União (DOU) nem nos portais institucionais da Anvisa.
