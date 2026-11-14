const { pesquisarAtos, processarAto } = require('./scraper');

const MESES_2026 = [
  { mesAno: '01/2026', dataInicio: '01/01/2026', dataFim: '31/01/2026', ano: '2026' },
  { mesAno: '02/2026', dataInicio: '01/02/2026', dataFim: '28/02/2026', ano: '2026' },
  { mesAno: '03/2026', dataInicio: '01/03/2026', dataFim: '31/03/2026', ano: '2026' },
  { mesAno: '04/2026', dataInicio: '01/04/2026', dataFim: '30/04/2026', ano: '2026' },
  { mesAno: '05/2026', dataInicio: '01/05/2026', dataFim: '31/05/2026', ano: '2026' },
  { mesAno: '06/2026', dataInicio: '01/06/2026', dataFim: '30/06/2026', ano: '2026' },
  { mesAno: '07/2026', dataInicio: '01/07/2026', dataFim: '31/07/2026', ano: '2026' }
];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function coletarMes(configMes, concurrency = 6) {
  console.log(`\n--------------------------------------------------`);
  console.log(`[Mês ${configMes.mesAno}] Buscando atos no Datalegis (${configMes.dataInicio} a ${configMes.dataFim})...`);
  console.log(`--------------------------------------------------`);

  const { cookies, listaAtos } = await pesquisarAtos({
    dataInicio: configMes.dataInicio,
    dataFim: configMes.dataFim,
    ano: configMes.ano
  });

  console.log(`Total de atos identificados em ${configMes.mesAno}: ${listaAtos.length}`);

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
          const res = await processarAto(item, cookies, false);
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

async function coletar2026JanJul() {
  const inicioTempo = Date.now();
  console.log('==================================================');
  console.log('   COLETA ANVISA: JANEIRO A JULHO DE 2026         ');
  console.log('   Metodologia Paralela (Worker Pool: Concorrência 6)');
  console.log('==================================================');

  const resultados = [];
  let totalAtosIdentificados = 0;
  let totalSalvosGeral = 0;
  let totalPuladosGeral = 0;
  let totalErrosGeral = 0;

  for (const configMes of MESES_2026) {
    const resMes = await coletarMes(configMes, 6);
    resultados.push(resMes);
    totalAtosIdentificados += resMes.total;
    totalSalvosGeral += resMes.salvos;
    totalPuladosGeral += resMes.pulados;
    totalErrosGeral += resMes.erros;
  }

  const duracaoSegundos = Math.round((Date.now() - inicioTempo) / 1000);

  console.log('\n==================================================');
  console.log('   RESUMO CONSOLIDADO - JANEIRO A JULHO DE 2026  ');
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
    console.log('✅ Coleta de Janeiro a Julho de 2026 finalizada com 100% de sucesso!');
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
  coletar2026JanJul().catch(err => {
    console.error('Falha crítica na execução de coletar-2026-jan-jul:', err);
    process.exit(1);
  });
}

module.exports = {
  coletar2026JanJul,
  MESES_2026
};
