import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const buscarNormasSchema = {
  termo: z
    .string()
    .optional()
    .describe(
      'Termo de busca textual para filtrar na ementa ou identificador (tolerante a acentos, ex: "sanitaria", "rotulagem", "medicamento")'
    ),
  query: z
    .string()
    .optional()
    .describe('Alias para o parâmetro termo de busca textual'),
  tipo: z
    .string()
    .optional()
    .describe(
      'Sigla do tipo de ato regulatório (ex: "RDC", "IN", "PORTARIA", "RE", "AFA", "NOM")'
    ),
  ano: z
    .number()
    .int()
    .optional()
    .describe('Ano da norma (ex: 2024, 2025, 2026)'),
  situacao: z
    .enum(['vigente', 'revogada'])
    .optional()
    .describe('Filtro por situação de vigência da norma'),
  limite: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(20)
    .describe('Quantidade máxima de resultados a retornar (padrão: 20, máx: 100)'),
};

export function registerBuscarNormasTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'buscar_normas',
    'Busca normas regulatórias da Anvisa por termo textual na ementa (insensível a acentuação), tipo de ato, ano ou situação de vigência. Retorna lista de metadados essenciais.',
    buscarNormasSchema,
    async (args) => {
      try {
        const termo = args.termo || args.query;
        const normas = await dbProvider.buscarNormas({
          termo,
          tipo: args.tipo,
          ano: args.ano,
          situacao: args.situacao,
          limite: args.limite,
        });

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  total_encontrado: normas.length,
                  filtros_aplicados: {
                    termo: termo || null,
                    tipo: args.tipo || null,
                    ano: args.ano || null,
                    situacao: args.situacao || null,
                    limite: args.limite,
                  },
                  normas,
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
              text: `Erro ao buscar normas: ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
