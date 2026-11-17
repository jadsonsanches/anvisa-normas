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
    assert.strictEqual(typeof scraper.validarHtmlAto, 'function');
  }, 'Falha ao importar scripts/scraper.js');

  assert.doesNotThrow(() => {
    const c2022 = require('../scripts/coletar-2022');
    assert.strictEqual(typeof c2022.coletar2022, 'function');
    assert.strictEqual(typeof c2022.coletarMes, 'function');
    assert.strictEqual(typeof c2022.parseCliArgs, 'function');
    assert.strictEqual(typeof c2022.normalizarFiltroMes, 'function');
    assert.strictEqual(c2022.MESES_2022.length, 12);
    assert.strictEqual(c2022.MESES_2022[1].dataFim, '28/02/2022');
  }, 'Falha ao importar scripts/coletar-2022.js');
});

test('validarHtmlAto rejeita payloads de erro/sessão expirada e aceita contêiner legislativo válido', () => {
  const { validarHtmlAto } = require('../scripts/scraper');
  assert.strictEqual(validarHtmlAto('').valido, false);
  assert.strictEqual(validarHtmlAto('<html><body>Sessão expirada no portal</body></html>').valido, false);
  assert.strictEqual(validarHtmlAto('<html><body><div>502 Bad Gateway</div></body></html>').valido, false);
  assert.strictEqual(validarHtmlAto('<html><body><div class="outro">Texto qualquer sem container</div></body></html>').valido, false);
  assert.strictEqual(validarHtmlAto('<html><body><div class="ato"><p>Este ato está sendo processado.</p></div></body></html>').valido, false);
  const htmlOk = '<html><body><div class="ato"><p>RESOLUÇÃO - RDC Nº 658, DE 30 DE MARÇO DE 2022. Dispõe sobre Boas Práticas.</p></div></body></html>';
  assert.strictEqual(validarHtmlAto(htmlOk).valido, true);
});

test('validarHtmlAto remove boilerplate antes de validar tamanho e escopa erros fora de .ato', () => {
  const { validarHtmlAto } = require('../scripts/scraper');

  const htmlApenasBoilerplate = `
    <html><body><div class="ato">
      <nav class="navbar">Menu</nav>
      <div class="noprint"><a class="btn">Voltar</a><a class="btn">IMPRIMIR</a><a class="btn">COPIAR LINK</a></div>
      <hr size="1">
      <p>Este texto não substitui a Publicação Oficial.</p>
    </div></body></html>
  `;
  assert.strictEqual(validarHtmlAto(htmlApenasBoilerplate).valido, false);
  assert.strictEqual(
    validarHtmlAto(htmlApenasBoilerplate, { ementa: 'Altera a Autorização de Funcionamento das Empresas constantes.' }).valido,
    true
  );

  const htmlBoilerplateComTexto = `
    <html><body><div class="ato">
      <div class="noprint"><a>Voltar</a><a>IMPRIMIR</a></div>
      <p>Dispõe sobre requisitos sanitários aplicáveis a medicamentos e insumos farmacêuticos.</p>
      <p>Este texto não substitui a Publicação Oficial.</p>
    </div></body></html>
  `;
  assert.strictEqual(validarHtmlAto(htmlBoilerplateComTexto).valido, true);

  const htmlAtoComTermosJuridicos = `
    <html><body><div class="ato">
      <p>Art. 1º Fica indeferido o recurso administrativo por acesso negado ao sistema em caso de erro 502 ou fatal error documental.</p>
    </div></body></html>
  `;
  assert.strictEqual(validarHtmlAto(htmlAtoComTermosJuridicos).valido, true);

  for (const erroMsg of [
    '502 Bad Gateway - servidor indisponível no momento da requisição ao portal',
    '503 Service Unavailable - manutenção temporária do portal regulatório da Anvisa',
    '504 Gateway Timeout - tempo limite excedido ao consultar o servidor de origem',
    'Acesso negado ao recurso solicitado por ausência de permissões válidas na sessão'
  ]) {
    const htmlErroSemAto = `<html><body><div id="conteudo"><p>${erroMsg}</p></div></body></html>`;
    assert.strictEqual(validarHtmlAto(htmlErroSemAto).valido, false, `Deveria rejeitar sem .ato: ${erroMsg}`);
  }

  const htmlSessaoExpiradaEmAto = '<html><body><div class="ato"><p>Sua Sessão expirada durante a consulta de legislação sanitária. Faça login novamente.</p></div></body></html>';
  assert.strictEqual(validarHtmlAto(htmlSessaoExpiradaEmAto).valido, false);

  const htmlProcessandoEmAto = '<html><body><div class="ato"><p>Aviso do sistema Datalegis: Este ato está sendo processado pela equipe editorial.</p></div></body></html>';
  assert.strictEqual(validarHtmlAto(htmlProcessandoEmAto).valido, false);
});

test('parseCliArgs valida estritamente --mes e --force em scripts/coletar-2022.js', () => {
  const { parseCliArgs } = require('../scripts/coletar-2022');

  assert.throws(() => parseCliArgs(['--mes', '--force']), /Argumento --mes requer/);
  assert.throws(() => parseCliArgs(['--mes']), /Argumento --mes requer/);
  assert.throws(() => parseCliArgs(['--mes=']), /Argumento --mes= requer/);
  assert.throws(() => parseCliArgs(['--mes', '13/2022']), /Nenhum mês correspondente/);

  assert.deepStrictEqual(parseCliArgs(['--mes', '08/2022', '--force']), { force: true, mes: '08/2022' });
  assert.deepStrictEqual(parseCliArgs(['--mes=2022-02']), { force: false, mes: '02/2022' });
  assert.deepStrictEqual(parseCliArgs([]), { force: false, mes: '' });
});
