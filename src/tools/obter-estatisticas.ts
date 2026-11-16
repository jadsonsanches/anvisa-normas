import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const obterEstatisticasSchema = {
  tipo: z
    .string()
    .optional()
    .describe(
      'Sigla de um tipo de ato regulatório para recorte estatístico específico (ex: "RDC", "IN", "PORTARIA", "RE")'
    ),
};

export function registerObterEstatisticasTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'obter_estatisticas',
    'Retorna dados estatísticos consolidados do acervo regulatório da Anvisa: total geral de normas, contagem de vigentes vs revogadas, total de arestas no grafo e distribuição por tipo de ato.',
    obterEstatisticasSchema,
    async (args) => {
      try {
        const stats = await dbProvider.obterEstatisticas(args.tipo);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(stats, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Erro ao obter estatísticas: ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
