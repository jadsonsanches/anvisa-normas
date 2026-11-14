const https = require('https');
const querystring = require('querystring');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { parseNormaHtml, normalizarTipo } = require('./parser');

const HOST = 'anvisalegis.datalegis.net';
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function httpGet(pathUrl, cookies = '') {
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

    https.get(options, res => {
      let chunks = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('latin1')
        });
      });
    }).on('error', reject);
  });
}

function httpPost(pathUrl, data, cookies = '', extraHeaders = {}) {
  return new Promise((resolve, reject) => {
    const postBody = typeof data === 'string' ? data : querystring.stringify(data);
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
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: Buffer.concat(chunks).toString('latin1')
        });
      });
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
  const rawCookies = res.headers['set-cookie'] || [];
  const cookies = rawCookies.map(c => c.split(';')[0]).join('; ');
  return cookies;
}

/**
 * Realiza a busca de atos por critérios (datas ou ano)
 */
async function pesquisarAtos(criterios = {}) {
  const cookies = await obterSessao();

  const ano = criterios.ano ? criterios.ano.toString() : '';
  const dataInicio = criterios.dataInicio || '';
  const dataFim = criterios.dataFim || '';

  const postData = {
    cod_modulo: '134',
    cod_menu: '1696',
    redirect_consultaato: 'apresentarAtos',
    cod_local: 'BR',
    inApsModuloBase: 'S',
    ind_legis_juris: 'L',
    vlr_ano: ano,
    dta_promulgacao: dataInicio,
    dta_promulgacao_final: dataFim
  };

  // 1. Inicializa o estado de busca na sessão PHP
  await httpPost(
    '/action/ActionDatalegis.php?acao=consultarAtosInicial&cod_modulo=134&cod_menu=1696',
    postData,
    cookies
  );

  // 2. Coleta os itens paginados
  let pagina = 1;
  let totalEncontrados = 0;
  const listaAtos = [];

  while (true) {
    const pageRes = await httpPost(
      `/action/ActionDatalegis.php?acao=abrirPagina&pagina=${pagina}&legisjuris=L`,
      postData,
      cookies,
      { 'X-Requested-With': 'XMLHttpRequest' }
    );

    let data;
    try {
      data = JSON.parse(pageRes.body);
    } catch (e) {
      console.warn(`[Aviso] Resposta não-JSON na página ${pagina}`);
      break;
    }

    if (!data.resultado) break;

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

      // Extração da data exata do ato (ex: "Portaria n° 1.294, de 11/11/2026")
      let dataAto = '';
      const matchDataAto = text.match(/de\s+(\d{2}\/\d{2}\/\d{4})/i);
      if (matchDataAto) {
        dataAto = matchDataAto[1];
      }

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
        dataPublicacaoDou: dataInicio || dataFim || '',
        ementa,
        textoCompleto: text
      });
    });

    if (itensPagina.length === 0) break;

    listaAtos.push(...itensPagina);

    // O Datalegis pagina de 50 em 50 registros por página.
    // Se a página retornou menos de 50 registros, chegamos ao final dos resultados.
    if (itensPagina.length < 50) {
      break;
    }

    pagina++;
    await sleep(300);
  }

  return { cookies, listaAtos };
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
    const isExistenteRetificacao = /seqAto=(RET|RT\d)/i.test(conteudoExistente) ||
                                  conteudoExistente.includes('RETIFICAÇÃO') ||
                                  conteudoExistente.includes('RETIFICACAO');

    if (isItemSubstantivo && isExistenteRetificacao) {
      // Priorização Substantiva: o arquivo existente contém apenas retificação/errata
      // e o novo item é o ato substantivo original (seqAto=000). Prossegue para sobrescrever!
    } else {
      return { status: 'pulado', tipo: item.tipo, numero: item.numero, ano: item.ano };
    }
  }

  const fullUrl = `https://${HOST}${item.href}`;
  const res = await httpGet(item.href, cookies);

  if (res.statusCode !== 200 || !res.body) {
    return { status: 'erro', item, statusCode: res.statusCode };
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
    caminho: filePath
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
  coletarPorData,
  coletarPorAno,
  coletarPorPeriodo,
  coletarPorMes,
  pesquisarAtos,
  processarAto
};
