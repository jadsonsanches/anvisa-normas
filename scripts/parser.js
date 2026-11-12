const cheerio = require('cheerio');
const TurndownService = require('turndown');

const turndown = new TurndownService({
  headingStyle: 'atx',
  codeBlockStyle: 'fenced',
  emDelimiter: '*'
});

turndown.addRule('removeJsLinks', {
  filter: function (node) {
    return node.nodeName === 'A' && (!node.getAttribute('href') || node.getAttribute('href').startsWith('javascript:mudaFonte') || node.innerText === 'PDF' || node.innerText === 'CRIAR TAGS');
  },
  replacement: function (content) {
    return content;
  }
});

function parseNormaHtml(html, urlOrigem = '', hints = {}) {
  const $ = cheerio.load(html);

  const rawTitle = $('title').text().trim();

  let situacao = 'vigente';
  const textoGeral = $('body').text();
  if (/REVOGAD[OA]/i.test(textoGeral) || /Revogada pela/i.test(textoGeral)) {
    situacao = 'revogada';
  }

  // Tipo, número e ano a partir dos hints ou do texto
  let tipo = (hints.tipo || '').toUpperCase();
  let numero = hints.numero || '';
  let ano = hints.ano || '';
  let dataPromulgacao = '';

  if (!tipo || !numero) {
    const matchRDC = rawTitle.match(/RDC[^\d]*(\d+)/i) || rawTitle.match(/Resolu[cç][aã]o[^\d]*(\d+)/i);
    const matchIN = rawTitle.match(/IN[^\d]*(\d+)/i) || rawTitle.match(/Instru[cç][aã]o[^\d]*(\d+)/i);
    const matchPortaria = rawTitle.match(/Portaria[^\d]*(\d+)/i);

    if (matchRDC) {
      if (!tipo) tipo = 'RDC';
      if (!numero) numero = matchRDC[1];
    } else if (matchIN) {
      if (!tipo) tipo = 'IN';
      if (!numero) numero = matchIN[1];
    } else if (matchPortaria) {
      if (!tipo) tipo = 'PORTARIA';
      if (!numero) numero = matchPortaria[1];
    }
  }

  const matchData = rawTitle.match(/(\d{2}\/\d{2}\/(\d{4}))/i) || textoGeral.match(/(\d{2}\/\d{2}\/(\d{4}))/i);
  if (matchData) {
    dataPromulgacao = matchData[1];
    if (!ano) ano = matchData[2];
  }

  if (!ano) {
    const anoMatch = textoGeral.match(/DE\s+\d{1,2}\s+DE\s+[A-ZÇ]+\s+DE\s+(\d{4})/i);
    if (anoMatch) ano = anoMatch[1];
  }

  // Ementa
  let ementa = '';
  $('p, div').each((_, el) => {
    const txt = $(el).text().trim();
    if (!ementa && /^(Aprova|Dispõe|Estabelece|Institui|Altera|Proíbe|Determina|Define|Regulamenta)/i.test(txt)) {
      if (txt.length > 20 && txt.length < 800) {
        ementa = txt.replace(/\s+/g, ' ');
      }
    }
  });

  // Relações via links estruturados LinkTexto
  const citacoes = [];
  const linkTextoRegex = /LinkTexto\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/g;
  let lt;
  while ((lt = linkTextoRegex.exec(html)) !== null) {
    const rawTipo = lt[1].trim();
    const rawNum = parseInt(lt[2], 10).toString();
    const anoCitado = lt[4].trim();

    let cleanTipo = rawTipo;
    if (cleanTipo === 'INM') cleanTipo = 'IN';
    if (cleanTipo === 'POR') cleanTipo = 'PORTARIA';

    citacoes.push({
      tipo: cleanTipo,
      numero: rawNum,
      ano: anoCitado,
      referencia: `${cleanTipo} ${rawNum}/${anoCitado}`
    });
  }

  const refsUnicas = [...new Map(citacoes.map(item => [item.referencia, item])).values()];

  const revogadaPor = [];
  const revoga = [];
  const altera = [];
  const alteradaPor = [];
  const leisBase = [];
  const outrasNormas = [];

  const revogadaPorMatch = textoGeral.match(/Revogada pela\s+([^.\n]+)/i);
  if (revogadaPorMatch) {
    revogadaPor.push(revogadaPorMatch[1].trim().replace(/\s+/g, ' '));
  }

  refsUnicas.forEach(ref => {
    if (ref.tipo === 'LEI') {
      leisBase.push(ref.referencia);
    } else {
      outrasNormas.push(ref.referencia);
    }
  });

  // Limpeza
  $('nav, header, footer, script, style, .btn, .navbar, .menu, #loading, .hiddenStructure').remove();
  $('a[href*="facebook.com"], a[href*="twitter.com"], a[href*="linkedin.com"], a[href*="whatsapp"]').remove();
  $('a:contains("Voltar"), a:contains("IMPRIMIR"), a:contains("COPIAR LINK"), a:contains("CRIAR TAGS"), a:contains("VER NOTAS")').remove();

  $('a[href*="LinkTexto"]').each((_, a) => {
    const href = $(a).attr('href');
    const m = href.match(/LinkTexto\s*\(\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'\s*,\s*'([^']+)'/);
    if (m) {
      let t = m[1].toLowerCase();
      if (t === 'inm') t = 'in';
      if (t === 'por') t = 'portaria';
      const n = parseInt(m[2], 10);
      const aAno = m[4];
      if (t === 'lei') {
        $(a).attr('href', `https://www.planalto.gov.br`);
      } else {
        $(a).attr('href', `../${t}/${aAno}/${t}-${n}.md`);
      }
    }
  });

  const container = $('.container, #corpo, .conteudo, body').first();
  const rawHtmlCorpo = container.html() || '';
  const markdownCorpo = turndown.turndown(rawHtmlCorpo)
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  const yaml = [
    '---',
    `tipo: "${tipo}"`,
    `numero: "${numero}"`,
    `ano: "${ano}"`,
    `data_promulgacao: "${dataPromulgacao}"`,
    `situacao: "${situacao}"`,
    `ementa: "${ementa.replace(/"/g, '\\"')}"`,
    `revogada_por: ${JSON.stringify(revogadaPor)}`,
    `revoga: ${JSON.stringify(revoga)}`,
    `altera: ${JSON.stringify(altera)}`,
    `alterada_por: ${JSON.stringify(alteradaPor)}`,
    `leis_base: ${JSON.stringify(leisBase)}`,
    `relacionadas: ${JSON.stringify(outrasNormas)}`,
    `fonte: "${urlOrigem}"`,
    '---',
    '',
    `# ${tipo} nº ${numero}, de ${dataPromulgacao || ano}`,
    '',
    markdownCorpo
  ].join('\n');

  return {
    tipo,
    numero,
    ano,
    situacao,
    ementa,
    revogadaPor,
    revoga,
    altera,
    alteradaPor,
    leisBase,
    relacionadas: outrasNormas,
    markdown: yaml
  };
}

module.exports = { parseNormaHtml };
