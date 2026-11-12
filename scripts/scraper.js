const https = require('https');
const fs = require('fs');
const path = require('path');
const { parseNormaHtml } = require('./parser');

function fetchGet(urlPath) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'anvisalegis.datalegis.net',
      path: urlPath,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
        'Cookie': 'PHPSESSID=vhld911e3mhfirr5s1527kruea; apresentacao=true'
      }
    };

    https.get(options, (res) => {
      let chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => {
        const body = Buffer.concat(chunks).toString('utf-8');
        resolve({ statusCode: res.statusCode, body });
      });
    }).on('error', reject);
  });
}

async function obterLinksPorAno(ano) {
  const urlResenha = `/action/ActionDatalegis.php?acao=abrirResenhaAnoData&cod_modulo=310&cod_menu=9882&ano=${ano}`;
  const res = await fetchGet(urlResenha);
  if (res.statusCode !== 200) {
    console.warn(`[Aviso] Falha ao acessar resenha do ano ${ano} (Status: ${res.statusCode})`);
    return [];
  }

  const regex = /href=["'](\/action\/ActionDatalegis\.php\?acao=abrirTextoAto[^"']+)["']/gi;
  let m;
  const links = [];
  while ((m = regex.exec(res.body)) !== null) {
    links.push(m[1].replace(/&amp;/g, '&'));
  }

  return [...new Set(links)];
}

async function processarAto(linkAto, force = false) {
  const params = new URLSearchParams(linkAto.split('?')[1]);
  let tipo = (params.get('tipo') || 'RDC').toLowerCase();
  if (tipo === 'inm') tipo = 'in';
  if (tipo === 'por') tipo = 'portaria';

  const rawNum = params.get('numeroAto') || '0';
  const numero = parseInt(rawNum, 10).toString();
  const ano = params.get('valorAno') || '';

  const filePath = path.join(__dirname, `../data/normas/${tipo}/${ano}/${tipo}-${numero}.md`);

  if (fs.existsSync(filePath) && !force) {
    return { status: 'pulado', tipo, numero, ano };
  }

  const fullUrl = `https://anvisalegis.datalegis.net${linkAto}`;
  const res = await fetchGet(linkAto);
  if (res.statusCode !== 200 || !res.body) {
    return { status: 'erro', link: linkAto, statusCode: res.statusCode };
  }

  const parsed = parseNormaHtml(res.body, fullUrl, {
    tipo: tipo.toUpperCase(),
    numero,
    ano
  });

  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, parsed.markdown, 'utf-8');

  return { status: 'sucesso', tipo, numero, ano, path: filePath };
}

async function coletarAno(ano, limite = 0, force = false) {
  console.log(`\n========================================`);
  console.log(` Iniciando coleta para o ano ${ano}...`);
  console.log(`========================================`);

  const links = await obterLinksPorAno(ano);
  console.log(`Total de normas identificadas em ${ano}: ${links.length}`);

  const alvos = limite > 0 ? links.slice(0, limite) : links;

  let salvos = 0;
  let pulados = 0;
  let erros = 0;

  for (let i = 0; i < alvos.length; i++) {
    const link = alvos[i];
    try {
      const res = await processarAto(link, force);
      if (res.status === 'sucesso') salvos++;
      else if (res.status === 'pulado') pulados++;
      else erros++;

      process.stdout.write(`Progresso: [${i + 1}/${alvos.length}] (Salvos: ${salvos}, Pulados: ${pulados}, Erros: ${erros})\r`);
      await new Promise(r => setTimeout(r, 200));
    } catch (err) {
      erros++;
      console.error(`\nErro ao processar ${link}:`, err.message);
    }
  }

  console.log(`\nConcluído ano ${ano}: ${salvos} salvos, ${pulados} já existiam, ${erros} falhas.`);
}

module.exports = { coletarAno, processarAto, obterLinksPorAno };

if (require.main === module) {
  // Re-processar com force=true para atualizar os metadados dos 5 primeiros
  coletarAno(2024, 5, true).then(() => {
    console.log('\nColeta e atualização finalizadas!');
  }).catch(console.error);
}
