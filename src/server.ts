import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from './db/provider.js';
import { registerTools } from './tools/index.js';
import { registerResources } from './resources/index.js';
import { registerPrompts } from './prompts/index.js';

export function createAnvisaMcpServer(dbProvider: DatabaseProvider): McpServer {
  const server = new McpServer(
    {
      name: 'anvisa-normas-mcp',
      title: '🌿 AnvisaNormas MCP',
      version: '1.0.0',
      description: 'Servidor MCP Oficial do acervo de normas regulatórias da Anvisa',
      icon: '🌿',
      iconUrl: 'https://jadsonsanches.github.io/anvisa-normas/favicon.svg',
    } as any,
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {},
      },
    }
  );

  // Registra as 6 ferramentas de consulta
  registerTools(server, dbProvider);

  // Registra recursos estáticos e dinâmicos
  registerResources(server, dbProvider);

  // Registra os templates de prompts regulatórios
  registerPrompts(server);

  return server;
}
