export interface NormaRegistro {
  id: string;
  tipo: string;
  numero: string;
  ano: number;
  data_ato: string;
  data_promulgacao: string;
  data_publicacao_dou: string;
  situacao: 'vigente' | 'revogada';
  ementa: string;
  leis_base: string; // JSON array string
  relacionadas: string; // JSON array string
  texto_markdown?: string;
  arquivo: string;
  fonte: string;
}

export interface RelacaoRegistro {
  id: number;
  origem: string;
  destino: string;
  tipo_relacao: string;
}

export interface EstatisticasAcervo {
  totalNormas: number;
  vigentes: number;
  revogadas: number;
  totalRelacoes: number;
  porTipo: Record<string, number>;
}

export interface EstatisticasPorTipo {
  tipo: string;
  total: number;
  vigentes: number;
  revogadas: number;
}

export interface VigenciaInfo {
  id: string;
  situacao: 'vigente' | 'revogada' | 'desconhecida';
  detalhes?: string;
  atoRevogador?: string;
  historico?: string[];
}

export interface RelacaoItemSaida {
  destino: string;
  tipo: string;
}

export interface RelacaoItemEntrada {
  origem: string;
  tipo: string;
}

export interface RelacoesInfo {
  norma: string;
  relacoesSaida: RelacaoItemSaida[];
  relacoesEntrada: RelacaoItemEntrada[];
}

export interface FiltrosBusca {
  termo?: string;
  query?: string;
  tipo?: string;
  ano?: number;
  situacao?: 'vigente' | 'revogada';
  data?: string;
  ordenar_por?: 'recentes' | 'id';
  limite?: number;
}
