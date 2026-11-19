const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const cheerio = require('cheerio');

const rootDir = path.resolve(__dirname, '..');
const visPath = path.join(rootDir, 'visualizador.html');
const indexPath = path.join(rootDir, 'index.html');
const generatorPath = path.join(rootDir, 'scripts', 'gerar-visualizador.js');

function loadGeneratorWithoutWrite() {
  const prev = process.env.ANVISA_VISUALIZER_NO_WRITE;
  process.env.ANVISA_VISUALIZER_NO_WRITE = '1';
  delete require.cache[require.resolve(generatorPath)];
  try {
    return require(generatorPath);
  } finally {
    if (prev === undefined) {
      delete process.env.ANVISA_VISUALIZER_NO_WRITE;
    } else {
      process.env.ANVISA_VISUALIZER_NO_WRITE = prev;
    }
  }
}

function createFakeDomEnvironment() {
  const elementsById = new Map();
  const createdTags = [];
  const innerHtmlAssignments = [];

  class FakeClassList {
    constructor(el) {
      this.el = el;
    }
    _tokens() {
      return new Set(String(this.el._className || '').split(/\s+/).filter(Boolean));
    }
    _save(set) {
      this.el._className = Array.from(set).join(' ');
    }
    add(...cls) {
      const s = this._tokens();
      cls.forEach((c) => c && s.add(c));
      this._save(s);
    }
    remove(...cls) {
      const s = this._tokens();
      cls.forEach((c) => s.delete(c));
      this._save(s);
    }
    toggle(c, force) {
      const s = this._tokens();
      if (force === undefined) {
        if (s.has(c)) s.delete(c);
        else s.add(c);
      } else if (force) {
        s.add(c);
      } else {
        s.delete(c);
      }
      this._save(s);
    }
    contains(c) {
      return this._tokens().has(c);
    }
  }

  class FakeElement {
    constructor(tagName, namespaceURI = 'http://www.w3.org/1999/xhtml') {
      this.tagName = String(tagName).toLowerCase();
      this.namespaceURI = namespaceURI;
      this.attributes = {};
      this.children = [];
      this.listeners = {};
      this.style = {};
      this.dataset = {};
      this._textContent = '';
      this._className = '';
      this.classList = new FakeClassList(this);
      this.value = '';
      this.clientWidth = 800;
      this.clientHeight = 500;
      this.width = 800;
      this.height = 500;
    }

    get className() {
      return this._className;
    }
    set className(val) {
      this._className = String(val || '');
    }

    get textContent() {
      if (this.children.length === 0) return this._textContent;
      return this._textContent + this.children.map((c) => c.textContent).join('');
    }
    set textContent(val) {
      this.children = [];
      this._textContent = val === null || val === undefined ? '' : String(val);
    }

    get innerHTML() {
      return '';
    }
    set innerHTML(val) {
      innerHtmlAssignments.push({ tagName: this.tagName, id: this.id || null, value: String(val) });
      throw new Error(`Atribuição proibida a innerHTML detectada em <${this.tagName} id="${this.id || ''}">`);
    }

    setAttribute(name, value) {
      const key = String(name);
      this.attributes[key] = String(value);
      if (key === 'class') this._className = String(value);
      if (key === 'id') {
        this.id = String(value);
        elementsById.set(this.id, this);
      }
    }
    getAttribute(name) {
      return this.attributes[String(name)] ?? null;
    }

    appendChild(child) {
      if (child && child.isFragment) {
        for (const item of child.children) {
          this.children.push(item);
        }
        child.children = [];
      } else if (child) {
        this.children.push(child);
      }
      return child;
    }
    append(...items) {
      for (const item of items) {
        if (item !== null && item !== undefined) {
          this.appendChild(item);
        }
      }
    }
    replaceChildren(...items) {
      this.children = [];
      this._textContent = '';
      this.append(...items);
    }

    addEventListener(type, fn) {
      if (!this.listeners[type]) this.listeners[type] = [];
      this.listeners[type].push(fn);
    }
    dispatchEvent(type, eventObj = {}) {
      for (const fn of this.listeners[type] || []) {
        fn({ target: this, preventDefault() {}, stopPropagation() {}, ...eventObj });
      }
    }

    getContext() {
      return {
        setTransform() {},
        clearRect() {},
        save() {},
        restore() {},
        translate() {},
        scale() {},
        beginPath() {},
        moveTo() {},
        lineTo() {},
        stroke() {},
        arc() {},
        fill() {},
        fillText() {},
        measureText: (t) => ({ width: String(t || '').length * 6 }),
      };
    }
    getBoundingClientRect() {
      return { left: 0, top: 0, width: 800, height: 500 };
    }
    scrollIntoView() {}
  }

  class FakeFragment {
    constructor() {
      this.isFragment = true;
      this.children = [];
    }
    appendChild(child) {
      this.children.push(child);
      return child;
    }
    append(...items) {
      for (const item of items) {
        if (item !== null && item !== undefined) this.children.push(item);
      }
    }
  }

  const ensureId = (id, tag = 'div') => {
    if (!elementsById.has(id)) {
      const el = new FakeElement(tag);
      el.id = id;
      elementsById.set(id, el);
    }
    return elementsById.get(id);
  };

  for (const id of [
    'app-sidebar',
    'sidebar-backdrop',
    'daily-timeline-carousel',
    'filtro-data-inicio',
    'filtro-data-fim',
    'custom-calendar-popover',
    'calendar-trigger-btn',
    'calendar-trigger-label',
    'calendar-trigger-chevron',
    'calendar-picker-wrapper',
    'cal-month-year-title',
    'cal-days-grid',
    'cal-summary-inicio',
    'cal-summary-fim',
    'cal-prompt-msg',
    'graph-canvas',
    'grafo-container',
    'grafo-legenda-body',
    'legenda-toggle-btn',
    'btn-clear-focus',
    'btn-reset-view',
    'btn-ver-todos-dias',
    'btn-zoom-in',
    'btn-zoom-out',
    'selected-badge-situacao',
    'inspector-content',
    'norms-list-container',
    'search-input',
    'donut-container',
    'graph-loading-overlay',
    'graph-loading-subtext',
    'graph-error-overlay',
    'graph-error-message',
    'graph-error-commands',
    'count-filtered',
    'list-status-badge',
    'metric-total',
    'metric-vigentes',
    'metric-pct-vigentes',
    'metric-relacoes',
    'metric-pico',
    'metric-pico-data',
    'radar-badge',
    'radar-badge-periodo',
    'stat-filtradas-badge',
    'stat-pico-badge',
    'stat-pico-data',
    'stat-pico-sub',
    'stat-pico-valor',
    'stat-relacoes',
    'stat-relacoes-badge',
    'stat-total-normas',
    'stat-vigentes',
    'stat-vigentes-badge',
    'stat-vigentes-pct',
    'toast-aviso',
    'toast-aviso-msg',
    'fallback-json-input',
    'visualizer-config',
  ]) {
    ensureId(id, id === 'graph-canvas' ? 'canvas' : id.includes('input') ? 'input' : 'div');
  }

  elementsById.get('graph-canvas').parentElement = elementsById.get('grafo-container');
  elementsById.get('visualizer-config').textContent = JSON.stringify({
    relacoesUrl: 'data/grafo/relacoes.json',
    estatisticasUrl: 'data/grafo/estatisticas.json',
  });

  const document = {
    getElementById: (id) => elementsById.get(id) || null,
    querySelectorAll: () => [],
    querySelector: () => null,
    createElement: (tag) => {
      createdTags.push(String(tag).toLowerCase());
      return new FakeElement(tag);
    },
    createElementNS: (ns, tag) => {
      createdTags.push(String(tag).toLowerCase());
      return new FakeElement(tag, ns);
    },
    createDocumentFragment: () => new FakeFragment(),
    addEventListener: () => {},
  };

  return { document, elementsById, createdTags, innerHtmlAssignments };
}

