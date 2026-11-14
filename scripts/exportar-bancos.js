const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

function extrairFrontmatterEMarkdown(conteudo) {
  const match = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n([\s\S]*))?$/);
  if (!match) return { meta: null, corpo: conteudo };

  const yamlStr = match[1];
  const corpo = (match[2] || '').trim();
  const dados = {};
  const linhas = yamlStr.split(/\r?\n/);

  for (const linha of linhas) {
    const idx = linha.indexOf(':');
    if (idx === -1) continue;

    const chave = linha.substring(0, idx).trim();
    let valor = linha.substring(idx + 1).trim();

    if (valor.startsWith('"') && valor.endsWith('"')) {
      valor = valor.slice(1, -1);
    } else if (valor.startsWith('[') && valor.endsWith(']')) {
      try {
        valor = JSON.parse(valor);
      } catch (e) {
        valor = [];
      }
    }
    dados[chave] = valor;
  }

  return { meta: dados, corpo };
}

function listarArquivosMd(dir) {
  let arquivos = [];
  if (!fs.existsSync(dir)) return arquivos;

  const itens = fs.readdirSync(dir, { withFileTypes: true });
  for (const item of itens) {
    const fullPath = path.join(dir, item.name);
    if (item.isDirectory()) {
      arquivos = arquivos.concat(listarArquivosMd(fullPath));
    } else if (item.name.endsWith('.md')) {
      arquivos.push(fullPath);
    }
  }
  return arquivos;
}

function escaparCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

