# Guia de Contribuição — Anvisa-Normas 🏛️

Agradecemos imensamente pelo seu interesse em contribuir com o **Anvisa-Normas**! Este projeto é uma iniciativa aberta que tem como objetivo transformar todo o acervo normativo da Agência Nacional de Vigilância Sanitária em dados estruturados (Markdown, YAML Frontmatter, SQLite, JSON e CSV), acessíveis para a sociedade, pesquisadores, setor produtivo regulado e sistemas de Inteligência Artificial / RAG.

Para garantir a qualidade técnica, a consistência dos dados e a agilidade na revisão das contribuições, estabelecemos as diretrizes a seguir.

---

## 📋 Sumário
1. [Código de Conduta e Princípios](#1-código-de-conduta-e-princípios)
2. [Como Posso Contribuir?](#2-como-posso-contribuir)
3. [Configuração do Ambiente Local](#3-configuração-do-ambiente-local)
4. [Diretrizes de Arquitetura e Dados](#4-diretrizes-de-arquitetura-e-dados)
5. [Padrões de Commit (Conventional Commits)](#5-padrões-de-commit-conventional-commits)
6. [Fluxo de Desenvolvimento e Envio de Pull Requests](#6-fluxo-de-desenvolvimento-e-envio-de-pull-requests)
7. [Processo de Revisão e Merge](#7-processo-de-revisão-e-merge)
8. [Licença e Aspectos Legais](#8-licença-e-aspectos-legais)

---

## 1. Código de Conduta e Princípios

Nosso compromisso é construir uma comunidade acolhedora, inclusiva, ética e tecnicamente rigorosa.

* **Respeito Mútuo:** Seja cordial e respeitoso em issues, discussões e revisões de código.
* **Integridade Normativa:** Os textos regulatórios e metadados devem refletir **estritamente a fonte oficial** (AnvisaLegis e Diário Oficial da União). É proibido criar, adulterar ou sintetizar normas via modelos gerativos não determinísticos.
* **Transparência e Rastreabilidade:** Qualquer ajuste em metadados ou regras de relações normativas deve citar a publicação ou link oficial de referência.

---

## 2. Como Posso Contribuir?

Você pode colaborar de diversas maneiras:
* 🐛 **Reportar Inconsistências:** Erros de conversão de HTML para Markdown, falhas em datas de publicação, ementas truncadas ou links quebrados.
* ⚙️ **Melhorias nos Scrapers e Parsers:** Otimização de seletores, tratamento de casos excepcionais de formatação do portal AnvisaLegis e resiliência a falhas de rede.
* 📊 **Exportação de Dados e Análises:** Criação de novos scripts analíticos, relatórios ou modelos de exportação (ex: Parquet, DuckDB, novos esquemas relacionais).
* 🌐 **Aprimoramento do Visualizador Web:** Melhorias de performance no Canvas, usabilidade, acessibilidade e novos filtros interativos no `index.html`.
* 📖 **Documentação:** Guias práticos de consumo dos dados em Python/Pandas, R, LangChain, LlamaIndex e exemplos de queries no SQLite.

---

## 3. Configuração do Ambiente Local

### Pré-requisitos
* **Node.js:** Versão `20.x` ou superior (recomendado utilizar a versão LTS atual).
* **npm:** Versão `10.x` ou superior.
* **Git:** Instalado e configurado com seu usuário e e-mail do GitHub.

### Passo a Passo de Instalação

1. Realize o fork do repositório no GitHub para sua conta pessoal.
2. Clone o seu fork localmente:
   ```bash
   git clone https://github.com/SEU_USUARIO/anvisa-normas.git
   cd anvisa-normas
   ```
3. Configure o repositório original como upstream:
   ```bash
   git remote add upstream https://github.com/jadsonsanches/anvisa-normas.git
   ```
4. Instale as dependências do projeto:
   ```bash
   npm install
   ```

### Comandos Disponíveis no Projeto

| Comando | Descrição |
| :--- | :--- |
| `npm run pipeline` | Executa a verificação padrão diária de novas normas e atualiza bancos e visualizador. |
| `node scripts/pipeline.js --ano 2026` | Coleta e processa atos de um ano específico. |
| `node scripts/pipeline.js --data DD/MM/AAAA` | Coleta atos de uma data específica. |
| `npm run gerar:grafo` | Reconstrói o grafo determinístico (`data/grafo/relacoes.json`). |
| `npm run exportar:bancos` | Consolida os dados em SQLite (`anvisa.db`), `normas.json` e `normas.csv`. |
| `npm run gerar:visualizador` | Atualiza o código do visualizador web estático com os dados embutidos. |
| `npm run test:syntax` | Valida a sintaxe JavaScript de todos os scripts em `scripts/` via `node --check`. |
| `npm test` | Executa a suíte de testes automatizados (`node:test`) em `test/`. |
| `npm run test:integrity` | Valida a execução determinística local do grafo, visualizador e exportadores. |

---

## 4. Diretrizes de Arquitetura e Dados

* **Imutabilidade e Fidelidade:** Nunca altere manualmente o arquivo Markdown de uma norma a menos que esteja corrigindo um erro explícito de parser contra a fonte oficial.
* **Estrutura de Pastas:**
  * `data/normas/{tipo}/{ano}/{tipo}-{numero}.md`: Arquivos de normas.
  * `data/dist/`: Arquivos binários e bancos consolidados gerados automaticamente pelos scripts.
  * `scripts/`: Módulos de extração, transformação e compilação em Node.js puro.
  * `test/`: Testes automatizados unitários e de integridade com o runner nativo do Node.js.
* **Padrão de Código JavaScript:**
  * Código legível, com tratamento claro de exceções (`try/catch`).
  * Prefira o uso de APIs modernas nativas do Node.js (`fs/promises`, `fetch`, etc.).
  * Evite adicionar dependências externas desnecessárias no `package.json`.

---

## 5. Padrões de Commit (Conventional Commits)

Adotamos a especificação [Conventional Commits](https://www.conventionalcommits.org/pt-br/v1.0.0/). Cada mensagem de commit deve seguir a estrutura:

```text
<tipo>(<escopo opcional>): <descrição no imperativo e em minúsculas>
```

### Tipos Permitidos
* `feat`: Nova funcionalidade (ex: novo exportador de dados, novo filtro na UI).
* `fix`: Correção de bug no código, parser ou pipeline.
* `docs`: Alterações exclusivamente na documentação (`README.md`, guias, comentários).
* `style`: Ajustes de formatação de código (espaçamento, ponto e vírgula) sem alteração lógica.
* `refactor`: Refatoração interna que não altera o comportamento externo.
* `perf`: Otimização de desempenho ou redução de consumo de memória.
* `test`: Adição ou melhoria de testes e validações automatizadas.
* `chore`: Tarefas rotineiras, atualização de dependências ou automações periódicas.
* `ci`: Ajustes em arquivos de workflows do GitHub Actions (`.github/workflows/`).

### Escopos Recomendados
* `scraper`, `parser`, `grafo`, `bancos`, `ui`, `data`, `ci`, `docs`, `test`.

### Exemplos Válidos
```bash
feat(scraper): adiciona extração de links para atas de reuniões da diretoria
fix(parser): corrige tratamento de datas no formato DD-MM-AAAA no frontmatter
docs(readme): adiciona instruções para consultas em duckdb
chore(ci): configura cache de dependências npm no workflow de pull request
test(normas): adiciona asserção para campo situacao no frontmatter
```

---

## 6. Fluxo de Desenvolvimento e Envio de Pull Requests

1. **Atualize sua branch `main`:**
   ```bash
   git checkout main
   git fetch upstream
   git merge upstream/main
   ```
2. **Crie uma branch específica para sua contribuição:**
   ```bash
   git checkout -b feat/nome-da-sua-feature
   # ou
   git checkout -b fix/descricao-do-bug
   ```
3. **Desenvolva as alterações:**
   * Mantenha alterações focadas no objetivo da branch.
   * Evite misturar refatorações não relacionadas com correções pontuais.
4. **Valide localmente:**
   * Execute `npm run test:syntax`, `npm test` e `npm run test:integrity`.
   * Garanta que todos os testes finalizem com código de saída 0.
5. **Faça commits atômicos:**
   * Use o padrão Conventional Commits descrito na seção 5.
6. **Envie para seu repositório remoto:**
   ```bash
   git push origin feat/nome-da-sua-feature
   ```
7. **Abra o Pull Request:**
   * Acesse o repositório no GitHub e abra o PR apontando para `main`.
   * O template `.github/PULL_REQUEST_TEMPLATE.md` será carregado automaticamente.
   * Preencha todos os campos do template com atenção e marque os itens do checklist.

---

## 7. Processo de Revisão e Merge

* **Verificação Automatizada (CI):** O workflow do GitHub Actions (`.github/workflows/ci.yml`) será disparado automaticamente para validar a sintaxe e a integridade dos scripts. O PR só poderá ser mesclado se o status do CI for verde (sucesso).
* **Revisão de Código (Code Owner):** As alterações serão analisadas pelo mantenedor responsável (`@jadsonsanches`). Podem ser solicitados ajustes ou esclarecimentos na aba de conversa do PR.
* **Estratégia de Merge:** O merge padrão geralmente é realizado via *Squash and Merge* ou *Rebase*, mantendo o histórico da branch `main` limpo e linear.

---

## 8. Licença e Aspectos Legais

Ao submeter código a este repositório, você concorda que:
1. Sua contribuição de software será licenciada sob a licença **MIT** do projeto.
2. Os dados de atos normativos e resoluções aqui tratados são de **domínio público**, nos termos do art. 8º, IV da Lei Federal nº 9.610/1998.
3. Você detém a autoria das alterações ou possui a autorização necessária para submetê-las como código aberto.

Muito obrigado por ajudar a tornar a regulação sanitária brasileira mais acessível e transparente! 🚀
