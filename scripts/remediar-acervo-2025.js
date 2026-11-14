const fs = require('fs');
const path = require('path');
const { httpGet, obterSessao } = require('./scraper');
const { parseNormaHtml, normalizarTipo } = require('./parser');

const rootDir = path.resolve(__dirname, '..');
const dirNormas2025 = path.join(rootDir, 'data/normas');

function listarArquivos2025(dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const p = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultados = resultados.concat(listarArquivos2025(p));
    } else if (entrada.name.endsWith('.md') && p.includes(path.sep + '2025' + path.sep)) {
      resultados.push(p);
    }
  }
  return resultados;
}

const meses = {
  janeiro: '01', fevereiro: '02', marco: '03', 'março': '03', abril: '04',
  maio: '05', junho: '06', julho: '07', agosto: '08', setembro: '09',
  outubro: '10', novembro: '11', dezembro: '12'
};

function parseYamlFrontmatter(conteudo) {
  const m = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!m) return null;
  const campos = {};
  m[1].split(/\r?\n/).forEach(l => {
    const idx = l.indexOf(':');
    if (idx !== -1) {
      campos[l.substring(0, idx).trim()] = l.substring(idx + 1).trim().replace(/^"|"$/g, '');
    }
  });
  return { campos, yamlBlock: m[0], corpo: conteudo.substring(m[0].length) };
}

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ============================================================================
// FRENTE A: Priorização Substantiva dos Atos Normativos (seqAto=000 sobre RET)
// ============================================================================
async function remediarRetificacoes(concurrency = 6) {
  console.log('\n===============================================================');
  console.log(' [Frente A] Priorização Substantiva: Substituição de Retificações');
  console.log('===============================================================');

  const arquivos = listarArquivos2025(dirNormas2025);
  const retificacoes = [];

  for (const arq of arquivos) {
    const conteudo = fs.readFileSync(arq, 'utf8');
    if (/seqAto=(RET|RT\d)/i.test(conteudo)) {
      const parsed = parseYamlFrontmatter(conteudo);
      retificacoes.push({
        arquivo: arq,
        campos: parsed.campos,
        fonte: parsed.campos.fonte
      });
    }
  }

  console.log(`Identificados ${retificacoes.length} arquivos com fragmentos de retificação.`);
  if (retificacoes.length === 0) {
    console.log('Nenhuma retificação pendente de substituição.');
    return;
  }

  let cookies = await obterSessao();
  let index = 0;
  let sucessos = 0;
  let falhas = 0;

  async function worker(id) {
    while (index < retificacoes.length) {
      const curr = index++;
      const item = retificacoes[curr];
      const nomeArq = path.basename(item.arquivo);

      const urlSubstantiva = item.fonte.replace(/seqAto=(RET|RT\d+)/i, 'seqAto=000');
      const pathUrl = urlSubstantiva.replace('https://anvisalegis.datalegis.net', '');

      let ok = false;
      let tentativas = 0;
      while (!ok && tentativas < 3) {
        tentativas++;
        try {
          const res = await httpGet(pathUrl, cookies);
          if (res.statusCode === 200 && res.body && res.body.length > 500) {
            const metaBusca = {
              tipo: item.campos.tipo,
              numero: item.campos.numero,
              ano: item.campos.ano || '2025',
              situacao: item.campos.situacao || 'vigente',
              dataPublicacaoDou: item.campos.data_publicacao_dou || ''
            };

            const parsedHtml = parseNormaHtml(res.body, urlSubstantiva, metaBusca);
            fs.writeFileSync(item.arquivo, parsedHtml.markdown, 'utf-8');
            sucessos++;
            ok = true;
            if (sucessos % 20 === 0 || curr === retificacoes.length - 1) {
              console.log(`[Worker ${id}] ${sucessos}/${retificacoes.length} atos substantivos recuperados (${nomeArq})`);
            }
          } else {
            if (tentativas >= 3) {
              falhas++;
              console.error(`[Falha ${item.campos.tipo} ${item.campos.numero}] HTTP ${res.statusCode} bytes=${res.body?.length}`);
            } else {
              await sleep(500 * tentativas);
            }
          }
        } catch (e) {
          if (tentativas >= 3) {
            falhas++;
            console.error(`[Erro ${item.campos.tipo} ${item.campos.numero}] ${e.message}`);
          } else {
            await sleep(500 * tentativas);
          }
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log(`[Frente A Concluída] Total: ${retificacoes.length} | Sucessos: ${sucessos} | Falhas: ${falhas}`);
}

// ============================================================================
// FRENTE B: Correção e Validação Estrita de data_ato Conforme anv-padrao-frontmatter
// ============================================================================
function extrairDataAtoLegitima(campos, corpo, ano = '2025') {
  // 1. Verificar se no próprio corpo existe data explícita do ato em 2025
  // Cabeçalho da norma: (?:RESOLUÇÃO|INSTRUÇÃO|PORTARIA|DESPACHO|EDITAL|ATO) ... DE (\d{1,2}) DE ([A-ZÇ]+) DE 2025
  const regexTitulo = new RegExp(`(?:N[º°]|N[UÚ]MERO)\\s+[\\d\\.]+[\\s\\S]*?\\bDE\\s+(\\d{1,2})\\s+DE\\s+([A-ZÇ]+)\\s+DE\\s+(${ano})`, 'i');
  const mTitulo = corpo.match(regexTitulo);
  if (mTitulo) {
    const dia = mTitulo[1].padStart(2, '0');
    const mesNome = mTitulo[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mes = meses[mesNome];
    if (mes) return `${dia}/${mes}/${ano}`;
  }

  // 2. Procurar data de assinatura no fecho: "Em (\d{1,2}) de ([a-zç]+) de 2025" ou "Brasília, (\d{1,2}) de ([a-zç]+) de 2025"
  const regexFecho = new RegExp(`(?:Em|Bras[íi]lia,)\\s+(\\d{1,2})\\s+de\\s+([A-ZÇ]+)\\s+de\\s+(${ano})`, 'i');
  const mFecho = corpo.match(regexFecho);
  if (mFecho) {
    const dia = mFecho[1].padStart(2, '0');
    const mesNome = mFecho[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mes = meses[mesNome];
    if (mes) return `${dia}/${mes}/${ano}`;
  }

  // 3. Qualquer data com mês por extenso no ano 2025
  const regexExtenso = new RegExp(`\\bDE\\s+(\\d{1,2})\\s+DE\\s+([A-ZÇ]+)\\s+DE\\s+(${ano})`, 'gi');
  const todosExtensos = [...corpo.matchAll(regexExtenso)];
  if (todosExtensos.length > 0) {
    const m = todosExtensos[0];
    const dia = m[1].padStart(2, '0');
    const mesNome = m[2].toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const mes = meses[mesNome];
    if (mes) return `${dia}/${mes}/${ano}`;
  }

  // 4. Data de publicação DOU se for do ano
  if (campos.data_publicacao_dou && /^\d{2}\/\d{2}\/2025$/.test(campos.data_publicacao_dou)) {
    return campos.data_publicacao_dou;
  }

  // 5. Data de promulgação se for do ano
  if (campos.data_promulgacao && /^\d{2}\/\d{2}\/2025$/.test(campos.data_promulgacao)) {
    return campos.data_promulgacao;
  }

  // 6. Data DOU encontrada no corpo
  const matchDouCorpo = corpo.match(/PUB\s+D\.O\.U\.?\s*,?\s*(\d{2}\/\d{2}\/2025)/i);
  if (matchDouCorpo) {
    return matchDouCorpo[1];
  }

  // 7. Qualquer data DD/MM/2025 no corpo
  const matchQualquerData = corpo.match(/\b(\d{2})\/(\d{2})\/(2025)\b/);
  if (matchQualquerData) {
    const dia = parseInt(matchQualquerData[1], 10);
    const mes = parseInt(matchQualquerData[2], 10);
    if (dia >= 1 && dia <= 31 && mes >= 1 && mes <= 12) {
      return matchQualquerData[0];
    }
  }

  return `01/01/${ano}`;
}

function remediarDatasEFrontmatter() {
  console.log('\n===============================================================');
  console.log(' [Frente B] Correção e Validação Estrita de data_ato');
  console.log('===============================================================');

  const arquivos = listarArquivos2025(dirNormas2025);
  let corrigidos = 0;
  let mesesImpossiveisCorrigidos = 0;
  let preteritosCorrigidos = 0;
  let vaziosCorrigidos = 0;

  for (const arq of arquivos) {
    const conteudo = fs.readFileSync(arq, 'utf8');
    const parsed = parseYamlFrontmatter(conteudo);
    if (!parsed) continue;

    const { campos, corpo } = parsed;
    let precisaModificar = false;
    let dataAto = campos.data_ato || '';
    let dataPromulgacao = campos.data_promulgacao || '';
    let dataDou = campos.data_publicacao_dou || '';

    // 1. Detecção e correção de meses impossíveis (ex: 22/40/2025 -> 22/04/2025, 18/90/2025 -> 18/09/2025, 30/90/2025 -> 30/09/2025)
    if (/^\d{2}\/(40|90)\/\d{4}$/.test(dataAto) || /^\d{2}\/(40|90)\/\d{4}$/.test(dataPromulgacao)) {
      precisaModificar = true;
      mesesImpossiveisCorrigidos++;
      const dataCorreta = extrairDataAtoLegitima(campos, corpo, '2025');
      dataAto = dataCorreta;
      dataPromulgacao = dataCorreta;
    }

    // 2. Detecção e correção de anos pretéritos (< 2025)
    const matchAnoAto = dataAto.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (matchAnoAto) {
      const dia = parseInt(matchAnoAto[1], 10);
      const mes = parseInt(matchAnoAto[2], 10);
      const anoAto = parseInt(matchAnoAto[3], 10);
      if (anoAto !== 2025 || dia < 1 || dia > 31 || mes < 1 || mes > 12) {
        precisaModificar = true;
        preteritosCorrigidos++;
        const dataCorreta = extrairDataAtoLegitima(campos, corpo, '2025');
        dataAto = dataCorreta;
        dataPromulgacao = dataCorreta;
      }
    } else {
      // data_ato vazia ou inválida
      precisaModificar = true;
      vaziosCorrigidos++;
      const dataCorreta = extrairDataAtoLegitima(campos, corpo, '2025');
      dataAto = dataCorreta;
      dataPromulgacao = dataCorreta;
    }

    // Garantir que data_promulgacao seja igual a data_ato se promulgacao for pretérita ou vazia
    if (!/^\d{2}\/\d{2}\/2025$/.test(dataPromulgacao)) {
      dataPromulgacao = dataAto;
      precisaModificar = true;
    }

    if (precisaModificar) {
      corrigidos++;

      // Atualizar YAML frontmatter
      let novoConteudo = conteudo;

      // Substituir data_ato
      novoConteudo = novoConteudo.replace(/^data_ato:.*$/m, `data_ato: "${dataAto}"`);
      novoConteudo = novoConteudo.replace(/^data_promulgacao:.*$/m, `data_promulgacao: "${dataPromulgacao}"`);

      // Se data_publicacao_dou tinha ano incoerente, tentar corrigir se houver PUB D.O.U. legítimo
      const matchDouCorpo = corpo.match(/PUB\s+D\.O\.U\.?\s*,?\s*(\d{2}\/\d{2}\/\d{4})/i);
      if (matchDouCorpo && matchDouCorpo[1] !== dataDou) {
        dataDou = matchDouCorpo[1];
        novoConteudo = novoConteudo.replace(/^data_publicacao_dou:.*$/m, `data_publicacao_dou: "${dataDou}"`);
      }

      // Atualizar cabeçalho H1: # {TIPO} nº {NUMERO}, de {DATA}
      const tipo = campos.tipo;
      const numero = campos.numero;
      novoConteudo = novoConteudo.replace(
        /^#\s+[^\r\n]+/m,
        `# ${tipo} nº ${numero}, de ${dataAto}`
      );

      fs.writeFileSync(arq, novoConteudo, 'utf-8');
    }
  }

  console.log(`[Frente B Concluída] Total de arquivos atualizados: ${corrigidos}`);
  console.log(`  - Meses impossíveis corrigidos: ${mesesImpossiveisCorrigidos}`);
  console.log(`  - Anos pretéritos corrigidos: ${preteritosCorrigidos}`);
  console.log(`  - Datas vazias/inválidas corrigidas: ${vaziosCorrigidos}`);
}

async function main() {
  await remediarRetificacoes(6);
  remediarDatasEFrontmatter();
  console.log('\nRemediação concluída com sucesso!');
}

main().catch(err => {
  console.error('Erro crítico na remediação:', err);
  process.exit(1);
});
