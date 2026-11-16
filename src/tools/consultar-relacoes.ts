import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const consultarRelacoesSchema = {
  id: z
    .string()
    .describe(
      'Identificador da norma para consulta de relacionamentos no grafo (ex: "ACM 1/2025", "RDC 1039/2026", "RDC 153/2017")'
    ),
  direcao: z
    .enum(['todas', 'saida', 'entrada'])
    .default('todas')
    .describe(
      'Direção das relações no grafo: "saida" (atos referenciados por esta norma), "entrada" (atos que referenciam esta norma) ou "todas"'
    ),
  tipo_relacao: z
    .enum(['todas', 'cita', 'baseada_em'])
    .default('todas')
    .describe(
      'Filtro por tipo de relação regulatória: "cita", "baseada_em" ou "todas"'
    ),
};

export function registerConsultarRelacoesTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'consultar_relacoes',
    'Navega no grafo de relações regulatórias da Anvisa, identificando fundamentos jurídicos (leis de base), normas citadas e normas que referenciam o ato.',
    consultarRelacoesSchema,
    async (args) => {
      try {
        const resultado = await dbProvider.consultarRelacoes(
          args.id,
          args.direcao,
          args.tipo_relacao
        );

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  norma: resultado.norma,
                  total_saida: resultado.relacoesSaida.length,
                  total_entrada: resultado.relacoesEntrada.length,
                  relacoes_saida: resultado.relacoesSaida,
                  relacoes_entrada: resultado.relacoesEntrada,
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Erro ao consultar relações da norma '${args.id}': ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
