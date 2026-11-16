import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

function getDirname(): string {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}

/**
 * Resolve o caminho do banco SQLite consolidado (anvisa.db) com tolerância a múltiplos contextos de execução:
 * 1. Variável de ambiente ANVISA_DB_PATH
 * 2. Caminhos relativos à localização deste módulo compilado
 * 3. Caminhos relativos ao process.cwd()
 */
export function resolveDbPath(): string {
  if (process.env.ANVISA_DB_PATH && fs.existsSync(process.env.ANVISA_DB_PATH)) {
    return path.resolve(process.env.ANVISA_DB_PATH);
  }

  const currentDir = getDirname();
  const candidates = [
    // Se executado de dist/bin/mcp.js
    path.resolve(currentDir, '../../data/dist/anvisa.db'),
    // Se executado de dist/config.js ou dist/index.js
    path.resolve(currentDir, '../data/dist/anvisa.db'),
    // Se executado de src/config.ts com tsx
    path.resolve(currentDir, '../data/dist/anvisa.db'),
    // Se executado a partir da raiz do repositório
    path.resolve(process.cwd(), 'data/dist/anvisa.db'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  // Fallback padrão se não encontrado ainda
  return path.resolve(process.cwd(), 'data/dist/anvisa.db');
}

/**
 * Resolve o diretório raiz de dados (data/)
 */
export function resolveDataDir(): string {
  if (process.env.ANVISA_DATA_DIR && fs.existsSync(process.env.ANVISA_DATA_DIR)) {
    return path.resolve(process.env.ANVISA_DATA_DIR);
  }

  const currentDir = getDirname();
  const candidates = [
    path.resolve(currentDir, '../../data'),
    path.resolve(currentDir, '../data'),
    path.resolve(process.cwd(), 'data'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  return path.resolve(process.cwd(), 'data');
}

/**
 * Resolve o caminho de relacoes.json
 */
export function resolveGrafoPath(): string {
  if (process.env.ANVISA_GRAFO_PATH && fs.existsSync(process.env.ANVISA_GRAFO_PATH)) {
    return path.resolve(process.env.ANVISA_GRAFO_PATH);
  }
  return path.resolve(resolveDataDir(), 'grafo/relacoes.json');
}

/**
 * Resolve o caminho de estatisticas.json
 */
export function resolveEstatisticasPath(): string {
  if (process.env.ANVISA_ESTATISTICAS_PATH && fs.existsSync(process.env.ANVISA_ESTATISTICAS_PATH)) {
    return path.resolve(process.env.ANVISA_ESTATISTICAS_PATH);
  }
  return path.resolve(resolveDataDir(), 'grafo/estatisticas.json');
}

/**
 * Resolve o diretório de arquivos markdown individuais (data/normas)
 */
export function resolveNormasDir(): string {
  if (process.env.ANVISA_NORMAS_DIR && fs.existsSync(process.env.ANVISA_NORMAS_DIR)) {
    return path.resolve(process.env.ANVISA_NORMAS_DIR);
  }
  return path.resolve(resolveDataDir(), 'normas');
}