async function exportarBancos() {
  const dirNormas = path.join(__dirname, '../data/normas');
  const dirDist = path.join(__dirname, '../data/dist');
  fs.mkdirSync(dirDist, { recursive: true });

  const arquivos = listarArquivosMd(dirNormas);
  console.log(`\n==================================================`);
  console.log(` EXPORTANDO BANCOS CONSOLIDADOS (${arquivos.length} NORMAS)`);
  console.log(`==================================================`);

  const todasNormas = [];

  for (const arq of arquivos) {
    const conteudo = fs.readFileSync(arq, 'utf-8');
    const { meta, corpo } = extrairFrontmatterEMarkdown(conteudo);
    if (!meta) continue;

    const id = `${meta.tipo} ${meta.numero}/${meta.ano}`;
    const caminhoRelativo = path.relative(path.join(__dirname, '..'), arq).replace(/\\/g, '/');

    todasNormas.push({
      id,
      tipo: meta.tipo || '',
      numero: meta.numero || '',
      ano: meta.ano || '',
      data_ato: meta.data_ato || meta.data_promulgacao || '',
      data_promulgacao: meta.data_promulgacao || '',
      data_publicacao_dou: meta.data_publicacao_dou || '',
      situacao: meta.situacao || 'vigente',
      ementa: meta.ementa || '',
      leis_base: Array.isArray(meta.leis_base) ? meta.leis_base : [],
      relacionadas: Array.isArray(meta.relacionadas) ? meta.relacionadas : [],
      texto_markdown: corpo,
      arquivo: caminhoRelativo,
      fonte: meta.fonte || ''
    });
  }

  // 1. Exportar JSON Consolidado
  const caminhoJson = path.join(dirDist, 'normas.json');
  fs.writeFileSync(caminhoJson, JSON.stringify(todasNormas, null, 2), 'utf-8');
  console.log(`[1/3] JSON Consolidado salvo em: ${path.relative(path.join(__dirname, '..'), caminhoJson)}`);

  // 2. Exportar CSV Estruturado
  const caminhoCsv = path.join(dirDist, 'normas.csv');
  const cabecalhosCsv = [
    'id', 'tipo', 'numero', 'ano', 'data_ato', 'data_publicacao_dou',
    'situacao', 'ementa', 'leis_base', 'relacionadas', 'arquivo', 'fonte'
  ];
  const linhasCsv = [cabecalhosCsv.join(',')];

  todasNormas.forEach(n => {
    linhasCsv.push([
      escaparCsv(n.id),
      escaparCsv(n.tipo),
      escaparCsv(n.numero),
      escaparCsv(n.ano),
      escaparCsv(n.data_ato),
      escaparCsv(n.data_publicacao_dou),
      escaparCsv(n.situacao),
      escaparCsv(n.ementa),
      escaparCsv(n.leis_base.join('; ')),
      escaparCsv(n.relacionadas.join('; ')),
      escaparCsv(n.arquivo),
      escaparCsv(n.fonte)
    ].join(','));
  });

  fs.writeFileSync(caminhoCsv, linhasCsv.join('\n'), 'utf-8');
  console.log(`[2/3] CSV Estruturado salvo em: ${path.relative(path.join(__dirname, '..'), caminhoCsv)}`);

  // 3. Exportar Banco de Dados SQLite Relacional com FTS
  const SQL = await initSqlJs();
  const db = new SQL.Database();
  db.run('PRAGMA page_size = 1024;');

  // Criar Tabela de Normas
  db.run(`
    CREATE TABLE normas (
      id TEXT PRIMARY KEY,
      tipo TEXT,
      numero TEXT,
      ano INTEGER,
      data_ato TEXT,
      data_promulgacao TEXT,
      data_publicacao_dou TEXT,
      situacao TEXT,
      ementa TEXT,
      leis_base TEXT,
      relacionadas TEXT,
      texto_markdown TEXT,
      arquivo TEXT,
      fonte TEXT
    );
  `);

  // Criar Tabela de Relações
  db.run(`
    CREATE TABLE relacoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      origem TEXT,
      destino TEXT,
      tipo_relacao TEXT
    );
  `);

  // Inserir Normas no SQLite
  const stmtNorma = db.prepare(`
    INSERT INTO normas VALUES (
      $id, $tipo, $numero, $ano, $data_ato, $data_promulgacao, $data_publicacao_dou,
      $situacao, $ementa, $leis_base, $relacionadas, $texto_markdown, $arquivo, $fonte
    );
  `);

  const stmtRel = db.prepare(`
    INSERT INTO relacoes (origem, destino, tipo_relacao) VALUES ($origem, $destino, $tipo_relacao);
  `);

  for (const n of todasNormas) {
    stmtNorma.run({
      $id: n.id,
      $tipo: n.tipo,
      $numero: n.numero,
      $ano: parseInt(n.ano, 10) || null,
      $data_ato: n.data_ato,
      $data_promulgacao: n.data_promulgacao,
      $data_publicacao_dou: n.data_publicacao_dou,
      $situacao: n.situacao,
      $ementa: n.ementa,
      $leis_base: JSON.stringify(n.leis_base),
      $relacionadas: JSON.stringify(n.relacionadas),
      $texto_markdown: n.texto_markdown,
      $arquivo: n.arquivo,
      $fonte: n.fonte
    });

    for (const lei of n.leis_base) {
      stmtRel.run({
        $origem: n.id,
        $destino: lei,
        $tipo_relacao: 'baseada_em'
      });
    }

    for (const rel of n.relacionadas) {
      stmtRel.run({
        $origem: n.id,
        $destino: rel,
        $tipo_relacao: 'cita'
      });
    }
  }

  stmtNorma.free();
  stmtRel.free();

  const bufferSqlite = Buffer.from(db.export());
  const caminhoSqlite = path.join(dirDist, 'anvisa.db');
  fs.writeFileSync(caminhoSqlite, bufferSqlite);
  console.log(`[3/3] Banco SQLite salvo em: ${path.relative(path.join(__dirname, '..'), caminhoSqlite)} (${(bufferSqlite.length / 1024).toFixed(1)} KB)`);

  console.log('Todos os bancos consolidados foram gerados com sucesso!\n');
  return { caminhoJson, caminhoCsv, caminhoSqlite, total: todasNormas.length };
}

module.exports = { exportarBancos };

if (require.main === module) {
  exportarBancos().catch(console.error);
}
