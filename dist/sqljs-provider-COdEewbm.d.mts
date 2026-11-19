import { D as DatabaseProvider, F as FiltrosBusca, N as NormaRegistro, V as VigenciaInfo, R as RelacoesInfo, E as EstatisticasAcervo, a as EstatisticasPorTipo } from './provider-DrlZbXwb.mjs';

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

export { SqlJsDatabaseProvider as S, normalizeId as n, unaccent as u };
