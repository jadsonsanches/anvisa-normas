import { D as DatabaseProvider, F as FiltrosBusca, N as NormaRegistro, V as VigenciaInfo, R as RelacoesInfo, E as EstatisticasAcervo, a as EstatisticasPorTipo } from './server-BqlvLZOi.mjs';
export { b as RelacaoItemEntrada, c as RelacaoItemSaida, d as RelacaoRegistro, e as createAnvisaMcpServer } from './server-BqlvLZOi.mjs';
export { resolveDataDir, resolveDbPath, resolveEstatisticasPath, resolveGrafoPath, resolveNormasDir } from './config.mjs';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

/**
 * Remove acentuação e converte para minúsculas (para busca tolerante a acentos em português)
 */
declare function unaccent(str: string): string;
/**
 * Normaliza referências informais para o padrão canônico (ex: 'rdc nº 658/2022' -> 'RDC 658/2022')
 */
declare function normalizeId(id: string): string;
declare class SqlJsDatabaseProvider implements DatabaseProvider {
    private db;
    private dbPath;
    private isInitialized;
    constructor(customDbPath?: string);
    init(): Promise<void>;
    private checkDb;
    close(): Promise<void>;
    buscarNormas(filtros: FiltrosBusca): Promise<Omit<NormaRegistro, 'texto_markdown'>[]>;
    obterNorma(id: string): Promise<Omit<NormaRegistro, 'texto_markdown'> | null>;
    obterTextoNorma(id: string, limiteCaracteres?: number): Promise<string | null>;
    verificarVigencia(id: string): Promise<VigenciaInfo>;
    consultarRelacoes(id: string, direcao?: 'todas' | 'saida' | 'entrada', tipoRelacao?: string): Promise<RelacoesInfo>;
    obterEstatisticas(tipo?: string): Promise<EstatisticasAcervo | EstatisticasPorTipo>;
}

declare const buscarNormasSchema: {
    termo: z.ZodOptional<z.ZodString>;
    query: z.ZodOptional<z.ZodString>;
    tipo: z.ZodOptional<z.ZodString>;
    ano: z.ZodOptional<z.ZodNumber>;
    situacao: z.ZodOptional<z.ZodEnum<{
        vigente: "vigente";
        revogada: "revogada";
    }>>;
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

export { DatabaseProvider, EstatisticasAcervo, EstatisticasPorTipo, FiltrosBusca, NormaRegistro, RelacoesInfo, SqlJsDatabaseProvider, VigenciaInfo, buscarNormasSchema, consultarRelacoesSchema, normalizeId, obterEstatisticasSchema, obterNormaSchema, obterTextoNormaSchema, registerBuscarNormasTool, registerConsultarRelacoesTool, registerObterEstatisticasTool, registerObterNormaTool, registerObterTextoNormaTool, registerPrompts, registerResources, registerTools, registerVerificarVigenciaTool, unaccent, verificarVigenciaSchema };
