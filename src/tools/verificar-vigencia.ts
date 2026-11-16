import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const verificarVigenciaSchema = {
  id: z
    .string()
    .describe(
      'Identificador da norma para verificação de vigência (ex: "DCP 108/2025", "RDC 658/2022", "RDC 153/2017")'
    ),
};

export function registerVerificarVigenciaTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'verificar_vigencia',
    'Verifica se uma norma regulatória da Anvisa está VIGENTE ou REVOGADA, identificando o ato revogador e o histórico de referências no grafo regulatório.',
    verificarVigenciaSchema,
    async (args) => {
      try {
        const resultado = await dbProvider.verificarVigencia(args.id);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(resultado, null, 2),
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Erro ao verificar vigência da norma '${args.id}': ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
