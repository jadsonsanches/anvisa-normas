const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

async function loadSseModule() {
  const distSseUrl = pathToFileURL(path.resolve(__dirname, '../dist/bin/sse.js')).href;
  const distIndexUrl = pathToFileURL(path.resolve(__dirname, '../dist/index.js')).href;
  const sseMod = await import(distSseUrl);
  const indexMod = await import(distIndexUrl);
  return { sseMod, indexMod };
}

async function startTestServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const addr = server.address();
      resolve({
        server,
        baseUrl: `http://127.0.0.1:${addr.port}`,
      });
    });
    server.on('error', reject);
  });
}

async function stopTestServer(server, closeApp) {
  if (closeApp) {
    await closeApp(false);
  }
  await new Promise((resolve, reject) => {
    server.close((err) => (err ? reject(err) : resolve()));
  });
}

function assertSecurityHeaders(headers, label) {
  assert.equal(
    headers.get('x-content-type-options'),
    'nosniff',
    `${label}: deve incluir X-Content-Type-Options: nosniff`
  );
  assert.equal(
    headers.get('x-frame-options'),
    'DENY',
    `${label}: deve incluir X-Frame-Options: DENY`
  );
  assert.equal(
    headers.get('referrer-policy'),
    'strict-origin-when-cross-origin',
    `${label}: deve incluir Referrer-Policy: strict-origin-when-cross-origin`
  );
  assert.equal(
    headers.get('x-powered-by'),
    null,
    `${label}: não deve expor X-Powered-By`
  );
}

