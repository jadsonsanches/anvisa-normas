const https = require('https');
const querystring = require('querystring');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { parseNormaHtml, normalizarTipo } = require('./parser');

const HOST = 'anvisalegis.datalegis.net';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
const REQUEST_TIMEOUT_MS = 30000;

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(pathUrl, cookies = '', timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: HOST,
      path: pathUrl,
      method: 'GET',
      headers: {
        'User-Agent': USER_AGENT,
        'Cookie': cookies,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
      }
    };

    const req = https.get(options, res => {
      let chunks = [];
      res.on('error', reject);
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('latin1')
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout na requisição GET após ${timeoutMs}ms: ${pathUrl}`));
    });
    req.on('error', reject);
  });
}

function httpPost(pathUrl, data, cookies = '', extraHeaders = {}, timeoutMs = REQUEST_TIMEOUT_MS) {
  return new Promise((resolve, reject) => {
    const postBody = typeof data === 'string'
      ? data
      : (data instanceof URLSearchParams ? data.toString() : querystring.stringify(data));
    const options = {
      hostname: HOST,
      path: pathUrl,
      method: 'POST',
      headers: {
        'User-Agent': USER_AGENT,
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'Content-Length': Buffer.byteLength(postBody),
        'Cookie': cookies,
        'Accept': '*/*',
        ...extraHeaders
      }
    };

    const req = https.request(options, res => {
      let chunks = [];
      res.on('error', reject);
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('latin1')
        });
      });
    });

    req.setTimeout(timeoutMs, () => {
      req.destroy(new Error(`Timeout na requisição POST após ${timeoutMs}ms: ${pathUrl}`));
    });
    req.on('error', reject);
    req.write(postBody);
    req.end();
  });
}

/**
 * Cria ou renova uma sessão com o portal Datalegis
 */
async function obterSessao() {
  const res = await httpGet('/action/ActionDatalegis.php?acao=abrirLegislacao&cod_modulo=134&cod_menu=1696');
  if (res.statusCode >= 400) {
    throw new Error(`HTTP ${res.statusCode} ao obter sessão`);
  }
  const rawCookies = res.headers['set-cookie'] || [];
  const cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
  return cookies;
}

const MESES_EXTENSO = {
  janeiro: '01',
  fevereiro: '02',
  marco: '03',
  abril: '04',
  maio: '05',
  junho: '06',
  julho: '07',
  agosto: '08',
  setembro: '09',
  outubro: '10',
  novembro: '11',
  dezembro: '12'
};

function extrairDataLinkTexto(text) {
  const matchDataAto = text.match(/de\s+(\d{2}\/\d{2}\/\d{4})/i);
  if (matchDataAto) {
    return matchDataAto[1];
  }
  const matchExtenso = text.match(/(?:de|em)\s+(\d{1,2})\s+de\s+([a-zçáéíóúâêôãõ]+)\s+de\s+(\d{4})/i);
  if (matchExtenso) {
    const diaNum = parseInt(matchExtenso[1], 10);
    const mesNorm = matchExtenso[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mesStr = MESES_EXTENSO[mesNorm];
    const anoNum = parseInt(matchExtenso[3], 10);
    if (mesStr && diaNum >= 1 && diaNum <= 31) {
      const mesNum = parseInt(mesStr, 10);
      const dt = new Date(anoNum, mesNum - 1, diaNum);
      if (dt.getFullYear() === anoNum && dt.getMonth() === mesNum - 1 && dt.getDate() === diaNum) {
        return `${String(diaNum).padStart(2, '0')}/${mesStr}/${matchExtenso[3]}`;
      }
    }
  }
  return '';
}

function buildSearchParams({ ano, dataInicio, dataFim, ordenacao, pageSize, sglTipo, numAto }) {
  const params = new URLSearchParams();
  params.set('cod_modulo', '134');
  params.set('cod_menu', '1696');
  params.set('redirect_consultaato', 'apresentarAtos');
  params.set('cod_local', 'BR');
  params.set('inApsModuloBase', 'S');
  params.set('ind_legis_juris', 'L');
  params.set('vlr_ano', ano);
  params.set('dta_promulgacao', dataInicio);
  params.set('dta_promulgacao_final', dataFim);
  params.set('ordenacao', ordenacao);
  params.set('qtd_pagina', String(pageSize));

  if (numAto !== undefined && numAto !== null && String(numAto).trim() !== '') {
    params.set('num_ato', String(numAto).trim());
  }

  if (sglTipo) {
    const tipos = Array.isArray(sglTipo) ? sglTipo : [sglTipo];
    for (const t of tipos) {
      if (t && String(t).trim()) {
        params.append('sgl_tipo[]', String(t).trim());
      }
    }
  }

  return params;
}

function parseBrDate(str) {
  const [d, m, y] = str.split('/').map(Number);
  return new Date(y, m - 1, d);
}

function formatBrDate(date) {
  const d = String(date.getDate()).padStart(2, '0');
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const y = date.getFullYear();
  return `${d}/${m}/${y}`;
}

async function executarPesquisaUnica(criterios = {}) {
  const ano = criterios.ano ? criterios.ano.toString() : '';
  const dataInicio = criterios.dataInicio || '';
  const dataFim = criterios.dataFim || '';
  const ordenacao = criterios.ordenacao || 'dta_promulgacao:ASC';
  let pageSize = Number(criterios.qtdPagina) || 500;
  const sglTipo = criterios.sglTipo;
  const numAto = criterios.numAto;

  let cookies = '';
  let initRes = null;
  let params = buildSearchParams({ ano, dataInicio, dataFim, ordenacao, pageSize, sglTipo, numAto });

  async function inicializarSessaoBusca() {
    let lastInitErr = null;
    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        cookies = await obterSessao();
        initRes = await httpPost(
          '/action/ActionDatalegis.php?acao=consultarAtosInicial&cod_modulo=134&cod_menu=1696',
          params.toString(),
          cookies
        );
        if (initRes.statusCode >= 400) {
          throw new Error(`HTTP ${initRes.statusCode} em consultarAtosInicial`);
        }
        lastInitErr = null;
        return;
      } catch (e) {
        lastInitErr = e;
        if (tentativa < 3) {
          console.warn(`[Aviso] Falha ao inicializar busca (tentativa ${tentativa}/3): ${e.message}. Retentando...`);
          await sleep(1000 * tentativa);
        }
      }
    }
    throw new Error(`Falha ao inicializar sessão de busca no Datalegis: ${lastInitErr.message}`);
  }

  await inicializarSessaoBusca();

  if (/Nenhum ato encontrado/i.test(initRes.body)) {
    return { cookies, listaAtos: [], expectedTotal: 0, params };
  }

  const $init = cheerio.load(initRes.body);
  let expectedTotal = null;
  const regEl = $init('#numeroRegistroInicial');
  if (regEl.length > 0) {
    const regText = regEl.parent().text().replace(/\s+/g, ' ').trim();
    const matchTotal = regText.match(/de\s+([\d.]+)\s+iten/i);
    if (matchTotal) {
      expectedTotal = parseInt(matchTotal[1].replace(/\./g, ''), 10);
    }
  }

  // 2. Coleta os itens paginados
  let pagina = 1;
  const listaAtos = [];

  while (true) {
    let data = null;
    let lastErr = null;
    let caiuPara100 = false;

    for (let tentativa = 1; tentativa <= 3; tentativa++) {
      try {
        const pageRes = await httpPost(
          `/action/ActionDatalegis.php?acao=abrirPagina&pagina=${pagina}&legisjuris=L`,
          params.toString(),
          cookies,
          { 'X-Requested-With': 'XMLHttpRequest' }
        );
        if (pageRes.statusCode !== 200) {
          throw new Error(`HTTP ${pageRes.statusCode} na página ${pagina}`);
        }
        data = JSON.parse(pageRes.body);
        lastErr = null;
        break;
      } catch (e) {
        lastErr = e;
        if (pagina === 1 && pageSize > 100 && (/HTTP 500/.test(e.message) || e instanceof SyntaxError)) {
          console.warn(`[Aviso] Falha com qtd_pagina=${pageSize} na página 1 (${e.message}). Aplicando fallback para qtd_pagina=100...`);
          pageSize = 100;
          params = buildSearchParams({ ano, dataInicio, dataFim, ordenacao, pageSize, sglTipo, numAto });
          await inicializarSessaoBusca();
          caiuPara100 = true;
          lastErr = null;
          break;
        }
        if (tentativa < 3) {
          console.warn(`[Aviso] Resposta não-JSON ou falha na página ${pagina} (tentativa ${tentativa}/3): ${e.message}. Retentando...`);
          await sleep(1000 * tentativa);
        }
      }
    }

    if (caiuPara100) {
      pagina = 1;
      continue;
    }

    if (lastErr) {
      throw new Error(`Falha na paginação do Datalegis na página ${pagina}: ${lastErr.message}`);
    }

    if (!data || !data.resultado) break;

    const $ = cheerio.load(data.resultado);
    const itensPagina = [];

    $('a[href*="abrirTextoAto"]').each((_, a) => {
      const href = $(a).attr('href');
      const text = $(a).text().trim().replace(/\s+/g, ' ');

      // Determinar situação jurídica
      let situacao = 'vigente';
      if (/revogad[oa]/i.test(text)) {
        situacao = 'revogada';
      }

      // Parâmetros da URL do ato
      const urlParams = new URLSearchParams(href.split('?')[1] || '');
      const rawTipo = urlParams.get('tipo') || 'RDC';
      const cleanTipo = normalizarTipo(rawTipo);
      const rawNum = urlParams.get('numeroAto') || '0';
      const numero = parseInt(rawNum, 10).toString();
      const anoAto = urlParams.get('valorAno') || ano || new Date().getFullYear().toString();
      const seqAto = urlParams.get('seqAto') || '000';

      const dataAto = extrairDataLinkTexto(text);

      // Extração de ementa do texto do link (geralmente vem após a data)
      let ementa = '';
      const matchEmenta = text.match(/\d{4}(.*)$/);
      if (matchEmenta && matchEmenta[1].length > 10) {
        ementa = matchEmenta[1].trim();
      }

      itensPagina.push({
        href,
        tipo: cleanTipo,
        numero,
        ano: anoAto,
        seqAto,
        situacao,
        dataAto,
        dataPublicacaoDou: (dataInicio && dataInicio === dataFim) ? dataInicio : '',
        ementa,
        textoCompleto: text
      });
    });

    if (itensPagina.length === 0) break;

    listaAtos.push(...itensPagina);

    if (itensPagina.length < pageSize) {
      break;
    }

    pagina++;
    await sleep(300);
  }

  return { cookies, listaAtos, expectedTotal, params };
}

async function obterTiposFacetas(params, cookies) {
  const qs = params.toString();
  const res = await httpGet(`/action/ActionDatalegis.php?acao=getFiltrosPesquisa&${qs}`, cookies);
  if (res.statusCode >= 400) {
    throw new Error(`HTTP ${res.statusCode} em getFiltrosPesquisa`);
  }
  const json = JSON.parse(res.body);
  if (!json || typeof json !== 'object' || !json.sgl_tipo) {
    return [];
  }
  if (Array.isArray(json.sgl_tipo)) {
    return json.sgl_tipo.map(entry => entry.SGL_TIPO || entry.sgl_tipo || entry.chave || entry.id).filter(Boolean);
  }
  return Object.keys(json.sgl_tipo).filter(Boolean);
}

/**
 * Realiza a busca de atos por critérios (datas ou ano) com ordenação determinística e reconciliação
 */
async function pesquisarAtos(criterios = {}) {
  const ordenacaoInicial = criterios.ordenacao || 'dta_promulgacao:ASC';
  const primeira = await executarPesquisaUnica({ ...criterios, ordenacao: ordenacaoInicial });
  const unicosPorHref = new Map();
  for (const item of primeira.listaAtos) {
    if (!unicosPorHref.has(item.href)) {
      unicosPorHref.set(item.href, item);
    }
  }

  const expectedTotal = primeira.expectedTotal;
  let lastCookies = primeira.cookies;

  if (expectedTotal !== null && unicosPorHref.size < expectedTotal) {
    console.warn(`[Reconciliação] Obtidos ${unicosPorHref.size}/${expectedTotal} únicos com ordenacao=${ordenacaoInicial}. Tentando ordenacao=num_ato:ASC...`);
    const segunda = await executarPesquisaUnica({ ...criterios, ordenacao: 'num_ato:ASC' });
    lastCookies = segunda.cookies || lastCookies;
    for (const item of segunda.listaAtos) {
      if (!unicosPorHref.has(item.href)) {
        unicosPorHref.set(item.href, item);
      }
    }
  }

  if (expectedTotal !== null && unicosPorHref.size < expectedTotal && criterios.dataInicio && criterios.dataFim && criterios.dataInicio !== criterios.dataFim) {
    const dtInicio = parseBrDate(criterios.dataInicio);
    const dtFim = parseBrDate(criterios.dataFim);
    const diffDias = Math.round((dtFim - dtInicio) / 86400000);
    if (diffDias >= 1) {
      const meioTime = dtInicio.getTime() + Math.floor(diffDias / 2) * 86400000;
      const dtMeio = new Date(meioTime);
      const dtMeioSeguinte = new Date(meioTime + 86400000);
      console.warn(`[Reconciliação] Dividindo janela ${criterios.dataInicio}..${criterios.dataFim} ao meio (${formatBrDate(dtMeio)})...`);
      const esquerda = await pesquisarAtos({ ...criterios, dataFim: formatBrDate(dtMeio) });
      const direita = await pesquisarAtos({ ...criterios, dataInicio: formatBrDate(dtMeioSeguinte) });
      lastCookies = direita.cookies || esquerda.cookies || lastCookies;
      for (const item of [...esquerda.listaAtos, ...direita.listaAtos]) {
        if (!unicosPorHref.has(item.href)) {
          unicosPorHref.set(item.href, item);
        }
      }
    }
  }

  if (expectedTotal !== null && unicosPorHref.size < expectedTotal && !criterios.sglTipo) {
    console.warn(`[Reconciliação] Ainda faltam itens (${unicosPorHref.size}/${expectedTotal}). Subdividindo por sgl_tipo[] via getFiltrosPesquisa...`);
    let tipos = [];
    try {
      tipos = await obterTiposFacetas(primeira.params, primeira.cookies);
    } catch (e) {
      console.warn(`[Aviso] getFiltrosPesquisa falhou: ${e.message}`);
    }
    for (const tipo of tipos) {
      const sub = await pesquisarAtos({ ...criterios, sglTipo: tipo });
      lastCookies = sub.cookies || lastCookies;
      for (const item of sub.listaAtos) {
        if (!unicosPorHref.has(item.href)) {
          unicosPorHref.set(item.href, item);
        }
      }
    }
  }

  if (expectedTotal !== null && unicosPorHref.size < expectedTotal) {
    throw new Error(`Pesquisa incompleta no Datalegis: esperados ${expectedTotal} itens, obtidos apenas ${unicosPorHref.size} únicos.`);
  }

  return {
    cookies: lastCookies,
    listaAtos: [...unicosPorHref.values()],
    expectedTotal,
    uniqueRawCount: unicosPorHref.size
  };
}

/**
 * Valida se o HTML retornado contém um ato legislativo válido e não uma página de erro ou sessão expirada.
 */
function validarHtmlAto(html, meta = null) {
  if (!html || typeof html !== 'string' || html.trim().length < 100) {
    return { valido: false, motivo: 'Payload vazio ou truncado' };
  }

  const $ = cheerio.load(html);
  const temAto = $('.ato').length > 0;

  const marcadoresGlobais = [
    /sess[aã]o\s+expirada/i,
    /este\s+ato\s+est[aá]\s+sendo\s+processado/i
  ];
  for (const regex of marcadoresGlobais) {
    if (regex.test(html)) {
      return { valido: false, motivo: `Marcador de erro/sessão detectado (${regex})` };
    }
  }

  if (!temAto) {
    const marcadoresEscopados = [
      /acesso\s+negado/i,
      /erro\s+interno\s+do\s+servidor/i,
      /502\s+bad\s+gateway/i,
      /503\s+service\s+unavailable/i,
      /504\s+gateway\s+time-?out/i,
      /fatal\s+error/i
    ];
    for (const regex of marcadoresEscopados) {
      if (regex.test(html)) {
        return { valido: false, motivo: `Marcador de erro/sessão detectado (${regex})` };
      }
    }
  }

  const container = temAto
    ? $('.ato')
    : $('#conteudo, #corpo, .conteudo').first();

  if (container.length === 0) {
    return { valido: false, motivo: 'Contêiner legislativo (.ato/#conteudo/#corpo/.conteudo) ausente' };
  }

  const containerLimpo = container.clone();
  containerLimpo.find('script, style, nav, header, footer').remove();
  containerLimpo.find('.noprint, #loading, .btn, .navbar, .menu').remove();
  containerLimpo.find('p:contains("Este texto não substitui a Publicação Oficial")').remove();
  containerLimpo.find('p:contains("Este texto nao substitui a Publicacao Oficial")').remove();
  containerLimpo.find('a:contains("Voltar"), a:contains("IMPRIMIR"), a:contains("COPIAR LINK"), a:contains("CRIAR TAGS")').remove();
  containerLimpo.find('a:contains("VER NOTAS"), a:contains("FECHAR NOTAS"), a:contains("PDF")').remove();

  const texto = containerLimpo.text().replace(/\s+/g, ' ').trim();
  if (texto.length < 20) {
    const temHrComEmenta = temAto &&
      containerLimpo.find('hr').length > 0 &&
      Boolean(meta && typeof meta.ementa === 'string' && meta.ementa.trim().length > 10);
    if (!temHrComEmenta) {
      return { valido: false, motivo: 'Conteúdo textual do ato insuficiente' };
    }
  }

  return { valido: true };
}

/**
 * Baixa e converte uma norma para Markdown
 */
async function processarAto(item, cookies, force = false) {
  const pastaTipo = item.tipo.toLowerCase();
  const filePath = path.join(__dirname, `../data/normas/${pastaTipo}/${item.ano}/${pastaTipo}-${item.numero}.md`);

  const itemSeq = item.seqAto || (item.href ? (new URLSearchParams(item.href.split('?')[1] || '')).get('seqAto') : '000') || '000';
  const isItemSubstantivo = itemSeq === '000';

  if (fs.existsSync(filePath) && !force) {
    const conteudoExistente = fs.readFileSync(filePath, 'utf-8');
    const matchSeqExistente = conteudoExistente.match(/seqAto=([^&\s"]+)/i);
    const seqExistente = matchSeqExistente ? matchSeqExistente[1] : '';
    const isExistenteNaoSubstantivo = Boolean(seqExistente && seqExistente !== '000');
    const isExistenteDataAtoVazia = /^data_ato:\s*""/m.test(conteudoExistente);
    const isExistenteRetificacao = /^fonte:.*seqAto=(RET|RT\d)/im.test(conteudoExistente) ||
                                  (!seqExistente && /^\s*RETIFICA[CÇ][AÃ]O\b/m.test(conteudoExistente));

    if (isItemSubstantivo && (isExistenteRetificacao || isExistenteNaoSubstantivo || isExistenteDataAtoVazia)) {
      // Priorização Substantiva: o arquivo existente contém apenas retificação, anexo não-000
      // ou data_ato vazia e o novo item é o ato substantivo original (seqAto=000). Prossegue para sobrescrever!
    } else {
      return { status: 'pulado', tipo: item.tipo, numero: item.numero, ano: item.ano };
    }
  }

  const fullUrl = `https://${HOST}${item.href}`;
  let res = await httpGet(item.href, cookies);
  let validacao = res.statusCode === 200 ? validarHtmlAto(res.body, item) : { valido: false, motivo: `HTTP ${res.statusCode}` };
  let renewedCookies = null;

  // Se houver falha de sessão/HTML inválido, renova cookie e tenta uma segunda vez antes de desistir
  if (!validacao.valido) {
    try {
      const freshCookies = await obterSessao();
      if (freshCookies) {
        res = await httpGet(item.href, freshCookies);
        validacao = res.statusCode === 200 ? validarHtmlAto(res.body, item) : { valido: false, motivo: `HTTP ${res.statusCode}` };
        if (validacao.valido) {
          renewedCookies = freshCookies;
        }
      }
    } catch (_) {
      // mantém validacao falha e deixa retry externo tratar
    }
  }

  if (res.statusCode !== 200 || !validacao.valido) {
    return { status: 'erro', item, statusCode: res.statusCode, motivo: validacao.motivo };
  }

  const parsed = parseNormaHtml(res.body, fullUrl, item);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, parsed.markdown, 'utf-8');

  return {
    status: 'sucesso',
    tipo: item.tipo,
    numero: item.numero,
    ano: item.ano,
    situacao: parsed.situacao,
    caminho: filePath,
    ...(renewedCookies ? { freshCookies: renewedCookies } : {})
  };
}

