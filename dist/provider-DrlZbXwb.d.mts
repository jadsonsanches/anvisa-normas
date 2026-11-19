interface NormaRegistro {
    id: string;
    tipo: string;
    numero: string;
    ano: number;
    data_ato: string;
    data_promulgacao: string;
    data_publicacao_dou: string;
    situacao: 'vigente' | 'revogada';
    ementa: string;
    leis_base: string;
    relacionadas: string;
    texto_markdown?: string;
    arquivo: string;
    fonte: string;
}
interface RelacaoRegistro {
    id: number;
    origem: string;
    destino: string;
    tipo_relacao: string;
}
interface EstatisticasAcervo {
    totalNormas: number;
    vigentes: number;
    revogadas: number;
    totalRelacoes: number;
    porTipo: Record<string, number>;
}
interface EstatisticasPorTipo {
    tipo: string;
    total: number;
    vigentes: number;
    revogadas: number;
}
interface VigenciaInfo {
    id: string;
    situacao: 'vigente' | 'revogada' | 'desconhecida';
    detalhes?: string;
    atoRevogador?: string;
    historico?: string[];
}
interface RelacaoItemSaida {
    destino: string;
    tipo: string;
}
interface RelacaoItemEntrada {
    origem: string;
    tipo: string;
}
interface RelacoesInfo {
    norma: string;
    relacoesSaida: RelacaoItemSaida[];
    relacoesEntrada: RelacaoItemEntrada[];
}
interface FiltrosBusca {
    termo?: string;
    query?: string;
    tipo?: string;
    ano?: number;
    situacao?: 'vigente' | 'revogada';
    data?: string;
    ordenar_por?: 'recentes' | 'id';
    limite?: number;
}

interface DatabaseProvider {
    init(): Promise<void>;
    close(): Promise<void>;
    buscarNormas(filtros: FiltrosBusca): Promise<Omit<NormaRegistro, 'texto_markdown'>[]>;
    obterNorma(id: string): Promise<Omit<NormaRegistro, 'texto_markdown'> | null>;
    obterTextoNorma(id: string, limiteCaracteres?: number): Promise<string | null>;
    verificarVigencia(id: string): Promise<VigenciaInfo>;
    consultarRelacoes(id: string, direcao?: 'todas' | 'saida' | 'entrada', tipoRelacao?: string): Promise<RelacoesInfo>;
    obterEstatisticas(tipo?: string): Promise<EstatisticasAcervo | EstatisticasPorTipo>;
}

export type { DatabaseProvider as D, EstatisticasAcervo as E, FiltrosBusca as F, NormaRegistro as N, RelacoesInfo as R, VigenciaInfo as V, EstatisticasPorTipo as a, RelacaoItemEntrada as b, RelacaoItemSaida as c, RelacaoRegistro as d };
