/**
 * Resolve o caminho do banco SQLite consolidado (anvisa.db) com tolerância a múltiplos contextos de execução:
 * 1. Variável de ambiente ANVISA_DB_PATH
 * 2. Caminhos relativos à localização deste módulo compilado
 * 3. Caminhos relativos ao process.cwd()
 */
declare function resolveDbPath(): string;
/**
 * Resolve o diretório raiz de dados (data/)
 */
declare function resolveDataDir(): string;
/**
 * Resolve o caminho de relacoes.json
 */
declare function resolveGrafoPath(): string;
/**
 * Resolve o caminho de estatisticas.json
 */
declare function resolveEstatisticasPath(): string;
/**
 * Resolve o diretório de arquivos markdown individuais (data/normas)
 */
declare function resolveNormasDir(): string;

export { resolveDataDir, resolveDbPath, resolveEstatisticasPath, resolveGrafoPath, resolveNormasDir };
