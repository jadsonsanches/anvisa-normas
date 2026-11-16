import { z } from 'zod';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

export function registerPrompts(server: McpServer): void {
  // 1. Prompt: analise_conformidade_anvisa
  server.prompt(
    'analise_conformidade_anvisa',
    'Roteiro estruturado para análise de conformidade e auditoria de requisitos regulatórios perante normas da Anvisa.',
    {
      tema: z
        .string()
        .describe(
          'Tema, setor ou produto a ser analisado (ex: "Boas Práticas de Fabricação de Medicamentos", "Rotulagem Nutricional de Alimentos", "Software como Dispositivo Médico (SaMD)")'
        ),
      normas_especificas: z
        .string()
        .optional()
        .describe(
          'Identificadores de normas conhecidas para focar a auditoria (opcional, ex: "RDC 658/2022", "IN 343/2025")'
        ),
    },
    ({ tema, normas_especificas }) => {
      let promptText = `Você é um Auditor Regulatório Sênior e Especialista em Assuntos Regulatórios da Anvisa (Agência Nacional de Vigilância Sanitária).\n\n`;
      promptText += `Objetivo: Conduzir uma Análise de Conformidade Regulatória Sanitária completa sobre o seguinte tema:\n`;
      promptText += `**Tema:** ${tema}\n`;
      if (normas_especificas) {
        promptText += `**Normas Especificadas:** ${normas_especificas}\n`;
      }
      promptText += `\nPasso a passo mandatória com as ferramentas disponíveis:\n`;
      promptText += `1. Utilize a ferramenta 'buscar_normas' para identificar todas as RDCs, INs e Portarias relevantes sobre '${tema}', filtrando preferencialmente por normas vigentes.\n`;
      promptText += `2. Para cada norma relevante identificada (ou especificada pelo usuário), execute 'verificar_vigencia' para assegurar que não foram revogadas ou alteradas recentemente.\n`;
      promptText += `3. Execute 'consultar_relacoes' para mapear as Leis de base que dão suporte ao regulamento e normas complementares/subsidiárias.\n`;
      promptText += `4. Acesse os artigos e anexos pertinentes através de 'obter_texto_norma'.\n`;
      promptText += `5. Elabore um Relatório Executivo de Conformidade contendo:\n`;
      promptText += `   - Sumário do arcabouço legal vigente aplicável;\n`;
      promptText += `   - Checklist de Requisitos Obrigatórios;\n`;
      promptText += `   - Riscos Sanitários e penalidades previstas por não-conformidade;\n`;
      promptText += `   - Recomendações práticas e cronograma de adequação.\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      };
    }
  );

  // 2. Prompt: verificar_revogacao
  server.prompt(
    'verificar_revogacao',
    'Investigação detalhada da linha sucessória, vigência e atos revogadores de uma norma da Anvisa.',
    {
      norma_id: z
        .string()
        .describe(
          'Identificador da norma a ser investigada (ex: "DCP 108/2025", "RDC 301/2019", "PORTARIA 344/1998")'
        ),
    },
    ({ norma_id }) => {
      let promptText = `Você é um Consultor Jurídico especializado em Direito Sanitário e Regulação da Anvisa.\n\n`;
      promptText += `Objetivo: Investigar exaustivamente o status de vigência, histórico e eventual sucessão do seguinte ato normativo:\n`;
      promptText += `**Norma:** ${norma_id}\n\n`;
      promptText += `Procedimento obrigatório utilizando as ferramentas do AnvisaNormas MCP:\n`;
      promptText += `1. Execute 'verificar_vigencia' para '${norma_id}' para obter a situação cadastral formal (vigente vs revogada) e identificar menções a ato revogador.\n`;
      promptText += `2. Execute 'obter_norma' para examinar as datas de publicação no DOU, promulgação e ementa oficial.\n`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='todas' para inspecionar todas as arestas do grafo regulatório (normas que citam ou são citadas por este ato).\n`;
      promptText += `4. Caso a norma esteja revogada ou substitua ato anterior, recupere o texto integral do ato revogador com 'obter_texto_norma' para confirmar o alcance da revogação (total ou parcial).\n`;
      promptText += `5. Apresente um Parecer de Vigência claro indicando: status atual, linha do tempo sucessória e o dispositivo atualmente em vigor.\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      };
    }
  );

  // 3. Prompt: analisar_impacto_regulatorio
  server.prompt(
    'analisar_impacto_regulatorio',
    'Mapeamento de efeito cascata e dependências normativas através da navegação no grafo de relações.',
    {
      norma_id: z
        .string()
        .describe(
          'Identificador da norma central para análise de impacto (ex: "RDC 658/2022", "RDC 958/2024", "ACM 1/2025")'
        ),
    },
    ({ norma_id }) => {
      let promptText = `Você é um Analista de Políticas Públicas e Impacto Regulatório (AIR) da Anvisa.\n\n`;
      promptText += `Objetivo: Mapear o Efeito Cascata e o Grafo de Dependências Normativas gerado a partir do seguinte ato regulatório:\n`;
      promptText += `**Norma de Referência:** ${norma_id}\n\n`;
      promptText += `Roteiro analítico:\n`;
      promptText += `1. Execute 'obter_norma' para '${norma_id}' para compreender seu escopo e categoria.\n`;
      promptText += `2. Execute 'consultar_relacoes' com direcao='saida' para verificar quais leis federais e normas estruturantes fundamentam este ato (baseada_em / cita).\n`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='entrada' para verificar quais normas, instruções normativas ou decisões posteriores foram criadas com base nela.\n`;
      promptText += `4. Para os nós mais críticos conectados no grafo, consulte 'verificar_vigencia'.\n`;
      promptText += `5. Conclua com uma Matriz de Impacto Regulatório, destacando o grau de acoplamento do setor com esta norma e o risco sistêmico de eventuais alterações.\n`;

      return {
        messages: [
          {
            role: 'user',
            content: {
              type: 'text',
              text: promptText,
            },
          },
        ],
      };
    }
  );
}
