import { D as DatabaseProvider } from './provider-DrlZbXwb.mjs';
export { E as EstatisticasAcervo, a as EstatisticasPorTipo, F as FiltrosBusca, N as NormaRegistro, b as RelacaoItemEntrada, c as RelacaoItemSaida, d as RelacaoRegistro, R as RelacoesInfo, V as VigenciaInfo } from './provider-DrlZbXwb.mjs';
export { resolveDataDir, resolveDbPath, resolveEstatisticasPath, resolveGrafoPath, resolveNormasDir } from './config.mjs';
export { S as SqlJsDatabaseProvider, n as normalizeId, u as unaccent } from './sqljs-provider-COdEewbm.mjs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
export { createAnvisaMcpServer } from './server.mjs';
import { z } from 'zod';

declare const buscarNormasSchema: {
    termo: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodString>;
    ano: z.ZodOptional<z.ZodNumber>;
    situacao: z.ZodOptional<z.ZodEnum<{
        vigente: "vigente";
        revogada: "revogada";
    }>>;
    data: z.ZodOptional<z.ZodString>;
    ordenar_por: z.ZodDefault<z.ZodOptional<z.ZodEnum<{
        id: "id";
        recentes: "recentes";
    }>>>;
    limite: z.ZodDefault<z.ZodNumber>;
};
declare function registerBuscarNormasTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare const obterNormaSchema: {
    id: z.ZodString;
};
declare function registerObterNormaTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare const verificarVigenciaSchema: {
    id: z.ZodString;
};
declare function registerVerificarVigenciaTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare const consultarRelacoesSchema: {
    id: z.ZodString;
    direcao: z.ZodDefault<z.ZodEnum<{
        todas: "todas";
        saida: "saida";
        entrada: "entrada";
    }>>;
    tipo_relacao: z.ZodDefault<z.ZodEnum<{
        todas: "todas";
        cita: "cita";
        baseada_em: "baseada_em";
    }>>;
};
declare function registerConsultarRelacoesTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare const obterEstatisticasSchema: {
    tipo: z.ZodOptional<z.ZodString>;
};
declare function registerObterEstatisticasTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare const obterTextoNormaSchema: {
    id: z.ZodString;
    limite_caracteres: z.ZodOptional<z.ZodNumber>;
};
declare function registerObterTextoNormaTool(server: McpServer, dbProvider: DatabaseProvider): void;

declare function registerTools(server: McpServer, dbProvider: DatabaseProvider): void;

declare function registerResources(server: McpServer, dbProvider: DatabaseProvider): void;

declare function registerPrompts(server: McpServer): void;

export { DatabaseProvider, buscarNormasSchema, consultarRelacoesSchema, obterEstatisticasSchema, obterNormaSchema, obterTextoNormaSchema, registerBuscarNormasTool, registerConsultarRelacoesTool, registerObterEstatisticasTool, registerObterNormaTool, registerObterTextoNormaTool, registerPrompts, registerResources, registerTools, registerVerificarVigenciaTool, verificarVigenciaSchema };