/**
 * Coleta todas as normas de uma data específica (DD/MM/AAAA)
 */
async function coletarPorData(dataStr, force = false) {
  console.log(`\n==================================================`);
  console.log(` Iniciando coleta para a data: ${dataStr}`);
  console.log(`==================================================`);

  const { cookies, listaAtos } = await pesquisarAtos({
    dataInicio: dataStr,
    dataFim: dataStr,
    ano: dataStr.split('/')[2]
  });

  console.log(`Total de atos identificados em ${dataStr}: ${listaAtos.length}`);

  let salvos = 0;
  let pulados = 0;
  let erros = 0;

  for (let i = 0; i < listaAtos.length; i++) {
    const item = listaAtos[i];
    try {
      const res = await processarAto(item, cookies, force);
      if (res.status === 'sucesso') {
        salvos++;
        console.log(`[${i + 1}/${listaAtos.length}] Salvo: ${item.tipo} nº ${item.numero}/${item.ano} (${res.situacao})`);
      } else if (res.status === 'pulado') {
        pulados++;
      } else {
        erros++;
        console.error(`[${i + 1}/${listaAtos.length}] Erro ao baixar ${item.tipo} nº ${item.numero}`);
      }
      await sleep(250);
    } catch (err) {
      erros++;
      console.error(`[${i + 1}/${listaAtos.length}] Falha:`, err.message);
    }
  }

  console.log(`\nResumo da Coleta (${dataStr}): ${salvos} salvos | ${pulados} já existentes | ${erros} falhas`);
  return { salvos, pulados, erros, total: listaAtos.length };
}

