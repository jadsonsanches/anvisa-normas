#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SqlJsDatabaseProvider } from '../db/sqljs-provider.js';
import { createAnvisaMcpServer } from '../server.js';
import { resolveDbPath } from '../config.js';

async function main() {
  console.error('[anvisa-normas-mcp-web] Inicializando servidor Web/SSE MCP AnvisaNormas...');

  const dbPath = resolveDbPath();
  console.error(`[anvisa-normas-mcp-web] Carregando banco de dados: ${dbPath}`);

  const dbProvider = new SqlJsDatabaseProvider(dbPath);
  await dbProvider.init();
  console.error('[anvisa-normas-mcp-web] Banco SQLite carregado em memória com sucesso.');

  const app = express();
  app.use(cors());

  // Rota de saúde e informações gerais
  app.get(['/', '/health'], (_req, res) => {
    res.json({
      status: 'healthy',
      name: 'anvisa-normas-mcp',
      description: 'Servidor MCP Oficial do acervo de normas da Anvisa',
      version: '1.0.0',
      transports: {
        sse: {
          connect: '/sse',
          messages: '/messages?sessionId={sessionId}'
        },
        streamableHttp: {
          endpoint: '/mcp'
        }
      }
    });
  });

  // Mapa de sessões ativas para SSE
  const sseTransports = new Map<string, SSEServerTransport>();

  // Endpoint SSE (Server-Sent Events) - compatível com Claude Desktop, Cursor e outros clientes MCP
  app.get('/sse', async (req, res) => {
    console.error(`[anvisa-normas-mcp-web] Nova conexão SSE recebida de ${req.ip}`);
    try {
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);

      transport.onclose = () => {
        console.error(`[anvisa-normas-mcp-web] Conexão SSE encerrada (sessão ${sessionId})`);
        sseTransports.delete(sessionId);
      };

      const server = createAnvisaMcpServer(dbProvider);
      await server.connect(transport);
      console.error(`[anvisa-normas-mcp-web] Sessão SSE iniciada com sucesso (sessão ${sessionId})`);
    } catch (err) {
      console.error('[anvisa-normas-mcp-web] Erro ao iniciar conexão SSE:', err);
      if (!res.headersSent) {
        res.status(500).send('Internal Server Error');
      }
    }
  });

  // Endpoint POST /messages para receber as chamadas dos clientes SSE
  app.post('/messages', async (req, res) => {
    const sessionId = req.query.sessionId as string;
    if (!sessionId) {
      res.status(400).json({ error: 'sessionId query parameter is required' });
      return;
    }

    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }

    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error(`[anvisa-normas-mcp-web] Erro ao processar mensagem na sessão ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Failed to process message' });
      }
    }
  });

  // Endpoint Streamable HTTP (/mcp) - novo padrão MCP
  const streamableTransport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
  });
  const streamableServer = createAnvisaMcpServer(dbProvider);
  await streamableServer.connect(streamableTransport);

  app.all('/mcp', async (req, res) => {
    try {
      await streamableTransport.handleRequest(req, res);
    } catch (err) {
      console.error('[anvisa-normas-mcp-web] Erro no endpoint /mcp:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Internal Server Error' });
      }
    }
  });

  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const host = '0.0.0.0';

  const httpServer = app.listen(port, host, () => {
    console.error(`[anvisa-normas-mcp-web] Servidor Web MCP escutando em http://${host}:${port}`);
    console.error(`[anvisa-normas-mcp-web] Endpoint SSE disponível em: http://${host}:${port}/sse`);
    console.error(`[anvisa-normas-mcp-web] Endpoint Streamable HTTP disponível em: http://${host}:${port}/mcp`);
  });

  const shutdown = async (signal: string) => {
    console.error(`[anvisa-normas-mcp-web] Encerrando servidor HTTP (sinal ${signal})...`);
    httpServer.close(async () => {
      try {
        await dbProvider.close();
        console.error('[anvisa-normas-mcp-web] Servidor encerrado com sucesso.');
        process.exit(0);
      } catch (err) {
        console.error('[anvisa-normas-mcp-web] Erro durante o encerramento:', err);
        process.exit(1);
      }
    });
  };

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}

main().catch((error) => {
  console.error('[anvisa-normas-mcp-web] Falha fatal ao iniciar o servidor Web MCP:', error);
  process.exit(1);
});
