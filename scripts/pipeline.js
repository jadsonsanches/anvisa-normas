const { coletarAno } = require('./scraper');
const { construirGrafo } = require('./grafo');

async function executarPipeline() {
  const args = process.argv.slice(2);
  const anoAtual = new Date().getFullYear();

  console.log('==================================================');
  console.log('   PIPELINE ANVISA-NORMAS - ACERVO REGULATÓRIO    ');
  console.log('==================================================');

  if (args.includes('--full')) {
    // Coleta histórica de todos os anos relevantes
    console.log('Modo Completo: Coletando resenha histórica (1999 a ' + anoAtual + ')...');
    for (let ano = anoAtual; ano >= 1999; ano--) {
      await coletarAno(ano);
    }
  } else if (args.includes('--ano')) {
    const idx = args.indexOf('--ano');
    const ano = parseInt(args[idx + 1], 10) || anoAtual;
    await coletarAno(ano);
  } else {
    // Modo padrão diário (GitHub Actions): confere o ano corrente e o anterior
    console.log(`Modo Diário: Verificando novidades em ${anoAtual} e ${anoAtual - 1}...`);
    await coletarAno(anoAtual);
    await coletarAno(anoAtual - 1);
  }

  console.log('\n--- Atualizando Grafo de Relações e Estatísticas ---');
  construirGrafo();

  console.log('\n==================================================');
  console.log('   PIPELINE CONCLUÍDO COM SUCESSO!                ');
  console.log('==================================================');
}

executarPipeline().catch(err => {
  console.error('Falha no pipeline:', err);
  process.exit(1);
});