/**
 * Coleta todas as normas de um ano
 */
async function coletarPorAno(ano, limite = 0, force = false) {
  console.log(`\n==================================================`);
  console.log(` Iniciando coleta para o ano: ${ano}`);
  console.log(`==================================================`);

  const { cookies, listaAtos } = await pesquisarAtos({ ano });
  console.log(`Total de atos identificados em ${ano}: ${listaAtos.length}`);

  const alvos = limite > 0 ? listaAtos.slice(0, limite) : listaAtos;
  let salvos = 0;
  let pulados = 0;
  let erros = 0;

  for (let i = 0; i < alvos.length; i++) {
    const item = alvos[i];
    try {
      const res = await processarAto(item, cookies, force);
      if (res.status === 'sucesso') {
        salvos++;
        console.log(`[${i + 1}/${alvos.length}] Salvo: ${item.tipo} nº ${item.numero}/${item.ano} (${res.situacao})`);
      } else if (res.status === 'pulado') {
        pulados++;
      } else {
        erros++;
      }
      await sleep(250);
    } catch (err) {
      erros++;
    }
  }

  console.log(`\nResumo (${ano}): ${salvos} salvos | ${pulados} pulados | ${erros} erros`);
  return { salvos, pulados, erros, total: alvos.length };
}


/**
 * Coleta todas as normas em um intervalo de datas (DD/MM/AAAA até DD/MM/AAAA)
 */