function collectAllDescendants(root) {
  const out = [];
  for (const child of root.children || []) {
    out.push(child);
    out.push(...collectAllDescendants(child));
  }
  return out;
}

test('R1: serializarJsonParaScript e gerarHtmlVisualizador escapam < como \\u003c sem quebrar <script>', () => {
  const { serializarJsonParaScript, gerarHtmlVisualizador } = loadGeneratorWithoutWrite();

  const payloadMalicioso = {
    ementa: '</script><script>alert(1)</script><!-- comentario',
    nested: ['<img src=x onerror=alert(1)>'],
  };

  const jsonSeguro = serializarJsonParaScript(payloadMalicioso);
  assert.ok(!jsonSeguro.includes('<'), 'JSON serializado para <script> não pode conter "<" literal');
  assert.ok(!jsonSeguro.includes('</script'), 'JSON serializado não pode conter "</script" literal');
  assert.ok(
    jsonSeguro.includes('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>'),
    'Deve escapar "<" como "\\u003c"'
  );
  assert.deepEqual(JSON.parse(jsonSeguro), payloadMalicioso);

  const htmlBase = gerarHtmlVisualizador();
  const htmlComPayload = gerarHtmlVisualizador({
    titulo: '</script><script>alert(1)</script>',
  });

  const $base = cheerio.load(htmlBase);
  const $mal = cheerio.load(htmlComPayload);

  assert.equal(
    $mal('script').length,
    $base('script').length,
    'Payload com </script><script>alert(1)</script> não pode criar novas tags <script>'
  );

  const rawConfigText = $mal('#visualizer-config').html();
  assert.ok(rawConfigText, 'Deve existir <script id="visualizer-config">');
  assert.ok(!rawConfigText.includes('</script'), 'Bloco #visualizer-config não pode conter </script literal');
  assert.ok(
    rawConfigText.includes('\\u003c/script>\\u003cscript>alert(1)\\u003c/script>'),
    'Config embutida no HTML deve escapar "<" como "\\u003c"'
  );
  assert.equal(
    JSON.parse(rawConfigText).titulo,
    '</script><script>alert(1)</script>'
  );
});

