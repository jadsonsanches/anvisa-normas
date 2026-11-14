# Padrão de Arquivos e Frontmatter YAML

## Propósito
Garantir interoperabilidade, indexação no SQLite/FTS5 e consistência estrutural em todo o repositório.

> Este padrão documenta o formato efetivamente gerado por `scripts/parser.js` e consumido por
> `scripts/grafo.js`, `scripts/exportar-bancos.js`, `scripts/gerar-visualizador.js` e pela suíte de testes.
> Qualquer mudança de esquema deve ser feita em conjunto no parser, nos consumidores, nos testes e no acervo já coletado.

## Estrutura de Diretórios e Nomenclatura

- Todos os arquivos Markdown de normas devem seguir rigorosamente o padrão:
  `data/normas/{tipo}/{ANO}/{tipo}-{NUMERO}.md`
  Exemplo: `data/normas/rdc/2025/rdc-834.md`
- O `{tipo}` no caminho da pasta e no nome do arquivo deve estar sempre em **letras minúsculas** (ex.: `rdc`, `in`, `re`, `portaria`).
- O `{ANO}` deve ter 4 dígitos.
- O `{NUMERO}` não deve ter zeros à esquerda.

## Esquema Estrito de Frontmatter (YAML)

Cada arquivo `.md` de norma deve iniciar com um bloco YAML válido contendo os seguintes campos, nesta ordem:

```yaml
---
tipo: "RDC"
numero: "834"
ano: "2025"
data_ato: "15/03/2025"
data_promulgacao: "15/03/2025"
data_publicacao_dou: "18/03/2025"
situacao: "vigente"
ementa: "Dispõe sobre..."
leis_base: []
relacionadas: ["RDC 585/2021"]
fonte: "https://anvisalegis.datalegis.net/action/ActionDatalegis.php?..."
---
```

Campo opcional (consumido por `scripts/grafo.js` para gerar arestas de revogação quando disponível):

```yaml
revogada_por: ["RDC 900/2025"]
```

### Regras dos Campos:
1. **`tipo`**: Sigla do ato em letras maiúsculas (ex.: `"RDC"`, `"IN"`, `"RE"`), correspondente à pasta em minúsculas.
2. **`numero`** e **`ano`**: Strings entre aspas; `numero` sem zeros à esquerda, `ano` com 4 dígitos e igual ao `{ANO}` do caminho.
3. **Datas** (`data_ato`, `data_promulgacao`, `data_publicacao_dou`):
   - Formato `DD/MM/AAAA`, com dia entre 01–31 e mês entre 01–12 (datas impossíveis, como mês `40` ou `90`, são proibidas).
   - `data_ato` é obrigatória e não pode ficar vazia; o ano de `data_ato` deve ser coerente com o campo `ano`.
   - `data_promulgacao` deve ser preenchida com a data de referência do ato (por padrão, igual a `data_ato`).
   - `data_publicacao_dou` pode ficar vazia (`""`) somente quando a publicação no DOU não estiver disponível na fonte oficial.
4. **`situacao`**: Valor em minúsculas: `"vigente"` ou `"revogada"`.
5. **`ementa`**: Texto da ementa entre aspas duplas, sem quebras de linha corrompidas e sem tags HTML.
6. **Listas de relacionamento** (`leis_base`, `relacionadas` e, quando presente, `revogada_por`):
   - Devem ser arrays YAML em notação JSON (ex.: `["RDC 585/2021", "IN 12/2024"]`).
   - Normas referenciadas devem seguir o identificador `{TIPO} {NUMERO}/{ANO}` (sigla em maiúsculas, número sem zeros à esquerda e ano com 4 dígitos).
7. **`fonte`**: URL oficial do AnvisaLegis (Datalegis) do ato.
8. **Encoding**:
   - Todo arquivo deve ser salvo estritamente em **UTF-8** (sem BOM).
   - Proibido salvar caracteres com *mojibake* (ex: `Ã§Ã£o`, ``).