async function coletarPorPeriodo(dataInicioStr, dataFimStr, force = false) {
  const parseData = (str) => {
    const [d, m, y] = str.split('/').map(Number);
    return new Date(y, m - 1, d);
  };
  const formatData = (date) => {
    const d = String(date.getDate()).padStart(2, '0');
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const y = date.getFullYear();
    return `${d}/${m}/${y}`;
  };

  const inicio = parseData(dataInicioStr);
  const fim = parseData(dataFimStr);

  console.log(`\n==================================================`);
  console.log(` Coleta por Período: ${dataInicioStr} a ${dataFimStr}`);
  console.log(`==================================================`);

  let totais = { salvos: 0, pulados: 0, erros: 0, total: 0 };
  const atual = new Date(inicio);

  while (atual <= fim) {
    const diaFormatado = formatData(atual);
    const resultadoDia = await coletarPorData(diaFormatado, force);
    totais.salvos += resultadoDia.salvos;
    totais.pulados += resultadoDia.pulados;
    totais.erros += resultadoDia.erros;
    totais.total += resultadoDia.total;

    atual.setDate(atual.getDate() + 1);
  }

  console.log(`\n==================================================`);
  console.log(` Resumo Final do Período (${dataInicioStr} a ${dataFimStr}):`);
  console.log(` Total de atos: ${totais.total} | Salvos: ${totais.salvos} | Pulados: ${totais.pulados} | Erros: ${totais.erros}`);
  console.log(`==================================================`);

  return totais;
}

