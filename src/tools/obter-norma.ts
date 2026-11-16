import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const obterNormaSchema = {
  id: z
    .string()
    .describe(
      'Identificador oficial da norma da Anvisa (ex: "RDC 658/2022", "IN 343/2025", "PORTARIA 344/1998")'
    ),
};

export function registerObterNormaTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'obter_norma',
    'Obtém metadados cadastrais completos de uma norma da Anvisa a partir de seu identificador (id). Não inclui o texto integral; para ler o texto use obter_texto_norma.',
    obterNormaSchema,
    async (args) => {
      try {
        const norma = await dbProvider.obterNorma(args.id);

        if (!norma) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    encontrada: false,
                    mensagem: `Norma com identificador '${args.id}' não foi encontrada no acervo cadastral consolidado da Anvisa.`,
                    sugestao:
                      'Tente utilizar a ferramenta buscar_normas para pesquisar por palavras-chave na ementa ou verificar_vigencia para consultar o grafo regulatório.',
                  },
                  null,
                  2
                ),
              },
            ],
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  encontrada: true,
                  norma,
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
              text: `Erro ao obter norma '${args.id}': ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
