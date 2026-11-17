const { pesquisarAtos, processarAto } = require('./scraper');

const MESES_2022 = [
  { mesAno: '01/2022', dataInicio: '01/01/2022', dataFim: '31/01/2022', ano: '2022' },
  { mesAno: '02/2022', dataInicio: '01/02/2022', dataFim: '28/02/2022', ano: '2022' },
  { mesAno: '03/2022', dataInicio: '01/03/2022', dataFim: '31/03/2022', ano: '2022' },
  { mesAno: '04/2022', dataInicio: '01/04/2022', dataFim: '30/04/2022', ano: '2022' },
  { mesAno: '05/2022', dataInicio: '01/05/2022', dataFim: '31/05/2022', ano: '2022' },
  { mesAno: '06/2022', dataInicio: '01/06/2022', dataFim: '30/06/2022', ano: '2022' },
  { mesAno: '07/2022', dataInicio: '01/07/2022', dataFim: '31/07/2022', ano: '2022' },
  { mesAno: '08/2022', dataInicio: '01/08/2022', dataFim: '31/08/2022', ano: '2022' },
  { mesAno: '09/2022', dataInicio: '01/09/2022', dataFim: '30/09/2022', ano: '2022' },
  { mesAno: '10/2022', dataInicio: '01/10/2022', dataFim: '31/10/2022', ano: '2022' },
  { mesAno: '11/2022', dataInicio: '01/11/2022', dataFim: '30/11/2022', ano: '2022' },
  { mesAno: '12/2022', dataInicio: '01/12/2022', dataFim: '31/12/2022', ano: '2022' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizarFiltroMes(filtro) {
  if (!filtro) return '';
  const limpo = String(filtro).trim();
  const isoMatch = limpo.match(/^(\d{4})-(\d{2})$/);
  if (isoMatch) return `${isoMatch[2]}/${isoMatch[1]}`;
  return limpo;
}

function parseCliArgs(argv = process.argv.slice(2)) {
  let force = false;
  let mesRaw = '';
  let mesSolicitado = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--force') {
      force = true;
    } else if (arg.startsWith('--mes=')) {
      mesSolicitado = true;
      const val = arg.slice('--mes='.length);
      if (!val || val.trim() === '') {
        throw new Error('Argumento --mes= requer um valor válido (ex.: --mes=08/2022 ou --mes=2022-08)');
      }
      mesRaw = val;
    } else if (arg === '--mes') {
      mesSolicitado = true;
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) {
        throw new Error('Argumento --mes requer um valor válido (ex.: --mes 08/2022 ou --mes 2022-08)');
      }
      mesRaw = next;
      i++;
    }
  }

  const mes = mesSolicitado ? normalizarFiltroMes(mesRaw) : '';
  if (mesSolicitado) {
    const valido = MESES_2022.some(m => m.mesAno === mes);
    if (!valido) {
      throw new Error(`Nenhum mês correspondente encontrado para o filtro: ${mes}`);
    }
  }

  return { force, mes };
}

function ordenarEDeduplicarFila(listaAtos) {
  const ordenada = [...listaAtos].sort((a, b) => {
    const seqA = a.seqAto || '000';
    const seqB = b.seqAto || '000';
    if (seqA === '000' && seqB !== '000') return -1;
    if (seqA !== '000' && seqB === '000') return 1;
    return 0;
  });

  const mapaUnicos = new Map();
  for (const item of ordenada) {
    const chave = `${item.tipo}|${item.numero}|${item.ano}`;
    if (!mapaUnicos.has(chave)) {
      mapaUnicos.set(chave, item);
    }
  }
  return [...mapaUnicos.values()];
}

