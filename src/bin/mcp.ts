#!/usr/bin/env node

import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { SqlJsDatabaseProvider } from '../db/sqljs-provider.js';
import { createAnvisaMcpServer } from '../server.js';
import { resolveDbPath } from '../config.js';

async function main() {
  // Redireciona qualquer log informativo estritamente para stderr para proteger o stdout (JSON-RPC)
  console.error('[anvisa-normas-mcp] Inicializando servidor MCP AnvisaNormas...');

  const dbPath = resolveDbPath();
  console.error(`[anvisa-normas-mcp] Carregando banco de dados: ${dbPath}`);

  const dbProvider = new SqlJsDatabaseProvider(dbPath);
  await dbProvider.init();
  console.error('[anvisa-normas-mcp] Banco SQLite carregado em memória com sucesso.');

  const server = createAnvisaMcpServer(dbProvider);
  const transport = new StdioServerTransport();

  // Tratamento de encerramento gracioso
  const shutdown = async (signal: string) => {
    console.error(`[anvisa-normas-mcp] Encerrando servidor (sinal ${signal})...`);
    try {
      await server.close();
      await dbProvider.close();
      console.error('[anvisa-normas-mcp] Servidor encerrado com sucesso.');
      process.exit(0);
    } catch (err) {
      console.error('[anvisa-normas-mcp] Erro durante encerramento:', err);
      process.exit(1);
    }
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));

  await server.connect(transport);
  console.error('[anvisa-normas-mcp] Servidor MCP conectado via stdio e pronto para receber requisições.');
}

main().catch((error) => {
  console.error('[anvisa-normas-mcp] Falha fatal ao iniciar o servidor MCP:', error);
  process.exit(1);
});
