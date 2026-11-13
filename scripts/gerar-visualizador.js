const fs = require('fs');
const path = require('path');

const grafo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/relacoes.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/estatisticas.json'), 'utf8'));

// Cores e configurações por tipo de ato
const CORES_TIPOS = {
  RDC: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', hex: '#3b82f6', label: 'RDC' },
  RE: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30', hex: '#06b6d4', label: 'RE' },
  PORTARIA: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', hex: '#f59e0b', label: 'Portaria' },
  IN: { bg: 'bg-purple-500/20', text: 'text-purple-300', border: 'border-purple-500/30', hex: '#a855f7', label: 'IN' },
  CPB: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30', hex: '#ec4899', label: 'Consulta Pública' },
  LEI_FEDERAL: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', hex: '#10b981', label: 'Lei Federal' },
  OUTROS: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600', hex: '#64748b', label: 'Outros' }
};

// Gera pills dinâmicos de distribuição
const distribuicaoHtml = Object.entries(stats.porTipo || {})
  .map(([tipo, qtd]) => {
    const conf = CORES_TIPOS[tipo] || CORES_TIPOS.OUTROS;
    return `<span class="px-2 py-0.5 rounded ${conf.bg} ${conf.text} border ${conf.border} text-xs font-semibold">${tipo}: ${qtd}</span>`;
  })
  .join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anvisa Normas - Visualizador Interativo & Analytics</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #090d16;
      color: #f8fafc;
      overflow-x: hidden;
    }
    canvas {
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-thumb {
      background: #1e293b;
      border-radius: 4px;
    }
    input[type="date"]::-webkit-calendar-picker-indicator {
      filter: invert(0.8);
      cursor: pointer;
    }
    .chart-bar:hover {
      filter: brightness(1.25);
    }
    .donut-segment:hover {
      filter: brightness(1.2);
      transform-origin: center;
    }
  </style>
</head>
<body class="p-3 md:p-6 bg-slate-950 text-slate-100 min-h-screen">
  <div class="max-w-7xl mx-auto space-y-5">

    <!-- Header com Ações e Downloads Diretos -->
    <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-3xl">🏛️</span>
          <div>
            <h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-cyan-300 to-emerald-400 bg-clip-text text-transparent">
              Acervo Aberto Anvisa - Visualizador & Analytics
            </h1>
            <p class="text-slate-400 text-xs md:text-sm mt-0.5">
              Navegação visual pelas normas regulatórias com grafo determinístico de relações e dados consolidados.
            </p>
          </div>
        </div>
      </div>
      
      <!-- Downloads e Links -->
      <div class="flex items-center gap-2 flex-wrap text-xs">
        <span class="text-[11px] text-slate-400 font-medium hidden sm:inline">Downloads Diretos:</span>
        <a href="data/dist/anvisa.db" download class="px-2.5 py-1.5 rounded-lg bg-blue-950/60 hover:bg-blue-900/80 text-blue-300 border border-blue-800/60 font-medium transition flex items-center gap-1.5" title="Baixar banco SQLite relacional completo">
          <span>💾 SQLite</span>
        </a>
        <a href="data/dist/normas.json" download class="px-2.5 py-1.5 rounded-lg bg-cyan-950/60 hover:bg-cyan-900/80 text-cyan-300 border border-cyan-800/60 font-medium transition flex items-center gap-1.5" title="Baixar acervo completo em JSON">
          <span>📊 JSON</span>
        </a>
        <a href="data/dist/normas.csv" download class="px-2.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/80 text-emerald-300 border border-emerald-800/60 font-medium transition flex items-center gap-1.5" title="Baixar tabela estruturada em CSV">
          <span>📑 CSV</span>
        </a>
        <a href="https://github.com/jadsonsanches/anvisa-normas" target="_blank" class="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700/80 font-semibold transition flex items-center gap-1">
          <span>GitHub</span> ↗
        </a>
      </div>
    </header>

    <!-- Estatísticas Rápidas -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div class="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Normas no Acervo</div>
        <div class="text-2xl font-bold text-blue-400 mt-1">${stats.totalNormas}</div>
        <div class="text-slate-500 text-[11px] mt-0.5">Texto integral em Markdown</div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div class="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Situação Jurídica</div>
        <div class="flex items-baseline gap-2 mt-1">
          <span class="text-2xl font-bold text-emerald-400">${stats.vigentes}</span>
          <span class="text-xs text-slate-400">vigentes</span>
          <span class="text-slate-600">/</span>
          <span class="text-sm font-semibold text-rose-400">${stats.revogadas}</span>
          <span class="text-xs text-slate-400">revogadas</span>
        </div>
        <div class="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden flex">
          <div style="width: ${Math.round((stats.vigentes / Math.max(1, stats.totalNormas)) * 100)}%" class="bg-emerald-500 h-full"></div>
          <div style="width: ${Math.round((stats.revogadas / Math.max(1, stats.totalNormas)) * 100)}%" class="bg-rose-500 h-full"></div>
        </div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div class="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Grafo de Relações</div>
        <div class="text-2xl font-bold text-indigo-400 mt-1">${grafo.nodes.length} nós / ${stats.totalRelacoes} arestas</div>
        <div class="text-slate-500 text-[11px] mt-0.5">Citações, revogações e bases</div>
      </div>
      <div class="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5">
        <div class="text-slate-400 text-[11px] font-medium uppercase tracking-wider">Tipos Coletados</div>
        <div class="flex items-center gap-1.5 mt-2 flex-wrap">
          ${distribuicaoHtml || '<span class="text-xs text-slate-500">Sem normas</span>'}
        </div>
      </div>
    </section>

    <!-- Painel de Gráficos e Analytics (Novo) -->
    <section class="bg-slate-900/60 border border-slate-800/90 rounded-xl p-4">
      <div class="flex items-center justify-between pb-3 border-b border-slate-800">
        <div class="flex items-center gap-2">
          <span class="text-base">📊</span>
          <h2 class="text-xs font-bold text-slate-200 uppercase tracking-wider">Dashboard de Métricas & Distribuição</h2>
        </div>
        <span class="text-[11px] text-slate-400">Clique nas barras ou fatias para filtrar o acervo</span>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-3.5">
        
        <!-- Gráfico 1: Proporção por Tipo (Donut Chart SVG) -->
        <div class="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Distribuição por Tipo de Ato</div>
          <div class="flex items-center justify-around gap-2" id="donut-container">
            <!-- Injetado dinamicamente -->
          </div>
        </div>

        <!-- Gráfico 2: Linha do Tempo / Publicações por Mês (Barras SVG) -->
        <div class="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Volume de Atos por Mês / Ano</div>
          <div class="h-28 flex items-end gap-2 pt-2 px-1" id="timeline-container">
            <!-- Injetado dinamicamente -->
          </div>
        </div>

        <!-- Gráfico 3: Relações & Conectividade -->
        <div class="bg-slate-950/70 border border-slate-800/80 rounded-lg p-3 flex flex-col justify-between">
          <div class="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">Conectividade Normativa</div>
          <div class="space-y-2 text-xs">
            <div class="flex items-center justify-between text-slate-300">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-cyan-400"></span> Normas Anvisa (Locais)</span>
              <span class="font-bold text-cyan-300" id="metric-local-nodes">0</span>
            </div>
            <div class="flex items-center justify-between text-slate-300">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-emerald-400"></span> Leis Federais & Referências</span>
              <span class="font-bold text-emerald-300" id="metric-ref-nodes">0</span>
            </div>
            <div class="flex items-center justify-between text-slate-300">
              <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-rose-400"></span> Revogações Mapeadas</span>
              <span class="font-bold text-rose-300" id="metric-revogacoes">0</span>
            </div>
            <div class="w-full bg-slate-900 border border-slate-800 rounded p-2 text-[11px] text-slate-400 mt-2">
              💡 As relações são extraídas diretamente das fórmulas oficiais do Datalegis.
            </div>
          </div>
        </div>

      </div>
    </section>

    <!-- Main Workspace -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-5">

      <!-- Grafo Interativo à Esquerda -->
      <div class="lg:col-span-2 bg-slate-900/70 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[680px] relative">
        <div class="p-3 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between z-10 flex-wrap gap-2">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="font-medium text-xs text-slate-300">Grafo Determinístico</span>
            <span class="text-[11px] text-slate-500 hidden sm:inline" id="graph-visible-count"></span>
          </div>
          
          <!-- Controles do Grafo e Toggle de Ocultar -->
          <div class="flex items-center gap-2 text-xs">
            <label class="flex items-center gap-1.5 text-[11px] text-slate-300 cursor-pointer bg-slate-900 hover:bg-slate-800 px-2.5 py-1 rounded border border-slate-800 transition">
              <input type="checkbox" id="toggle-hide-filtered" checked class="rounded bg-slate-800 border-slate-700 text-cyan-500 focus:ring-0" />
              <span>Ocultar nós fora do filtro</span>
            </label>

            <button id="btn-clear-focus" class="hidden px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 rounded transition text-[11px]">
              ✕ Desmarcar Foco
            </button>

            <div class="flex items-center gap-1 text-xs">
              <button id="btn-zoom-in" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200" title="Aproximar">+</button>
              <button id="btn-zoom-out" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200" title="Afastar">-</button>
              <button id="btn-reset" class="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">Centralizar</button>
            </div>
          </div>
        </div>

        <div class="relative flex-1 bg-slate-950">
          <canvas id="graphCanvas" class="w-full h-full block"></canvas>
          
          <!-- Legenda -->
          <div class="absolute bottom-3 left-3 bg-slate-900/95 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1 text-slate-300 shadow-xl">
            <div class="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-1">Legenda</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-cyan-400"></span> RE (Resoluções)</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-amber-500"></span> Portaria</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span> RDC</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-purple-500"></span> Instrução Normativa</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-pink-400"></span> Consulta Pública</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-emerald-500"></span> Lei Federal (Base)</div>
          </div>
        </div>
      </div>

      <!-- Busca e Detalhes da Norma à Direita -->
      <div class="bg-slate-900/70 border border-slate-800 rounded-xl p-4 flex flex-col h-[680px]">
        <div class="space-y-3 pb-3 border-b border-slate-800">
          <div class="flex items-center justify-between">
            <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Explorador de Normas</label>
            <span class="text-[11px] font-medium text-cyan-400" id="count-filtered"></span>
          </div>

          <!-- Campo de Busca -->
          <input 
            id="search-input"
            type="text" 
            placeholder="Buscar por número, tipo, ano ou ementa..."
            class="w-full bg-slate-950 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition"
          />

          <!-- Filtros por Período de Datas -->
          <div class="space-y-1.5 p-2 bg-slate-950/60 rounded-lg border border-slate-800/80">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400 font-medium">📅 Filtrar por Período:</span>
              <button id="btn-limpar-datas" class="text-[10px] text-cyan-400 hover:text-cyan-300 transition">Limpar Datas</button>
            </div>
            <div class="grid grid-cols-2 gap-2 text-xs">
              <div>
                <label for="date-start" class="block text-[10px] text-slate-500 uppercase">A partir de:</label>
                <input id="date-start" type="date" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500" />
              </div>
              <div>
                <label for="date-end" class="block text-[10px] text-slate-500 uppercase">Até:</label>
                <input id="date-end" type="date" class="w-full bg-slate-900 border border-slate-700/80 rounded px-2 py-1 text-[11px] text-slate-200 focus:outline-none focus:border-cyan-500" />
              </div>
            </div>
            <!-- Botões de Atalho de Ano -->
            <div class="flex items-center gap-1.5 text-[10px] pt-1 border-t border-slate-800/60 flex-wrap">
              <span class="text-slate-500">Atalhos:</span>
              <button class="preset-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition" data-mode="all">Todas</button>
              <button class="preset-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition" data-mode="week">Últimos 7 dias</button>
              <button class="preset-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition" data-mode="2026">2026</button>
              <button class="preset-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition" data-mode="2025">2025</button>
              <button class="preset-btn px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded transition" data-mode="2024">2024</button>
            </div>
          </div>

          <!-- Filtros por Tipo -->
          <div class="flex items-center gap-1.5 flex-wrap text-[11px]" id="filter-buttons">
            <button data-tipo="ALL" class="filter-btn active px-2.5 py-1 rounded-full bg-blue-600 text-white font-medium">Todos</button>
            <button data-tipo="RE" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">RE</button>
            <button data-tipo="PORTARIA" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">Portaria</button>
            <button data-tipo="RDC" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">RDC</button>
            <button data-tipo="IN" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">IN</button>
            <button data-tipo="CPB" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">CPB</button>
          </div>

          <!-- Filtros por Situação -->
          <div class="flex items-center gap-1.5 text-[11px]">
            <span class="text-slate-500 text-[10px] uppercase font-semibold">Status:</span>
            <button data-status="ALL" class="status-btn active px-2 py-0.5 rounded bg-slate-800 text-slate-200">Todos</button>
            <button data-status="vigente" class="status-btn px-2 py-0.5 rounded bg-slate-900 text-emerald-400 hover:bg-slate-800">Vigentes</button>
            <button data-status="revogada" class="status-btn px-2 py-0.5 rounded bg-slate-900 text-rose-400 hover:bg-slate-800">Revogadas</button>
          </div>
        </div>

        <!-- Painel de Detalhes ou Lista de Normas -->
        <div class="flex-1 overflow-y-auto mt-3 pr-1 space-y-2.5" id="details-pane">
          <!-- Renderizado dinamicamente via JS -->
        </div>
      </div>

    </div>

  </div>

  <script>
    const data = {
      nodes: ${JSON.stringify(grafo.nodes)},
      edges: ${JSON.stringify(grafo.edges)}
    };

    const CORES = {
      RDC: '#3b82f6',
      RE: '#06b6d4',
      PORTARIA: '#f59e0b',
      IN: '#a855f7',
      CPB: '#ec4899',
      LEI_FEDERAL: '#10b981',
      OUTROS: '#64748b'
    };

    function getNodeColor(node) {
      return CORES[node.tipo] || CORES.OUTROS;
    }

    // Parser robusto de datas brasileiras (DD/MM/AAAA, texto ou ISO)
    function parseDateToIso(str) {
      if (!str || typeof str !== 'string') return '';
      const trimmed = str.trim();
      const slashParts = trimmed.split('/');
      if (slashParts.length === 3) {
        const d = slashParts[0].padStart(2, '0');
        const m = slashParts[1].padStart(2, '0');
        const y = slashParts[2];
        if (y.length === 4) return \`\${y}-\${m}-\${d}\`;
      }
      const meses = {
        janeiro: '01', fevereiro: '02', março: '03', marco: '03',
        abril: '04', maio: '05', junho: '06', julho: '07',
        agosto: '08', setembro: '09', outubro: '10', novembro: '11', dezembro: '12'
      };
      const textualMatch = trimmed.match(/(\\d{1,2})\\s+de\\s+([a-zA-Zç]+)\\s+de\\s+(\\d{4})/i);
      if (textualMatch) {
        const dia = textualMatch[1].padStart(2, '0');
        const mes = meses[textualMatch[2].toLowerCase()] || '01';
        const ano = textualMatch[3];
        return \`\${ano}-\${mes}-\${dia}\`;
      }
      const isoMatch = trimmed.match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
      if (isoMatch) return trimmed;
      return '';
    }

    const canvas = document.getElementById('graphCanvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    function resize() {
      width = canvas.parentElement.clientWidth;
      height = canvas.parentElement.clientHeight;
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    }
    resize();
    window.addEventListener('resize', resize);

    const nodes = data.nodes.map((n, i) => {
      const angle = (i / Math.max(1, data.nodes.length)) * Math.PI * 2;
      const radius = 110 + Math.random() * 130;
      return {
        ...n,
        x: (width / 2) + Math.cos(angle) * radius,
        y: (height / 2) + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        radius: n.tipo === 'LEI_FEDERAL' ? 14 : (n.arquivo ? 11 : 7)
      };
    });

    const nodeMap = new Map();
    nodes.forEach(n => nodeMap.set(n.id, n));

    const edges = data.edges.map(e => ({
      ...e,
      sourceNode: nodeMap.get(e.source),
      targetNode: nodeMap.get(e.target)
    })).filter(e => e.sourceNode && e.targetNode);

    // Mapeamento de vizinhança rápida
    const adjacency = new Map();
    nodes.forEach(n => adjacency.set(n.id, new Set()));
    edges.forEach(e => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });

    let transform = { x: 0, y: 0, scale: 1 };
    let isDragging = false;
    let dragNode = null;
    let lastMouse = { x: 0, y: 0 };
    let selectedNode = nodes[0] || null;
    let isFocused = false;
    let filteredNodeIds = new Set(nodes.map(n => n.id));
    let hasActiveFilter = false;
    let hideFilteredNodes = true;

    const toggleHideFiltered = document.getElementById('toggle-hide-filtered');
    const btnClearFocus = document.getElementById('btn-clear-focus');
    const graphVisibleCount = document.getElementById('graph-visible-count');

    toggleHideFiltered.addEventListener('change', (e) => {
      hideFilteredNodes = e.target.checked;
    });

    btnClearFocus.addEventListener('click', () => {
      isFocused = false;
      btnClearFocus.classList.add('hidden');
    });

    function isNodeVisible(n) {
      if (!hasActiveFilter) return true;
      if (filteredNodeIds.has(n.id)) return true;
      // Se não estiver no filtro direto, mas for referência de um nó visível:
      if (!n.arquivo) {
        const neighbors = adjacency.get(n.id) || new Set();
        for (const neighborId of neighbors) {
          if (filteredNodeIds.has(neighborId)) return true;
        }
      }
      return !hideFilteredNodes;
    }

    function isNodeMatched(n) {
      if (!hasActiveFilter) return true;
      return filteredNodeIds.has(n.id) || (!n.arquivo && isNodeVisible(n));
    }

    function stepPhysics() {
      const repulsion = 1700;
      const springLength = 80;
      const springK = 0.04;
      const damping = 0.85;

      const visibleList = nodes.filter(n => isNodeVisible(n));

      for (let i = 0; i < visibleList.length; i++) {
        for (let j = i + 1; j < visibleList.length; j++) {
          const n1 = visibleList[i];
          const n2 = visibleList[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 320) {
            let force = repulsion / (dist * dist);
            let fx = (dx / dist) * force;
            let fy = (dy / dist) * force;
            n1.vx -= fx;
            n1.vy -= fy;
            n2.vx += fx;
            n2.vy += fy;
          }
        }
      }

      edges.forEach(e => {
        if (!isNodeVisible(e.sourceNode) || !isNodeVisible(e.targetNode)) return;
        let dx = e.targetNode.x - e.sourceNode.x;
        let dy = e.targetNode.y - e.sourceNode.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - springLength) * springK;
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        e.sourceNode.vx += fx;
        e.sourceNode.vy += fy;
        e.targetNode.vx -= fx;
        e.targetNode.vy -= fy;
      });

      visibleList.forEach(n => {
        let dx = (width / 2) - n.x;
        let dy = (height / 2) - n.y;
        n.vx += dx * 0.003;
        n.vy += dy * 0.003;

        n.vx *= damping;
        n.vy *= damping;

        if (n !== dragNode) {
          n.x += n.vx;
          n.y += n.vy;
        }
      });
    }

    function draw() {
      ctx.save();
      ctx.clearRect(0, 0, width, height);
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      const focusedNeighbors = (isFocused && selectedNode) ? adjacency.get(selectedNode.id) || new Set() : null;

      // Desenhar Arestas
      edges.forEach(e => {
        const sourceVis = isNodeVisible(e.sourceNode);
        const targetVis = isNodeVisible(e.targetNode);

        if (!sourceVis || !targetVis) return;

        const isEdgeConnectedToFocus = isFocused && selectedNode && (e.source === selectedNode.id || e.target === selectedNode.id);
        const isMatched = (!hasActiveFilter || (filteredNodeIds.has(e.source) && filteredNodeIds.has(e.target)));

        ctx.save();
        if (isFocused) {
          ctx.globalAlpha = isEdgeConnectedToFocus ? 1.0 : 0.08;
        } else {
          ctx.globalAlpha = isMatched ? 1.0 : (hideFilteredNodes ? 0 : 0.15);
        }

        ctx.beginPath();
        ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
        ctx.lineTo(e.targetNode.x, e.targetNode.y);
        ctx.strokeStyle = e.relacao === 'revogada_por' ? 'rgba(244, 63, 94, 0.6)' :
                          e.relacao === 'baseada_em' ? 'rgba(16, 185, 129, 0.5)' :
                          'rgba(148, 163, 184, 0.35)';
        ctx.lineWidth = isEdgeConnectedToFocus ? 2.5 : (e.relacao === 'revogada_por' ? 2 : 1.2);
        ctx.stroke();
        ctx.restore();
      });

      let visibleNodesCount = 0;

      // Desenhar Nós
      nodes.forEach(n => {
        if (!isNodeVisible(n)) return;
        visibleNodesCount++;

        const isSelected = selectedNode && selectedNode.id === n.id;
        const isNeighborOfSelected = focusedNeighbors && focusedNeighbors.has(n.id);
        const isMatched = isNodeMatched(n);

        ctx.save();

        if (isFocused) {
          ctx.globalAlpha = (isSelected || isNeighborOfSelected) ? 1.0 : 0.12;
        } else {
          ctx.globalAlpha = isMatched ? 1.0 : (hideFilteredNodes ? 0 : 0.18);
        }

        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fillStyle = getNodeColor(n);
        ctx.fill();

        if (isSelected) {
          ctx.lineWidth = 3;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();

          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 5, 0, Math.PI * 2);
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (isNeighborOfSelected) {
          ctx.lineWidth = 2;
          ctx.strokeStyle = '#38bdf8';
          ctx.stroke();
        } else {
          ctx.lineWidth = 1.5;
          ctx.strokeStyle = '#0f172a';
          ctx.stroke();
        }

        // Rótulo de texto
        if (!isFocused || isSelected || isNeighborOfSelected) {
          ctx.font = isSelected ? 'bold 11px system-ui' : '10px system-ui';
          ctx.fillStyle = isSelected ? '#38bdf8' : (isMatched ? '#cbd5e1' : '#64748b');
          ctx.textAlign = 'center';
          ctx.fillText(n.id, n.x, n.y + n.radius + 12);
        }

        ctx.restore();
      });

      graphVisibleCount.textContent = \`(\${visibleNodesCount} nós visíveis)\`;
      ctx.restore();
    }

    function loop() {
      stepPhysics();
      draw();
      requestAnimationFrame(loop);
    }
    loop();

    // Eventos do Canvas
    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      return {
        x: (clientX - rect.left - transform.x) / transform.scale,
        y: (clientY - rect.top - transform.y) / transform.scale
      };
    }

    canvas.addEventListener('mousedown', e => {
      const pos = getMousePos(e);
      let clicked = null;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!isNodeVisible(n)) continue;
        const dist = Math.hypot(n.x - pos.x, n.y - pos.y);
        if (dist <= n.radius + 5) {
          clicked = n;
          break;
        }
      }

      if (clicked) {
        dragNode = clicked;
        selectedNode = clicked;
        isFocused = true;
        btnClearFocus.classList.remove('hidden');
        updateDetails(clicked);
      } else {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mousemove', e => {
      if (dragNode) {
        const pos = getMousePos(e);
        dragNode.x = pos.x;
        dragNode.y = pos.y;
        dragNode.vx = 0;
        dragNode.vy = 0;
      } else if (isDragging) {
        const dx = e.clientX - lastMouse.x;
        const dy = e.clientY - lastMouse.y;
        transform.x += dx;
        transform.y += dy;
        lastMouse = { x: e.clientX, y: e.clientY };
      }
    });

    window.addEventListener('mouseup', () => {
      dragNode = null;
      isDragging = false;
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 1.12 : 0.88;
      const pos = getMousePos(e);
      transform.x = pos.x * (1 - zoomFactor) + transform.x * zoomFactor;
      transform.y = pos.y * (1 - zoomFactor) + transform.y * zoomFactor;
      transform.scale *= zoomFactor;
      transform.scale = Math.max(0.2, Math.min(3.5, transform.scale));
    }, { passive: false });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      transform.scale = Math.min(3.5, transform.scale * 1.25);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      transform.scale = Math.max(0.2, transform.scale * 0.8);
    });
    document.getElementById('btn-reset').addEventListener('click', () => {
      transform = { x: 0, y: 0, scale: 1 };
      isFocused = false;
      btnClearFocus.classList.add('hidden');
    });

    // Detalhes da Norma
    const detailsPane = document.getElementById('details-pane');

    function updateDetails(node) {
      if (!node) return;
      const relsOrigem = edges.filter(e => e.source === node.id);
      const relsDestino = edges.filter(e => e.target === node.id);

      const githubUrl = node.arquivo ? \`https://github.com/jadsonsanches/anvisa-normas/blob/main/\${node.arquivo}\` : null;

      let corBadge = 'bg-slate-800 text-slate-300 border-slate-700';
      if (node.tipo === 'RDC') corBadge = 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      if (node.tipo === 'RE') corBadge = 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
      if (node.tipo === 'PORTARIA') corBadge = 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      if (node.tipo === 'IN') corBadge = 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      if (node.tipo === 'CPB') corBadge = 'bg-pink-500/20 text-pink-300 border-pink-500/30';
      if (node.tipo === 'LEI_FEDERAL') corBadge = 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';

      detailsPane.innerHTML = \`
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
            <div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded border \${corBadge}">\${node.tipo}</span>
              <h3 class="text-base font-bold text-slate-100 mt-1.5">\${node.id}</h3>
            </div>
            \${node.situacao ? \`
              <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded \${
                node.situacao === 'vigente' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                node.situacao === 'revogada' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-slate-800 text-slate-400 border border-slate-700'
              }">\${node.situacao}</span>
            \` : ''}
          </div>

          <!-- Datas Jurídicas -->
          <div class="grid grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded border border-slate-800">
            <div>
              <span class="text-slate-500 font-medium block text-[10px] uppercase">Data do Ato:</span>
              <strong class="text-cyan-300 font-semibold">\${node.data_ato || node.data_promulgacao || 'N/D'}</strong>
            </div>
            <div>
              <span class="text-slate-500 font-medium block text-[10px] uppercase">Publicação no DOU:</span>
              <strong class="text-slate-200 font-semibold">\${node.data_publicacao_dou || 'N/D'}</strong>
            </div>
          </div>

          \${node.ementa ? \`
            <div class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span class="font-semibold text-slate-400 block mb-1">Ementa Oficial:</span>
              \${node.ementa}
            </div>
          \` : '<div class="text-xs text-slate-500 italic">Norma de referência externa citada no acervo.</div>'}

          \${githubUrl ? \`
            <div class="pt-1 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-mono text-[10px] truncate max-w-[200px]">\${node.arquivo}</span>
              <a href="\${githubUrl}" target="_blank" class="px-2.5 py-1 bg-blue-600/30 hover:bg-blue-600/50 text-blue-300 rounded text-[11px] border border-blue-500/40 font-medium transition flex items-center gap-1">
                <span>Ver Markdown</span> ↗
              </a>
            </div>
          \` : ''}

          <!-- Relações -->
          <div class="space-y-2 pt-2 border-t border-slate-800 text-xs">
            <div class="font-semibold text-slate-300">Conexões no Grafo (\${relsOrigem.length + relsDestino.length})</div>
            
            \${relsOrigem.length > 0 ? \`
              <div>
                <span class="text-[11px] text-slate-400 block mb-1">Vinculado a:</span>
                <div class="flex flex-wrap gap-1">
                  \${relsOrigem.map(r => \`
                    <button onclick="selectNodeById('\${r.target}')" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition">
                      \${r.relacao} → \${r.target}
                    </button>
                  \`).join('')}
                </div>
              </div>
            \` : ''}

            \${relsDestino.length > 0 ? \`
              <div>
                <span class="text-[11px] text-slate-400 block mb-1">Citado por:</span>
                <div class="flex flex-wrap gap-1">
                  \${relsDestino.map(r => \`
                    <button onclick="selectNodeById('\${r.source}')" class="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[11px] border border-slate-700 transition">
                      ← \${r.source}
                    </button>
                  \`).join('')}
                </div>
              </div>
            \` : ''}
          </div>
        </div>
      \`;
    }

    window.selectNodeById = function(id) {
      const target = nodeMap.get(id);
      if (target) {
        selectedNode = target;
        isFocused = true;
        btnClearFocus.classList.remove('hidden');
        updateDetails(target);
        transform.x = (width / 2) - target.x * transform.scale;
        transform.y = (height / 2) - target.y * transform.scale;
      }
    };

    // Filtros e busca
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    const statusBtns = document.querySelectorAll('.status-btn');
    const countFiltered = document.getElementById('count-filtered');
    const dateStartInput = document.getElementById('date-start');
    const dateEndInput = document.getElementById('date-end');
    const btnLimparDatas = document.getElementById('btn-limpar-datas');
    const presetBtns = document.querySelectorAll('.preset-btn');

    let currentTipoFilter = 'ALL';
    let currentStatusFilter = 'ALL';

    function renderList() {
      const q = searchInput.value.toLowerCase().trim();
      const startDate = dateStartInput.value;
      const endDate = dateEndInput.value;

      hasActiveFilter = q.length > 0 || currentTipoFilter !== 'ALL' || currentStatusFilter !== 'ALL' || !!startDate || !!endDate;

      const filtered = nodes.filter(n => {
        if (!n.arquivo) return false;
        if (currentTipoFilter !== 'ALL' && n.tipo !== currentTipoFilter) return false;
        if (currentStatusFilter !== 'ALL' && n.situacao !== currentStatusFilter) return false;

        // Filtro por período de datas
        if (startDate || endDate) {
          const atoIso = parseDateToIso(n.data_ato);
          const douIso = parseDateToIso(n.data_publicacao_dou);
          const refDate = douIso || atoIso;

          if (startDate && refDate && refDate < startDate) return false;
          if (endDate && refDate && refDate > endDate) return false;
          if (!refDate && n.ano) {
            if (startDate && startDate.substring(0, 4) > n.ano) return false;
            if (endDate && endDate.substring(0, 4) < n.ano) return false;
          }
        }

        // Filtro textual
        if (!q) return true;
        const inId = n.id.toLowerCase().includes(q);
        const inEmenta = n.ementa && n.ementa.toLowerCase().includes(q);
        const inAno = n.ano && n.ano.includes(q);
        const inDataAto = n.data_ato && n.data_ato.includes(q);
        const inDataDou = n.data_publicacao_dou && n.data_publicacao_dou.includes(q);

        return inId || inEmenta || inAno || inDataAto || inDataDou;
      });

      filteredNodeIds = new Set(filtered.map(n => n.id));
      countFiltered.textContent = \`\${filtered.length} de \${nodes.filter(n => n.arquivo).length} normas\`;

      if (hasActiveFilter) {
        detailsPane.innerHTML = filtered.map(n => \`
          <div onclick="selectNodeById('\${n.id}')" class="bg-slate-950 hover:bg-slate-800/80 border border-slate-800/90 rounded-lg p-2.5 cursor-pointer transition space-y-1.5">
            <div class="flex items-center justify-between">
              <span class="font-bold text-xs text-slate-200">\${n.id}</span>
              <span class="text-[9px] uppercase px-1.5 py-0.2 rounded \${
                n.situacao === 'vigente' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
              }">\${n.situacao}</span>
            </div>
            <div class="flex items-center justify-between text-[10px] text-slate-400">
              <span>📅 Ato: \${n.data_ato || n.data_promulgacao || ''}</span>
              \${n.data_publicacao_dou ? \`<span>DOU: \${n.data_publicacao_dou}</span>\` : ''}
            </div>
            \${n.ementa ? \`<p class="text-[11px] text-slate-400 line-clamp-2 leading-tight">\${n.ementa}</p>\` : ''}
          </div>
        \`).join('') || '<div class="text-xs text-slate-500 text-center py-8">Nenhuma norma encontrada para os filtros ativos.</div>';
      } else if (selectedNode) {
        updateDetails(selectedNode);
      }
    }

    searchInput.addEventListener('input', renderList);
    dateStartInput.addEventListener('input', renderList);
    dateEndInput.addEventListener('input', renderList);

    btnLimparDatas.addEventListener('click', () => {
      dateStartInput.value = '';
      dateEndInput.value = '';
      renderList();
    });

    presetBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        const mode = btn.dataset.mode;
        if (mode === 'all') {
          dateStartInput.value = '';
          dateEndInput.value = '';
        } else if (mode === 'week') {
          const now = new Date();
          const past = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
          dateEndInput.value = now.toISOString().split('T')[0];
          dateStartInput.value = past.toISOString().split('T')[0];
        } else {
          dateStartInput.value = \`\${mode}-01-01\`;
          dateEndInput.value = \`\${mode}-12-31\`;
        }
        renderList();
      });
    });

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        btn.classList.add('bg-blue-600', 'text-white');
        currentTipoFilter = btn.dataset.tipo;
        renderList();
      });
    });

    statusBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        statusBtns.forEach(b => {
          b.classList.remove('bg-slate-700', 'text-white');
          b.classList.add('bg-slate-900', 'text-slate-400');
        });
        btn.classList.remove('bg-slate-900', 'text-slate-400');
        btn.classList.add('bg-slate-700', 'text-white');
        currentStatusFilter = btn.dataset.status;
        renderList();
      });
    });

    // Construção dos Gráficos Interativos (SVG Analytics)
    function buildCharts() {
      // 1. Donut Chart por Tipo
      const tiposCount = {};
      nodes.filter(n => n.arquivo).forEach(n => {
        tiposCount[n.tipo] = (tiposCount[n.tipo] || 0) + 1;
      });

      const totalNormasLocais = Object.values(tiposCount).reduce((a, b) => a + b, 0) || 1;
      let cumulativePercent = 0;

      const slices = Object.entries(tiposCount).map(([tipo, count]) => {
        const percent = count / totalNormasLocais;
        const start = cumulativePercent;
        cumulativePercent += percent;
        return { tipo, count, percent, start, end: cumulativePercent, color: CORES[tipo] || '#64748b' };
      });

      const donutSvg = \`
        <svg viewBox="0 0 100 100" class="w-24 h-24 transform -rotate-90">
          \${slices.map(s => {
            const startAngle = s.start * 2 * Math.PI;
            const endAngle = s.end * 2 * Math.PI;
            const x1 = 50 + 40 * Math.cos(startAngle);
            const y1 = 50 + 40 * Math.sin(startAngle);
            const x2 = 50 + 40 * Math.cos(endAngle);
            const y2 = 50 + 40 * Math.sin(endAngle);
            const largeArc = (s.end - s.start) > 0.5 ? 1 : 0;
            const d = s.percent >= 0.999 ? 'M 50 10 A 40 40 0 1 1 49.99 10 Z' :
                      \`M \${x1} \${y1} A 40 40 0 \${largeArc} 1 \${x2} \${y2}\`;
            return \`<path d="\${d}" fill="none" stroke="\${s.color}" stroke-width="18" class="donut-segment cursor-pointer transition" data-tipo="\${s.tipo}">
              <title>\${s.tipo}: \${s.count} (\${Math.round(s.percent * 100)}%)</title>
            </path>\`;
          }).join('')}
        </svg>
        <div class="space-y-1 text-xs">
          \${slices.map(s => \`
            <div class="flex items-center gap-1.5 cursor-pointer hover:opacity-80 transition" onclick="triggerTipoFilter('\${s.tipo}')">
              <span class="w-2.5 h-2.5 rounded-full" style="background-color: \${s.color}"></span>
              <span class="text-slate-300 font-medium">\${s.tipo}:</span>
              <strong class="text-slate-100">\${s.count}</strong>
              <span class="text-[10px] text-slate-500">(\${Math.round(s.percent * 100)}%)</span>
            </div>
          \`).join('')}
        </div>
      \`;
      document.getElementById('donut-container').innerHTML = donutSvg;

      // 2. Timeline de Publicações por Mês/Ano
      const mesesMap = {};
      nodes.filter(n => n.arquivo).forEach(n => {
        const iso = parseDateToIso(n.data_publicacao_dou || n.data_ato);
        const mesAno = iso ? iso.substring(0, 7) : (n.ano ? \`\${n.ano}-01\` : '2026-11');
        mesesMap[mesAno] = (mesesMap[mesAno] || 0) + 1;
      });

      const mesesSorted = Object.keys(mesesMap).sort();
      const maxCount = Math.max(1, ...Object.values(mesesMap));

      const timelineHtml = mesesSorted.map(mes => {
        const count = mesesMap[mes];
        const heightPct = Math.max(15, Math.round((count / maxCount) * 100));
        const [ano, m] = mes.split('-');
        const nomesMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
        const label = m ? \`\${nomesMes[parseInt(m, 10)-1] || m}/\${ano.slice(2)}\` : mes;
        return \`
          <div class="flex-1 flex flex-col items-center gap-1 group cursor-pointer" onclick="filterByMonth('\${mes}')">
            <span class="text-[9px] text-cyan-300 font-bold opacity-0 group-hover:opacity-100 transition">\${count}</span>
            <div class="w-full bg-gradient-to-t from-blue-600 to-cyan-400 rounded-t chart-bar transition-all" style="height: \${heightPct}%" title="\${mes}: \${count} atos"></div>
            <span class="text-[9px] text-slate-400 group-hover:text-cyan-300 transition truncate w-full text-center">\${label}</span>
          </div>
        \`;
      }).join('');
      document.getElementById('timeline-container').innerHTML = timelineHtml || '<div class="text-xs text-slate-500 m-auto">Sem datas suficientes</div>';

      // 3. Contadores de Rede
      const locais = nodes.filter(n => n.arquivo).length;
      const refNodes = nodes.filter(n => !n.arquivo).length;
      const revogacoes = edges.filter(e => e.relacao === 'revogada_por').length;

      document.getElementById('metric-local-nodes').textContent = locais;
      document.getElementById('metric-ref-nodes').textContent = refNodes;
      document.getElementById('metric-revogacoes').textContent = revogacoes;

      // Eventos dos segmentos do Donut
      document.querySelectorAll('.donut-segment').forEach(seg => {
        seg.addEventListener('click', () => {
          triggerTipoFilter(seg.dataset.tipo);
        });
      });
    }

    window.triggerTipoFilter = function(tipo) {
      filterBtns.forEach(btn => {
        if (btn.dataset.tipo === tipo) {
          btn.click();
        }
      });
    };

    window.filterByMonth = function(mesAno) {
      dateStartInput.value = \`\${mesAno}-01\`;
      const [ano, mes] = mesAno.split('-');
      const lastDay = new Date(parseInt(ano, 10), parseInt(mes, 10), 0).getDate();
      dateEndInput.value = \`\${mesAno}-\${lastDay}\`;
      renderList();
    };

    buildCharts();

    // Iniciar com o primeiro nó selecionado
    updateDetails(selectedNode);
    renderList();
  </script>
</body>
</html>
`;

// Salvar no repositório (visualizador.html e index.html para o GitHub Pages)
fs.writeFileSync(path.join(__dirname, '../visualizador.html'), htmlContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '../index.html'), htmlContent, 'utf8');
console.log('✅ Visualizador e index.html gerados com sucesso!');