test('R2: Suíte de CORS e Headers de Segurança em src/bin/sse.ts', async (suite) => {
  let sseMod;
  let sharedDbProvider;

  suite.before(async () => {
    const loaded = await loadSseModule();
    sseMod = loaded.sseMod;
    sharedDbProvider = new loaded.indexMod.SqlJsDatabaseProvider();
    await sharedDbProvider.init();
  });

  suite.after(async () => {
    if (sharedDbProvider) {
      await sharedDbProvider.close();
    }
  });

  await suite.test('parseCorsAllowedOrigins trata undefined, *, vazio e listas com espaços/barra final', () => {
    const { parseCorsAllowedOrigins } = sseMod;

    const unsetCfg = parseCorsAllowedOrigins(undefined);
    assert.equal(unsetCfg.allowAll, true);
    assert.equal(unsetCfg.allowedOrigins.size, 0);

    const wildcardCfg = parseCorsAllowedOrigins('*');
    assert.equal(wildcardCfg.allowAll, true);

    const mixedWildcardCfg = parseCorsAllowedOrigins('https://a.com, *');
    assert.equal(mixedWildcardCfg.allowAll, true);

    const emptyCfg = parseCorsAllowedOrigins('');
    assert.equal(emptyCfg.allowAll, false);
    assert.equal(emptyCfg.allowedOrigins.size, 0);

    const spacesCfg = parseCorsAllowedOrigins('  ,   ');
    assert.equal(spacesCfg.allowAll, false);
    assert.equal(spacesCfg.allowedOrigins.size, 0);

    const listCfg = parseCorsAllowedOrigins(' https://app.anvisa.gov.br/ , http://localhost:3000 ');
    assert.equal(listCfg.allowAll, false);
    assert.deepEqual(
      Array.from(listCfg.allowedOrigins),
      ['https://app.anvisa.gov.br', 'http://localhost:3000']
    );
  });

  await suite.test('Com CORS_ALLOWED_ORIGINS não definida, aplica fallback Access-Control-Allow-Origin: * e headers de segurança', async () => {
    const appCtx = sseMod.createSseApp({
      corsAllowedOrigins: undefined,
      dbProvider: sharedDbProvider,
    });
    const { server, baseUrl } = await startTestServer(appCtx.app);

    try {
      const resGet = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://qualquer-origem.example' },
      });
      assert.equal(resGet.status, 200);
      assert.equal(resGet.headers.get('access-control-allow-origin'), '*');
      assertSecurityHeaders(resGet.headers, 'GET /health (fallback *)');

      const resOptions = await fetch(`${baseUrl}/mcp`, {
        method: 'OPTIONS',
        headers: {
          Origin: 'https://qualquer-origem.example',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type, Authorization',
        },
      });
      assert.equal(resOptions.status, 204);
      assert.equal(resOptions.headers.get('access-control-allow-origin'), '*');
      assert.ok(resOptions.headers.get('access-control-allow-methods'));
      assert.equal(resOptions.headers.get('access-control-allow-headers'), 'Content-Type, Authorization');
      assertSecurityHeaders(resOptions.headers, 'OPTIONS /mcp (fallback *)');
    } finally {
      await stopTestServer(server, appCtx.close);
    }
  });

  await suite.test('Com CORS_ALLOWED_ORIGINS definida, permite apenas origens autorizadas e bloqueia não autorizadas', async () => {
    const appCtx = sseMod.createSseApp({
      corsAllowedOrigins: 'https://permitida.gov.br, http://localhost:3000',
      apiKeys: ['chave-secreta-r2'],
      dbProvider: sharedDbProvider,
    });
    const { server, baseUrl } = await startTestServer(appCtx.app);

    try {
      // Origem permitida em GET
      const resAllowed = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://permitida.gov.br' },
      });
      assert.equal(resAllowed.status, 200);
      assert.equal(resAllowed.headers.get('access-control-allow-origin'), 'https://permitida.gov.br');
      assert.ok((resAllowed.headers.get('vary') || '').toLowerCase().includes('origin'));
      assertSecurityHeaders(resAllowed.headers, 'GET /health (origem permitida)');

      // Origem permitida em preflight OPTIONS (mesmo com auth ativa e sem API key)
      const resPreflightAllowed = await fetch(`${baseUrl}/mcp`, {
        method: 'OPTIONS',
        headers: { Origin: 'http://localhost:3000' },
      });
      assert.equal(resPreflightAllowed.status, 204);
      assert.equal(resPreflightAllowed.headers.get('access-control-allow-origin'), 'http://localhost:3000');
      assert.ok(resPreflightAllowed.headers.get('access-control-allow-methods'));
      assert.ok(resPreflightAllowed.headers.get('access-control-allow-headers'));
      assert.ok((resPreflightAllowed.headers.get('vary') || '').toLowerCase().includes('origin'));
      assertSecurityHeaders(resPreflightAllowed.headers, 'OPTIONS /mcp (origem permitida)');

      // Origem NÃO autorizada em GET
      const resDenied = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://nao-autorizada.evil' },
      });
      assert.equal(resDenied.status, 200);
      assert.equal(resDenied.headers.get('access-control-allow-origin'), null);
      assert.ok((resDenied.headers.get('vary') || '').toLowerCase().includes('origin'));
      assertSecurityHeaders(resDenied.headers, 'GET /health (origem negada)');

      // Origem NÃO autorizada em preflight OPTIONS
      const resPreflightDenied = await fetch(`${baseUrl}/mcp`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://nao-autorizada.evil' },
      });
      assert.equal(resPreflightDenied.status, 403);
      assert.equal(resPreflightDenied.headers.get('access-control-allow-origin'), null);
      assert.equal(resPreflightDenied.headers.get('access-control-allow-methods'), null);
      assert.equal(resPreflightDenied.headers.get('access-control-allow-headers'), null);
      assert.ok((resPreflightDenied.headers.get('vary') || '').toLowerCase().includes('origin'));
      assertSecurityHeaders(resPreflightDenied.headers, 'OPTIONS /mcp (origem negada)');

      // Requisição sem header Origin (cliente não-browser)
      const resNoOrigin = await fetch(`${baseUrl}/health`);
      assert.equal(resNoOrigin.status, 200);
      assert.equal(resNoOrigin.headers.get('access-control-allow-origin'), null);
      assert.ok((resNoOrigin.headers.get('vary') || '').toLowerCase().includes('origin'));
      assertSecurityHeaders(resNoOrigin.headers, 'GET /health (sem Origin)');
    } finally {
      await stopTestServer(server, appCtx.close);
    }
  });

  await suite.test('Com CORS_ALLOWED_ORIGINS="" (vazia), opera em fail-closed sem liberar origens', async () => {
    const appCtx = sseMod.createSseApp({
      corsAllowedOrigins: '',
      dbProvider: sharedDbProvider,
    });
    const { server, baseUrl } = await startTestServer(appCtx.app);

    try {
      const resGet = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://permitida.gov.br' },
      });
      assert.equal(resGet.status, 200);
      assert.equal(resGet.headers.get('access-control-allow-origin'), null);
      assertSecurityHeaders(resGet.headers, 'GET /health (fail-closed)');

      const resOptions = await fetch(`${baseUrl}/mcp`, {
        method: 'OPTIONS',
        headers: { Origin: 'https://permitida.gov.br' },
      });
      assert.equal(resOptions.status, 403);
      assert.equal(resOptions.headers.get('access-control-allow-origin'), null);
      assertSecurityHeaders(resOptions.headers, 'OPTIONS /mcp (fail-closed)');
    } finally {
      await stopTestServer(server, appCtx.close);
    }
  });

  await suite.test('Headers de segurança presentes em JSON, HTML, SVG, 401, 400, 404, GET /sse e POST /mcp', async () => {
    const appCtx = sseMod.createSseApp({
      corsAllowedOrigins: 'https://cliente.anvisa.gov.br',
      apiKeys: ['token-teste'],
      dbProvider: sharedDbProvider,
    });
    await appCtx.initPromise;
    const { server, baseUrl } = await startTestServer(appCtx.app);

    try {
      // HTML (GET /)
      const resHtml = await fetch(`${baseUrl}/`, {
        headers: { Accept: 'text/html', Origin: 'https://cliente.anvisa.gov.br' },
      });
      assert.equal(resHtml.status, 200);
      assert.ok((resHtml.headers.get('content-type') || '').includes('text/html'));
      assert.equal(resHtml.headers.get('access-control-allow-origin'), 'https://cliente.anvisa.gov.br');
      assertSecurityHeaders(resHtml.headers, 'GET / (HTML)');

      // SVG (GET /favicon.svg)
      const resSvg = await fetch(`${baseUrl}/favicon.svg`);
      assert.equal(resSvg.status, 200);
      assert.ok((resSvg.headers.get('content-type') || '').includes('image/svg+xml'));
      assertSecurityHeaders(resSvg.headers, 'GET /favicon.svg (SVG)');

      // 404
      const res404 = await fetch(`${baseUrl}/rota-inexistente`);
      assert.equal(res404.status, 404);
      assertSecurityHeaders(res404.headers, 'GET /rota-inexistente (404)');

      // 401
      const res401 = await fetch(`${baseUrl}/sse`);
      assert.equal(res401.status, 401);
      assertSecurityHeaders(res401.headers, 'GET /sse sem chave (401)');

      // 400 (POST /messages sem sessionId)
      const res400 = await fetch(`${baseUrl}/messages`, {
        method: 'POST',
        headers: { 'x-api-key': 'token-teste', 'Content-Type': 'application/json' },
        body: '{}',
      });
      assert.equal(res400.status, 400);
      assertSecurityHeaders(res400.headers, 'POST /messages sem sessionId (400)');

      // GET /sse autorizado (stream text/event-stream)
      const ac = new AbortController();
      const resSse = await fetch(`${baseUrl}/sse`, {
        headers: {
          Authorization: 'Bearer token-teste',
          Origin: 'https://cliente.anvisa.gov.br',
        },
        signal: ac.signal,
      });
      assert.equal(resSse.status, 200);
      assert.ok((resSse.headers.get('content-type') || '').includes('text/event-stream'));
      assert.equal(resSse.headers.get('access-control-allow-origin'), 'https://cliente.anvisa.gov.br');
      assertSecurityHeaders(resSse.headers, 'GET /sse (stream)');
      ac.abort();

      // POST /mcp (StreamableHTTPServerTransport)
      const resMcp = await fetch(`${baseUrl}/mcp`, {
        method: 'POST',
        headers: {
          'x-api-key': 'token-teste',
          Origin: 'https://cliente.anvisa.gov.br',
          'Content-Type': 'application/json',
          Accept: 'application/json, text/event-stream',
        },
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2024-11-05',
            capabilities: {},
            clientInfo: { name: 'test-client', version: '1.0.0' },
          },
        }),
      });
      assert.equal(resMcp.status, 200);
      assert.equal(resMcp.headers.get('access-control-allow-origin'), 'https://cliente.anvisa.gov.br');
      assertSecurityHeaders(resMcp.headers, 'POST /mcp (StreamableHTTP)');
      await resMcp.body?.cancel();
    } finally {
      await stopTestServer(server, appCtx.close);
    }
  });

  await suite.test('createSseApp lê process.env.CORS_ALLOWED_ORIGINS em tempo de execução quando options.corsAllowedOrigins não é passado', async () => {
    const prevCors = process.env.CORS_ALLOWED_ORIGINS;
    process.env.CORS_ALLOWED_ORIGINS = 'https://env-runtime.gov.br';

    const appCtx = sseMod.createSseApp({ dbProvider: sharedDbProvider });
    const { server, baseUrl } = await startTestServer(appCtx.app);

    try {
      const resOk = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://env-runtime.gov.br' },
      });
      assert.equal(resOk.headers.get('access-control-allow-origin'), 'https://env-runtime.gov.br');

      const resBlocked = await fetch(`${baseUrl}/health`, {
        headers: { Origin: 'https://outra.example' },
      });
      assert.equal(resBlocked.headers.get('access-control-allow-origin'), null);
    } finally {
      await stopTestServer(server, appCtx.close);
      if (prevCors === undefined) {
        delete process.env.CORS_ALLOWED_ORIGINS;
      } else {
        process.env.CORS_ALLOWED_ORIGINS = prevCors;
      }
    }
  });
});
