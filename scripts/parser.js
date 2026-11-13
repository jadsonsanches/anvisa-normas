const cheerio = require('cheerio');
const TurndownService = require('turndown');

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

// Remove links vazios ou de javascript
turndown.addRule('cleanupJsLinks', {
  filter: function (node) {
    if (node.nodeName !== 'A') return false;
    const href = node.getAttribute('href') || '';
    return href.startsWith('javascript:') || href === '#' || !href;
  },
  replacement: function (content) {
    return content.trim();
  }
});

function normalizarTipo(tipoRaw = '') {
  const t = tipoRaw.trim().toUpperCase();
  if (t === 'POR' || t === 'PORTARIA') return 'PORTARIA';
  if (t === 'INM' || t === 'IN') return 'IN';
  if (t === 'RDC') return 'RDC';
  if (t === 'RES' || t === 'RE') return 'RE';
  return t;
}

function parseNormaHtml(html, urlOrigem = '', metaBusca = {}) {
  const $ = cheerio.load(html);

  // 1. Extração do contêiner legislativo oficial
  let container = $('.ato');
  if (container.length === 0) {
    container = $('#conteudo, #corpo, .conteudo').first();
  }
  if (container.length === 0) {
    container = $('body');
  }

  // 2. Limpeza de artefatos de interface dentro do conteúdo
  container.find('script, style, nav, header, footer').remove();
  container.find('.noprint, #loading, .btn, .navbar, .menu').remove();
  container.find('p:contains("Este texto não substitui a Publicação Oficial")').remove();
  container.find('p:contains("Este texto nao substitui a Publicacao Oficial")').remove();
  container.find('a:contains("Voltar"), a:contains("IMPRIMIR"), a:contains("COPIAR LINK"), a:contains("CRIAR TAGS")').remove();
  container.find('a:contains("VER NOTAS"), a:contains("FECHAR NOTAS"), a:contains("PDF")').remove();

  // 3. Normalização de links para outras normas (LinkTexto)
  const citacoes = [];
  const linkTextoRegex = /LinkTexto\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g;
  let lt;
  const rawHtmlContainer = container.html() || '';
  while ((lt = linkTextoRegex.exec(rawHtmlContainer)) !== null) {
    const rawTipo = lt[1].trim();
    const rawNum = parseInt(lt[2], 10).toString();
    const anoCitado = lt[4].trim();

    const cleanTipo = normalizarTipo(rawTipo);
    citacoes.push({
      tipo: cleanTipo,
      numero: rawNum,
      ano: anoCitado,
      referencia: `${cleanTipo} ${rawNum}/${anoCitado}`
    });
  }

  // Converter chamadas LinkTexto em links relativos locais ou planalto
  container.find('a[href*="LinkTexto"]').each((_, a) => {
    const href = $(a).attr('href') || '';
    const m = href.match(/LinkTexto\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/);
    if (m) {
      const tipoDestino = normalizarTipo(m[1]).toLowerCase();
      const numDestino = parseInt(m[2], 10).toString();
      const anoDestino = m[4];
      if (tipoDestino === 'lei') {
        $(a).attr('href', 'https://www.planalto.gov.br');
      } else {
        $(a).attr('href', `../${tipoDestino}/${anoDestino}/${tipoDestino}-${numDestino}.md`);
      }
    }
  });

  // 4. Metadados
  const tipo = normalizarTipo(metaBusca.tipo || '');
  const numero = metaBusca.numero ? metaBusca.numero.toString() : '';
  const ano = metaBusca.ano ? metaBusca.ano.toString() : '';
  const situacao = (metaBusca.situacao || 'vigente').toLowerCase();
  let ementa = metaBusca.ementa || '';

  // Se ementa não veio nos metadados, tentar extrair do primeiro parágrafo relevante
  if (!ementa) {
    container.find('p').each((_, p) => {
      const txt = $(p).text().trim().replace(/\s+/g, ' ');
      if (!ementa && /^(Aprova|Dispõe|Estabelece|Institui|Altera|Proíbe|Determina|Define|Regulamenta|Autoriza|Exonera|Nomeia|Designa|Revoga|Concede|Defere|Indefere|Adota|Renova)/i.test(txt)) {
        if (txt.length > 20 && txt.length < 800) {
          ementa = txt;
        }
      }
    });
  }

  // Datas
  let dataPromulgacao = metaBusca.dataPromulgacao || '';
  let dataPublicacaoDou = '';
  const matchDou = container.text().match(/PUB\s+D\.O\.U\.?\s*,?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (matchDou) {
    dataPublicacaoDou = matchDou[1];
    if (!dataPromulgacao) dataPromulgacao = matchDou[1];
  }

  const matchDataAto = container.text().match(/DE\s+(\d{1,2})\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/i);
  if (matchDataAto && !dataPromulgacao) {
    dataPromulgacao = `${matchDataAto[1]} de ${matchDataAto[2].toLowerCase()} de ${matchDataAto[3]}`;
  }

  // Relações
  const refsUnicas = [...new Map(citacoes.map(item => [item.referencia, item])).values()];
  const leisBase = [];
  const outrasNormas = [];

  refsUnicas.forEach(ref => {
    if (ref.tipo === 'LEI') {
      leisBase.push(ref.referencia);
    } else {
      outrasNormas.push(ref.referencia);
    }
  });

  // 5. Conversão HTML -> Markdown
  const markdownCorpo = turndown.turndown(container.html() || '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  // 6. Montagem do YAML Frontmatter + Markdown
  const yamlLines = [
    '---',
    `tipo: "${tipo}"`,
    `numero: "${numero}"`,
    `ano: "${ano}"`,
    `data_promulgacao: "${dataPromulgacao}"`,
    `data_publicacao_dou: "${dataPublicacaoDou}"`,
    `situacao: "${situacao}"`,
    `ementa: "${ementa.replace(/"/g, '\\"')}"`,
    `leis_base: ${JSON.stringify(leisBase)}`,
    `relacionadas: ${JSON.stringify(outrasNormas)}`,
    `fonte: "${urlOrigem}"`,
    '---',
    '',
    `# ${tipo} nº ${numero}, de ${dataPromulgacao || ano}`,
    '',
    markdownCorpo
  ];

  return {
    tipo,
    numero,
    ano,
    situacao,
    ementa,
    dataPromulgacao,
    dataPublicacaoDou,
    leisBase,
    relacionadas: outrasNormas,
    markdown: yamlLines.join('\n')
  };
}

module.exports = { parseNormaHtml, normalizarTipo };
