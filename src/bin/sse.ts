#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SqlJsDatabaseProvider } from '../db/sqljs-provider.js';
import { createAnvisaMcpServer } from '../server.js';
import { resolveDbPath } from '../config.js';

async function main() {
  console.error('[anvisa-normas-mcp-web] Inicializando servidor Web/SSE MCP AnvisaNormas...');

  const app = express();
  app.use(cors());

  let isReady = false;
  let initError: Error | null = null;
  const dbPath = resolveDbPath();
  const dbProvider = new SqlJsDatabaseProvider(dbPath);

  // Inicialização assíncrona do banco em segundo plano
  const initPromise = (async () => {
    try {
      console.error(`[anvisa-normas-mcp-web] Carregando banco de dados: ${dbPath}`);
      await dbProvider.init();
      isReady = true;
      console.error('[anvisa-normas-mcp-web] Banco SQLite carregado em memória com sucesso.');
    } catch (err: any) {
      initError = err;
      console.error('[anvisa-normas-mcp-web] Erro ao carregar banco SQLite:', err);
    }
  })();

  // Middleware para aguardar o banco estar pronto antes de responder chamadas MCP
  const ensureReady = async (_req: express.Request, res: express.Response, next: express.NextFunction) => {
    if (!isReady) {
      if (initError) {
        res.status(500).json({ error: `Falha na inicialização do banco: ${initError.message}` });
        return;
      }
      await initPromise;
    }
    next();
  };

  // Gerenciador de sessões Streamable HTTP (compatível com Claude Custom Connectors, Cursor e padrão oficial)
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

  const handleStreamableRequest = async (req: express.Request, res: express.Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? streamableSessions.get(sessionId) : null;

      if (!transport) {
        const newSessionId = randomUUID();
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessionclosed: (id) => {
            streamableSessions.delete(id);
          },
        });
        const server = createAnvisaMcpServer(dbProvider);
        await server.connect(transport);
        streamableSessions.set(newSessionId, transport);
      }

      await transport.handleRequest(req, res);
    } catch (err: any) {
      console.error('[anvisa-normas-mcp-web] Erro no Streamable HTTP:', err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || 'Internal Server Error' });
      }
    }
  };

  // Rota de saúde e informações gerais (responde imediatamente às sondas do Cloud Run)
  app.get('/health', (_req, res) => {
    res.json({
      status: isReady ? 'healthy' : 'initializing',
      ready: isReady,
      error: initError ? initError.message : null,
      name: 'anvisa-normas-mcp',
      description: 'Servidor MCP Oficial do acervo de normas da Anvisa',
      version: '1.0.0',
    });
  });

  // Rota raiz GET: se cliente solicitar event-stream, atende como Streamable HTTP; caso contrário, retorna status JSON
  app.get('/', (req, res, next) => {
    if (req.headers.accept?.includes('text/event-stream')) {
      return ensureReady(req, res, () => handleStreamableRequest(req, res));
    }
    res.json({
      status: isReady ? 'healthy' : 'initializing',
      ready: isReady,
      name: 'anvisa-normas-mcp',
      description: 'Servidor MCP Oficial do acervo de normas da Anvisa',
      version: '1.0.0',
      endpoints: {
        streamableHttp: '/mcp',
        sse: '/sse',
        health: '/health'
      }
    });
  });

  // Endpoints Streamable HTTP: /mcp, / e fallback de POST em /sse
  app.all('/mcp', ensureReady, handleStreamableRequest);
  app.post('/', ensureReady, handleStreamableRequest);
  app.post('/sse', ensureReady, handleStreamableRequest);

  // Mapa de sessões ativas para SSE legado
  const sseTransports = new Map<string, SSEServerTransport>();

  // Endpoint SSE GET (Server-Sent Events)
  app.get('/sse', ensureReady, async (req, res) => {
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

  // Endpoint POST /messages para receber as chamadas dos clientes SSE legado
  app.post('/messages', ensureReady, async (req, res) => {
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
