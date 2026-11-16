import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

// src/config.ts
function getDirname() {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}
function resolveDbPath() {
  if (process.env.ANVISA_DB_PATH && fs.existsSync(process.env.ANVISA_DB_PATH)) {
    return path.resolve(process.env.ANVISA_DB_PATH);
  }
  const currentDir = getDirname();
  const candidates = [
    // Se executado de dist/bin/mcp.js
    path.resolve(currentDir, "../../data/dist/anvisa.db"),
    // Se executado de dist/config.js ou dist/index.js
    path.resolve(currentDir, "../data/dist/anvisa.db"),
    // Se executado de src/config.ts com tsx
    path.resolve(currentDir, "../data/dist/anvisa.db"),
    // Se executado a partir da raiz do repositório
    path.resolve(process.cwd(), "data/dist/anvisa.db")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "data/dist/anvisa.db");
}
function resolveDataDir() {
  if (process.env.ANVISA_DATA_DIR && fs.existsSync(process.env.ANVISA_DATA_DIR)) {
    return path.resolve(process.env.ANVISA_DATA_DIR);
  }
  const currentDir = getDirname();
  const candidates = [
    path.resolve(currentDir, "../../data"),
    path.resolve(currentDir, "../data"),
    path.resolve(process.cwd(), "data")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "data");
}
function resolveGrafoPath() {
  if (process.env.ANVISA_GRAFO_PATH && fs.existsSync(process.env.ANVISA_GRAFO_PATH)) {
    return path.resolve(process.env.ANVISA_GRAFO_PATH);
  }
  return path.resolve(resolveDataDir(), "grafo/relacoes.json");
}
function resolveEstatisticasPath() {
  if (process.env.ANVISA_ESTATISTICAS_PATH && fs.existsSync(process.env.ANVISA_ESTATISTICAS_PATH)) {
    return path.resolve(process.env.ANVISA_ESTATISTICAS_PATH);
  }
  return path.resolve(resolveDataDir(), "grafo/estatisticas.json");
}
function resolveNormasDir() {
  if (process.env.ANVISA_NORMAS_DIR && fs.existsSync(process.env.ANVISA_NORMAS_DIR)) {
    return path.resolve(process.env.ANVISA_NORMAS_DIR);
  }
  return path.resolve(resolveDataDir(), "normas");
}

export { resolveDataDir, resolveDbPath, resolveEstatisticasPath, resolveGrafoPath, resolveNormasDir };
//# sourceMappingURL=config.js.map
//# sourceMappingURL=config.js.map