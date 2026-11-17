#!/usr/bin/env node

import express from 'express';
import cors from 'cors';
import { randomUUID, timingSafeEqual } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { SqlJsDatabaseProvider } from '../db/sqljs-provider.js';
import { createAnvisaMcpServer } from '../server.js';
import { resolveDbPath } from '../config.js';

// Extrai chaves válidas da variável de ambiente MCP_API_KEY (suporta múltiplas chaves separadas por vírgula)
const configuredKeys = (process.env.MCP_API_KEY || '')
  .split(',')
  .map((k) => k.trim())
  .filter((k) => k.length > 0);

const isAuthEnabled = configuredKeys.length > 0;

function isValidApiKey(providedKey: string, validKeys: string[]): boolean {
  const provBuf = Buffer.from(providedKey);
  for (const validKey of validKeys) {
    const validBuf = Buffer.from(validKey);
    if (provBuf.length === validBuf.length && timingSafeEqual(provBuf, validBuf)) {
      return true;
    }
  }
  return false;
}

function extractApiKey(req: express.Request): string | null {
  const authHeader = req.headers['authorization'];
  if (authHeader) {
    const parts = authHeader.split(' ');
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return parts[1].trim();
    }
    return authHeader.trim();
  }

  const customHeader =
    (req.headers['x-api-key'] as string) ||
    (req.headers['mcp-api-key'] as string);
  if (customHeader) {
    return customHeader.trim();
  }

  const queryKey =
    (req.query.apiKey as string) ||
    (req.query.api_key as string) ||
    (req.query.key as string);
  if (queryKey) {
    return queryKey.trim();
  }

  return null;
}

async function main() {
  console.error('[anvisa-normas-mcp-web] Inicializando servidor Web/SSE MCP AnvisaNormas...');
  if (isAuthEnabled) {
    console.error(
      `[anvisa-normas-mcp-web] 🔒 Autenticação MCP ATIVADA com ${configuredKeys.length} chave(s) autorizada(s).`
    );
  } else {
    console.error(
      '[anvisa-normas-mcp-web] ⚠️ AVISO: Autenticação MCP DESATIVADA (variável MCP_API_KEY não configurada). Servidor aberto.'
    );
  }

  const app = express();
  app.use(cors());

  let isReady = false;
  let initError: Error | null = null;
  const dbPath = resolveDbPath();
  const dbProvider = new SqlJsDatabaseProvider(dbPath);

  // Registro de sessões autenticadas ativas
  const authenticatedSessions = new Set<string>();

  // Middleware de Autenticação
  const authMiddleware = (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ) => {
    if (!isAuthEnabled) {
      return next();
    }

    const sessionId =
      (req.headers['mcp-session-id'] as string) ||
      (req.query.sessionId as string);

    if (sessionId && authenticatedSessions.has(sessionId)) {
      return next();
    }

    const key = extractApiKey(req);
    if (key && isValidApiKey(key, configuredKeys)) {
      if (sessionId) {
        authenticatedSessions.add(sessionId);
      }
      return next();
    }

    res.status(401).json({
      error: 'Unauthorized',
      message: 'Acesso negado: chave de autenticação MCP_API_KEY ausente ou inválida.',
      docs: 'Forneça a chave via header "Authorization: Bearer <key>", "x-api-key: <key>" ou query parameter "?apiKey=<key>".',
    });
  };

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
        res.status(500).json({ error: 'Falha interna na inicialização do acervo regulatório.' });
        return;
      }
      await initPromise;
    }
    next();
  };

  // Gerenciador de sessões Streamable HTTP
  const streamableSessions = new Map<string, StreamableHTTPServerTransport>();

  const handleStreamableRequest = async (req: express.Request, res: express.Response) => {
    try {
      const sessionId = req.headers['mcp-session-id'] as string | undefined;
      let transport = sessionId ? streamableSessions.get(sessionId) : null;

      if (!transport) {
        const newSessionId = randomUUID();
        authenticatedSessions.add(newSessionId);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessionclosed: (id) => {
            streamableSessions.delete(id);
            authenticatedSessions.delete(id);
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

  // Rota de saúde e sondas (aberta para pings do Cloud Run, sem expor caminhos internos)
  app.get('/health', (_req, res) => {
    res.json({
      status: isReady ? 'healthy' : 'initializing',
      ready: isReady,
      auth_required: isAuthEnabled,
      name: 'anvisa-normas-mcp',
      description: 'Servidor MCP Oficial do acervo de normas da Anvisa',
      version: '1.0.0',
    });
  });

  // Rota raiz GET: se cliente solicitar event-stream, passa por auth; caso contrário, retorna status JSON
  app.get('/', (req, res, next) => {
    if (req.headers.accept?.includes('text/event-stream')) {
      return authMiddleware(req, res, () =>
        ensureReady(req, res, () => handleStreamableRequest(req, res))
      );
    }
    res.json({
      status: isReady ? 'healthy' : 'initializing',
      ready: isReady,
      auth_required: isAuthEnabled,
      name: 'anvisa-normas-mcp',
      description: 'Servidor MCP Oficial do acervo de normas da Anvisa',
      version: '1.0.0',
      endpoints: {
        streamableHttp: '/mcp',
        sse: '/sse',
        health: '/health',
      },
    });
  });

  // Endpoints Streamable HTTP protegidos por autenticação
  app.all('/mcp', authMiddleware, ensureReady, handleStreamableRequest);
  app.post('/', authMiddleware, ensureReady, handleStreamableRequest);
  app.post('/sse', authMiddleware, ensureReady, handleStreamableRequest);

  // Mapa de sessões ativas para SSE legado
  const sseTransports = new Map<string, SSEServerTransport>();

  // Endpoint SSE GET (Server-Sent Events) protegido por autenticação
  app.get('/sse', authMiddleware, ensureReady, async (req, res) => {
    console.error(`[anvisa-normas-mcp-web] Nova conexão SSE autorizada de ${req.ip}`);
    try {
      const transport = new SSEServerTransport('/messages', res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);
      authenticatedSessions.add(sessionId);

      transport.onclose = () => {
        console.error(`[anvisa-normas-mcp-web] Conexão SSE encerrada (sessão ${sessionId})`);
        sseTransports.delete(sessionId);
        authenticatedSessions.delete(sessionId);
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

  // Endpoint POST /messages protegido por autenticação (ou sessão já validada)
  app.post('/messages', authMiddleware, ensureReady, async (req, res) => {
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