async function processarFilaAtos(filaAtos, initialCookies, concurrency, force, labelLog) {
  let activeCookies = initialCookies;
  let salvos = 0;
  let pulados = 0;
  let erros = 0;
  let index = 0;
  const itensComErro = [];

  async function worker() {
    while (index < filaAtos.length) {
      const currentIndex = index++;
      const item = filaAtos[currentIndex];

      let sucesso = false;
      let tentativas = 0;
      const MAX_TENTATIVAS = 3;

      while (!sucesso && tentativas < MAX_TENTATIVAS) {
        tentativas++;
        try {
          const res = await processarAto(item, activeCookies, force);
          if (res.freshCookies) {
            activeCookies = res.freshCookies;
          }
          if (res.status === 'sucesso') {
            salvos++;
            sucesso = true;
            if (salvos % 50 === 0 || currentIndex === filaAtos.length - 1) {
              console.log(`[${labelLog} - Progresso ${currentIndex + 1}/${filaAtos.length}] Salvos: ${salvos} | Pulados: ${pulados} | Falhas: ${erros}`);
            }
            await sleep(120);
          } else if (res.status === 'pulado') {
            pulados++;
            sucesso = true;
          } else {
            if (tentativas >= MAX_TENTATIVAS) {
              erros++;
              itensComErro.push(`${item.tipo} ${item.numero}/${item.ano} (${res.motivo || 'status ' + res.statusCode})`);
              console.error(`[${labelLog}] Erro persistente ao baixar ${item.tipo} nº ${item.numero}/${item.ano} (tentativa ${tentativas}): ${res.motivo || 'status ' + res.statusCode}`);
            } else {
              await sleep(500 * Math.pow(2, tentativas - 1));
            }
          }
        } catch (err) {
          if (tentativas >= MAX_TENTATIVAS) {
            erros++;
            itensComErro.push(`${item.tipo} ${item.numero}/${item.ano} (${err.message})`);
            console.error(`[${labelLog}] Falha persistente no item ${item.tipo} nº ${item.numero}/${item.ano}: ${err.message}`);
          } else {
            await sleep(500 * Math.pow(2, tentativas - 1));
          }
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  await Promise.all(workers);

  return { salvos, pulados, erros, itensComErro };
}

async function coletarMes(configMes, concurrency = 6, force = false) {
  console.log(`\n--------------------------------------------------`);
  console.log(`[Mês ${configMes.mesAno}] Buscando atos no Datalegis (${configMes.dataInicio} a ${configMes.dataFim})...`);
  console.log(`--------------------------------------------------`);

  let pesquisaResultado = null;
  for (let tentativaBusca = 1; tentativaBusca <= 3; tentativaBusca++) {
    try {
      pesquisaResultado = await pesquisarAtos({
        dataInicio: configMes.dataInicio,
        dataFim: configMes.dataFim,
        ano: configMes.ano,
        ordenacao: 'dta_promulgacao:ASC',
        qtdPagina: 500
      });
      break;
    } catch (err) {
      if (tentativaBusca === 3) throw err;
      const delayMs = 1000 * Math.pow(2, tentativaBusca - 1);
      console.warn(`[${configMes.mesAno}] Falha ao pesquisar atos (tentativa ${tentativaBusca}/3): ${err.message}. Retentando em ${delayMs}ms...`);
      await sleep(delayMs);
    }
  }

  const { cookies, listaAtos, expectedTotal } = pesquisaResultado;
  console.log(`Total de registros identificados em ${configMes.mesAno}: ${listaAtos.length}${expectedTotal !== null ? ` (esperado: ${expectedTotal})` : ''}`);

  const filaAtos = ordenarEDeduplicarFila(listaAtos);
  if (filaAtos.length !== listaAtos.length) {
    console.log(`[${configMes.mesAno}] Atos únicos após priorização seqAto=000: ${filaAtos.length} (de ${listaAtos.length} registros)`);
  }

  const { salvos, pulados, erros, itensComErro } = await processarFilaAtos(
    filaAtos,
    cookies,
    concurrency,
    force,
    configMes.mesAno
  );

  console.log(`[${configMes.mesAno} Concluído] Registros: ${listaAtos.length} | Únicos: ${filaAtos.length} | Salvos: ${salvos} | Já existentes: ${pulados} | Falhas: ${erros}`);

  return {
    mesAno: configMes.mesAno,
    totalRegistros: listaAtos.length,
    expectedTotal,
    total: filaAtos.length,
    salvos,
    pulados,
    erros,
    itensComErro,
    hrefs: listaAtos.map(item => item.href)
  };
}

async function coletar2022(options = {}) {
  const inicioTempo = Date.now();
  const concurrency = options.concurrency || 6;

  const cliArgs = parseCliArgs(options.argv || process.argv.slice(2));
  const force = options.force !== undefined ? Boolean(options.force) : cliArgs.force;
  const filtroMes = options.mes !== undefined ? normalizarFiltroMes(options.mes) : cliArgs.mes;

  if (filtroMes && !MESES_2022.some(m => m.mesAno === filtroMes)) {
    throw new Error(`Nenhum mês correspondente encontrado para o filtro: ${filtroMes}`);
  }

  console.log('==================================================');
  console.log('   COLETA ANVISA: ANO COMPLETO DE 2022            ');
  console.log(`   Metodologia Paralela Determinística (Concorrência ${concurrency})`);
  if (force) console.log('   Modo: FORCE ATIVADO (sobrescreverá arquivos existentes)');
  if (filtroMes) console.log(`   Filtro específico: Mês ${filtroMes}`);
  console.log('==================================================');

  const mesesParaColetar = filtroMes
    ? MESES_2022.filter(m => m.mesAno === filtroMes)
    : MESES_2022;

  const resultados = [];
  let totalRegistrosGeral = 0;
  let totalAtosIdentificados = 0;
  let totalSalvosGeral = 0;
  let totalPuladosGeral = 0;
  let totalErrosGeral = 0;

  for (const configMes of mesesParaColetar) {
    const resMes = await coletarMes(configMes, concurrency, force);
    resultados.push(resMes);
    totalRegistrosGeral += resMes.totalRegistros;
    totalAtosIdentificados += resMes.total;
    totalSalvosGeral += resMes.salvos;
    totalPuladosGeral += resMes.pulados;
    totalErrosGeral += resMes.erros;
  }

  let reconciliationOk = true;
  let reconciliacaoDetalhes = null;

  if (!filtroMes) {
    console.log('\n--------------------------------------------------');
    console.log('[Reconciliação Anual] Conferindo união dos 12 meses contra busca anual (ordenacao=num_ato:ASC)...');
    console.log('--------------------------------------------------');

    const unionHrefs = new Set(resultados.flatMap(r => r.hrefs || []));
    const annualRes = await pesquisarAtos({
      ano: '2022',
      ordenacao: 'num_ato:ASC',
      qtdPagina: 500
    });

    const faltantes = annualRes.listaAtos.filter(item => !unionHrefs.has(item.href));
    console.log(`[Reconciliação Anual] União mensal: ${unionHrefs.size} hrefs | Busca anual: ${annualRes.listaAtos.length} hrefs (esperado: ${annualRes.expectedTotal}) | Faltantes: ${faltantes.length}`);

    if (faltantes.length > 0) {
      console.warn(`[Reconciliação Anual] Baixando ${faltantes.length} atos faltantes detectados na reconciliação...`);
      const filaFaltantes = ordenarEDeduplicarFila(faltantes);
      const resFaltantes = await processarFilaAtos(
        filaFaltantes,
        annualRes.cookies,
        concurrency,
        force,
        'Reconciliação 2022'
      );
      totalSalvosGeral += resFaltantes.salvos;
      totalPuladosGeral += resFaltantes.pulados;
      totalErrosGeral += resFaltantes.erros;
      for (const item of faltantes) {
        unionHrefs.add(item.href);
      }
      if (resFaltantes.erros > 0) {
        reconciliationOk = false;
      }
    }

    const faltantesPos = annualRes.listaAtos.filter(item => !unionHrefs.has(item.href));
    if (faltantesPos.length > 0 || (annualRes.expectedTotal !== null && unionHrefs.size < annualRes.expectedTotal)) {
      reconciliationOk = false;
    }

    reconciliacaoDetalhes = {
      unionHrefsCount: unionHrefs.size,
      annualCount: annualRes.listaAtos.length,
      expectedTotal: annualRes.expectedTotal,
      faltantesInicial: faltantes.length,
      faltantesPos: faltantesPos.length
    };
  }

  const duracaoSegundos = Math.round((Date.now() - inicioTempo) / 1000);

  console.log('\n==================================================');
  console.log('   RESUMO CONSOLIDADO - ANO DE 2022               ');
  console.log('==================================================');
  console.log(`Tempo total de execução: ${duracaoSegundos}s`);
  console.log(`Total de registros no Datalegis: ${totalRegistrosGeral}`);
  console.log(`Total de atos únicos processados: ${totalAtosIdentificados}`);
  console.log(`Novos atos salvos: ${totalSalvosGeral}`);
  console.log(`Atos já existentes (pulados): ${totalPuladosGeral}`);
  console.log(`Erros/Falhas: ${totalErrosGeral}`);
  if (reconciliacaoDetalhes) {
    console.log(`Reconciliação anual: ${reconciliacaoDetalhes.unionHrefsCount}/${reconciliacaoDetalhes.expectedTotal} hrefs (faltantes pós-reconciliação: ${reconciliacaoDetalhes.faltantesPos})`);
  }
  console.log('--------------------------------------------------');
  for (const r of resultados) {
    console.log(`* ${r.mesAno}: ${r.totalRegistros} reg / ${r.total} únicos (Novos: ${r.salvos}, Pulados: ${r.pulados}, Erros: ${r.erros})`);
  }
  console.log('==================================================');

  if (totalErrosGeral > 0 || !reconciliationOk) {
    console.warn(`Atenção: Houve ${totalErrosGeral} falhas ou divergência de reconciliação durante a coleta.`);
  } else {
    console.log('✅ Coleta do ano de 2022 finalizada com 100% de sucesso!');
  }

  return {
    duracaoSegundos,
    totalRegistrosGeral,
    totalAtosIdentificados,
    totalSalvosGeral,
    totalPuladosGeral,
    totalErrosGeral,
    reconciliationOk,
    reconciliacaoDetalhes,
    resultados
  };
}

if (require.main === module) {
  coletar2022()
    .then(res => {
      if (res && (res.totalErrosGeral > 0 || res.reconciliationOk === false)) {
        process.exit(1);
      }
    })
    .catch(err => {
      console.error('Falha crítica na execução de coletar-2022:', err);
      process.exit(1);
    });
}

module.exports = {
  coletar2022,
  coletarMes,
  MESES_2022,
  parseCliArgs,
  normalizarFiltroMes
};
