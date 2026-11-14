const { pesquisarAtos, processarAto } = require('./scraper');

const MESES_2025 = [
  { mesAno: '01/2025', dataInicio: '01/01/2025', dataFim: '31/01/2025', ano: '2025' },
  { mesAno: '02/2025', dataInicio: '01/02/2025', dataFim: '28/02/2025', ano: '2025' },
  { mesAno: '03/2025', dataInicio: '01/03/2025', dataFim: '31/03/2025', ano: '2025' },
  { mesAno: '04/2025', dataInicio: '01/04/2025', dataFim: '30/04/2025', ano: '2025' },
  { mesAno: '05/2025', dataInicio: '01/05/2025', dataFim: '31/05/2025', ano: '2025' },
  { mesAno: '06/2025', dataInicio: '01/06/2025', dataFim: '30/06/2025', ano: '2025' },
  { mesAno: '07/2025', dataInicio: '01/07/2025', dataFim: '31/07/2025', ano: '2025' },
  { mesAno: '08/2025', dataInicio: '01/08/2025', dataFim: '31/08/2025', ano: '2025' },
  { mesAno: '09/2025', dataInicio: '01/09/2025', dataFim: '30/09/2025', ano: '2025' },
  { mesAno: '10/2025', dataInicio: '01/10/2025', dataFim: '31/10/2025', ano: '2025' },
  { mesAno: '11/2025', dataInicio: '01/11/2025', dataFim: '30/11/2025', ano: '2025' },
  { mesAno: '12/2025', dataInicio: '01/12/2025', dataFim: '31/12/2025', ano: '2025' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
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
        ano: configMes.ano
      });
      break;
    } catch (err) {
      if (tentativaBusca === 3) throw err;
      console.warn(`[${configMes.mesAno}] Falha ao pesquisar atos (tentativa ${tentativaBusca}/3): ${err.message}. Retentando em ${tentativaBusca * 1000}ms...`);
      await sleep(1000 * tentativaBusca);
    }
  }

  const { cookies, listaAtos } = pesquisaResultado;
  console.log(`Total de atos identificados em ${configMes.mesAno}: ${listaAtos.length}`);

  // Priorização Substantiva: atos substantivos (seqAto=000) sempre processados antes de retificações
  listaAtos.sort((a, b) => {
    const seqA = a.seqAto || '000';
    const seqB = b.seqAto || '000';
    if (seqA === '000' && seqB !== '000') return -1;
    if (seqA !== '000' && seqB === '000') return 1;
    return 0;
  });

  let salvos = 0;
  let pulados = 0;
  let erros = 0;
  let index = 0;

  async function worker(workerId) {
    while (index < listaAtos.length) {
      const currentIndex = index++;
      const item = listaAtos[currentIndex];

      let sucesso = false;
      let tentativas = 0;
      const MAX_TENTATIVAS = 3;

      while (!sucesso && tentativas < MAX_TENTATIVAS) {
        tentativas++;
        try {
          const res = await processarAto(item, cookies, force);
          if (res.status === 'sucesso') {
            salvos++;
            sucesso = true;
            if (salvos % 50 === 0 || currentIndex === listaAtos.length - 1) {
              console.log(`[${configMes.mesAno} - Progresso ${currentIndex + 1}/${listaAtos.length}] Salvos: ${salvos} | Pulados: ${pulados} | Falhas: ${erros}`);
            }
          } else if (res.status === 'pulado') {
            pulados++;
            sucesso = true;
          } else {
            if (tentativas >= MAX_TENTATIVAS) {
              erros++;
              console.error(`[${configMes.mesAno}] Erro persistente ao baixar ${item.tipo} nº ${item.numero} (tentativa ${tentativas}): status ${res.statusCode}`);
            } else {
              await sleep(500 * tentativas);
            }
          }
        } catch (err) {
          if (tentativas >= MAX_TENTATIVAS) {
            erros++;
            console.error(`[${configMes.mesAno}] Falha persistente no item ${item.tipo} nº ${item.numero}: ${err.message}`);
          } else {
            await sleep(500 * tentativas);
          }
        }
      }
    }
  }

  const workers = Array.from({ length: concurrency }, (_, i) => worker(i + 1));
  await Promise.all(workers);

  console.log(`[${configMes.mesAno} Concluído] Total: ${listaAtos.length} | Salvos: ${salvos} | Já existentes: ${pulados} | Falhas: ${erros}`);

  return {
    mesAno: configMes.mesAno,
    total: listaAtos.length,
    salvos,
    pulados,
    erros
  };
}

async function coletar2025(options = {}) {
  const inicioTempo = Date.now();
  const concurrency = options.concurrency || 6;
  const force = options.force || process.argv.includes('--force');
  const filtroMes = options.mes || process.argv.find(a => a.startsWith('--mes='))?.split('=')[1];

  console.log('==================================================');
  console.log('   COLETA ANVISA: ANO COMPLETO DE 2025            ');
  console.log(`   Metodologia Paralela (Worker Pool: Concorrência ${concurrency})`);
  if (force) console.log('   Modo: FORCE ATIVADO (sobrescreverá arquivos existentes)');
  if (filtroMes) console.log(`   Filtro específico: Mês ${filtroMes}`);
  console.log('==================================================');

  const mesesParaColetar = filtroMes
    ? MESES_2025.filter(m => m.mesAno === filtroMes)
    : MESES_2025;

  if (mesesParaColetar.length === 0) {
    throw new Error(`Nenhum mês correspondente encontrado para o filtro: ${filtroMes}`);
  }

  const resultados = [];
  let totalAtosIdentificados = 0;
  let totalSalvosGeral = 0;
  let totalPuladosGeral = 0;
  let totalErrosGeral = 0;

  for (const configMes of mesesParaColetar) {
    const resMes = await coletarMes(configMes, concurrency, force);
    resultados.push(resMes);
    totalAtosIdentificados += resMes.total;
    totalSalvosGeral += resMes.salvos;
    totalPuladosGeral += resMes.pulados;
    totalErrosGeral += resMes.erros;
  }

  const duracaoSegundos = Math.round((Date.now() - inicioTempo) / 1000);

  console.log('\n==================================================');
  console.log('   RESUMO CONSOLIDADO - ANO DE 2025               ');
  console.log('==================================================');
  console.log(`Tempo total de execução: ${duracaoSegundos}s`);
  console.log(`Total de atos identificados: ${totalAtosIdentificados}`);
  console.log(`Novos atos salvos: ${totalSalvosGeral}`);
  console.log(`Atos já existentes (pulados): ${totalPuladosGeral}`);
  console.log(`Erros/Falhas: ${totalErrosGeral}`);
  console.log('--------------------------------------------------');
  for (const r of resultados) {
    console.log(`* ${r.mesAno}: ${r.total} atos (Novos: ${r.salvos}, Pulados: ${r.pulados}, Erros: ${r.erros})`);
  }
  console.log('==================================================');

  if (totalErrosGeral > 0) {
    console.warn(`Atenção: Houve ${totalErrosGeral} falhas durante a coleta.`);
  } else {
    console.log('✅ Coleta do ano de 2025 finalizada com 100% de sucesso!');
  }

  return {
    duracaoSegundos,
    totalAtosIdentificados,
    totalSalvosGeral,
    totalPuladosGeral,
    totalErrosGeral,
    resultados
  };
}

if (require.main === module) {
  coletar2025().catch(err => {
    console.error('Falha crítica na execução de coletar-2025:', err);
    process.exit(1);
  });
}

module.exports = {
  coletar2025,
  coletarMes,
  MESES_2025
};
