const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');

// Carrega os módulos do MCP e SDK oficial dinamicamente (ESM interoperável no Windows e Linux)
async function setupMcpTestEnvironment() {
  const { Client } = await import('@modelcontextprotocol/sdk/client/index.js');
  const { InMemoryTransport } = await import('@modelcontextprotocol/sdk/inMemory.js');
  const distUrl = pathToFileURL(path.resolve(__dirname, '../dist/index.js')).href;
  const { createAnvisaMcpServer, SqlJsDatabaseProvider } = await import(distUrl);

  const dbProvider = new SqlJsDatabaseProvider();
  await dbProvider.init();

  const server = createAnvisaMcpServer(dbProvider);
  const client = new Client({ name: 'test-mcp-client', version: '1.0.0' });

  const [clientTransport, serverTransport] = InMemoryTransport.createLinkedPair();

  await Promise.all([
    client.connect(clientTransport),
    server.connect(serverTransport),
  ]);

  return { client, server, dbProvider };
}

test('Suíte de Testes Automatizados do AnvisaNormas MCP Server', async (suite) => {
  let env;

  suite.before(async () => {
    env = await setupMcpTestEnvironment();
  });

  suite.after(async () => {
    if (env) {
      await env.client.close();
      await env.server.close();
      await env.dbProvider.close();
    }
  });

  await suite.test('Descoberta de Ferramentas: deve listar exatamente as 6 ferramentas obrigatórias', async () => {
    const { tools } = await env.client.listTools();
    const toolNames = tools.map((t) => t.name);

    assert.equal(tools.length, 6, 'Deve registrar exatamente 6 ferramentas no servidor');
    assert.ok(toolNames.includes('buscar_normas'), 'Deve conter buscar_normas');
    assert.ok(toolNames.includes('obter_norma'), 'Deve conter obter_norma');
    assert.ok(toolNames.includes('verificar_vigencia'), 'Deve conter verificar_vigencia');
    assert.ok(toolNames.includes('consultar_relacoes'), 'Deve conter consultar_relacoes');
    assert.ok(toolNames.includes('obter_estatisticas'), 'Deve conter obter_estatisticas');
    assert.ok(toolNames.includes('obter_texto_norma'), 'Deve conter obter_texto_norma');
  });

  await suite.test('Tool buscar_normas: busca textual com UDF unaccent (insensível a acentuação)', async () => {
    // Busca com acentuação
    const resComAcento = await env.client.callTool({
      name: 'buscar_normas',
      arguments: { termo: 'sanitária', limite: 5 },
    });
    assert.ok(!resComAcento.isError);
    const dataComAcento = JSON.parse(resComAcento.content[0].text);
    assert.ok(dataComAcento.total_encontrado > 0, 'Deve encontrar normas com "sanitária"');

    // Busca sem acentuação
    const resSemAcento = await env.client.callTool({
      name: 'buscar_normas',
      arguments: { termo: 'sanitaria', limite: 5 },
    });
    assert.ok(!resSemAcento.isError);
    const dataSemAcento = JSON.parse(resSemAcento.content[0].text);
    assert.ok(dataSemAcento.total_encontrado > 0, 'Deve encontrar normas com "sanitaria"');

    // As duas buscas devem recuperar os mesmos registros
    assert.equal(
      dataComAcento.normas[0].id,
      dataSemAcento.normas[0].id,
      'Busca com e sem acento deve retornar resultados idênticos via UDF unaccent'
    );
  });

  await suite.test('Tool buscar_normas: filtros por tipo, ano e situação', async () => {
    const res = await env.client.callTool({
      name: 'buscar_normas',
      arguments: { tipo: 'RDC', ano: 2024, situacao: 'vigente', limite: 10 },
    });
    assert.ok(!res.isError);
    const data = JSON.parse(res.content[0].text);
    assert.ok(data.total_encontrado > 0);

    for (const norma of data.normas) {
      assert.equal(norma.tipo, 'RDC');
      assert.equal(norma.ano, 2024);
      assert.equal(norma.situacao, 'vigente');
    }
  });

  await suite.test('Tool obter_norma: consulta por ID canônico e por variação normalizada', async () => {
    // ID canônico
    const resCanonico = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'DCP 108/2025' },
    });
    assert.ok(!resCanonico.isError);
    const dataCanonico = JSON.parse(resCanonico.content[0].text);
    assert.equal(dataCanonico.encontrada, true);
    assert.equal(dataCanonico.norma.id, 'DCP 108/2025');

    // Variação informal ("dcp nº 108/2025")
    const resVariacao = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'dcp nº 108/2025' },
    });
    assert.ok(!resVariacao.isError);
    const dataVariacao = JSON.parse(resVariacao.content[0].text);
    assert.equal(dataVariacao.encontrada, true);
    assert.equal(dataVariacao.norma.id, 'DCP 108/2025');

    // ID inexistente
    const resInexistente = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'XYZ 99999/2099' },
    });
    const dataInexistente = JSON.parse(resInexistente.content[0].text);
    assert.equal(dataInexistente.encontrada, false);
  });

  await suite.test('Tool verificar_vigencia: detecção de norma vigente e norma revogada com ato revogador', async () => {
    // Norma vigente
    const resVigente = await env.client.callTool({
      name: 'verificar_vigencia',
      arguments: { id: 'ACM 1/2025' },
    });
    const dataVigente = JSON.parse(resVigente.content[0].text);
    assert.equal(dataVigente.situacao, 'vigente');

    // Norma revogada com extração do ato revogador
    const resRevogada = await env.client.callTool({
      name: 'verificar_vigencia',
      arguments: { id: 'DCP 108/2025' },
    });
    const dataRevogada = JSON.parse(resRevogada.content[0].text);
    assert.equal(dataRevogada.situacao, 'revogada');
    assert.ok(dataRevogada.atoRevogador, 'Deve identificar o ato revogador');
    assert.ok(
      dataRevogada.atoRevogador.includes('229'),
      'Ato revogador da DCP 108/2025 deve ser a Portaria 229'
    );

    // Norma histórica no grafo (RDC 153/2017)
    const resGrafo = await env.client.callTool({
      name: 'verificar_vigencia',
      arguments: { id: 'RDC 153/2017' },
    });
    const dataGrafo = JSON.parse(resGrafo.content[0].text);
    assert.equal(dataGrafo.situacao, 'desconhecida');
    assert.ok(dataGrafo.historico && dataGrafo.historico.length >= 4);
  });

  await suite.test('Tool consultar_relacoes: navegação bidirecional no grafo regulatório', async () => {
    // Relações de saída da ACM 1/2025
    const resSaida = await env.client.callTool({
      name: 'consultar_relacoes',
      arguments: { id: 'ACM 1/2025', direcao: 'saida' },
    });
    const dataSaida = JSON.parse(resSaida.content[0].text);
    assert.equal(dataSaida.norma, 'ACM 1/2025');
    assert.ok(dataSaida.total_saida > 0, 'ACM 1/2025 deve ter relações de saída');

    // Relações de entrada para a RDC 153/2017
    const resEntrada = await env.client.callTool({
      name: 'consultar_relacoes',
      arguments: { id: 'RDC 153/2017', direcao: 'entrada' },
    });
    const dataEntrada = JSON.parse(resEntrada.content[0].text);
    assert.ok(dataEntrada.total_entrada >= 4, 'RDC 153/2017 deve ter pelo menos 4 citações de entrada');
  });

  await suite.test('Tool obter_estatisticas: dados quantitativos globais e por tipo de ato', async () => {
    const statsPath = path.resolve(__dirname, '../data/grafo/estatisticas.json');
    const expectedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    // Estatísticas globais
    const resGlobal = await env.client.callTool({
      name: 'obter_estatisticas',
      arguments: {},
    });
    const dataGlobal = JSON.parse(resGlobal.content[0].text);
    assert.equal(dataGlobal.totalNormas, expectedStats.totalNormas, 'Total de normas deve corresponder a estatisticas.json');
    assert.equal(dataGlobal.vigentes, expectedStats.vigentes, 'Total de vigentes deve corresponder a estatisticas.json');
    assert.equal(dataGlobal.revogadas, expectedStats.revogadas, 'Total de revogadas deve corresponder a estatisticas.json');
    assert.equal(dataGlobal.totalRelacoes, expectedStats.totalRelacoes, 'Total de relações deve corresponder a estatisticas.json');
    assert.ok(dataGlobal.porTipo.RE > 20000, 'Tipo RE deve ter mais de 20000 registros');

    // Estatísticas por tipo específico
    const resTipo = await env.client.callTool({
      name: 'obter_estatisticas',
      arguments: { tipo: 'RDC' },
    });
    const dataTipo = JSON.parse(resTipo.content[0].text);
    assert.equal(dataTipo.tipo, 'RDC');
    assert.equal(dataTipo.total, expectedStats.porTipo.RDC, 'Total de RDCs cadastradas no acervo deve corresponder a estatisticas.json');
  });

  await suite.test('Tool obter_texto_norma: recuperação do Markdown integral e limitação de caracteres', async () => {
    // Texto completo
    const resTexto = await env.client.callTool({
      name: 'obter_texto_norma',
      arguments: { id: 'ACM 1/2025' },
    });
    assert.ok(!resTexto.isError);
    const textoCompleto = resTexto.content[0].text;
    assert.ok(textoCompleto.length > 100);
    assert.ok(textoCompleto.includes('ACM'), 'Deve conter cabeçalho da norma');

    // Limitação de caracteres
    const resTruncado = await env.client.callTool({
      name: 'obter_texto_norma',
      arguments: { id: 'ACM 1/2025', limite_caracteres: 200 },
    });
    const textoTruncado = resTruncado.content[0].text;
    assert.ok(textoTruncado.includes('[Texto truncado no limite de 200 caracteres'));
  });

  await suite.test('Resources MCP: leitura de normas://{id} e normas://estatisticas', async () => {
    const statsPath = path.resolve(__dirname, '../data/grafo/estatisticas.json');
    const expectedStats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

    // Recurso estático
    const resStats = await env.client.readResource({ uri: 'normas://estatisticas' });
    assert.equal(resStats.contents[0].mimeType, 'application/json');
    const statsObj = JSON.parse(resStats.contents[0].text);
    assert.equal(statsObj.totalNormas, expectedStats.totalNormas);

    // Recurso dinâmico (template)
    const resNorma = await env.client.readResource({ uri: 'normas://ACM%201/2025' });
    assert.equal(resNorma.contents[0].mimeType, 'text/markdown');
    assert.ok(resNorma.contents[0].text.length > 50);
  });

  await suite.test('Prompts MCP: listagem e geração dos 3 templates regulatórios', async () => {
    const { prompts } = await env.client.listPrompts();
    const promptNames = prompts.map((p) => p.name);

    assert.equal(prompts.length, 3, 'Deve registrar 3 prompts especializados');
    assert.ok(promptNames.includes('analise_conformidade_anvisa'));
    assert.ok(promptNames.includes('verificar_revogacao'));
    assert.ok(promptNames.includes('analisar_impacto_regulatorio'));

    // Geração do prompt de conformidade
    const p1 = await env.client.getPrompt({
      name: 'analise_conformidade_anvisa',
      arguments: { tema: 'Boas Práticas de Fabricação', normas_especificas: 'RDC 658/2022' },
    });
    assert.ok(p1.messages[0].content.text.includes('Boas Práticas de Fabricação'));
    assert.ok(p1.messages[0].content.text.includes('RDC 658/2022'));

    // Geração do prompt de revogação
    const p2 = await env.client.getPrompt({
      name: 'verificar_revogacao',
      arguments: { norma_id: 'DCP 108/2025' },
    });
    assert.ok(p2.messages[0].content.text.includes('DCP 108/2025'));

    // Geração do prompt de impacto
    const p3 = await env.client.getPrompt({
      name: 'analisar_impacto_regulatorio',
      arguments: { norma_id: 'RDC 958/2024' },
    });
    assert.ok(p3.messages[0].content.text.includes('RDC 958/2024'));
  });

  await suite.test('Validação de Esquemas Zod: rejeição de argumentos inválidos sem falha do servidor', async () => {
    // Chamada com tipo inválido para parâmetro numérico 'ano'
    const resInvalido = await env.client.callTool({
      name: 'buscar_normas',
      arguments: { ano: 'ano_invalido_nao_numerico' },
    });
    assert.equal(resInvalido.isError, true, 'Deve retornar isError: true quando parâmetro for inválido');
    assert.ok(
      resInvalido.content[0].text.includes('Input validation error') ||
        resInvalido.content[0].text.includes('Invalid input'),
      'Mensagem deve indicar erro de validação de input'
    );
  });

  await suite.test('Consulta de normas de 2022 via MCP (buscar_normas, obter_norma, obter_texto_norma, consultar_relacoes)', async () => {
    const resBusca = await env.client.callTool({
      name: 'buscar_normas',
      arguments: { tipo: 'RDC', ano: 2022, limite: 10 },
    });
    assert.ok(!resBusca.isError);
    const dataBusca = JSON.parse(resBusca.content[0].text);
    assert.equal(dataBusca.total_encontrado, 10, 'Deve retornar 10 RDCs de 2022 respeitando limite=10');
    for (const norma of dataBusca.normas) {
      assert.equal(norma.tipo, 'RDC');
      assert.equal(norma.ano, 2022);
    }

    const resNorma = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'RDC 658/2022' },
    });
    assert.ok(!resNorma.isError);
    const dataNorma = JSON.parse(resNorma.content[0].text);
    assert.equal(dataNorma.encontrada, true);
    assert.equal(dataNorma.norma.id, 'RDC 658/2022');
    assert.ok(dataNorma.norma.ementa.includes('Boas Práticas'));

    const resTexto = await env.client.callTool({
      name: 'obter_texto_norma',
      arguments: { id: 'RDC 658/2022', limite_caracteres: 500 },
    });
    assert.ok(!resTexto.isError);
    assert.ok(resTexto.content[0].text.includes('RDC'));
    assert.ok(resTexto.content[0].text.includes('658'));

    const resRel = await env.client.callTool({
      name: 'consultar_relacoes',
      arguments: { id: 'RDC 658/2022', direcao: 'todas' },
    });
    assert.ok(!resRel.isError);
    const dataRel = JSON.parse(resRel.content[0].text);
    assert.ok(dataRel.total_saida > 0, 'RDC 658/2022 deve ter relações de saída');

    const resPortaria143 = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'PORTARIA 143/2022' },
    });
    assert.ok(!resPortaria143.isError);
    const dataPortaria143 = JSON.parse(resPortaria143.content[0].text);
    assert.equal(dataPortaria143.encontrada, true);
    assert.equal(dataPortaria143.norma.id, 'PORTARIA 143/2022');
    assert.equal(dataPortaria143.norma.data_ato, '03/03/2022');

    const resRe2446 = await env.client.callTool({
      name: 'obter_norma',
      arguments: { id: 'RE 2446/2022' },
    });
    assert.ok(!resRe2446.isError);
    const dataRe2446 = JSON.parse(resRe2446.content[0].text);
    assert.equal(dataRe2446.encontrada, true);
    assert.equal(dataRe2446.norma.id, 'RE 2446/2022');
    assert.ok(dataRe2446.norma.ementa.includes('REBLAS'));
  });
});
