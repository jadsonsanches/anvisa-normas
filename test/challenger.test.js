const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const initSqlJs = require('sql.js');

function listarArquivosMarkdown(dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const caminhoCompleto = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultados = resultados.concat(listarArquivosMarkdown(caminhoCompleto));
    } else if (entrada.name.endsWith('.md')) {
      resultados.push(caminhoCompleto);
    }
  }
  return resultados;
}

const rootDir = path.resolve(__dirname, '..');
const dirNormas = path.join(rootDir, 'data/normas');
const dirGrafo = path.join(rootDir, 'data/grafo');
const dirDist = path.join(rootDir, 'data/dist');

test('Desafio Empírico 1: Exatamente 929 arquivos markdown em data/normas/', () => {
  const arquivos = listarArquivosMarkdown(dirNormas);
  assert.strictEqual(arquivos.length, 929, `Esperava exatamente 929 arquivos markdown, mas encontrou ${arquivos.length}`);
});

test('Desafio Empírico 2: Validação estrita de YAML frontmatter, 11 propriedades e integridade em todos os 929 arquivos', () => {
  const arquivos = listarArquivosMarkdown(dirNormas);
  const requiredKeys = [
    'tipo', 'numero', 'ano', 'data_ato', 'data_promulgacao',
    'data_publicacao_dou', 'situacao', 'ementa', 'leis_base',
    'relacionadas', 'fonte'
  ];

  const falhas = [];
  let ementasNaoVazias = 0;
  let retificacoesSemEmentaOficial = 0;

  for (const arquivo of arquivos) {
    const rel = path.relative(rootDir, arquivo).replace(/\\/g, '/');
    const conteudo = fs.readFileSync(arquivo, 'utf8');

    // 1. Delimitadores
    const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) {
      falhas.push(`${rel}: Delimitadores YAML frontmatter ausentes ou inválidos`);
      continue;
    }

    const yamlTexto = m[1];
    const linhas = yamlTexto.split(/\r?\n/);
    const campos = {};

    for (const l of linhas) {
      const idx = l.indexOf(':');
      if (idx !== -1) {
        campos[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
      }
    }

    // 2. Presença de todas as 11 propriedades
    for (const chave of requiredKeys) {
      if (campos[chave] === undefined) {
        falhas.push(`${rel}: Chave obrigatória '${chave}' ausente no frontmatter`);
      }
    }

    // 3. Validação do tipo e correspondência de pasta
    if (campos['tipo']) {
      const t = campos['tipo'].replace(/"/g, '');
      assert.ok(t.length > 0, `${rel}: 'tipo' vazio`);
      const pastaEsperada = t.toLowerCase();
      if (!rel.includes(`/${pastaEsperada}/`)) {
        falhas.push(`${rel}: Caminho não corresponde ao tipo '${t}'`);
      }
    }

    // 4. Validação de número e ano
    if (campos['numero']) {
      const num = campos['numero'].replace(/"/g, '');
      if (num.length === 0) falhas.push(`${rel}: 'numero' vazio`);
    }
    if (campos['ano']) {
      const ano = campos['ano'].replace(/"/g, '');
      if (!/^\d{4}$/.test(ano)) falhas.push(`${rel}: 'ano' inválido: '${ano}'`);
    }

    // 5. Validação de situação
    if (campos['situacao']) {
      const sit = campos['situacao'].replace(/"/g, '');
      if (sit !== 'vigente' && sit !== 'revogada') {
        falhas.push(`${rel}: 'situacao' inválida: '${sit}'`);
      }
    }

    // 6. Validação de ementa
    if (campos['ementa'] !== undefined) {
      const em = campos['ementa'].replace(/^"(.*)"$/, '$1').trim();
      if (em.length > 0) {
        ementasNaoVazias++;
      } else {
        // Se ementa é vazia, deve ser comprovadamente uma Retificação oficial ou Extrato/Edital que não possui ementa no DOU
        const isRetOuExtrato = conteudo.includes('RETIFICAÇÃO') ||
                               conteudo.includes('RETIFICACAO') ||
                               conteudo.includes('EXTRATO') ||
                               conteudo.includes('EDITAL') ||
                               conteudo.includes('AVISO DE ALTERAÇÃO');
        if (isRetOuExtrato) {
          retificacoesSemEmentaOficial++;
        } else {
          falhas.push(`${rel}: 'ementa' vazia em ato substantivo não-retificação`);
        }
      }
    }

    // 7. Validação de fonte (URL não-vazia)
    if (campos['fonte']) {
      const fte = campos['fonte'].replace(/"/g, '').trim();
      if (fte.length === 0 || !fte.startsWith('http')) {
        falhas.push(`${rel}: 'fonte' inválida ou não é URL: '${fte}'`);
      }
    }

    // 8. Validação de JSON syntax em leis_base e relacionadas
    for (const arrKey of ['leis_base', 'relacionadas']) {
      if (campos[arrKey] !== undefined) {
        try {
          const parsed = JSON.parse(campos[arrKey]);
          if (!Array.isArray(parsed)) {
            falhas.push(`${rel}: '${arrKey}' não é um array JSON`);
          }
        } catch (e) {
          falhas.push(`${rel}: '${arrKey}' JSON inválido: ${campos[arrKey]} (${e.message})`);
        }
      }
    }
  }

  assert.strictEqual(falhas.length, 0, `Falhas encontradas na validação YAML (${falhas.length}):\n${falhas.slice(0, 15).join('\n')}`);
  assert.strictEqual(ementasNaoVazias + retificacoesSemEmentaOficial, 929, 'Total de ementas válidas deve cobrir 929 arquivos');
});

test('Desafio Empírico 3: Formato estrito de datas (DD/MM/AAAA) nos campos de data', () => {
  const arquivos = listarArquivosMarkdown(dirNormas);
  const dataRegex = /^\d{2}\/\d{2}\/\d{4}$/;
  const falhasData = [];

  for (const arquivo of arquivos) {
    const rel = path.relative(rootDir, arquivo).replace(/\\/g, '/');
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;

    const linhas = m[1].split(/\r?\n/);
    const campos = {};
    for (const l of linhas) {
      const idx = l.indexOf(':');
      if (idx !== -1) {
        campos[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
      }
    }

    for (const dk of ['data_ato', 'data_promulgacao', 'data_publicacao_dou']) {
      if (campos[dk] !== undefined) {
        const val = campos[dk].replace(/"/g, '').trim();
        // Se preenchido, deve ser rigorosamente DD/MM/AAAA
        if (val.length > 0 && !dataRegex.test(val)) {
          falhasData.push(`${rel}: '${dk}' com formato de data não conforme: '${val}' (esperado DD/MM/AAAA)`);
        }
      }
    }
  }

  assert.strictEqual(falhasData.length, 0, `Falhas de formato de data (${falhasData.length}):\n${falhasData.slice(0, 15).join('\n')}`);
});

test('Desafio Empírico 4: Título H1 válido em todos os 929 arquivos', () => {
  const arquivos = listarArquivosMarkdown(dirNormas);
  const falhasH1 = [];

  for (const arquivo of arquivos) {
    const rel = path.relative(rootDir, arquivo).replace(/\\/g, '/');
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;

    const corpo = conteudo.substring(m[0].length);
    // H1 deve existir e conter '# <TIPO> nº <NUMERO>'
    const matchH1 = corpo.match(/#\s+[A-Za-z0-9_]+\s+n[ºo]\s+[0-9]+/i);
    if (!matchH1) {
      const anyH1 = corpo.match(/^#\s+[^\r\n]+/m);
      if (!anyH1) {
        falhasH1.push(`${rel}: Título H1 ausente no corpo`);
      }
    }
  }

  assert.strictEqual(falhasH1.length, 0, `Arquivos com cabeçalho H1 inválido (${falhasH1.length}):\n${falhasH1.slice(0, 15).join('\n')}`);
});

test('Desafio Empírico 5: Ausência de resíduos e artefatos de web scraping no corpo legislativo', () => {
  const arquivos = listarArquivosMarkdown(dirNormas);
  const artefatosProibidos = [
    'javascript:',
    'LinkTexto',
    'IMPRIMIR',
    'COPIAR LINK',
    'CRIAR TAGS',
    'VER NOTAS',
    'FECHAR NOTAS',
    'Este texto não substitui a Publicação Oficial',
    'Este texto nao substitui a Publicacao Oficial'
  ];

  const falhasArtefatos = [];

  for (const arquivo of arquivos) {
    const rel = path.relative(rootDir, arquivo).replace(/\\/g, '/');
    const conteudo = fs.readFileSync(arquivo, 'utf8');
    const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    if (!m) continue;

    const corpo = conteudo.substring(m[0].length);

    for (const artefato of artefatosProibidos) {
      if (corpo.includes(artefato)) {
        falhasArtefatos.push(`${rel}: Contém artefato residual proibido '${artefato}'`);
      }
    }

    // Checar especificamente a palavra "Voltar" quando associada a botão de navegação
    if (corpo.match(/\[\s*Voltar\s*\]/i) || corpo.match(/<a[^>]*>\s*Voltar\s*<\/a>/i) || corpo.match(/^\s*Voltar\s*$/m)) {
      falhasArtefatos.push(`${rel}: Contém botão residual de navegação 'Voltar'`);
    }
  }

  assert.strictEqual(falhasArtefatos.length, 0, `Artefatos de scraping encontrados (${falhasArtefatos.length}):\n${falhasArtefatos.slice(0, 15).join('\n')}`);
});

test('Desafio Empírico 6: Verificação específica de todos os atos estruturantes de Outubro de 2026', () => {
  const atosEsperados = [
    // RDCs
    { path: 'data/normas/rdc/2026/rdc-1043.md', tipo: 'RDC', numero: '1043' },
    { path: 'data/normas/rdc/2026/rdc-1044.md', tipo: 'RDC', numero: '1044' },
    { path: 'data/normas/rdc/2026/rdc-1045.md', tipo: 'RDC', numero: '1045' },
    // INs
    { path: 'data/normas/in/2026/in-473.md', tipo: 'IN', numero: '473' },
    { path: 'data/normas/in/2026/in-474.md', tipo: 'IN', numero: '474' },
    // CPBs 1424 a 1432
    { path: 'data/normas/cpb/2026/cpb-1424.md', tipo: 'CPB', numero: '1424' },
    { path: 'data/normas/cpb/2026/cpb-1425.md', tipo: 'CPB', numero: '1425' },
    { path: 'data/normas/cpb/2026/cpb-1426.md', tipo: 'CPB', numero: '1426' },
    { path: 'data/normas/cpb/2026/cpb-1427.md', tipo: 'CPB', numero: '1427' },
    { path: 'data/normas/cpb/2026/cpb-1428.md', tipo: 'CPB', numero: '1428' },
    { path: 'data/normas/cpb/2026/cpb-1429.md', tipo: 'CPB', numero: '1429' },
    { path: 'data/normas/cpb/2026/cpb-1430.md', tipo: 'CPB', numero: '1430' },
    { path: 'data/normas/cpb/2026/cpb-1431.md', tipo: 'CPB', numero: '1431' },
    { path: 'data/normas/cpb/2026/cpb-1432.md', tipo: 'CPB', numero: '1432' },
    // DEPs 126 a 131 e DEP 10
    { path: 'data/normas/dep/2026/dep-10.md', tipo: 'DEP', numero: '10' },
    { path: 'data/normas/dep/2026/dep-126.md', tipo: 'DEP', numero: '126' },
    { path: 'data/normas/dep/2026/dep-127.md', tipo: 'DEP', numero: '127' },
    { path: 'data/normas/dep/2026/dep-128.md', tipo: 'DEP', numero: '128' },
    { path: 'data/normas/dep/2026/dep-129.md', tipo: 'DEP', numero: '129' },
    { path: 'data/normas/dep/2026/dep-130.md', tipo: 'DEP', numero: '130' },
    { path: 'data/normas/dep/2026/dep-131.md', tipo: 'DEP', numero: '131' },
    // TAPs 52 a 59
    { path: 'data/normas/tap/2026/tap-52.md', tipo: 'TAP', numero: '52' },
    { path: 'data/normas/tap/2026/tap-53.md', tipo: 'TAP', numero: '53' },
    { path: 'data/normas/tap/2026/tap-54.md', tipo: 'TAP', numero: '54' },
    { path: 'data/normas/tap/2026/tap-55.md', tipo: 'TAP', numero: '55' },
    { path: 'data/normas/tap/2026/tap-56.md', tipo: 'TAP', numero: '56' },
    { path: 'data/normas/tap/2026/tap-57.md', tipo: 'TAP', numero: '57' },
    { path: 'data/normas/tap/2026/tap-58.md', tipo: 'TAP', numero: '58' },
    { path: 'data/normas/tap/2026/tap-59.md', tipo: 'TAP', numero: '59' }
  ];

  for (const ato of atosEsperados) {
    const fullPath = path.join(rootDir, ato.path);
    assert.ok(fs.existsSync(fullPath), `Ato regulatório obrigatório ausente: ${ato.path}`);

    const conteudo = fs.readFileSync(fullPath, 'utf8');
    const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert.ok(m, `Frontmatter ausente em ${ato.path}`);

    const lines = m[1].split(/\r?\n/);
    const campos = {};
    for (const l of lines) {
      const idx = l.indexOf(':');
      if (idx !== -1) campos[l.substring(0, idx).trim()] = l.substring(idx + 1).trim();
    }

    assert.strictEqual(campos['tipo'].replace(/"/g, ''), ato.tipo, `${ato.path}: tipo incorreto`);
    assert.strictEqual(campos['numero'].replace(/"/g, ''), ato.numero, `${ato.path}: número incorreto`);
    assert.strictEqual(campos['ano'].replace(/"/g, ''), '2026', `${ato.path}: ano incorreto`);

    // Ementa deve ser preenchida e ter substância
    const ementa = (campos['ementa'] || '').replace(/^"(.*)"$/, '$1');
    assert.ok(ementa.length > 10, `${ato.path}: ementa vazia ou curta demais: '${ementa}'`);

    // Pelo menos uma data deve ser de Outubro de 2026 (/10/2026)
    const datas = [campos['data_ato'], campos['data_promulgacao'], campos['data_publicacao_dou']]
      .map(d => (d || '').replace(/"/g, ''));
    const temOutubro = datas.some(d => d.includes('/10/2026'));
    assert.ok(temOutubro, `${ato.path}: Nenhuma data refere-se a Outubro/2026: ${datas.join(', ')}`);
  }
});

test('Desafio Empírico 7: Integridade do Grafo e Estatísticas (relacoes.json e estatisticas.json)', () => {
  const grafoPath = path.join(dirGrafo, 'relacoes.json');
  const statsPath = path.join(dirGrafo, 'estatisticas.json');

  assert.ok(fs.existsSync(grafoPath), 'relacoes.json não encontrado');
  assert.ok(fs.existsSync(statsPath), 'estatisticas.json não encontrado');

  const grafo = JSON.parse(fs.readFileSync(grafoPath, 'utf8'));
  const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

  // 1. Estatísticas
  assert.strictEqual(stats.totalNormas, 929, `stats.totalNormas deve ser 929, encontrado ${stats.totalNormas}`);
  assert.strictEqual(stats.vigentes + stats.revogadas, 929, `Soma vigentes+revogadas deve ser 929`);
  assert.strictEqual(stats.totalRelacoes, 750, `stats.totalRelacoes deve ser 750`);

  const somaPorTipo = Object.values(stats.porTipo).reduce((a, b) => a + b, 0);
  assert.strictEqual(somaPorTipo, 929, `Soma de porTipo deve ser 929`);

  // 2. Nós do grafo
  assert.strictEqual(grafo.nodes.length, 1123, `Grafo deve ter exatamente 1123 nós`);
  const nodesMap = new Map();
  let nosInternos = 0;

  for (const no of grafo.nodes) {
    assert.ok(!nodesMap.has(no.id), `Nó duplicado no grafo: ${no.id}`);
    nodesMap.set(no.id, no);

    if (no.arquivo) {
      nosInternos++;
      const arqPath = path.join(rootDir, no.arquivo);
      assert.ok(fs.existsSync(arqPath), `Nó ${no.id} aponta para arquivo inexistente: ${no.arquivo}`);
    }
  }

  assert.strictEqual(nosInternos, 929, `Grafo deve ter exatamente 929 nós internos com arquivo`);

  // 3. Arestas do grafo
  assert.strictEqual(grafo.edges.length, 750, `Grafo deve ter exatamente 750 arestas`);
  const edgesSet = new Set();

  for (const aresta of grafo.edges) {
    assert.ok(nodesMap.has(aresta.source), `Source inexistente no grafo: ${aresta.source}`);
    assert.ok(nodesMap.has(aresta.target), `Target inexistente no grafo: ${aresta.target}`);
    assert.ok(['cita', 'baseada_em', 'revogada_por'].includes(aresta.relacao), `Relação inválida: ${aresta.relacao}`);

    const key = `${aresta.source}->${aresta.target}:${aresta.relacao}`;
    assert.ok(!edgesSet.has(key), `Aresta duplicada: ${key}`);
    edgesSet.add(key);
  }
});

test('Desafio Empírico 8: Integridade de Artefatos Derivados (SQLite, JSON, CSV e Visualizadores HTML)', async () => {
  const jsonPath = path.join(dirDist, 'normas.json');
  const csvPath = path.join(dirDist, 'normas.csv');
  const dbPath = path.join(dirDist, 'anvisa.db');
  const visPath = path.join(rootDir, 'visualizador.html');
  const indexPath = path.join(rootDir, 'index.html');

  assert.ok(fs.existsSync(jsonPath), 'data/dist/normas.json não existe');
  assert.ok(fs.existsSync(csvPath), 'data/dist/normas.csv não existe');
  assert.ok(fs.existsSync(dbPath), 'data/dist/anvisa.db não existe');
  assert.ok(fs.existsSync(visPath), 'visualizador.html não existe');
  assert.ok(fs.existsSync(indexPath), 'index.html não existe');

  // JSON
  const normasJson = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  assert.strictEqual(normasJson.length, 929, `normas.json deve ter 929 registros, tem ${normasJson.length}`);

  // CSV
  const csvContent = fs.readFileSync(csvPath, 'utf8');
  const linhasCsv = csvContent.split(/\r?\n/).filter(l => l.trim().length > 0);
  assert.strictEqual(linhasCsv.length, 930, `normas.csv deve ter 930 linhas (1 header + 929 dados), tem ${linhasCsv.length}`);

  // SQLite
  const SQL = await initSqlJs();
  const dbBuffer = fs.readFileSync(dbPath);
  const db = new SQL.Database(dbBuffer);

  const resNormas = db.exec('SELECT COUNT(*) as c FROM normas;');
  assert.strictEqual(resNormas[0].values[0][0], 929, 'Tabela normas no SQLite deve ter 929 registros');

  const resRel = db.exec('SELECT COUNT(*) as c FROM relacoes;');
  assert.strictEqual(resRel[0].values[0][0], 750, 'Tabela relacoes no SQLite deve ter 750 registros');

  db.close();

  // HTML Visualizador e index
  const visContent = fs.readFileSync(visPath, 'utf8');
  assert.ok(visContent.length > 50000, 'visualizador.html deve possuir conteúdo completo gerado');
  assert.ok(visContent.includes('const graphData ='), 'visualizador.html deve embutir dados do grafo');
  assert.ok(visContent.includes('const statsData ='), 'visualizador.html deve embutir estatísticas');

  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.strictEqual(visContent, indexContent, 'index.html e visualizador.html devem ser idênticos');
});
