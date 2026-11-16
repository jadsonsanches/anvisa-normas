import {
  NormaRegistro,
  RelacaoRegistro,
  EstatisticasAcervo,
  EstatisticasPorTipo,
  VigenciaInfo,
  RelacoesInfo,
  FiltrosBusca,
} from '../types/index.js';

export interface DatabaseProvider {
  init(): Promise<void>;
  close(): Promise<void>;
  buscarNormas(filtros: FiltrosBusca): Promise<Omit<NormaRegistro, 'texto_markdown'>[]>;
  obterNorma(id: string): Promise<Omit<NormaRegistro, 'texto_markdown'> | null>;
  obterTextoNorma(id: string, limiteCaracteres?: number): Promise<string | null>;
  verificarVigencia(id: string): Promise<VigenciaInfo>;
  consultarRelacoes(
    id: string,
    direcao?: 'todas' | 'saida' | 'entrada',
    tipoRelacao?: string
  ): Promise<RelacoesInfo>;
  obterEstatisticas(
    tipo?: string
  ): Promise<EstatisticasAcervo | EstatisticasPorTipo>;
}
