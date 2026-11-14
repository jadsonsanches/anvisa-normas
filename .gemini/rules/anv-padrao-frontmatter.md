# Padrão de Arquivos e Frontmatter YAML

## Propósito
Garantir interoperabilidade, indexação no SQLite/FTS5 e consistência estrutural em todo o repositório.

## Estrutura de Diretórios e Nomenclatura

- Todos os arquivos Markdown de normas devem seguir rigorosamente o padrão:
  `data/normas/{TIPO}/{ANO}/{TIPO}-{NUMERO}.md`
  Exemplo: `data/normas/RDC/2024/RDC-834.md`
- O `{TIPO}` no caminho da pasta e no nome do arquivo deve estar sempre em letras maiúsculas.
- O `{ANO}` deve ter 4 dígitos.
- O `{NUMERO}` não deve ter zeros à esquerda.

## Esquema Estrito de Frontmatter (YAML)

Cada arquivo `.md` de norma deve iniciar com um bloco YAML válido contendo os seguintes campos:

```yaml
---
tipo: RDC
numero: 834
ano: 2024
data: '2024-03-15'
situacao: Vigente
ementa: 'Dispõe sobre...'
revogada_por: []
revoga: []
altera: []
leis_base: []
relacionadas: []
fonte: 'https://anvisalegis.datalegis.net/action/ActionDatalegis.php?...'
---
```

### Regras dos Campos:
1. **`data`**: Formato ISO `YYYY-MM-DD`. Caso o dia/mês não estejam disponíveis, preservar a precisão máxima possível.
2. **`ementa`**: Texto da ementa entre aspas simples ou bloco literal limpo, sem quebras de linha corrompidas e sem tags HTML.
3. **Listas de relacionamento** (`revogada_por`, `revoga`, `altera`, `leis_base`, `relacionadas`):
   - Devem ser arrays YAML (ex: `['RDC-500', 'IN-12']`).
   - Normas referenciadas devem seguir o identificador canônico `{TIPO}-{NUMERO}`.
4. **Encoding**:
   - Todo arquivo deve ser salvo estritamente em **UTF-8** (sem BOM).
   - Proibido salvar caracteres com *mojibake* (ex: `Ã§Ã£o`, ``).
