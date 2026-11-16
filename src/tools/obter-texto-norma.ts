import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export const obterTextoNormaSchema = {
  id: z
    .string()
    .describe(
      'Identificador oficial da norma cujo texto integral deve ser recuperado (ex: "RDC 958/2024", "DCP 108/2025")'
    ),
  limite_caracteres: z
    .number()
    .int()
    .min(100)
    .max(500000)
    .optional()
    .describe(
      'Limite máximo de caracteres a retornar para proteger a janela de contexto de modelos menores (opcional)'
    ),
};

export function registerObterTextoNormaTool(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  server.tool(
    'obter_texto_norma',
    'Recupera o texto integral da norma da Anvisa em formato Markdown original, permitindo leitura completa de artigos, parágrafos, incisos e anexos.',
    obterTextoNormaSchema,
    async (args) => {
      try {
        const texto = await dbProvider.obterTextoNorma(
          args.id,
          args.limite_caracteres
        );

        if (!texto) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    encontrado: false,
                    mensagem: `Texto integral da norma '${args.id}' não foi localizado no acervo consolidado.`,
                    sugestao:
                      'A norma pode ser externa (como Leis Federais) ou ato histórico anterior ao período de consolidação completa. Use verificar_vigencia ou consultar_relacoes para verificar referências no grafo.',
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
              text: texto,
            },
          ],
        };
      } catch (error: any) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Erro ao obter texto da norma '${args.id}': ${error?.message || String(error)}`,
            },
          ],
        };
      }
    }
  );
}
