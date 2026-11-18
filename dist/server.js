import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

// src/server.ts
var buscarNormasSchema = {
  termo: z.string().optional().describe(
    'Termo de busca textual para filtrar na ementa ou identificador (tolerante a acentos, ex: "sanitaria", "rotulagem", "medicamento")'
  ),
  query: z.string().optional().describe("Alias para o par\xE2metro termo de busca textual"),
  tipo: z.string().optional().describe(
    'Sigla do tipo de ato regulat\xF3rio (ex: "RDC", "IN", "PORTARIA", "RE", "AFA", "NOM")'
  ),
  ano: z.number().int().optional().describe("Ano da norma (ex: 2024, 2025, 2026)"),
  situacao: z.enum(["vigente", "revogada"]).optional().describe("Filtro por situa\xE7\xE3o de vig\xEAncia da norma"),
  data: z.string().optional().describe(
    'Filtro por data exata da norma ou publica\xE7\xE3o no DOU (aceita formato DD/MM/AAAA ou AAAA-MM-DD, ex: "16/11/2026" ou "2026-11-16")'
  ),
  ordenar_por: z.enum(["recentes", "id"]).optional().default("recentes").describe(
    'Crit\xE9rio de ordena\xE7\xE3o dos resultados: "recentes" (padr\xE3o, normas publicadas mais recentemente primeiro) ou "id"'
  ),
  limite: z.number().int().min(1).max(100).default(20).describe("Quantidade m\xE1xima de resultados a retornar (padr\xE3o: 20, m\xE1x: 100)")
};
function registerBuscarNormasTool(server, dbProvider) {
  server.tool(
    "buscar_normas",
    "Busca normas regulat\xF3rias da Anvisa por termo textual na ementa (insens\xEDvel a acentua\xE7\xE3o), tipo de ato, ano ou situa\xE7\xE3o de vig\xEAncia. Retorna lista de metadados essenciais.",
    buscarNormasSchema,
    async (args) => {
      try {
        const termo = args.termo || args.query;
        const normas = await dbProvider.buscarNormas({
          termo,
          tipo: args.tipo,
          ano: args.ano,
          situacao: args.situacao,
          data: args.data,
          ordenar_por: args.ordenar_por,
          limite: args.limite
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total_encontrado: normas.length,
                  filtros_aplicados: {
                    termo: termo || null,
                    tipo: args.tipo || null,
                    ano: args.ano || null,
                    situacao: args.situacao || null,
                    data: args.data || null,
                    ordenar_por: args.ordenar_por || "recentes",
                    limite: args.limite
                  },
                  normas
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao buscar normas: ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterNormaSchema = {
  id: z.string().describe(
    'Identificador oficial da norma da Anvisa (ex: "RDC 658/2022", "IN 343/2025", "PORTARIA 344/1998")'
  )
};
function registerObterNormaTool(server, dbProvider) {
  server.tool(
    "obter_norma",
    "Obt\xE9m metadados cadastrais completos de uma norma da Anvisa a partir de seu identificador (id). N\xE3o inclui o texto integral; para ler o texto use obter_texto_norma.",
    obterNormaSchema,
    async (args) => {
      try {
        const norma = await dbProvider.obterNorma(args.id);
        if (!norma) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    encontrada: false,
                    mensagem: `Norma com identificador '${args.id}' n\xE3o foi encontrada no acervo cadastral consolidado da Anvisa.`,
                    sugestao: "Tente utilizar a ferramenta buscar_normas para pesquisar por palavras-chave na ementa ou verificar_vigencia para consultar o grafo regulat\xF3rio."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  encontrada: true,
                  norma
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var verificarVigenciaSchema = {
  id: z.string().describe(
    'Identificador da norma para verifica\xE7\xE3o de vig\xEAncia (ex: "DCP 108/2025", "RDC 658/2022", "RDC 153/2017")'
  )
};
function registerVerificarVigenciaTool(server, dbProvider) {
  server.tool(
    "verificar_vigencia",
    "Verifica se uma norma regulat\xF3ria da Anvisa est\xE1 VIGENTE ou REVOGADA, identificando o ato revogador e o hist\xF3rico de refer\xEAncias no grafo regulat\xF3rio.",
    verificarVigenciaSchema,
    async (args) => {
      try {
        const resultado = await dbProvider.verificarVigencia(args.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(resultado, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao verificar vig\xEAncia da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var consultarRelacoesSchema = {
  id: z.string().describe(
    'Identificador da norma para consulta de relacionamentos no grafo (ex: "ACM 1/2025", "RDC 1039/2026", "RDC 153/2017")'
  ),
  direcao: z.enum(["todas", "saida", "entrada"]).default("todas").describe(
    'Dire\xE7\xE3o das rela\xE7\xF5es no grafo: "saida" (atos referenciados por esta norma), "entrada" (atos que referenciam esta norma) ou "todas"'
  ),
  tipo_relacao: z.enum(["todas", "cita", "baseada_em"]).default("todas").describe(
    'Filtro por tipo de rela\xE7\xE3o regulat\xF3ria: "cita", "baseada_em" ou "todas"'
  )
};
function registerConsultarRelacoesTool(server, dbProvider) {
  server.tool(
    "consultar_relacoes",
    "Navega no grafo de rela\xE7\xF5es regulat\xF3rias da Anvisa, identificando fundamentos jur\xEDdicos (leis de base), normas citadas e normas que referenciam o ato.",
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
              type: "text",
              text: JSON.stringify(
                {
                  norma: resultado.norma,
                  total_saida: resultado.relacoesSaida.length,
                  total_entrada: resultado.relacoesEntrada.length,
                  relacoes_saida: resultado.relacoesSaida,
                  relacoes_entrada: resultado.relacoesEntrada
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao consultar rela\xE7\xF5es da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterEstatisticasSchema = {
  tipo: z.string().optional().describe(
    'Sigla de um tipo de ato regulat\xF3rio para recorte estat\xEDstico espec\xEDfico (ex: "RDC", "IN", "PORTARIA", "RE")'
  )
};
function registerObterEstatisticasTool(server, dbProvider) {
  server.tool(
    "obter_estatisticas",
    "Retorna dados estat\xEDsticos consolidados do acervo regulat\xF3rio da Anvisa: total geral de normas, contagem de vigentes vs revogadas, total de arestas no grafo e distribui\xE7\xE3o por tipo de ato.",
    obterEstatisticasSchema,
    async (args) => {
      try {
        const stats = await dbProvider.obterEstatisticas(args.tipo);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter estat\xEDsticas: ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterTextoNormaSchema = {
  id: z.string().describe(
    'Identificador oficial da norma cujo texto integral deve ser recuperado (ex: "RDC 958/2024", "DCP 108/2025")'
  ),
  limite_caracteres: z.number().int().min(100).max(5e5).optional().describe(
    "Limite m\xE1ximo de caracteres a retornar para proteger a janela de contexto de modelos menores (opcional)"
  )
};
function registerObterTextoNormaTool(server, dbProvider) {
  server.tool(
    "obter_texto_norma",
    "Recupera o texto integral da norma da Anvisa em formato Markdown original, permitindo leitura completa de artigos, par\xE1grafos, incisos e anexos.",
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
                type: "text",
                text: JSON.stringify(
                  {
                    encontrado: false,
                    mensagem: `Texto integral da norma '${args.id}' n\xE3o foi localizado no acervo consolidado.`,
                    sugestao: "A norma pode ser externa (como Leis Federais) ou ato hist\xF3rico anterior ao per\xEDodo de consolida\xE7\xE3o completa. Use verificar_vigencia ou consultar_relacoes para verificar refer\xEAncias no grafo."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        return {
          content: [
            {
              type: "text",
              text: texto
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter texto da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}

// src/tools/index.ts
function registerTools(server, dbProvider) {
  registerBuscarNormasTool(server, dbProvider);
  registerObterNormaTool(server, dbProvider);
  registerVerificarVigenciaTool(server, dbProvider);
  registerConsultarRelacoesTool(server, dbProvider);
  registerObterEstatisticasTool(server, dbProvider);
  registerObterTextoNormaTool(server, dbProvider);
}
function registerResources(server, dbProvider) {
  server.resource(
    "norma-texto",
    new ResourceTemplate("normas://{+id}", { list: void 0 }),
    {
      description: "Recupera o texto integral em Markdown e metadados de uma norma da Anvisa pelo identificador URI.",
      mimeType: "text/markdown"
    },
    async (uri, { id }) => {
      const rawId = Array.isArray(id) ? id.join("/") : String(id || "");
      const decodedId = decodeURIComponent(rawId).replace(/_/g, " ");
      const texto = await dbProvider.obterTextoNorma(decodedId);
      const norma = await dbProvider.obterNorma(decodedId);
      if (!texto && !norma) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# Norma '${decodedId}' n\xE3o encontrada

A norma solicitada n\xE3o foi localizada no acervo consolidado da Anvisa.`
            }
          ]
        };
      }
      let conteudo = texto || "";
      if (!conteudo && norma) {
        conteudo = `# ${norma.id}

**Ementa:** ${norma.ementa}

**Situa\xE7\xE3o:** ${norma.situacao}
**Data do Ato:** ${norma.data_ato}`;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: conteudo
          }
        ]
      };
    }
  );
  server.resource(
    "estatisticas-acervo",
    "normas://estatisticas",
    {
      description: "Estat\xEDsticas agregadas globais do acervo regulat\xF3rio da Anvisa em formato JSON.",
      mimeType: "application/json"
    },
    async (uri) => {
      const stats = await dbProvider.obterEstatisticas();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2)
          }
        ]
      };
    }
  );
}
function registerPrompts(server) {
  server.prompt(
    "analise_conformidade_anvisa",
    "Roteiro estruturado para an\xE1lise de conformidade e auditoria de requisitos regulat\xF3rios perante normas da Anvisa.",
    {
      tema: z.string().describe(
        'Tema, setor ou produto a ser analisado (ex: "Boas Pr\xE1ticas de Fabrica\xE7\xE3o de Medicamentos", "Rotulagem Nutricional de Alimentos", "Software como Dispositivo M\xE9dico (SaMD)")'
      ),
      normas_especificas: z.string().optional().describe(
        'Identificadores de normas conhecidas para focar a auditoria (opcional, ex: "RDC 658/2022", "IN 343/2025")'
      )
    },
    ({ tema, normas_especificas }) => {
      let promptText = `Voc\xEA \xE9 um Auditor Regulat\xF3rio S\xEAnior e Especialista em Assuntos Regulat\xF3rios da Anvisa (Ag\xEAncia Nacional de Vigil\xE2ncia Sanit\xE1ria).

`;
      promptText += `Objetivo: Conduzir uma An\xE1lise de Conformidade Regulat\xF3ria Sanit\xE1ria completa sobre o seguinte tema:
`;
      promptText += `**Tema:** ${tema}
`;
      if (normas_especificas) {
        promptText += `**Normas Especificadas:** ${normas_especificas}
`;
      }
      promptText += `
Passo a passo mandat\xF3ria com as ferramentas dispon\xEDveis:
`;
      promptText += `1. Utilize a ferramenta 'buscar_normas' para identificar todas as RDCs, INs e Portarias relevantes sobre '${tema}', filtrando preferencialmente por normas vigentes.
`;
      promptText += `2. Para cada norma relevante identificada (ou especificada pelo usu\xE1rio), execute 'verificar_vigencia' para assegurar que n\xE3o foram revogadas ou alteradas recentemente.
`;
      promptText += `3. Execute 'consultar_relacoes' para mapear as Leis de base que d\xE3o suporte ao regulamento e normas complementares/subsidi\xE1rias.
`;
      promptText += `4. Acesse os artigos e anexos pertinentes atrav\xE9s de 'obter_texto_norma'.
`;
      promptText += `5. Elabore um Relat\xF3rio Executivo de Conformidade contendo:
`;
      promptText += `   - Sum\xE1rio do arcabou\xE7o legal vigente aplic\xE1vel;
`;
      promptText += `   - Checklist de Requisitos Obrigat\xF3rios;
`;
      promptText += `   - Riscos Sanit\xE1rios e penalidades previstas por n\xE3o-conformidade;
`;
      promptText += `   - Recomenda\xE7\xF5es pr\xE1ticas e cronograma de adequa\xE7\xE3o.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "verificar_revogacao",
    "Investiga\xE7\xE3o detalhada da linha sucess\xF3ria, vig\xEAncia e atos revogadores de uma norma da Anvisa.",
    {
      norma_id: z.string().describe(
        'Identificador da norma a ser investigada (ex: "DCP 108/2025", "RDC 301/2019", "PORTARIA 344/1998")'
      )
    },
    ({ norma_id }) => {
      let promptText = `Voc\xEA \xE9 um Consultor Jur\xEDdico especializado em Direito Sanit\xE1rio e Regula\xE7\xE3o da Anvisa.

`;
      promptText += `Objetivo: Investigar exaustivamente o status de vig\xEAncia, hist\xF3rico e eventual sucess\xE3o do seguinte ato normativo:
`;
      promptText += `**Norma:** ${norma_id}

`;
      promptText += `Procedimento obrigat\xF3rio utilizando as ferramentas do AnvisaNormas MCP:
`;
      promptText += `1. Execute 'verificar_vigencia' para '${norma_id}' para obter a situa\xE7\xE3o cadastral formal (vigente vs revogada) e identificar men\xE7\xF5es a ato revogador.
`;
      promptText += `2. Execute 'obter_norma' para examinar as datas de publica\xE7\xE3o no DOU, promulga\xE7\xE3o e ementa oficial.
`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='todas' para inspecionar todas as arestas do grafo regulat\xF3rio (normas que citam ou s\xE3o citadas por este ato).
`;
      promptText += `4. Caso a norma esteja revogada ou substitua ato anterior, recupere o texto integral do ato revogador com 'obter_texto_norma' para confirmar o alcance da revoga\xE7\xE3o (total ou parcial).
`;
      promptText += `5. Apresente um Parecer de Vig\xEAncia claro indicando: status atual, linha do tempo sucess\xF3ria e o dispositivo atualmente em vigor.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "analisar_impacto_regulatorio",
    "Mapeamento de efeito cascata e depend\xEAncias normativas atrav\xE9s da navega\xE7\xE3o no grafo de rela\xE7\xF5es.",
    {
      norma_id: z.string().describe(
        'Identificador da norma central para an\xE1lise de impacto (ex: "RDC 658/2022", "RDC 958/2024", "ACM 1/2025")'
      )
    },
    ({ norma_id }) => {
      let promptText = `Voc\xEA \xE9 um Analista de Pol\xEDticas P\xFAblicas e Impacto Regulat\xF3rio (AIR) da Anvisa.

`;
      promptText += `Objetivo: Mapear o Efeito Cascata e o Grafo de Depend\xEAncias Normativas gerado a partir do seguinte ato regulat\xF3rio:
`;
      promptText += `**Norma de Refer\xEAncia:** ${norma_id}

`;
      promptText += `Roteiro anal\xEDtico:
`;
      promptText += `1. Execute 'obter_norma' para '${norma_id}' para compreender seu escopo e categoria.
`;
      promptText += `2. Execute 'consultar_relacoes' com direcao='saida' para verificar quais leis federais e normas estruturantes fundamentam este ato (baseada_em / cita).
`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='entrada' para verificar quais normas, instru\xE7\xF5es normativas ou decis\xF5es posteriores foram criadas com base nela.
`;
      promptText += `4. Para os n\xF3s mais cr\xEDticos conectados no grafo, consulte 'verificar_vigencia'.
`;
      promptText += `5. Conclua com uma Matriz de Impacto Regulat\xF3rio, destacando o grau de acoplamento do setor com esta norma e o risco sist\xEAmico de eventuais altera\xE7\xF5es.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
}

// src/server.ts
function createAnvisaMcpServer(dbProvider) {
  const server = new McpServer(
    {
      name: "anvisa-normas-mcp",
      title: "\u{1F33F} AnvisaNormas MCP",
      version: "1.0.0",
      description: "Servidor MCP Oficial do acervo de normas regulat\xF3rias da Anvisa",
      icon: "\u{1F33F}",
      iconUrl: "https://jadsonsanches.github.io/anvisa-normas/favicon.svg"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {}
      }
    }
  );
  registerTools(server, dbProvider);
  registerResources(server, dbProvider);
  registerPrompts(server);
  return server;
}

export { createAnvisaMcpServer };
//# sourceMappingURL=server.js.map
//# sourceMappingURL=server.js.map