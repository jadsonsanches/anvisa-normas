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

test('parseNormaHtml extrai ementa do Art. 1º para Deferir e Indeferir respeitando tamanho mínimo', () => {
  const htmlDeferir = `
    <div class="ato">
      <p>RESOLUÇÃO-RE Nº 3.507, DE 24 DE OUTUBRO DE 2022</p>
      <p>Art. 1º Deferir petição referente a registro de produto de terapia avançada, conforme anexo.</p>
    </div>
  `;
  const resDeferir = parseNormaHtml(htmlDeferir, 'https://anvisalegis.datalegis.net/re-3507', {
    tipo: 'RE',
    numero: '3507',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(
    resDeferir.ementa,
    'Deferir petição referente a registro de produto de terapia avançada, conforme anexo.'
  );

  const htmlIndeferir = `
    <div class="ato">
      <p>RESOLUÇÃO-RE Nº 3.588, DE 31 DE OUTUBRO DE 2022</p>
      <p>Art. 1º. Indeferir o pedido de Autorização de Funcionamento para as Empresas constantes no anexo desta Resolução.</p>
    </div>
  `;
  const resIndeferir = parseNormaHtml(htmlIndeferir, 'https://anvisalegis.datalegis.net/re-3588', {
    tipo: 'RE',
    numero: '3588',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(
    resIndeferir.ementa,
    'Indeferir o pedido de Autorização de Funcionamento para as Empresas constantes no anexo desta Resolução.'
  );

  const htmlCurto = `
    <div class="ato">
      <p>RESOLUÇÃO-RE Nº 1, DE 02 DE JANEIRO DE 2022</p>
      <p>Art. 1º Deferir.</p>
    </div>
  `;
  const resCurto = parseNormaHtml(htmlCurto, 'https://anvisalegis.datalegis.net/re-1', {
    tipo: 'RE',
    numero: '1',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(resCurto.ementa, '');
});

test('parseNormaHtml aplica fallback de data com guarda de ano para ATAs e atos internos', () => {
  const htmlAta14 = `
    <div class="ato">
      <p>14ª SESSÃO DE JULGAMENTO ORDINÁRIA</p>
      <p>Publicado Internamente pela ANVISA em 12/05/2025</p>
    </div>
  `;
  const resAta14 = parseNormaHtml(htmlAta14, 'https://anvisalegis.datalegis.net/ata-14', {
    tipo: 'ATA',
    numero: '14',
    ano: '2022',
    situacao: 'vigente',
    ementa: 'Ata da 14ª Sessão de Julgamento Ordinária realizada em 12 de maio de 2022.'
  });
  assert.strictEqual(resAta14.dataAto, '12/05/2022', 'Deve priorizar data da ementa do ano 2022 e rejeitar ano 2025 do rodapé');

  const htmlPubInterna = `
    <div class="ato">
      <p>NOTA TÉCNICA Nº 2/2022</p>
      <p>Publicado Internamente pela ANVISA em 18/04/2022</p>
    </div>
  `;
  const resPub = parseNormaHtml(htmlPubInterna, 'https://anvisalegis.datalegis.net/ntc-2', {
    tipo: 'NTC',
    numero: '2',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(resPub.dataAto, '18/04/2022');

  const htmlRealizacao = `
    <div class="ato">
      <p>Diálogo Setorial nº 1</p>
      <p>Data de realização</p>
      <p>03 e 04 de outubro de 2022</p>
    </div>
  `;
  const resRealiz = parseNormaHtml(htmlRealizacao, 'https://anvisalegis.datalegis.net/dst-1', {
    tipo: 'DST',
    numero: '1',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(resRealiz.dataAto, '04/10/2022');

  const htmlDlb10 = `
    <div class="ato">
      <p>DELIBERAÇÃO Nº 10/2022</p>
      <p>Reunião realizada no dia 6/7/2022 para deliberação.</p>
    </div>
  `;
  const resDlb = parseNormaHtml(htmlDlb10, 'https://anvisalegis.datalegis.net/dlb-10', {
    tipo: 'DLB',
    numero: '10',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(resDlb.dataAto, '06/07/2022');

  const htmlCtd4 = `
    <div class="ato">
      <p>Consulta Dirigida nº 4/2022</p>
      <p>STATUS</p>
      <p>encerrada em 22/11/2022.</p>
    </div>
  `;
  const resCtd4 = parseNormaHtml(htmlCtd4, 'https://anvisalegis.datalegis.net/ctd-4', {
    tipo: 'CTD',
    numero: '4',
    ano: '2022',
    situacao: 'vigente'
  });
  assert.strictEqual(resCtd4.dataAto, '22/11/2022');
});
