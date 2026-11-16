import {
  McpServer,
  ResourceTemplate,
} from '@modelcontextprotocol/sdk/server/mcp.js';
import { DatabaseProvider } from '../db/provider.js';

export function registerResources(
  server: McpServer,
  dbProvider: DatabaseProvider
): void {
  // Recurso Dinâmico: normas://{+id} (operador + do RFC 6570 permite barras como em 'RDC 658/2022')
  server.resource(
    'norma-texto',
    new ResourceTemplate('normas://{+id}', { list: undefined }),
    {
      description:
        'Recupera o texto integral em Markdown e metadados de uma norma da Anvisa pelo identificador URI.',
      mimeType: 'text/markdown',
    },
    async (uri, { id }) => {
      const rawId = Array.isArray(id) ? id.join('/') : String(id || '');
      const decodedId = decodeURIComponent(rawId).replace(/_/g, ' ');

      const texto = await dbProvider.obterTextoNorma(decodedId);
      const norma = await dbProvider.obterNorma(decodedId);

      if (!texto && !norma) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: 'text/markdown',
              text: `# Norma '${decodedId}' não encontrada\n\nA norma solicitada não foi localizada no acervo consolidado da Anvisa.`,
            },
          ],
        };
      }

      let conteudo = texto || '';
      if (!conteudo && norma) {
        conteudo = `# ${norma.id}\n\n**Ementa:** ${norma.ementa}\n\n**Situação:** ${norma.situacao}\n**Data do Ato:** ${norma.data_ato}`;
      }

      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'text/markdown',
            text: conteudo,
          },
        ],
      };
    }
  );

  // Recurso Estático: normas://estatisticas
  server.resource(
    'estatisticas-acervo',
    'normas://estatisticas',
    {
      description:
        'Estatísticas agregadas globais do acervo regulatório da Anvisa em formato JSON.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const stats = await dbProvider.obterEstatisticas();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: 'application/json',
            text: JSON.stringify(stats, null, 2),
          },
        ],
      };
    }
  );
}
