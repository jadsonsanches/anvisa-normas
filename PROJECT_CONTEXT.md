# Contexto do Projeto: Anvisa-Normas

> **ID da Conversa de Criação:** `751dcabd-4e40-4928-8790-25b82fbcd3e4`  
> **Data de Criação:** 12/11/2026  
> **Autor / Mantenedor:** Jadson Sanches  
> **Inspiração:** [Bruno Moniz (BCB e CVM)](https://www.linkedin.com/in/brmoniz/) & [ctresb/leis](https://github.com/ctresb/leis)

---

## 1. Visão Geral e Propósito
Criar o primeiro acervo 100% aberto das normas da Agência Nacional de Vigilância Sanitária (Anvisa) em formato texto limpo (Markdown), com metadados jurídicos estruturados (YAML Frontmatter), grafo de relações determinístico (sem alucinações de IA) e pipeline de atualização contínua via GitHub Actions.

Setor impactado: Indústria farmacêutica, cosméticos, alimentos, saúde e consultorias de Assuntos Regulatórios (cerca de 10% do PIB brasileiro).

---

## 2. Descoberta da Fonte de Dados
* **Portal Oficial:** AnvisaLegis (`https://anvisalegis.datalegis.net/`).
* **Resenha Histórica por Ano:**
  `/action/ActionDatalegis.php?acao=abrirResenhaAnoData&cod_modulo=310&cod_menu=9882&ano={ANO}`
* **Texto Integral do Ato:**
  `/action/ActionDatalegis.php?acao=abrirTextoAto&link=S&tipo={TIPO}&numeroAto={NUMERO}&valorAno={ANO}`
* **Relações Oficiais Embutidas:**
  O Datalegis embute tuplas nas chamadas `LinkTexto('TIPO', 'NUM', 'SEQ', 'ANO', 'ORGAO')`. Isso permite mapear 100% das referências cruzadas entre RDCs, INs, Portarias e Leis Federais de forma exata.

---

## 3. Arquitetura do Repositório
* **`data/normas/{tipo}/{ano}/{tipo}-{numero}.md`**:
  Normas convertidas para Markdown com frontmatter YAML (tipo, número, ano, data, situação, ementa, revogada_por, revoga, altera, leis_base, relacionadas, fonte).
* **`data/grafo/relacoes.json`**:
  Nós e arestas mapeando a rede normativa completa.
* **`data/grafo/estatisticas.json`**:
  Totalizadores por tipo (RDC, IN, Portaria, RE) e status (vigente vs revogada).
* **`scripts/`**:
  - `parser.js`: Higienização de HTML e conversão Turndown.
  - `scraper.js`: Coletor em lote por ano.
  - `grafo.js`: Construtor do grafo determinístico.
  - `pipeline.js`: Orquestrador com flags `--full`, `--ano` ou modo diário.
* **`.github/workflows/atualiza.yml`**:
  Cron agendado a cada 6 horas (`0 */6 * * *`) para commitar alterações automaticamente.

---

## 4. Estado Atual
* 28 normas de 2024 já coletadas, convertidas e validadas.
* Grafo com 74 nós e 137 conexões ativas.
* Git inicializado na branch `main`.
