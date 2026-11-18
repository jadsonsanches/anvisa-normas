# 🏛️ AnvisaNormas

<p align="center">
  <strong>Base de Dados Aberta de Normas da Anvisa em Markdown, SQLite, JSON & Grafo de Conexões</strong><br>
  Pronta para Inteligência Artificial, RAG, Servidores MCP, Compliance Farmacêutico e Análises Regulatórias
</p>

<p align="center">
  <a href="README.md">🇧🇷 Português</a> •
  <a href="README_EN.md">🇺🇸 English</a>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/licença-MIT-blue.svg?style=flat-square" alt="Licença MIT" /></a>
  <a href=".github/workflows/atualiza.yml"><img src="https://img.shields.io/badge/pipeline-GitHub%20Actions-green.svg?style=flat-square" alt="Pipeline de Atualização" /></a>
  <a href="https://modelcontextprotocol.io/"><img src="https://img.shields.io/badge/MCP-Model%20Context%20Protocol-8A2BE2.svg?style=flat-square" alt="Model Context Protocol" /></a>
  <a href="https://jadsonsanches.github.io/anvisa-normas/"><img src="https://img.shields.io/badge/visualizador-online%20(demo)-blueviolet.svg?style=flat-square" alt="Visualizador Online" /></a>
  <a href="data/dist/anvisa.db"><img src="https://img.shields.io/badge/database-SQLite%203-003B57.svg?style=flat-square" alt="SQLite 3" /></a>
  <a href="#-formato-padronizado-de-cada-norma"><img src="https://img.shields.io/badge/formato-Markdown%20%2B%20YAML-orange.svg?style=flat-square" alt="Markdown + YAML" /></a>
  <a href="data/grafo/relacoes.json"><img src="https://img.shields.io/badge/grafo-26k%2B%20conexões-purple.svg?style=flat-square" alt="Grafo de Relações" /></a>
</p>

---

## 📌 Visão Geral

O **AnvisaNormas** transforma o acervo normativo da **Agência Nacional de Vigilância Sanitária (Anvisa)** em uma infraestrutura moderna de dados abertos. Cada resolução (RDC), instrução normativa (IN), portaria ou resolução especial (RE) é convertida em texto simples (Markdown), enriquecida com metadados estruturados (YAML Frontmatter), conectada em um **Grafo de Relações Regulatórias** determinístico e compilada em bases consolidadas (**SQLite, JSON e CSV**).

Além disso, o projeto inclui um **Servidor MCP (Model Context Protocol)** oficial de alto desempenho, permitindo que modelos de linguagem (Claude Desktop, Cursor, VS Code Copilot e Antigravity) consultem o acervo sanitário em tempo real, verifiquem vigência de atos e naveguem no grafo normativo com latência inferior a 30 ms.

