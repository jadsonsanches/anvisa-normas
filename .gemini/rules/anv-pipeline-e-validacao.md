# Pipeline, Exportação e Validação de Integridade

## Propósito
Garantir que modificações no código ou novas coletas não quebrem a cadeia de geração de dados derivados (grafo, SQLite com FTS e visualizador web).

## Diretrizes de Qualidade e Validação

1. **Validação Obrigatória Pós-Alteração:**
   - Sempre que scripts em `scripts/` forem modificados ou novas rotinas de coleta forem executadas, rodar as verificações do repositório:
     ```bash
     npm run test:syntax
     npm test
     ```
   - Para validações completas dos artefatos gerados:
     ```bash
     npm run test:integrity
     ```

2. **Sincronia dos Artefatos Derivados:**
   - O repositório depende de três saídas derivadas que precisam estar sempre alinhadas aos arquivos Markdown de `data/normas/`:
     - **Grafo:** `data/grafo/relacoes.json` e `data/grafo/estatisticas.json`
     - **Visualizador:** `visualizador.html` (gerado por `scripts/gerar-visualizador.js`)
     - **Bancos Exportados:** Arquivos SQLite gerados por `scripts/exportar-bancos.js`
   - Mudanças estruturais no parser ou no crawler devem ser seguidas pela regeneração desses artefatos para evitar divergência de dados.

3. **Compatibilidade de Dependências:**
   - O projeto utiliza `sql.js` (WebAssembly/Node) para portabilidade sem compilações nativas de C++. Manter dependências limpas e sem introduzir binários pesados ou dependências desnecessárias.
