const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

test('Validação de sintaxe JavaScript em todos os arquivos de scripts/', () => {
  const dirScripts = path.resolve(__dirname, '../scripts');
  const files = fs.readdirSync(dirScripts).filter(f => f.endsWith('.js'));

  assert(files.length >= 6, `Esperados pelo menos 6 scripts, encontrados ${files.length}`);

  for (const file of files) {
    const fullPath = path.join(dirScripts, file);
    assert.doesNotThrow(() => {
      cp.execFileSync(process.execPath, ['--check', fullPath], { stdio: 'pipe' });
    }, `Erro de sintaxe encontrado no script: ${file}`);
  }
});

test('Carregamento de módulos exportados em scripts/', () => {
  assert.doesNotThrow(() => {
    const parser = require('../scripts/parser');
    assert.strictEqual(typeof parser.parseNormaHtml, 'function');
    assert.strictEqual(typeof parser.normalizarTipo, 'function');
  }, 'Falha ao importar scripts/parser.js');

  assert.doesNotThrow(() => {
    const grafo = require('../scripts/grafo');
    assert.strictEqual(typeof grafo.construirGrafo, 'function');
  }, 'Falha ao importar scripts/grafo.js');

  assert.doesNotThrow(() => {
    const exportador = require('../scripts/exportar-bancos');
    assert.strictEqual(typeof exportador.exportarBancos, 'function');
  }, 'Falha ao importar scripts/exportar-bancos.js');

  assert.doesNotThrow(() => {
    const scraper = require('../scripts/scraper');
    assert.strictEqual(typeof scraper.coletarPorData, 'function');
    assert.strictEqual(typeof scraper.coletarPorAno, 'function');
  }, 'Falha ao importar scripts/scraper.js');
});