/**
 * Coleta todas as normas de um mês específico
 * @param {number|string} mes 1 a 12
 * @param {number|string} ano AAAA
 */
async function coletarPorMes(mes, ano = new Date().getFullYear(), force = false) {
  const mesNum = parseInt(mes, 10);
  const anoNum = parseInt(ano, 10);
  const mesFormatado = String(mesNum).padStart(2, '0');

  const hoje = new Date();
  const hojeAno = hoje.getFullYear();
  const hojeMes = hoje.getMonth() + 1;
  const hojeDia = hoje.getDate();

  const ultimoDiaMes = new Date(anoNum, mesNum, 0).getDate();
  let diaFinal = ultimoDiaMes;

  // Se for o mês e ano corrente, limita até o dia de hoje
  if (anoNum === hojeAno && mesNum === hojeMes && diaFinal > hojeDia) {
    diaFinal = hojeDia;
  }

  const dataInicioStr = `01/${mesFormatado}/${anoNum}`;
  const dataFimStr = `${String(diaFinal).padStart(2, '0')}/${mesFormatado}/${anoNum}`;

  return await coletarPorPeriodo(dataInicioStr, dataFimStr, force);
}

module.exports = {
  httpGet,
  httpPost,
  obterSessao,
  validarHtmlAto,
  coletarPorData,
  coletarPorAno,
  coletarPorPeriodo,
  coletarPorMes,
  pesquisarAtos,
  processarAto
};
