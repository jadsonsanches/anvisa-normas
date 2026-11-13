const { coletarPorData, coletarPorAno } = require('./scraper');
const { construirGrafo } = require('./grafo');
const { execSync } = require('child_process');
const path = require('path');

function formatarDataBrasil(date = new Date()) {
  const dia = String(date.getDate()).padStart(2, '0');
  const mes = String(date.getMonth() + 1).padStart(2, '0');
  const ano = date.getFullYear();
  return `${dia}/${mes}/${ano}`;
}

async function executarPipeline() {
  const args = process.argv.slice(2);
  const dataHoje = formatarDataBrasil();
  const anoAtual = new Date().getFullYear();

  console.log('==================================================');
  console.log('   PIPELINE ANVISA-NORMAS - ACERVO REGULATÓRIO    ');
  console.log('==================================================');

  if (args.includes('--full')) {
    console.log(`Modo Completo: Coletando resenha histórica (1999 a ${anoAtual})...`);
    for (let ano = anoAtual; ano >= 1999; ano--) {
      await coletarPorAno(ano);
    }
  } else if (args.includes('--ano')) {
    const idx = args.indexOf('--ano');
    const ano = parseInt(args[idx + 1], 10) || anoAtual;
    await coletarPorAno(ano);
  } else if (args.includes('--data')) {
    const idx = args.indexOf('--data');
    const dataAlvo = args[idx + 1] || dataHoje;
    await coletarPorData(dataAlvo);
  } else {
    // Modo padrão diário: consulta a data de hoje
    console.log(`Modo Diário: Verificando atos publicados na data de hoje (${dataHoje})...`);
    await coletarPorData(dataHoje);
  }

  console.log('\n--- 1. Atualizando Grafo de Relações e Estatísticas ---');
  construirGrafo();

  console.log('\n--- 2. Regenerando Visualizador Web Interativo ---');
  try {
    require('./gerar-visualizador');
  } catch (e) {
    console.warn('[Aviso] Falha ao invocar gerar-visualizador diretamente, tentando via processo:', e.message);
    execSync(`node "${path.join(__dirname, 'gerar-visualizador.js')}"`, { stdio: 'inherit' });
  }

  console.log('\n==================================================');
  console.log('   PIPELINE CONCLUÍDO COM SUCESSO!                ');
  console.log('==================================================');
}

executarPipeline().catch(err => {
  console.error('Falha crítica no pipeline:', err);
  process.exit(1);
});
