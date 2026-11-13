const test = require('node:test');
const assert = require('node:assert');
const { normalizarTipo, parseNormaHtml } = require('../scripts/parser');

test('normalizarTipo converte variações de tipos de atos para formato canônico', () => {
  assert.strictEqual(normalizarTipo('rdc'), 'RDC');
  assert.strictEqual(normalizarTipo('RDC'), 'RDC');
  assert.strictEqual(normalizarTipo('por'), 'PORTARIA');
  assert.strictEqual(normalizarTipo('PORTARIA'), 'PORTARIA');
  assert.strictEqual(normalizarTipo('in'), 'IN');
  assert.strictEqual(normalizarTipo('INM'), 'IN');
  assert.strictEqual(normalizarTipo('res'), 'RE');
  assert.strictEqual(normalizarTipo('RE'), 'RE');
  assert.strictEqual(normalizarTipo('cpb'), 'CPB');
});

test('parseNormaHtml extrai metadados, ementa e gera Markdown formatado', () => {
  const htmlExemplo = `
    <div class="ato">
      <p class="numero">RESOLUÇÃO DA DIRETORIA COLEGIADA - RDC Nº 999, DE 15 DE JANEIRO DE 2026</p>
      <p class="ementa">Dispõe sobre os requisitos técnicos para validação de sistemas e integridade de dados regulatórios.</p>
      <p>Art. 1º Esta Resolução estabelece critérios de conformidade regulatória.</p>
      <p>Art. 2º Fica revogada a <a href="javascript:LinkTexto('RDC','888','0','2025','ANVISA')">RDC 888/2025</a>.</p>
    </div>
  `;

  const metaBusca = {
    tipo: 'RDC',
    numero: '999',
    ano: '2026',
    situacao: 'vigente'
  };

  const resultado = parseNormaHtml(htmlExemplo, 'https://anvisalegis.datalegis.net/exemplo', metaBusca);

  assert.strictEqual(resultado.tipo, 'RDC');
  assert.strictEqual(resultado.numero, '999');
  assert.strictEqual(resultado.ano, '2026');
  assert.strictEqual(resultado.situacao, 'vigente');
  assert.ok(resultado.markdown.includes('---'), 'Deve conter delimitadores de frontmatter YAML');
  assert.ok(resultado.markdown.includes('tipo: "RDC"'), 'YAML deve conter tipo');
  assert.ok(resultado.markdown.includes('# RDC nº 999'), 'Deve conter cabeçalho H1 com tipo e número');
  assert.ok(resultado.relacionadas.some(r => r.includes('RDC 888/2025')), 'Deve capturar citação de norma relacionada');
});