test('R1: visualizador.html e index.html gerados estão sincronizados, sem innerHTML dinâmico e sintaticamente válidos', () => {
  const visContent = fs.readFileSync(visPath, 'utf8');
  const indexContent = fs.readFileSync(indexPath, 'utf8');

  assert.equal(visContent, indexContent, 'visualizador.html e index.html devem ser idênticos');
  assert.ok(!visContent.includes('.innerHTML ='), 'visualizador.html não deve usar .innerHTML =');
  assert.ok(!visContent.includes('.outerHTML ='), 'visualizador.html não deve usar .outerHTML =');
  assert.ok(!visContent.includes('insertAdjacentHTML('), 'visualizador.html não deve usar insertAdjacentHTML');
  assert.ok(!visContent.includes('onclick="selecionarPorId('), 'Não deve usar handler inline onclick em selecionarPorId');
  assert.ok(!visContent.includes('onclick="filtrarPorDia('), 'Não deve usar handler inline onclick em filtrarPorDia');
  assert.ok(!visContent.includes('onclick="calClickDia('), 'Não deve usar handler inline onclick em calClickDia');
  assert.ok(!visContent.includes('onmouseenter="calHoverDia('), 'Não deve usar handler inline onmouseenter em calHoverDia');

  const $ = cheerio.load(visContent);
  const cfgRaw = $('#visualizer-config').html();
  assert.ok(cfgRaw && cfgRaw.trim().startsWith('{'), 'Deve conter JSON válido em #visualizer-config');
  assert.equal(JSON.parse(cfgRaw).relacoesUrl, 'data/grafo/relacoes.json');

  const scriptsInline = $('script')
    .toArray()
    .map((el) => $(el).html() || '')
    .filter((txt) => txt.trim().length > 0 && !txt.trim().startsWith('{'));
  assert.equal(scriptsInline.length, 1, 'Deve existir exatamente 1 script inline executável');
  assert.doesNotThrow(() => new vm.Script(scriptsInline[0]), 'Script inline do visualizador deve ter sintaxe JS válida');
});

