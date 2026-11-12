const fs = require('fs');
const path = require('path');

const grafo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/relacoes.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/estatisticas.json'), 'utf8'));

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anvisa Normas - Visualizador Interativo</title>
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <style>
    body {
      margin: 0;
      font-family: system-ui, -apple-system, sans-serif;
      background: #0f172a;
      color: #f8fafc;
      overflow-x: hidden;
    }
    canvas {
      cursor: grab;
    }
    canvas:active {
      cursor: grabbing;
    }
    /* Scrollbar */
    ::-webkit-scrollbar {
      width: 6px;
      height: 6px;
    }
    ::-webkit-scrollbar-thumb {
      background: #334155;
      border-radius: 4px;
    }
  </style>
</head>
<body class="p-4 md:p-6 bg-slate-950 text-slate-100 min-h-screen">
  <div class="max-w-7xl mx-auto space-y-6">

    <!-- Header -->
    <header class="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
      <div>
        <div class="flex items-center gap-3">
          <span class="text-3xl">🏛️</span>
          <h1 class="text-2xl font-bold tracking-tight bg-gradient-to-r from-blue-400 via-indigo-300 to-emerald-400 bg-clip-text text-transparent">
            Acervo Aberto Anvisa - Visualizador
          </h1>
        </div>
        <p class="text-slate-400 text-sm mt-1">
          Navegação visual pelas normas regulatórias e grafo determinístico de relações.
        </p>
      </div>
      <div class="flex items-center gap-2">
        <a href="https://github.com/jadsonsanches/anvisa-normas" target="_blank" class="px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition">
          Ver no GitHub ↗
        </a>
      </div>
    </header>

    <!-- Estatísticas Rápidas -->
    <section class="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-slate-400 text-xs font-medium uppercase tracking-wider">Normas Coletadas</div>
        <div class="text-2xl font-bold text-blue-400 mt-1" id="stat-normas">${stats.totalNormas}</div>
        <div class="text-slate-500 text-xs mt-1">Lote piloto 2024</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-slate-400 text-xs font-medium uppercase tracking-wider">Relações Ativas</div>
        <div class="text-2xl font-bold text-emerald-400 mt-1" id="stat-relacoes">${stats.totalRelacoes}</div>
        <div class="text-slate-500 text-xs mt-1">Revogações e citações</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-slate-400 text-xs font-medium uppercase tracking-wider">Nós no Grafo</div>
        <div class="text-2xl font-bold text-indigo-400 mt-1" id="stat-nos">${grafo.nodes.length}</div>
        <div class="text-slate-500 text-xs mt-1">RDCs, INs e Leis</div>
      </div>
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4">
        <div class="text-slate-400 text-xs font-medium uppercase tracking-wider">Distribuição</div>
        <div class="flex items-center gap-2 mt-2 text-xs">
          <span class="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-500/30">RDC: ${stats.porTipo.RDC}</span>
          <span class="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">PORT: ${stats.porTipo.PORTARIA}</span>
          <span class="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">IN: ${stats.porTipo.IN}</span>
        </div>
      </div>
    </section>

    <!-- Main Workspace: Grafo à esquerda, Detalhes à direita -->
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-6">

      <!-- Coluna da Esquerda: Grafo Interativo -->
      <div class="lg:col-span-2 bg-slate-900 border border-slate-800 rounded-xl overflow-hidden flex flex-col h-[580px] relative">
        <div class="p-3 border-b border-slate-800 bg-slate-950/60 flex items-center justify-between z-10">
          <div class="flex items-center gap-2">
            <span class="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span class="font-medium text-xs text-slate-300">Grafo Determinístico (Arrastar / Zoom / Clique)</span>
          </div>
          <div class="flex items-center gap-2 text-xs">
            <button id="btn-zoom-in" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">+</button>
            <button id="btn-zoom-out" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">-</button>
            <button id="btn-reset" class="px-2 py-1 bg-slate-800 hover:bg-slate-700 rounded text-slate-200">Centralizar</button>
          </div>
        </div>

        <div class="relative flex-1 bg-slate-950">
          <canvas id="graphCanvas" class="w-full h-full block"></canvas>
          <div class="absolute bottom-3 left-3 bg-slate-900/90 backdrop-blur border border-slate-800 rounded-lg p-2.5 text-[11px] space-y-1 text-slate-300">
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-blue-500"></span> RDC</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-purple-500"></span> Instrução Normativa</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-amber-500"></span> Portaria</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-emerald-500"></span> Lei Federal (Base)</div>
            <div class="flex items-center gap-2"><span class="w-3 h-3 rounded-full bg-slate-600"></span> Norma Correlata</div>
          </div>
        </div>
      </div>

      <!-- Coluna da Direita: Busca e Detalhes da Norma -->
      <div class="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col h-[580px]">
        <div class="space-y-3 pb-3 border-b border-slate-800">
          <label class="block text-xs font-semibold text-slate-300 uppercase tracking-wider">Pesquisar Norma</label>
          <div class="relative">
            <input 
              id="search-input"
              type="text" 
              placeholder="Digite nº, tipo ou palavra da ementa..."
              class="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-blue-500 transition"
            />
          </div>
          <div class="flex items-center gap-1.5 flex-wrap text-[11px]" id="filter-buttons">
            <button data-tipo="ALL" class="filter-btn active px-2.5 py-1 rounded-full bg-blue-600 text-white font-medium">Todos</button>
            <button data-tipo="RDC" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">RDC</button>
            <button data-tipo="IN" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">IN</button>
            <button data-tipo="PORTARIA" class="filter-btn px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 hover:bg-slate-700">Portarias</button>
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

    // Cores por tipo
    function getNodeColor(node) {
      if (node.tipo === 'RDC') return '#3b82f6';
      if (node.tipo === 'IN') return '#a855f7';
      if (node.tipo === 'PORTARIA') return '#f59e0b';
      if (node.tipo === 'LEI_FEDERAL') return '#10b981';
      return '#64748b';
    }

    // Inicialização da simulação física simples
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

    // Estrutura de nós
    const nodes = data.nodes.map((n, i) => {
      const angle = (i / data.nodes.length) * Math.PI * 2;
      const radius = 120 + Math.random() * 120;
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

    // Zoom & Pan
    let transform = { x: 0, y: 0, scale: 1 };
    let isDragging = false;
    let dragNode = null;
    let lastMouse = { x: 0, y: 0 };
    let selectedNode = nodes[0] || null;

    // Física
    function stepPhysics() {
      const repulsion = 1800;
      const springLength = 70;
      const springK = 0.04;
      const damping = 0.85;

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const n1 = nodes[i];
          const n2 = nodes[j];
          let dx = n2.x - n1.x;
          let dy = n2.y - n1.y;
          let dist = Math.sqrt(dx * dx + dy * dy) || 1;
          if (dist < 300) {
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

      // Centro de atração
      nodes.forEach(n => {
        let dx = (width / 2) - n.x;
        let dy = (height / 2) - n.y;
        n.vx += dx * 0.002;
        n.vy += dy * 0.002;

        if (n !== dragNode) {
          n.vx *= damping;
          n.vy *= damping;
          n.x += n.vx;
          n.y += n.vy;
        }
      });
    }

    // Render loop
    function render() {
      stepPhysics();

      ctx.clearRect(0, 0, width, height);
      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      // Linhas / Arestas
      edges.forEach(e => {
        const isHighlight = selectedNode && (e.sourceNode === selectedNode || e.targetNode === selectedNode);
        ctx.strokeStyle = isHighlight ? '#38bdf8' : '#334155';
        ctx.lineWidth = isHighlight ? 2 : 1;
        ctx.globalAlpha = isHighlight ? 1 : 0.4;
        ctx.beginPath();
        ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
        ctx.lineTo(e.targetNode.x, e.targetNode.y);
        ctx.stroke();
      });

      ctx.globalAlpha = 1;

      // Nós
      nodes.forEach(n => {
        const isSel = n === selectedNode;
        ctx.fillStyle = getNodeColor(n);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        if (isSel) {
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 3;
          ctx.stroke();
        }

        // Rótulo
        if (n.radius >= 10 || isSel) {
          ctx.font = isSel ? 'bold 11px system-ui' : '10px system-ui';
          ctx.fillStyle = isSel ? '#ffffff' : '#94a3b8';
          ctx.textAlign = 'center';
          ctx.fillText(n.id, n.x, n.y + n.radius + 12);
        }
      });

      ctx.restore();
      requestAnimationFrame(render);
    }
    requestAnimationFrame(render);

    // Mouse interativo
    function getMousePos(e) {
      const rect = canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left - transform.x) / transform.scale;
      const y = (e.clientY - rect.top - transform.y) / transform.scale;
      return { x, y };
    }

    function findNodeAt(pos) {
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        const dx = pos.x - n.x;
        const dy = pos.y - n.y;
        if (dx * dx + dy * dy <= (n.radius + 5) * (n.radius + 5)) {
          return n;
        }
      }
      return null;
    }

    canvas.addEventListener('mousedown', e => {
      const pos = getMousePos(e);
      const hit = findNodeAt(pos);
      if (hit) {
        dragNode = hit;
        selectedNode = hit;
        updateDetails(hit);
      } else {
        isDragging = true;
      }
      lastMouse = { x: e.clientX, y: e.clientY };
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
      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      transform.scale = Math.max(0.3, Math.min(3, transform.scale * zoomFactor));
    });

    document.getElementById('btn-zoom-in').onclick = () => { transform.scale = Math.min(3, transform.scale * 1.2); };
    document.getElementById('btn-zoom-out').onclick = () => { transform.scale = Math.max(0.3, transform.scale / 1.2); };
    document.getElementById('btn-reset').onclick = () => {
      transform = { x: 0, y: 0, scale: 1 };
    };

    // Detalhes da Norma
    const detailsPane = document.getElementById('details-pane');

    function updateDetails(node) {
      if (!node) return;

      const relsOrigem = edges.filter(e => e.source === node.id);
      const relsDestino = edges.filter(e => e.target === node.id);

      detailsPane.innerHTML = \`
        <div class="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-3">
          <div class="flex items-start justify-between gap-2">
            <div>
              <span class="text-xs font-semibold px-2 py-0.5 rounded \${
                node.tipo === 'RDC' ? 'bg-blue-500/20 text-blue-300' :
                node.tipo === 'IN' ? 'bg-purple-500/20 text-purple-300' :
                node.tipo === 'PORTARIA' ? 'bg-amber-500/20 text-amber-300' :
                'bg-emerald-500/20 text-emerald-300'
              }">\${node.tipo}</span>
              <h3 class="text-base font-bold text-slate-100 mt-1">\${node.id}</h3>
            </div>
            \${node.situacao ? \`
              <span class="text-[10px] uppercase font-bold px-2 py-0.5 rounded \${
                node.situacao === 'vigente' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                node.situacao === 'revogada' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                'bg-slate-700 text-slate-300'
              }">\${node.situacao}</span>
            \` : ''}
          </div>

          \${node.ementa ? \`
            <div class="text-xs text-slate-300 leading-relaxed bg-slate-900/60 p-2.5 rounded border border-slate-800/80">
              <span class="font-semibold text-slate-400 block mb-1">Ementa Oficial:</span>
              \${node.ementa}
            </div>
          \` : '<div class="text-xs text-slate-500 italic">Norma externa citada no acervo.</div>'}

          \${node.arquivo ? \`
            <div class="text-[11px] text-slate-400">
              <span class="font-semibold text-slate-400">Arquivo Local:</span>
              <code class="block mt-0.5 bg-slate-900 px-2 py-1 rounded text-blue-400 font-mono text-[10px] break-all">\${node.arquivo}</code>
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
                      \${r.tipo} → \${r.target}
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
        updateDetails(target);
        transform.x = (width / 2) - target.x * transform.scale;
        transform.y = (height / 2) - target.y * transform.scale;
      }
    };

    // Filtros e busca
    const searchInput = document.getElementById('search-input');
    const filterBtns = document.querySelectorAll('.filter-btn');
    let currentFilter = 'ALL';

    function renderList() {
      const q = searchInput.value.toLowerCase().trim();
      const filtered = nodes.filter(n => {
        if (!n.arquivo) return false; // apenas normas do acervo
        if (currentFilter !== 'ALL' && n.tipo !== currentFilter) return false;
        if (!q) return true;
        return n.id.toLowerCase().includes(q) || (n.ementa && n.ementa.toLowerCase().includes(q));
      });

      if (q || currentFilter !== 'ALL') {
        detailsPane.innerHTML = \`
          <div class="text-xs text-slate-400 mb-2">Exibindo \${filtered.length} norma(s):</div>
          \${filtered.map(n => \`
            <div onclick="selectNodeById('\${n.id}')" class="cursor-pointer bg-slate-950 hover:bg-slate-800/80 border border-slate-800 rounded-lg p-2.5 transition space-y-1">
              <div class="flex items-center justify-between">
                <span class="font-bold text-xs text-slate-200">\${n.id}</span>
                <span class="text-[10px] px-1.5 py-0.5 rounded \${n.situacao === 'vigente' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}">\${n.situacao || ''}</span>
              </div>
              <p class="text-[11px] text-slate-400 line-clamp-2">\${n.ementa || ''}</p>
            </div>
          \`).join('')}
        \`;
      } else {
        updateDetails(selectedNode);
      }
    }

    searchInput.addEventListener('input', renderList);

    filterBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        filterBtns.forEach(b => {
          b.classList.remove('bg-blue-600', 'text-white');
          b.classList.add('bg-slate-800', 'text-slate-300');
        });
        btn.classList.remove('bg-slate-800', 'text-slate-300');
        btn.classList.add('bg-blue-600', 'text-white');
        currentFilter = btn.dataset.tipo;
        renderList();
      });
    });

    // Iniciar com o primeiro nó
    updateDetails(selectedNode);
  </script>
</body>
</html>
`;

// 1. Salvar no repositório
fs.writeFileSync(path.join(__dirname, '../visualizador.html'), htmlContent, 'utf8');

// 2. Salvar no diretório de artifacts do Antigravity
const artifactDir = 'C:\\\\Users\\\\jadson.sanches\\\\.gemini\\\\antigravity\\\\brain\\\\1851ab74-9135-4706-9b2a-9fc406732ec3';
fs.writeFileSync(path.join(artifactDir, 'visualizador.html'), htmlContent, 'utf8');

console.log('Visualizador gerado com sucesso em ambos os locais!');
