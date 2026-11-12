# 🏛️ Acervo Aberto de Normas da Anvisa em Markdown

[![GitHub License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Update Pipeline](https://img.shields.io/badge/pipeline-GitHub%20Actions-green.svg)](.github/workflows/atualiza.yml)
[![Visualizador Online](https://img.shields.io/badge/visualizador-online-blueviolet.svg)](https://jadsonsanches.github.io/anvisa-normas/)
[![AI-Ready](https://img.shields.io/badge/format-Markdown%20%2B%20YAML-orange.svg)](#formato-das-normas)
[![Graph](https://img.shields.io/badge/grafo-relacoes.json-purple.svg)](data/grafo/relacoes.json)

> **Todo o acervo normativo da Agência Nacional de Vigilância Sanitária (Anvisa) convertido em texto simples (Markdown), com metadados estruturados (YAML Frontmatter), grafo de relações determinístico e atualização automática contínua.**

Inspirado pelo trabalho do [ctresb/leis](https://github.com/ctresb/leis) (Legislação Federal) e do [Bruno Moniz](https://github.com/BrunoMoniz) (Banco Central e CVM).

---

## 🎯 Por que este repositório existe?

Quem atua com **Assuntos Regulatórios, Jurídico, Compliance, Indústria Farmacêutica, Cosméticos, Alimentos e HealthTechs** no Brasil perde horas navegando em portais fragmentados, PDFs com formatações antigas e buscando saber se uma norma ainda vale, por quem foi alterada ou em qual lei ela se fundamenta.

Além disso, **agentes de Inteligência Artificial e sistemas de RAG precisam de texto puro estruturado** para responder dúvidas com precisão jurídica, citando artigos e fontes oficiais sem alucinações.

### O que este projeto entrega:
* **Texto Oficial em Markdown:** Cada ato normativo (RDC, Instrução Normativa, Portaria, RE) em um arquivo `.md` padronizado.
* **Metadados Ricos (YAML Frontmatter):** Situação (vigente/revogada), ementa, leis de base, datas e referências oficiais.
* **Grafo de Relações (`relacoes.json`):** Relações de quem revoga, altera, regulamenta ou cita quem, extraídas deterministicamente a partir dos cabeçalhos e links oficiais (sem alucinação de IA).
* **Hiperlinks Locais:** Se a *RDC 952/2024* cita a *RDC 463/2021*, o Markdown já inclui o link direto para o arquivo local correspondente.
* **Atualização Automática (GitHub Actions):** Um job roda a cada 6 horas conferindo novas publicações nos canais oficiais e commitando no repositório.
* **Visualizador Interativo Online:** Interface web com grafo de física em Canvas e busca instantânea de ementas disponível em [jadsonsanches.github.io/anvisa-normas](https://jadsonsanches.github.io/anvisa-normas/).

---

## 📂 Estrutura do Repositório

```text
anvisa-normas/
├── data/
│   ├── normas/
│   │   ├── rdc/
│   │   │   └── 2024/
│   │   │       ├── rdc-935.md
│   │   │       └── rdc-952.md
│   │   ├── in/
│   │   └── portaria/
│   └── grafo/
│       ├── relacoes.json         # Nós e arestas do grafo completo
│       └── estatisticas.json     # Contadores e cobertura
├── scripts/
│   ├── parser.js                # Extração de metadados, limpeza HTML e conversão para Markdown
│   ├── scraper.js               # Coletor inteligente com controle de requisições
│   ├── grafo.js                 # Gerador do grafo determinístico de relações
│   └── pipeline.js              # Orquestrador geral de atualização
└── .github/
    └── workflows/
        └── atualiza.yml         # Automação periódica (cron)
```

---

## 📑 Formato de Cada Norma

Cada arquivo na pasta `data/normas/` segue rigorosamente o formato:

```markdown
---
tipo: "RDC"
numero: "952"
ano: "2024"
data_promulgacao: "13/12/2024"
situacao: "revogada"
ementa: "Aprova a Errata nº 2 do Formulário de Fitoterápicos da Farmacopeia Brasileira..."
revogada_por: ["Resolução da Diretoria Colegiada Anvisa nº 1.024, de 14/05/2026"]
revoga: []
altera: []
alterada_por: []
leis_base: ["LEI 9782/1999"]
relacionadas: ["RDC 1024/2026", "RDC 463/2021", "RDC 585/2021"]
fonte: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?..."
---

# RDC nº 952, de 13/12/2024

MINISTÉRIO DA SAÚDE
AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA
DIRETORIA COLEGIADA

RESOLUÇÃO Nº 952, DE 13 DE DEZEMBRO DE 2024

*Revogada pela [Resolução da Diretoria Colegiada Anvisa nº 1.024, de 14/05/2026](../rdc/2026/rdc-1024.md)*

A DIRETORIA COLEGIADA DA AGÊNCIA NACIONAL DE VIGILÂNCIA SANITÁRIA...
```

---

## 🤖 Como Usar com Agentes de IA e RAG

Você pode plugar qualquer LLM (Claude, GPT, Gemini, Llama) diretamente nesta base de dados:

1. **Busca Semântica / Embeddings:** Vetorize os arquivos `.md` por seções ou artigos. O frontmatter YAML garante que filtros por ano, tipo e situação (`situacao: "vigente"`) sejam imediatos.
2. **Navegação no Grafo:** O arquivo `data/grafo/relacoes.json` permite que a IA faça *Graph-RAG*, navegando pelas dependências de uma RDC até as Instruções Normativas que a complementam.

---

## 🚀 Como Executar Localmente

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 20 ou superior)

### Instalação
```bash
git clone https://github.com/seu-usuario/anvisa-normas.git
cd anvisa-normas
npm install
```

### Comandos Disponíveis
```bash
# Executa a verificação diária (ano atual e anterior)
npm run pipeline

# Coleta um ano específico
node scripts/pipeline.js --ano 2024

# Re-constrói apenas o grafo de relações a partir dos arquivos Markdown
npm run gerar:grafo
```

---

## ⚖️ Aviso Legal e Licença

* **Código-fonte:** Licenciado sob a [MIT License](LICENSE).
* **Textos Normativos:** Conforme o art. 8º, inciso IV da Lei Federal nº 9.610/1998 (Lei de Direitos Autorais), os atos normativos, resoluções e regulamentos oficiais são de **domínio público**.
* **Isenção:** Este repositório é uma iniciativa independente e de caráter estritamente informativo e educacional. Não substitui as publicações oficiais no Diário Oficial da União (DOU) nem nos portais institucionais da Anvisa.
