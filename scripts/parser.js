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

  // Se ementa não veio nos metadados, tentar extrair do primeiro parágrafo relevante ou do Art. 1º
  if (!ementa) {
    container.find('p').each((_, p) => {
      const txt = $(p).text().trim().replace(/\s+/g, ' ');
      if (!ementa) {
        const cleanTxt = txt.replace(/^Art\.\s*1[º°]\.?\s*/i, '');
        if (/^(Aprova|Dispõe|Estabelece|Institui|Altera|Proíbe|Determina|Define|Regulamenta|Autoriza|Exonera|Nomeia|Designa|Revoga|Concede|Defere|Indefere|Adota|Renova|Inclui|Decide)/i.test(cleanTxt)) {
          if (cleanTxt.length > 15 && cleanTxt.length < 800) {
            ementa = cleanTxt;
          }
        }
      }
    });
  }

  // Datas: distinguir data do ato (assinatura) e data de publicação no DOU
  const meses = {
    janeiro: '01', fevereiro: '02', marco: '03', 'março': '03', abril: '04',
    maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
    outubro: '10', novembro: '11', dezembro: '12'
  };

  let dataAto = metaBusca.dataAto || metaBusca.dataPromulgacao || '';
  // Se dataAto informada tiver ano divergente do ano da norma, descartar para extrair do corpo/metadados coerentes
  if (dataAto) {
    const m = dataAto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m && ano && m[3] !== ano) {
      dataAto = '';
    }
  }

  const rawContainerText = container.text();

  // Se não temos dataAto coerente com o ano, buscar no texto do contêiner
  if (!dataAto) {
    // 1. Tentar correspondência no cabeçalho ou título específico do ato com o ano exato
    if (ano) {
      const regexHeader = new RegExp(`(?:N[º°]|N[UÚ]MERO)\\s+[\\d\\.]+[\\s\\S]*?\\bDE\\s+(\\d{1,2})\\s+DE\\s+([A-ZÇ]+)\\s+DE\\s+(${ano})`, 'i');
      const matchHeader = rawContainerText.match(regexHeader);
      if (matchHeader) {
        const dia = matchHeader[1].padStart(2, '0');
        const mesNome = matchHeader[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mes = meses[mesNome];
        if (mes) {
          dataAto = `${dia}/${mes}/${ano}`;
        }
      }

      // 2. Se não achou no cabeçalho, buscar qualquer data com extenso que tenha o ANO da norma
      if (!dataAto) {
        const regexAno = new RegExp(`(?:DE|EM)\\s+(\\d{1,2})\\s+DE\\s+([A-ZÇ]+)\\s+DE\\s+(${ano})`, 'gi');
        const allMatches = [...rawContainerText.matchAll(regexAno)];
        if (allMatches.length > 0) {
          // Se houver mais de uma, preferir a última ocorrência (geralmente data de assinatura no fecho: "Em 19 de agosto de 2025")
          const last = allMatches[allMatches.length - 1];
          const dia = last[1].padStart(2, '0');
          const mesNome = last[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          const mes = meses[mesNome];
          if (mes) {
            dataAto = `${dia}/${mes}/${ano}`;
          }
        }
      }
    } else {
      const matchDataAto = rawContainerText.match(/DE\s+(\d{1,2})\s+DE\s+([A-ZÇ]+)\s+DE\s+(\d{4})/i);
      if (matchDataAto) {
        const dia = matchDataAto[1].padStart(2, '0');
        const mesNome = matchDataAto[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const mes = meses[mesNome] || '01';
        dataAto = `${dia}/${mes}/${matchDataAto[3]}`;
      }
    }
  }

  let dataPublicacaoDou = '';
  const matchDou = rawContainerText.match(/PUB\s+D\.O\.U\.?\s*,?\s*(\d{2}\/\d{2}\/\d{4})/i);
  if (matchDou) {
    dataPublicacaoDou = matchDou[1];
  } else if (metaBusca.dataPublicacaoDou) {
    dataPublicacaoDou = metaBusca.dataPublicacaoDou;
  }

  // Fallback garantido: dataAto não pode ser vazia e deve ser coerente com ano
  if (!dataAto && dataPublicacaoDou && (!ano || dataPublicacaoDou.endsWith(`/${ano}`))) {
    dataAto = dataPublicacaoDou;
  }

  if (!dataAto) {
    if (metaBusca.dataPublicacaoDou && (!ano || metaBusca.dataPublicacaoDou.endsWith(`/${ano}`))) {
      dataAto = metaBusca.dataPublicacaoDou;
    } else if (metaBusca.dataPromulgacao && (!ano || metaBusca.dataPromulgacao.endsWith(`/${ano}`))) {
      dataAto = metaBusca.dataPromulgacao;
    } else if (ano) {
      dataAto = `01/01/${ano}`;
    }
  }

  const dataReferencia = dataAto || dataPublicacaoDou || ano;

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
    `data_ato: "${dataAto}"`,
    `data_promulgacao: "${dataReferencia}"`,
    `data_publicacao_dou: "${dataPublicacaoDou}"`,
    `situacao: "${situacao}"`,
    `ementa: "${ementa.replace(/"/g, '\\"')}"`,
    `leis_base: ${JSON.stringify(leisBase)}`,
    `relacionadas: ${JSON.stringify(outrasNormas)}`,
    `fonte: "${urlOrigem}"`,
    '---',
    '',
    `# ${tipo} nº ${numero}, de ${dataReferencia}`,
    '',
    markdownCorpo
  ];

  return {
    tipo,
    numero,
    ano,
    situacao,
    ementa,
    dataAto,
    dataPromulgacao: dataReferencia,
    dataPublicacaoDou,
    leisBase,
    relacionadas: outrasNormas,
    markdown: yamlLines.join('\n')
  };
}

module.exports = { parseNormaHtml, normalizarTipo };