> 🌐 **Acesse a Demonstração Interativa:** Explore o grafo e faça buscas em tempo real em [jadsonsanches.github.io/anvisa-normas](https://jadsonsanches.github.io/anvisa-normas/).

Inspirado nas iniciativas de transparência pública do [ctresb/leis](https://github.com/ctresb/leis) (Legislação Federal) e do [Bruno Moniz](https://github.com/BrunooMoniz/normas-bcb) (Banco Central e CVM).

---

## 🤖 Servidor MCP (Model Context Protocol)

O **AnvisaNormas MCP Server** implementa o protocolo oficial aberto da Anthropic/ModelContextProtocol (`@modelcontextprotocol/sdk`), transformando assistentes de IA em especialistas em regulação sanitária brasileira com acesso nativo e local aos dados.

### ⚡ Execução Imediata (Zero Config)

Você pode iniciar o servidor diretamente via `npx` (não requer compilação nativa C++, opera em WebAssembly puro):

```bash
npx -y anvisa-normas-mcp
```

Ou, caso tenha clonado este repositório localmente:

```bash
npm run build
npm run mcp
```

---

### 🛠️ Ferramentas (Tools) Disponíveis

O servidor disponibiliza 6 ferramentas com validação estrita via esquemas Zod:

| Ferramenta | Descrição | Principais Parâmetros |
| :--- | :--- | :--- |
| `buscar_normas` | Pesquisa textual rápida na ementa e identificadores com **UDF `unaccent`** (tolerante a acentuação em português: "sanitária" == "sanitaria") e filtros estruturados. | `termo` (string), `tipo` (string), `ano` (int), `situacao` (`vigente` \| `revogada`), `limite` (int, padrão: 20) |
| `obter_norma` | Detalhes cadastrais completos por ID canônico ou informal (ex: `"RDC 658/2022"`, `"rdc nº 658/2022"`, `"PORTARIA 344/1998"`). | `id` (string, obrigatório) |
| `verificar_vigencia` | Análise técnica rigorosa de vigência (`vigente`, `revogada` ou `desconhecida`), com **extração automática do ato revogador** e rastreamento de referências no grafo regulatório. | `id` (string, obrigatório) |
| `consultar_relacoes` | Navegação bidirecional no grafo regulatório: leis que fundamentam a norma (`baseada_em`), atos citados (`cita`) e normas que a referenciam. | `id` (string, obrigatório), `direcao` (`todas` \| `saida` \| `entrada`), `tipo_relacao` (`todas` \| `cita` \| `baseada_em`) |
| `obter_estatisticas` | Panorama quantitativo em tempo real: total de normas, vigentes, revogadas, arestas no grafo e agrupamento por tipo de ato. | `tipo` (string, opcional, ex: `"RDC"`, `"IN"`) |
| `obter_texto_norma` | Recupera o texto integral em Markdown original com parâmetro opcional de corte de caracteres para proteção de contexto em modelos menores. | `id` (string, obrigatório), `limite_caracteres` (int, opcional) |

---

### 📦 Recursos (Resources) MCP

* **`normas://{id}`**: Acesso direto ao documento textual em Markdown de qualquer norma através de sua URI (suporta identificadores com barras via URI Template RFC 6570, ex: `normas://RDC%20658/2022` ou `normas://ACM%201/2025`).
* **`normas://estatisticas`**: Recurso estático com métricas quantitativas globais do acervo em formato JSON (`application/json`).

---

### 💡 Templates de Prompts Regulatórios

O servidor MCP registra 3 roteiros padronizados para auditorias e investigações de alto nível:

1. **`analise_conformidade_anvisa`**:
   - *Parâmetros:* `tema` (obrigatório, ex: `"Boas Práticas de Fabricação"`), `normas_especificas` (opcional).
   - *Finalidade:* Conduz a IA a mapear normas ativas, checar vigência, auditar artigos e gerar checklist de conformidade sanitária.
2. **`verificar_revogacao`**:
   - *Parâmetros:* `norma_id` (obrigatório, ex: `"DCP 108/2025"`).
   - *Finalidade:* Rastreia a linha sucessória histórica de um ato, confirmando se houve revogação total ou parcial e qual instrumento o substituiu.
3. **`analisar_impacto_regulatorio`**:
   - *Parâmetros:* `norma_id` (obrigatório, ex: `"RDC 958/2024"`).
   - *Finalidade:* Mapeia o efeito cascata e dependências normativas através da navegação no grafo de relações.

---

### ⚙️ Como Configurar em Clientes MCP

#### 1. Claude Desktop

Abra o arquivo de configuração do Claude Desktop:
- **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
- **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`

Adicione a seção `mcpServers`:

```json
{
  "mcpServers": {
    "anvisa-normas": {
      "command": "npx",
      "args": ["-y", "anvisa-normas-mcp"]
    }
  }
}
```

*Ou para desenvolvimento com clone local apontando para o binário compilado:*

```json
{
  "mcpServers": {
    "anvisa-normas": {
      "command": "node",
      "args": ["/caminho/para/anvisa-normas/dist/bin/mcp.js"]
    }
  }
}
```

#### 2. Cursor

No Cursor, acesse **Cursor Settings** > **Features** > **MCP Servers** > **Add New MCP Server** (ou edite o arquivo `.cursor/mcp.json` na raiz de seu workspace):

```json
{
  "mcpServers": {
    "anvisa-normas": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/bin/mcp.js"]
    }
  }
}
```

#### 3. VS Code Copilot

No VS Code, crie ou edite o arquivo `.vscode/mcp.json`:

```json
{
  "servers": {
    "anvisa-normas": {
      "command": "node",
      "args": ["${workspaceFolder}/dist/bin/mcp.js"]
    }
  }
}
```

#### 4. Antigravity

No painel de configurações ou arquivo de configuração MCP:

```json
{
  "mcpServers": {
    "anvisa-normas": {
      "command": "npx",
      "args": ["-y", "anvisa-normas-mcp"]
    }
  }
}
```

*Ou para desenvolvimento com clone local:*

```json
{
  "mcpServers": {
    "anvisa-normas": {
      "command": "node",
      "args": ["/caminho/para/anvisa-normas/dist/bin/mcp.js"]
    }
  }
}
```

---

## 📸 Interface & Grafo Regulatório

O projeto conta com um visualizador interativo cliente-side que roda diretamente no navegador, permitindo navegar visualmente pelas conexões jurídicas entre normas.

<p align="center">
  <img src="docs/assets/grafo-relacoes.jpg" alt="Grafo Interativo de Relações Regulatórias" width="49%" />
  <img src="docs/assets/inspetor-metadados.png" alt="Inspetor de Metadados Regulatórios" width="49%" />
</p>
<p align="center">
  <em>Visualizador Interativo: Grafo de relações com física interativa (esquerda) e Inspetor de metadados regulatórios (direita).</em>
</p>

---

## 🎯 Por que este repositório existe?

Profissionais de **Assuntos Regulatórios, Jurídico, Compliance, P&D, Indústria Farmacêutica, Cosméticos, Alimentos e HealthTechs** frequentemente enfrentam:
- Portais governamentais instáveis, buscas lentas e PDFs escaneados ou com formatação quebrada.
- Dificuldade em rastrear se uma norma ainda está **vigente**, quais artigos foram revogados ou alterados e em qual Lei Federal ela se fundamenta.
- Falta de texto limpo para alimentar modelos de linguagem (LLMs), agentes autônomos e sistemas RAG (Retrieval-Augmented Generation).

### O que este projeto entrega:
- ✅ **Servidor MCP Integrado:** Conexão nativa e padronizada com Claude Desktop, Cursor, VS Code Copilot e Antigravity.
- ✅ **Texto Integral em Markdown:** Arquivos leves, limpos e versionados no Git.
- ✅ **Metadados Ricos (YAML Frontmatter):** Situação jurídica oficial (`vigente` / `revogada`), ementa, datas distintas (**Data do Ato** vs **Data de Publicação no DOU**), leis-base e referências cruzadas.
- ✅ **Grafo Determinístico (`relacoes.json`):** Mapeamento preciso de citações, alterações e revogações — sem alucinações de inteligência artificial.
- ✅ **Bancos Prontos para Consumo:** Arquivos consolidados em **SQLite (`anvisa.db`)**, **JSON** e **CSV** gerados a cada atualização.
- ✅ **Pipeline Contínuo e Automatizado:** GitHub Actions executado a cada 6 horas coletando novos atos normativos diretamente da fonte oficial.
- ✅ **AI & RAG Ready:** Ideal para chunking semântico, embeddings e agentes de suporte regulatório.

---

## 📊 Estatísticas do Acervo

| Indicador | Quantidade |
| :--- | :--- |
| 📜 **Normas Catalogadas** | **+14.300** |
| 🟢 **Normas Vigentes** | **+14.200** |
| 🔗 **Conexões no Grafo Regulatório** | **+26.300** |
| 📂 **Tipos de Atos Cobertos** | RDC, Portaria, RE, IN, CPB, Leis Federais e mais |

---

## 💾 Downloads Diretos (Bancos Consolidados)

Para cientistas de dados, engenheiros de IA e analistas de BI, disponibilizamos os arquivos prontos na pasta [`data/dist/`](data/dist):

| Formato | Arquivo | Tamanho / Descrição |
| :--- | :--- | :--- |
| 🗄️ **SQLite 3** | [`data/dist/anvisa.db`](data/dist/anvisa.db) | Banco relacional completo com tabelas indexadas `normas` e `relacoes`. |
| 📦 **JSON Consolidado** | [`data/dist/normas.json`](data/dist/normas.json) | Objeto estruturado com todas as normas, metadados e textos integrais. |
| 📊 **CSV Estruturado** | [`data/dist/normas.csv`](data/dist/normas.csv) | Tabela compatível com Excel, Pandas e ferramentas de BI. |
| 🕸️ **Grafo Completo** | [`data/grafo/relacoes.json`](data/grafo/relacoes.json) | Lista de nós (nodes) e arestas direcionadas (links) para análises de rede. |

---

## 💻 Como Usar em Python

### 1. Consultar Normas via SQLite & Pandas

```python
import sqlite3
import pandas as pd

# Conectar ao banco SQLite consolidado
conn = sqlite3.connect("data/dist/anvisa.db")

# Consultar RDCs vigentes mais recentes
query = """
    SELECT tipo, numero, ano, data_ato, data_publicacao_dou, ementa 
    FROM normas 
    WHERE tipo = 'RDC' AND situacao = 'vigente'
    ORDER BY ano DESC, numero DESC
    LIMIT 10
"""
df = pd.read_sql_query(query, conn)
print(df)
```

### 2. Carregar o Grafo de Relações com NetworkX

```python
import json
import networkx as nx

# Carregar o grafo de relações regulatórias
with open("data/grafo/relacoes.json", "r", encoding="utf-8") as f:
    grafo_data = json.load(f)

G = nx.DiGraph()

# Adicionar nós e arestas
for node in grafo_data["nodes"]:
    G.add_node(node["id"], tipo=node.get("tipo"), titulo=node.get("titulo"))

for link in grafo_data["links"]:
    G.add_edge(link["source"], link["target"], relacao=link.get("tipo"))

print(f"Total de Nós: {G.number_of_nodes()} | Total de Arestas: {G.number_of_edges()}")
```

---

## 📑 Formato Padronizado de Cada Norma

Cada ato presente no repositório (`data/normas/`) possui um cabeçalho estruturado no padrão YAML Frontmatter:

```markdown
---
tipo: "RDC"
numero: "1046"
ano: "2026"
data_ato: "29/10/2026"
data_promulgacao: "29/10/2026"
data_publicacao_dou: "03/11/2026"
situacao: "vigente"
ementa: "Altera a Resolução de Diretoria Colegiada nº 1.000, de 11 de dezembro de 2025, que dispõe sobre os requisitos de controle para Notificações de Receita..."
leis_base: ["LEI 9782/1999"]
relacionadas: ["RDC 1000/2025", "RDC 585/2021", "PORTARIA 344/1998", "RDC 471/2021", "TAP 60/2026"]
fonte: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?..."
---

# RESOLUÇÃO DA DIRETORIA COLEGIADA - RDC Nº 1.046, DE 29 DE OUTUBRO DE 2026

O Diretor-Presidente da Agência Nacional de Vigilância Sanitária...

Art. 1º Esta Resolução altera a Resolução de Diretoria Colegiada - RDC nº 1.000...
```

---

## 📂 Estrutura do Repositório

```text
anvisa-normas/
├── src/                          # 🚀 Código-fonte TypeScript do Servidor MCP
│   ├── bin/                      # CLI executável stdio (shebang #!/usr/bin/env node)
│   ├── db/                       # Provedores de banco (DatabaseProvider e sql.js WASM)
│   ├── tools/                    # 6 Ferramentas MCP (busca, vigência, texto, relações, estatísticas)
│   ├── resources/                # Recursos MCP (normas://{id} e normas://estatisticas)
│   ├── prompts/                  # Prompts regulatórios padronizados
│   ├── config.ts                 # Resolução dinâmica e resiliente de caminhos
│   ├── server.ts                 # Fábrica createAnvisaMcpServer
│   └── index.ts                  # Ponto de exportação de bibliotecas
├── dist/                         # 📦 Artefatos compilados em ESM
├── docs/
│   └── assets/                   # 🖼️ Imagens do visualizador e logotipos
├── data/
│   ├── dist/                     # 💾 Bancos de dados consolidados (SQLite, JSON, CSV)
│   │   ├── anvisa.db             # Banco SQLite 3 relacional (~94 MB)
│   │   ├── normas.json           # Base JSON completa
│   │   └── normas.csv            # Tabela CSV
│   ├── normas/                   # 📄 Atos normativos individuais em Markdown (.md)
│   │   ├── rdc/                  # Resoluções da Diretoria Colegiada
│   │   ├── portaria/             # Portarias
│   │   ├── in/                   # Instruções Normativas
│   │   └── re/                   # Resoluções Especiais
│   └── grafo/
│       ├── relacoes.json         # Nós e conexões do grafo regulatório
│       └── estatisticas.json     # Métricas consolidadas do acervo
├── scripts/
│   ├── parser.js                # Higienização de HTML e conversão para Markdown
│   ├── scraper.js               # Coletor integrado à busca oficial da Anvisa
│   ├── grafo.js                 # Construtor determinístico do grafo
│   ├── exportar-bancos.js       # Exportador consolidado (SQLite, JSON, CSV)
│   ├── gerar-visualizador.js    # Compilador do visualizador web estático
│   └── pipeline.js              # Orquestrador geral de atualização contínua
├── test/
│   ├── mcp.test.js              # Testes automatizados do Servidor MCP (InMemoryTransport)
│   ├── challenger.test.js       # Testes de integridade do acervo e datas
│   ├── normas.test.js           # Validação de frontmatter
│   ├── parser.test.js           # Testes do parser HTML
│   └── scripts.test.js          # Validação de sintaxe e módulos
├── tsconfig.json                 # Configuração do TypeScript ESM/NodeNext
├── tsup.config.ts                # Configuração do bundler tsup
├── index.html                   # Visualizador interativo publicado no GitHub Pages
└── .github/
    └── workflows/
        └── atualiza.yml         # Automação periódica (cron a cada 6h)
```

---

## 🚀 Execução Local e Testes

### Pré-requisitos
* [Node.js](https://nodejs.org/) (versão 20 LTS ou superior recomendada)
* Git instalado

### Instalação
```bash
git clone https://github.com/jadsonsanches/anvisa-normas.git
cd anvisa-normas
npm install
```

### Compilar e Testar o Servidor MCP
```bash
# Compila o servidor MCP com TypeScript e tsup
npm run build

# Executa o servidor MCP em modo stdio
npm run mcp

# Executa os testes automatizados do servidor MCP (12 testes via InMemoryTransport)
npm run test:mcp

# Executa a suíte completa de testes do repositório (26 testes de integridade + MCP)
npm test
```

### Comandos do Pipeline de Dados
```bash
# Executa o pipeline completo: coleta, parse, grafo, bancos e visualizador
npm run pipeline

# Coleta atos de uma data específica (DD/MM/AAAA)
node scripts/pipeline.js --data 12/11/2026

# Coleta atos de um ano específico
node scripts/pipeline.js --ano 2026

# Exporta apenas os bancos consolidados (SQLite, JSON, CSV)
npm run exportar:bancos

# Reconstrói apenas o visualizador web estático
npm run gerar:visualizador
```

---

## 🤝 Como Contribuir

Contribuições são muito bem-vindas! Você pode contribuir:
- Reportando inconsistências de texto ou links em atos específicos via [Issues](https://github.com/jadsonsanches/anvisa-normas/issues).
- Sugerindo novas ferramentas e melhorias para o Servidor MCP.
- Sugerindo novas regras de extração e relacionamentos no `scripts/grafo.js`.
- Aprimorando o visualizador em `index.html`.

Para mais detalhes, confira o nosso [Guia de Contribuição](CONTRIBUTING.md).

---

## ⚖️ Aviso Legal & Licença

* **Código-fonte:** Licenciado sob a [MIT License](LICENSE).
* **Textos Normativos:** Conforme o art. 8º, inciso IV da Lei Federal nº 9.610/1998 (Lei de Direitos Autorais brasileira), os textos de leis, decretos, resoluções e regulamentos oficiais são de **domínio público**.
* **Isenção de Responsabilidade:** Este projeto é uma iniciativa independente de dados abertos para fins de pesquisa, tecnologia e facilitação do acesso à informação. Ele não substitui as publicações oficiais no [Diário Oficial da União (DOU)](https://in.gov.br/) nem no portal institucional da Anvisa.
