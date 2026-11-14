const { pesquisarAtos, processarAto } = require('./scraper');
const { construirGrafo } = require('./grafo');
const { exportarBancos } = require('./exportar-bancos');
const fs = require('fs');
const path = require('path');

async function coletarAgosto2026() {
  console.log('==================================================');
  console.log('   COLETA COMPLETA DE AGOSTO/2026 - ANVISA        ');
  console.log('==================================================');

  console.log('\n[1/4] Buscando lista consolidada de atos no Datalegis (01/08/2026 a 31/08/2026)...');
  const { cookies, listaAtos } = await pesquisarAtos({
    dataInicio: '01/08/2026',
    dataFim: '31/08/2026',
    ano: '2026'
  });

  console.log(`Total de atos identificados em Agosto/2026: ${listaAtos.length}`);

  let salvos = 0;
  let pulados = 0;
  let erros = 0;

  // Concorrência controlada (worker pool de 6 conexões simultâneas)
  const CONCURRENCY = 6;
  let index = 0;

  async function worker() {
    while (index < listaAtos.length) {
      const currentIndex = index++;
      const item = listaAtos[currentIndex];
      try {
        const res = await processarAto(item, cookies, false);
        if (res.status === 'sucesso') {
          salvos++;
          if (salvos % 25 === 0 || currentIndex === listaAtos.length - 1) {
            console.log(`[Progresso ${currentIndex + 1}/${listaAtos.length}] Salvos: ${salvos} | Pulados: ${pulados} | Erros: ${erros}`);
          }
        } else if (res.status === 'pulado') {
          pulados++;
        } else {
          erros++;
          console.error(`Erro ao baixar ${item.tipo} nº ${item.numero}: status ${res.statusCode}`);
        }
      } catch (err) {
        erros++;
        console.error(`Falha no item ${currentIndex + 1}: ${err.message}`);
      }
    }
  }

  const workers = Array.from({ length: CONCURRENCY }, () => worker());
  await Promise.all(workers);

  console.log('\n==================================================');
  console.log(` Resumo Final da Coleta de Agosto/2026:`);
  console.log(` Total de atos: ${listaAtos.length} | Novos Salvos: ${salvos} | Já Existentes: ${pulados} | Falhas: ${erros}`);
  console.log('==================================================');

  console.log('\n[2/4] Atualizando Grafo de Relações e Estatísticas...');
  construirGrafo();

  console.log('\n[3/4] Regenerando Visualizadores Web (com Favicon)...');
  require('./gerar-visualizador');

  console.log('\n[4/4] Exportando Bancos Consolidados (SQLite, JSON, CSV)...');
  await exportarBancos();

  console.log('\n✅ Download e processamento de Agosto/2026 concluído com sucesso!');
}

coletarAgosto2026().catch(err => {
  console.error('Falha crítica na coleta de Agosto/2026:', err);
  process.exit(1);
});
