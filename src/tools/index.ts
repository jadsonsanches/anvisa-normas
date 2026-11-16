import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';
import { registerBuscarNormasTool } from './buscar-normas.js';
import { registerObterNormaTool } from './obter-norma.js';
import { registerVerificarVigenciaTool } from './verificar-vigencia.js';
import { registerConsultarRelacoesTool } from './consultar-relacoes.js';
import { registerObterEstatisticasTool } from './obter-estatisticas.js';
import { registerObterTextoNormaTool } from './obter-texto-norma.js';

export function registerTools(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  registerBuscarNormasTool(server, dbProvider);
  registerObterNormaTool(server, dbProvider);
  registerVerificarVigenciaTool(server, dbProvider);
  registerConsultarRelacoesTool(server, dbProvider);
  registerObterEstatisticasTool(server, dbProvider);
  registerObterTextoNormaTool(server, dbProvider);
}

export * from './buscar-normas.js';
export * from './obter-norma.js';
export * from './verificar-vigencia.js';
export * from './consultar-relacoes.js';
export * from './obter-estatisticas.js';
export * from './obter-texto-norma.js';
