import * as express_serve_static_core from 'express-serve-static-core';
import express from 'express';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import { S as SqlJsDatabaseProvider } from '../sqljs-provider-COdEewbm.mjs';
import '../provider-DrlZbXwb.mjs';

declare const SECURITY_HEADERS: {
    readonly 'X-Content-Type-Options': "nosniff";
    readonly 'X-Frame-Options': "DENY";
    readonly 'Referrer-Policy': "strict-origin-when-cross-origin";
};
interface CorsConfig {
    allowAll: boolean;
    allowedOrigins: Set<string>;
}
interface SseAppOptions {
    corsAllowedOrigins?: string;
    apiKeys?: string[];
    dbProvider?: SqlJsDatabaseProvider;
    dbPath?: string;
}
declare function parseCorsAllowedOrigins(rawValue: string | undefined): CorsConfig;
declare function createSecurityHeadersMiddleware(): express.RequestHandler;
declare function createCorsMiddleware(config: CorsConfig): express.RequestHandler;
declare function createSseApp(options?: SseAppOptions): {
    app: express_serve_static_core.Express;
    dbProvider: SqlJsDatabaseProvider;
    initPromise: Promise<void>;
    isAuthEnabled: boolean;
    configuredKeys: string[];
    corsConfig: CorsConfig;
    sseTransports: Map<string, SSEServerTransport>;
    streamableSessions: Map<string, StreamableHTTPServerTransport>;
    close: (closeDb?: boolean) => Promise<void>;
};

export { type CorsConfig, SECURITY_HEADERS, type SseAppOptions, createCorsMiddleware, createSecurityHeadersMiddleware, createSseApp, parseCorsAllowedOrigins };
