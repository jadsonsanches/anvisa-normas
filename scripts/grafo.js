const fs = require('fs');
const path = require('path');

function extrairFrontmatter(conteudo) {
  const match = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match) return null;

  const yamlStr = match[1];
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

  return dados;
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

function construirGrafo() {
  const dirNormas = path.join(__dirname, '../data/normas');
  const arquivos = listarArquivosMd(dirNormas);
  console.log(`Construindo grafo a partir de ${arquivos.length} normas...`);

  const nodesMap = new Map();
  const edges = [];
  const stats = {
    totalNormas: arquivos.length,
    vigentes: 0,
    revogadas: 0,
    porTipo: {},
    totalRelacoes: 0
  };

  for (const arq of arquivos) {
    const conteudo = fs.readFileSync(arq, 'utf-8');
    const meta = extrairFrontmatter(conteudo);
    if (!meta) continue;

    const idNorma = `${meta.tipo} ${meta.numero}/${meta.ano}`;

    // Atualizar stats
    if (meta.situacao === 'vigente') stats.vigentes++;
    else if (meta.situacao === 'revogada') stats.revogadas++;

    stats.porTipo[meta.tipo] = (stats.porTipo[meta.tipo] || 0) + 1;

    // Registrar nó de origem
    if (!nodesMap.has(idNorma)) {
      nodesMap.set(idNorma, {
        id: idNorma,
        tipo: meta.tipo,
        numero: meta.numero,
        ano: meta.ano,
        data_ato: meta.data_ato || meta.data_promulgacao || '',
        data_promulgacao: meta.data_promulgacao || '',
        data_publicacao_dou: meta.data_publicacao_dou || '',
        situacao: meta.situacao,
        ementa: meta.ementa || '',
        arquivo: path.relative(path.join(__dirname, '..'), arq).replace(/\\/g, '/')
      });
    }

    // Arestas de revogação
    if (Array.isArray(meta.revogada_por)) {
      meta.revogada_por.forEach(rev => {
        edges.push({
          source: idNorma,
          target: rev,
          relacao: 'revogada_por'
        });
        if (!nodesMap.has(rev)) {
          const match = rev.match(/^(?:([A-Z_]+)\s+)?(\d+)\/(\d{4})/i);
          const tipo = match && match[1] ? match[1].toUpperCase() : 'NORMA_CORRELATA';
          const numero = match ? match[2] : '';
          const ano = match ? match[3] : '';
          nodesMap.set(rev, {
            id: rev,
            tipo: tipo,
            numero: numero,
            ano: ano,
            situacao: 'pendente_coleta',
            ementa: `Norma citada como revogadora de ${idNorma}. Texto integral será integrado em coletas complementares do ano ${ano}.`
          });
        }
      });
    }

    // Arestas de leis de base
    if (Array.isArray(meta.leis_base)) {
      meta.leis_base.forEach(lei => {
        edges.push({
          source: idNorma,
          target: lei,
          relacao: 'baseada_em'
        });
        if (!nodesMap.has(lei)) {
          const match = lei.match(/(\d+)\/(\d{4})/);
          const numero = match ? match[1] : '';
          const ano = match ? match[2] : '';
          nodesMap.set(lei, {
            id: lei,
            tipo: 'LEI_FEDERAL',
            numero: numero,
            ano: ano,
            situacao: 'externa',
            ementa: 'Legislação Federal citada como fundamento e base legal de competência.'
          });
        }
      });
    }

    // Arestas de normas relacionadas (citações)
    if (Array.isArray(meta.relacionadas)) {
      meta.relacionadas.forEach(rel => {
        edges.push({
          source: idNorma,
          target: rel,
          relacao: 'cita'
        });
        if (!nodesMap.has(rel)) {
          const match = rel.match(/^(?:([A-Z_]+)\s+)?(\d+)\/(\d{4})/i);
          const tipo = match && match[1] ? match[1].toUpperCase() : 'NORMA_CORRELATA';
          const numero = match ? match[2] : '';
          const ano = match ? match[3] : '';
          nodesMap.set(rel, {
            id: rel,
            tipo: tipo,
            numero: numero,
            ano: ano,
            situacao: 'pendente_coleta',
            ementa: `Norma citada oficialmente no acervo. Texto integral e metadados serão integrados em coletas complementares do ano ${ano}.`
          });
        }
      });
    }
  }

  stats.totalRelacoes = edges.length;

  const grafo = {
    nodes: Array.from(nodesMap.values()),
    edges: edges
  };

  const dirGrafo = path.join(__dirname, '../data/grafo');
  fs.mkdirSync(dirGrafo, { recursive: true });

  fs.writeFileSync(path.join(dirGrafo, 'relacoes.json'), JSON.stringify(grafo, null, 2), 'utf-8');
  fs.writeFileSync(path.join(dirGrafo, 'estatisticas.json'), JSON.stringify(stats, null, 2), 'utf-8');

  console.log('Grafo gerado com sucesso!');
  console.log(`Nós: ${grafo.nodes.length} | Arestas: ${grafo.edges.length}`);
  console.log('Estatísticas:', stats);

  return { grafo, stats };
}

module.exports = { construirGrafo };

if (require.main === module) {
  construirGrafo();
}