test('R1: sanitização de DOM bloqueia payloads XSS em nós, arestas, tipos e caminhos de arquivo', () => {
  const visContent = fs.readFileSync(visPath, 'utf8');
  const $ = cheerio.load(visContent);
  const inlineJs = $('script')
    .toArray()
    .filter((el) => !$(el).attr('src') && $(el).attr('type') !== 'application/json')
    .map((el) => $(el).html())
    .join('\n');

  const { document, elementsById, createdTags, innerHtmlAssignments } = createFakeDomEnvironment();
  const context = {
    innerWidth: 1280,
    innerHeight: 800,
    location: { protocol: 'https:' },
    addEventListener: () => {},
    document,
    localStorage: { getItem: () => null, setItem: () => {} },
    fetch: () => Promise.resolve({ ok: false, status: 404 }),
    requestAnimationFrame: () => 0,
    setTimeout,
    clearTimeout,
    console: { log: () => {}, warn: () => {}, error: () => {} },
    Map,
    Set,
    Date,
    Math,
    Number,
    String,
    Array,
    Object,
    JSON,
    encodeURIComponent,
  };
  context.window = context;

  vm.runInNewContext(inlineJs, context);

  const maliciousId1 = 'RDC 1/2026\');alert(1);//<img src=x onerror=alert(1)>';
  const maliciousId2 = 'RE 2/2026" onmouseover="alert(2)';
  const maliciousEmenta = '</script><script>alert(1)</script><img src=x onerror=alert("xss")>';
  const maliciousTipo = '</title><script>alert(1)</script>';
  const maliciousArquivo = 'data/normas/rdc/2026/" onclick="alert(1).md';

  const grafoMalicioso = {
    nodes: [
      {
        id: maliciousId1,
        tipo: maliciousTipo,
        ano: 2026,
        data_ato: '15/08/2026<b onmouseover=alert(1)>',
        data_publicacao_dou: '16/08/2026<iframe src=javascript:alert(1)>',
        situacao: 'vigente<svg onload=alert(1)>',
        ementa: maliciousEmenta,
        arquivo: maliciousArquivo,
      },
      {
        id: maliciousId2,
        tipo: 'RDC',
        ano: 2026,
        data_ato: '15/08/2026',
        situacao: 'revogada',
        ementa: 'Norma vizinha segura',
        arquivo: '../../etc/passwd',
      },
    ],
    edges: [
      { source: maliciousId1, target: maliciousId2, tipo_relacao: 'ALTERA' },
    ],
  };

  // Inicializa o visualizador com dados maliciosos
  context.window.carregarDadosGrafo = () => {};
  vm.runInContext('inicializarVisualizador', context)(grafoMalicioso, { totalNormas: 2 });

  assert.equal(innerHtmlAssignments.length, 0, 'Nenhuma função pode atribuir innerHTML');

  for (const forbiddenTag of ['script', 'img', 'iframe', 'b']) {
    assert.ok(
      !createdTags.includes(forbiddenTag),
      `Nenhuma tag perigosa <${forbiddenTag}> pode ser criada dinamicamente no DOM`
    );
  }

  // Verificar Inspetor (#inspector-content) para Nó 1
  const inspector = elementsById.get('inspector-content');
  const inspectorDescendants = collectAllDescendants(inspector);
  for (const el of inspectorDescendants) {
    for (const attr of Object.keys(el.attributes)) {
      assert.ok(!attr.toLowerCase().startsWith('on'), `Atributo inline proibido encontrado: ${attr}`);
    }
  }
  assert.ok(inspector.textContent.includes(maliciousEmenta), 'Ementa maliciosa deve ser exibida como texto puro');
  assert.ok(inspector.textContent.includes(maliciousId1), 'ID malicioso deve ser exibido como texto puro');

  const linkEl = inspectorDescendants.find((el) => el.tagName === 'a');
  assert.ok(linkEl, 'Deve renderizar link <a> para arquivo válido codificado');
  assert.equal(linkEl.rel, 'noopener noreferrer');
  assert.equal(linkEl.target, '_blank');
  assert.ok(
    linkEl.href.startsWith('https://github.com/jadsonsanches/anvisa-normas/blob/main/'),
    'Link deve apontar estritamente para o repositório GitHub HTTPS'
  );
  assert.ok(!linkEl.href.includes('"'), 'Aspas em arquivo devem ser codificadas via encodeURIComponent');
  assert.ok(linkEl.href.includes('%22'), 'Aspas devem virar %22 na URL');

  // Verificar Donut Chart (#donut-container) com tipo contendo </title><script>
  const donut = elementsById.get('donut-container');
  const donutDescendants = collectAllDescendants(donut);
  assert.ok(
    donutDescendants.some((el) => el.tagName === 'title' && el.textContent.includes(maliciousTipo)),
    'Título SVG deve conter tipo malicioso apenas como textContent seguro'
  );
  assert.ok(
    !donutDescendants.some((el) => el.tagName === 'script'),
    'Donut SVG não pode conter elemento <script>'
  );

  // Verificar lista de normas (#norms-list-container)
  const normsList = elementsById.get('norms-list-container');
  const normsDescendants = collectAllDescendants(normsList);
  for (const el of normsDescendants) {
    for (const attr of Object.keys(el.attributes)) {
      assert.ok(!attr.toLowerCase().startsWith('on'), `Atributo inline proibido na lista: ${attr}`);
    }
  }
  assert.ok(normsList.textContent.includes(maliciousEmenta));

  // Clicar no botão do vizinho (Nó 2 com arquivo ../../etc/passwd) via addEventListener e verificar bloqueio de traversal
  const neighborBtn = inspectorDescendants.find(
    (el) => el.tagName === 'button' && el.textContent === maliciousId2
  );
  assert.ok(neighborBtn, 'Botão do nó vizinho deve existir');
  neighborBtn.dispatchEvent('click');

  const inspectorAfterClick = collectAllDescendants(elementsById.get('inspector-content'));
  assert.ok(elementsById.get('inspector-content').textContent.includes('Norma vizinha segura'));
  assert.equal(
    inspectorAfterClick.find((el) => el.tagName === 'a'),
    undefined,
    'Caminho ../../etc/passwd deve ser rejeitado e não gerar link <a>'
  );
});
