const fs = require('fs');
const path = require('path');

const grafo = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/relacoes.json'), 'utf8'));
const stats = JSON.parse(fs.readFileSync(path.join(__dirname, '../data/grafo/estatisticas.json'), 'utf8'));

// Cores temáticas no padrão Bio-Tech & AI (Emerald / Neon / Glassmorphism)
const CORES_TIPOS = {
  RDC: { bg: 'bg-emerald-500/20', text: 'text-emerald-300', border: 'border-emerald-500/30', hex: '#10b981', label: 'RDC' },
  RE: { bg: 'bg-teal-500/20', text: 'text-teal-300', border: 'border-teal-500/30', hex: '#14b8a6', label: 'RE' },
  PORTARIA: { bg: 'bg-amber-500/20', text: 'text-amber-300', border: 'border-amber-500/30', hex: '#f59e0b', label: 'Portaria' },
  IN: { bg: 'bg-cyan-500/20', text: 'text-cyan-300', border: 'border-cyan-500/30', hex: '#06b6d4', label: 'IN' },
  CPB: { bg: 'bg-pink-500/20', text: 'text-pink-300', border: 'border-pink-500/30', hex: '#ec4899', label: 'Consulta Pública' },
  LEI_FEDERAL: { bg: 'bg-green-500/20', text: 'text-green-300', border: 'border-green-500/30', hex: '#22c55e', label: 'Lei Federal' },
  DEP: { bg: 'bg-blue-500/20', text: 'text-blue-300', border: 'border-blue-500/30', hex: '#3b82f6', label: 'Despacho' },
  TAP: { bg: 'bg-red-500/20', text: 'text-red-300', border: 'border-red-500/30', hex: '#ef4444', label: 'Termo Apreensão' },
  OUTROS: { bg: 'bg-slate-700/50', text: 'text-slate-300', border: 'border-slate-600', hex: '#64748b', label: 'Outros' }
};

// Pills de distribuição por tipo no header
const distribuicaoHtml = Object.entries(stats.porTipo || {})
  .map(([tipo, qtd]) => {
    const conf = CORES_TIPOS[tipo] || CORES_TIPOS.OUTROS;
    return `<span class="px-2.5 py-1 rounded-full ${conf.bg} ${conf.text} border ${conf.border} text-xs font-semibold tracking-wide">${tipo}: ${qtd}</span>`;
  })
  .join('\n');

const htmlContent = `<!DOCTYPE html>
<html lang="pt-BR" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Anvisa Normas | Intelligence & Graph Analytics</title>
  <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌿</text></svg>">
  <script src="https://www.gstatic.com/antigravity/web/dev/tailwindcss.min.js"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    :root {
      --bg-main: #040e0a;
      --bg-card: rgba(8, 26, 18, 0.72);
      --border-emerald: rgba(16, 185, 129, 0.18);
      --accent-neon: #00ff87;
    }
    body {
      margin: 0;
      font-family: 'Plus Jakarta Sans', system-ui, -apple-system, sans-serif;
      background-color: var(--bg-main);
      color: #e6f4ee;
      overflow-x: hidden;
      background-image: 
        radial-gradient(circle at 15% 10%, rgba(0, 255, 135, 0.07) 0%, transparent 40%),
        radial-gradient(circle at 85% 60%, rgba(16, 185, 129, 0.05) 0%, transparent 45%),
        radial-gradient(circle at 50% 90%, rgba(20, 184, 166, 0.06) 0%, transparent 50%);
      background-attachment: fixed;
    }
    .font-mono {
      font-family: 'JetBrains Mono', monospace;
    }
    .glass-card {
      background: var(--bg-card);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid var(--border-emerald);
      box-shadow: 0 12px 32px 0 rgba(0, 0, 0, 0.45);
    }
    .glass-card-hover {
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .glass-card-hover:hover {
      border-color: rgba(0, 255, 135, 0.35);
      box-shadow: 0 14px 36px -4px rgba(0, 255, 135, 0.12);
      transform: translateY(-2px);
    }
    .neon-glow {
      box-shadow: 0 0 20px rgba(0, 255, 135, 0.25);
    }
    .neon-text {
      text-shadow: 0 0 12px rgba(0, 255, 135, 0.4);
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
    ::-webkit-scrollbar-track {
      background: rgba(4, 14, 10, 0.6);
    }
    ::-webkit-scrollbar-thumb {
      background: rgba(16, 185, 129, 0.25);
      border-radius: 9999px;
    }
    ::-webkit-scrollbar-thumb:hover {
      background: rgba(0, 255, 135, 0.45);
    }
    .timeline-pill {
      transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .timeline-pill.active {
      background: linear-gradient(135deg, rgba(0, 255, 135, 0.25), rgba(16, 185, 129, 0.35));
      border-color: #00ff87;
      box-shadow: 0 0 16px rgba(0, 255, 135, 0.3);
      transform: scale(1.05);
    }
    .donut-segment:hover {
      filter: brightness(1.25);
      stroke-width: 20;
    }
    .cal-dot {
      width: 4px;
      height: 4px;
      background-color: #00ff87;
      border-radius: 9999px;
      box-shadow: 0 0 4px #00ff87;
    }
  </style>
</head>
<body class="min-h-screen flex text-slate-200 antialiased selection:bg-emerald-500/30 selection:text-emerald-200">

  <!-- Sidebar Lateral Moderna (Estilo AI Dashboard) -->
  <aside class="w-16 md:w-64 bg-[#05140d]/90 border-r border-emerald-500/15 flex flex-col justify-between p-3 md:p-4 sticky top-0 h-screen z-30 shrink-0 backdrop-blur-xl">
    <div class="space-y-6">
      <!-- Logo / Marca -->
      <div class="flex items-center gap-3 px-1 md:px-2 pt-1">
        <div class="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 flex items-center justify-center text-slate-950 font-black text-xl shadow-lg shadow-emerald-500/20 shrink-0">
          🌿
        </div>
        <div class="hidden md:block overflow-hidden">
          <div class="font-bold text-sm tracking-wide text-white flex items-center gap-1.5">
            <span>AnvisaNormas</span>
            <span class="text-[9px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-mono border border-emerald-500/30">AI</span>
          </div>
          <p class="text-[11px] text-emerald-400/70 truncate">Inteligência Regulatória</p>
          <div class="mt-1 flex items-center gap-1.5 text-[10px] text-emerald-300 font-mono bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/25 w-fit">
            <span>📅</span>
            <span>Desde 01/01/2025</span>
          </div>
        </div>
      </div>

      <!-- Menu Principal de Navegação -->
      <nav class="space-y-1.5 pt-2">
        <button onclick="scrollToSection('radar-section')" class="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-500/15 text-emerald-300 font-medium text-xs md:text-sm border border-emerald-500/30 shadow-sm transition hover:bg-emerald-500/20 group">
          <span class="text-base group-hover:scale-110 transition">📊</span>
          <span class="hidden md:inline font-semibold">Dashboard</span>
        </button>
      </nav>

      <!-- Seção de Downloads Consolidados -->
      <div class="hidden md:block pt-4 border-t border-emerald-500/15 space-y-2">
        <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 px-2">Bases Abertas (Data)</span>
        <div class="space-y-1">
          <a href="data/dist/anvisa.db" download class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#082016] hover:bg-emerald-950/70 border border-emerald-500/20 text-xs text-slate-200 hover:text-emerald-300 transition">
            <span class="flex items-center gap-2">💾 SQLite (DB)</span>
            <span class="text-[10px] text-emerald-400 font-mono">~94 MB</span>
          </a>
          <a href="data/dist/normas.json" download class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#082016] hover:bg-emerald-950/70 border border-emerald-500/20 text-xs text-slate-200 hover:text-emerald-300 transition">
            <span class="flex items-center gap-2">📊 JSON Consolidado</span>
            <span class="text-[10px] text-emerald-400 font-mono">~96 MB</span>
          </a>
          <a href="data/dist/normas.csv" download class="flex items-center justify-between px-3 py-2 rounded-lg bg-[#082016] hover:bg-emerald-950/70 border border-emerald-500/20 text-xs text-slate-200 hover:text-emerald-300 transition">
            <span class="flex items-center gap-2">📑 Planilha CSV</span>
            <span class="text-[10px] text-emerald-400 font-mono">Raw</span>
          </a>
        </div>
      </div>
    </div>

    <!-- Rodapé Sidebar -->
    <div class="border-t border-emerald-500/15 pt-3">
      <div class="hidden md:flex items-center justify-between text-[11px] text-slate-400 mb-2">
        <span class="flex items-center gap-1.5">
          <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Pipeline Ativo</span>
        </span>
        <span class="font-mono text-emerald-300/80">6/6h</span>
      </div>
      <a href="https://github.com/jadsonsanches/anvisa-normas" target="_blank" class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold transition">
        <span>GitHub Repo</span> ↗
      </a>
    </div>
  </aside>

  <!-- Conteúdo Principal -->
  <main class="flex-1 p-3 md:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto overflow-y-auto w-full">

    <!-- Topbar: Barra de Busca & Filtros Rápidos / Calendário (Retângulo Azul) -->
    <header class="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
      <!-- Barra de Busca Inspirada na Imagem 1 -->
      <div class="relative flex-1 max-w-xl">
        <div class="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-emerald-400/80">
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path></svg>
        </div>
        <input 
          id="search-input" 
          type="text" 
          placeholder="Buscar por número do ato, ementa, setor regulado (ex: alimentos, medicamentos, cosméticos)..." 
          class="w-full pl-10 pr-24 py-2.5 rounded-full bg-[#081f15]/80 border border-emerald-500/25 text-slate-100 placeholder-emerald-400/40 text-xs md:text-sm focus:outline-none focus:border-emerald-400 focus:ring-2 focus:ring-emerald-400/20 transition shadow-inner"
        >
        <div class="absolute inset-y-0 right-0 pr-2 flex items-center gap-1">
          <span id="count-filtered" class="text-[10px] font-mono font-medium px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
            ${grafo.nodes.length} nós
          </span>
        </div>
      </div>

      <!-- Área do Retângulo Azul: Controles de Período (7d, 14d, 30d, 60d + Calendário Moderno) -->
      <div class="flex items-center gap-2 self-start lg:self-auto flex-wrap">
        <!-- Filtros Rápidos de Período -->
        <div id="radar-filtros-rapidos" class="flex items-center gap-1 bg-[#061810] p-1 rounded-xl border border-emerald-500/20 shadow-sm">
          <button onclick="aplicarFiltroRapido('7_DIAS')" data-filtro="7_DIAS" class="filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition">7 dias</button>
          <button onclick="aplicarFiltroRapido('14_DIAS')" data-filtro="14_DIAS" class="filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition">14 dias</button>
          <button onclick="aplicarFiltroRapido('30_DIAS')" data-filtro="30_DIAS" class="filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition">30 dias</button>
          <button onclick="aplicarFiltroRapido('60_DIAS')" data-filtro="60_DIAS" class="filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition">60 dias</button>
        </div>

        <!-- Componente Moderno de Calendário (Custom Date Range Picker Dark Emerald) -->
        <div class="relative" id="calendar-picker-wrapper">
          <button 
            id="calendar-trigger-btn"
            type="button"
            onclick="toggleCustomCalendar(event)" 
            class="flex items-center gap-2 bg-[#061810] hover:bg-[#0c2a1d] px-3 py-1.5 rounded-xl border border-emerald-500/25 text-xs text-slate-200 hover:text-white transition shadow-sm cursor-pointer group active:scale-95"
            title="Selecionar período personalizado no calendário"
          >
            <span class="text-sm">📅</span>
            <span id="calendar-trigger-label" class="font-mono text-emerald-300 font-semibold text-xs">Últimos 7 dias</span>
            <svg id="calendar-trigger-chevron" class="w-3.5 h-3.5 text-emerald-400/80 transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"></path></svg>
          </button>

          <!-- Inputs ocultos para preservação de estado e integração -->
          <input type="hidden" id="filtro-data-inicio">
          <input type="hidden" id="filtro-data-fim">

          <!-- Popover Dropdown de Calendário Customizado -->
          <div 
            id="custom-calendar-popover" 
            class="hidden absolute right-0 top-full mt-2 z-50 w-[310px] bg-[#05150e]/95 backdrop-blur-2xl border border-emerald-500/30 rounded-2xl p-4 shadow-2xl shadow-black/90 select-none"
          >
            <!-- Header do Popover: Navegação Mês / Ano -->
            <div class="flex items-center justify-between pb-3 border-b border-emerald-500/15">
              <button type="button" onclick="calNavegarMes(-1)" class="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-center transition border border-emerald-500/20 active:scale-95" title="Mês anterior">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path></svg>
              </button>
              <span id="cal-month-year-title" class="font-semibold text-xs md:text-sm text-white tracking-wide">Novembro 2026</span>
              <button type="button" onclick="calNavegarMes(1)" class="w-7 h-7 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 flex items-center justify-center transition border border-emerald-500/20 active:scale-95" title="Próximo mês">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path></svg>
              </button>
            </div>

            <!-- Cabeçalho Dias da Semana -->
            <div class="grid grid-cols-7 gap-1 text-center py-2 text-[10px] font-bold text-emerald-400/70 uppercase">
              <span>Dom</span>
              <span>Seg</span>
              <span>Ter</span>
              <span>Qua</span>
              <span>Qui</span>
              <span>Sex</span>
              <span>Sáb</span>
            </div>

            <!-- Grid de Dias -->
            <div id="cal-days-grid" class="grid grid-cols-7 gap-1 text-xs">
              <!-- Gerado dinamicamente via JS -->
            </div>

            <!-- Resumo e Dicas do Intervalo -->
            <div class="pt-3 mt-3 border-t border-emerald-500/15 space-y-1">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">De:</span>
                <span id="cal-summary-inicio" class="font-mono text-emerald-300 font-medium">--/--/----</span>
              </div>
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-400">Até:</span>
                <span id="cal-summary-fim" class="font-mono text-emerald-300 font-medium">--/--/----</span>
              </div>
              <div id="cal-prompt-msg" class="text-[10px] text-emerald-400/80 pt-1 text-center">
                Clique na data inicial e depois na data final
              </div>
            </div>

            <!-- Ações do Popover -->
            <div class="pt-3 flex items-center justify-end gap-2 border-t border-emerald-500/10">
              <button type="button" onclick="fecharCustomCalendar()" class="px-3 py-1 rounded-lg text-xs text-slate-400 hover:text-white transition">
                Cancelar
              </button>
              <button type="button" onclick="calAplicarSelecao()" class="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition active:scale-95 shadow-sm shadow-emerald-500/20">
                Aplicar
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>

    <!-- Componente Estrela: RADAR REGULATÓRIO DIÁRIO -->
    <section id="radar-section" class="glass-card rounded-2xl p-4 md:p-6 space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-emerald-500/15 pb-3">
        <div>
          <div class="flex items-center gap-2">
            <span class="text-xl">📅</span>
            <h2 class="text-base md:text-lg font-bold text-white tracking-wide flex items-center gap-2">
              Linha do Tempo Diária de Publicações no DOU
              <span id="radar-badge-periodo" class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal">Últimos 7 dias</span>
            </h2>
          </div>
          <p class="text-xs text-slate-400 mt-0.5">
            Clique em um dia específico para filtrar o grafo e analisar os atos publicados no DOU.
          </p>
        </div>
      </div>

      <!-- Carrossel de Dias com Contador de Atos por Dia -->
      <div id="daily-timeline-carousel" class="flex items-stretch gap-2.5 overflow-x-auto pb-2 pt-1 scroll-smooth">
        <!-- Gerado via JavaScript -->
      </div>
    </section>

    <!-- Cards de Métricas Principais (Estilo Imagens 1 e 2) -->
    <section id="metrics-section" class="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
      <!-- Card 1: Total Normas (Opção 1: Acervo Total Fixo + Badge Exibindo X) -->
      <div class="glass-card glass-card-hover rounded-2xl p-4 space-y-2 relative overflow-hidden group">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider text-emerald-400/80">Acervo Total</span>
          <span class="text-base group-hover:scale-110 transition">📑</span>
        </div>
        <div class="flex items-baseline gap-2 flex-wrap">
          <span class="text-2xl md:text-3xl font-extrabold text-white font-mono" id="stat-total-normas">${stats.totalNormas || grafo.nodes.filter(n => n.arquivo).length}</span>
          <span class="text-xs text-emerald-400 font-medium">normas</span>
          <span class="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono border border-emerald-500/30" id="stat-filtradas-badge">
            Exibindo ${stats.totalNormas || grafo.nodes.filter(n => n.arquivo).length}
          </span>
        </div>
        <p class="text-[11px] text-slate-300">Atos com texto integral e dados consolidados desde <span class="text-emerald-300 font-semibold font-mono">01/01/2025</span></p>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-emerald-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      <!-- Card 2: Vigentes -->
      <div class="glass-card glass-card-hover rounded-2xl p-4 space-y-2 relative overflow-hidden group">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider text-teal-400/80">Normas Vigentes</span>
          <span class="text-base group-hover:scale-110 transition">✅</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl md:text-3xl font-extrabold text-white font-mono" id="stat-vigentes">${stats.vigentes || 0}</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px]" id="stat-vigentes-pct">
            ${Math.round(((stats.vigentes || 0) / (stats.totalNormas || 1)) * 100)}%
          </span>
        </div>
        <p class="text-[11px] text-slate-400">Plena eficácia jurídica em vigor no Brasil</p>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-teal-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      <!-- Card 3: Grafo de Relações -->
      <div class="glass-card glass-card-hover rounded-2xl p-4 space-y-2 relative overflow-hidden group">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider text-cyan-400/80">Conexões Mapeadas</span>
          <span class="text-base group-hover:scale-110 transition">🕸️</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl md:text-3xl font-extrabold text-white font-mono" id="stat-relacoes">${stats.totalRelacoes || grafo.edges.length}</span>
          <span class="text-xs text-cyan-400 font-medium">arestas</span>
        </div>
        <p class="text-[11px] text-slate-400">Relações determinísticas (altera, revoga, cita)</p>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-cyan-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>

      <!-- Card 4: Volume Médio / Picos -->
      <div class="glass-card glass-card-hover rounded-2xl p-4 space-y-2 relative overflow-hidden group">
        <div class="flex items-center justify-between text-slate-400">
          <span class="text-xs font-semibold uppercase tracking-wider text-amber-400/80">Pico Regulatório</span>
          <span class="text-base group-hover:scale-110 transition">⚡</span>
        </div>
        <div class="flex items-baseline gap-2">
          <span class="text-2xl md:text-3xl font-extrabold text-white font-mono" id="stat-pico-valor">121</span>
          <span class="text-xs px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px]" id="stat-pico-data">19/10</span>
        </div>
        <p class="text-[11px] text-slate-400" id="stat-pico-sub">Maior volume diário no período</p>
        <div class="absolute -right-4 -bottom-4 w-16 h-16 bg-amber-500/10 rounded-full blur-xl pointer-events-none"></div>
      </div>
    </section>

    <!-- Área de Exploração em Duas Colunas: Grafo e Feed -->
    <div class="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">

      <!-- Coluna da Esquerda: Grafo Determinístico Interativo & Analytics -->
      <div id="graph-section" class="lg:col-span-7 space-y-4">
        <div class="glass-card rounded-2xl p-4 md:p-5 space-y-3 relative">
          
          <div class="flex items-center justify-between">
            <div>
              <h3 class="text-sm md:text-base font-bold text-white flex items-center gap-2">
                <span>🕸️</span>
                <span>Grafo de Relações Regulatórias</span>
              </h3>
              <p class="text-xs text-slate-400">Física interativa de conexões entre RDCs, Portarias, REs e Leis</p>
            </div>
            <div class="flex items-center gap-1.5 text-xs">
              <button id="btn-zoom-in" class="w-8 h-8 rounded-lg bg-[#0b241a] hover:bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold" title="Aproximar">+</button>
              <button id="btn-zoom-out" class="w-8 h-8 rounded-lg bg-[#0b241a] hover:bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center justify-center font-bold" title="Afastar">-</button>
              <button id="btn-reset-view" class="px-2.5 h-8 rounded-lg bg-[#0b241a] hover:bg-emerald-950 text-emerald-300 border border-emerald-500/30 flex items-center justify-center text-xs" title="Resetar visualização">Reset</button>
            </div>
          </div>

          <!-- Canvas do Grafo -->
          <div class="relative w-full h-[480px] bg-[#030a07] rounded-xl overflow-hidden border border-emerald-500/20 shadow-[inset_0_4px_24px_rgba(0,0,0,0.65)]" style="background-image: radial-gradient(rgba(16, 185, 129, 0.12) 1px, transparent 1px); background-size: 22px 22px;">
            <canvas id="graph-canvas" class="w-full h-full block"></canvas>
            
            <!-- Legenda Flutuante Discreta -->
            <div class="absolute bottom-3 left-3 bg-[#05140d]/90 backdrop-blur-md border border-emerald-500/20 rounded-xl p-2.5 text-[10px] space-y-1 shadow-[0_12px_32px_rgba(0,0,0,0.55)] pointer-events-none">
              <div class="font-bold text-slate-300 mb-1">Tipologia dos Nós:</div>
              <div class="grid grid-cols-2 gap-x-3 gap-y-1">
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#10b981] shadow-[0_0_8px_#10b981]"></span> RDC</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#14b8a6] shadow-[0_0_8px_#14b8a6]"></span> RE</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#f59e0b] shadow-[0_0_8px_#f59e0b]"></span> Portaria</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#06b6d4] shadow-[0_0_8px_#06b6d4]"></span> IN</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#ec4899] shadow-[0_0_8px_#ec4899]"></span> CPB</span>
                <span class="flex items-center gap-1.5"><span class="w-2 h-2 rounded-full bg-[#22c55e] shadow-[0_0_8px_#22c55e]"></span> Lei Federal</span>
              </div>
            </div>

            <!-- Botão Limpar Foco -->
            <button id="btn-clear-focus" class="hidden absolute top-3 right-3 px-3 py-1.5 rounded-lg bg-emerald-500/30 hover:bg-emerald-500/40 text-emerald-200 border border-emerald-400 text-xs font-semibold backdrop-blur shadow-lg transition">
              Desfazer Foco no Nó
            </button>
          </div>

          <!-- Filtro de Tipos Rápido em Pills -->
          <div class="pt-1 flex items-center gap-1.5 flex-wrap">
            <span class="text-[11px] text-slate-400 font-medium">Filtrar Tipo:</span>
            <button data-tipo="ALL" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition">Todos</button>
            <button data-tipo="RE" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#092217] text-slate-300 hover:text-white border border-emerald-500/20 transition">RE</button>
            <button data-tipo="PORTARIA" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#092217] text-slate-300 hover:text-white border border-emerald-500/20 transition">Portaria</button>
            <button data-tipo="IN" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#092217] text-slate-300 hover:text-white border border-emerald-500/20 transition">IN</button>
            <button data-tipo="RDC" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#092217] text-slate-300 hover:text-white border border-emerald-500/20 transition">RDC</button>
            <button data-tipo="CPB" class="tipo-filter-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-[#092217] text-slate-300 hover:text-white border border-emerald-500/20 transition">CPB</button>
          </div>
        </div>

        <!-- Distribuição por Tipologia (Donut & Analytics) -->
        <div class="glass-card rounded-2xl p-4 md:p-5 flex flex-col sm:flex-row items-center justify-between gap-5">
          <div class="space-y-1">
            <h4 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📊</span>
              <span>Proporção por Tipologia Normativa</span>
            </h4>
            <p class="text-xs text-slate-400">Composição do acervo regulatório coletado em 2026</p>
          </div>
          <div id="donut-container" class="flex items-center gap-4">
            <!-- Donut SVG gerado dinamicamente -->
          </div>
        </div>
      </div>

      <!-- Coluna da Direita: Inspetor de Detalhes & Feed de Normas -->
      <div id="feed-section" class="lg:col-span-5 space-y-4">
        
        <!-- Painel de Inspeção do Nó Selecionado -->
        <div class="glass-card rounded-2xl p-4 md:p-5 space-y-3 border-emerald-500/30">
          <div class="flex items-center justify-between border-b border-emerald-500/20 pb-2.5">
            <div class="flex items-center gap-2">
              <span class="text-emerald-400 text-lg">🔍</span>
              <h3 class="text-sm font-bold text-white">Inspetor de Metadados Regulatórios</h3>
            </div>
            <span id="selected-badge-situacao" class="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Vigente
            </span>
          </div>

          <div id="inspector-content" class="space-y-3 text-xs">
            <!-- Conteúdo atualizado via JS -->
            <div class="text-slate-400 text-center py-6">
              Clique em qualquer nó do grafo ou ato na lista abaixo para inspecionar os detalhes completos.
            </div>
          </div>
        </div>

        <!-- Lista Filtrada de Normas -->
        <div class="glass-card rounded-2xl p-4 space-y-3">
          <div class="flex items-center justify-between">
            <h3 class="text-sm font-bold text-white flex items-center gap-2">
              <span>📋</span>
              <span>Lista de Normas</span>
            </h3>
            <span id="list-status-badge" class="text-[11px] text-emerald-400 font-mono">
              Mostrando normas
            </span>
          </div>

          <!-- Container Scrollável da Lista de Normas -->
          <div id="norms-list-container" class="space-y-2 max-h-[500px] overflow-y-auto pr-1">
            <!-- Itens inseridos dinamicamente -->
          </div>
        </div>

      </div>

    </div>

    <!-- Rodapé Geral -->
    <footer class="text-center text-xs text-white pt-8 pb-4 border-t border-emerald-500/10 space-y-1.5">
      <p class="text-white font-semibold">Acervo Aberto das Normas da Anvisa • Processamento Determinístico de Grafo Regulatório</p>
      <p class="text-xs text-white">Dados obtidos via portal oficial AnvisaLegis / Datalegis • Atualização contínua via GitHub Actions</p>
      <p class="text-[11px] text-emerald-300 font-mono">📅 Histórico regulatório contínuo com dados consolidados a partir de 01/01/2025</p>
    </footer>

    <!-- Toast Flutuante de Notificação / Performance -->
    <div id="toast-aviso" class="fixed bottom-6 right-6 z-50 transform translate-y-20 opacity-0 pointer-events-none transition-all duration-300 bg-[#061810]/95 border border-emerald-400/40 text-emerald-200 text-xs px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-2.5">
      <span class="text-base">⚡</span>
      <span id="toast-aviso-msg">Aviso de desempenho</span>
    </div>

  </main>

  <script>
    const graphData = ${JSON.stringify(grafo)};
    const statsData = ${JSON.stringify(stats)};

    const CORES = {
      RDC: '#10b981',
      RE: '#14b8a6',
      PORTARIA: '#f59e0b',
      IN: '#06b6d4',
      CPB: '#ec4899',
      LEI_FEDERAL: '#22c55e',
      DEP: '#3b82f6',
      TAP: '#ef4444',
      OUTROS: '#64748b'
    };

    // Agrupamento diário de atos
    const atosPorDiaMap = {};
    graphData.nodes.filter(n => n.arquivo).forEach(n => {
      const d = n.data_publicacao_dou || n.data_ato || '';
      if (d) {
        atosPorDiaMap[d] = (atosPorDiaMap[d] || 0) + 1;
      }
    });

    const carouselContainer = document.getElementById('daily-timeline-carousel');
    const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    // Gerador dinâmico de dias para o mês selecionado
    function gerarDiasDoMes(mesStr) {
      const [mm, aaaa] = mesStr.split('/').map(Number);
      const totalDias = new Date(aaaa, mm, 0).getDate();
      const dias = [];
      for (let d = 1; d <= totalDias; d++) {
        const diaFormatado = String(d).padStart(2, '0');
        const dataStr = \`\${diaFormatado}/\${String(mm).padStart(2, '0')}/\${aaaa}\`;
        const dt = new Date(aaaa, mm - 1, d);
        const sem = DIAS_SEMANA[dt.getDay()];
        dias.push({ dia: diaFormatado, sem, data: dataStr, mesStr });
      }
      return dias;
    }

    // Gerador de datas ativas para visão do acervo completo
    function gerarDiasAcervo() {
      const datasSet = new Set();
      graphData.nodes.filter(n => n.arquivo).forEach(n => {
        const d = n.data_publicacao_dou || n.data_ato || '';
        if (d && d.length === 10 && d.includes('/2026')) {
          datasSet.add(d);
        }
      });
      const ordenadas = Array.from(datasSet).sort((a, b) => {
        const [d1, m1, y1] = a.split('/').map(Number);
        const [d2, m2, y2] = b.split('/').map(Number);
        return new Date(y1, m1 - 1, d1) - new Date(y2, m2 - 1, d2);
      });
      return ordenadas.map(dataStr => {
        const [d, m, y] = dataStr.split('/').map(Number);
        const dt = new Date(y, m - 1, d);
        return {
          dia: String(d).padStart(2, '0'),
          sem: DIAS_SEMANA[dt.getDay()],
          data: dataStr,
          mesStr: \`\${String(m).padStart(2, '0')}/\${y}\`
        };
      });
    }

    function parseBrDate(str) {
      if (!str || typeof str !== 'string') return null;
      const parts = str.split('/');
      if (parts.length !== 3) return null;
      const d = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const y = parseInt(parts[2], 10);
      if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
      return new Date(y, m, d);
    }

    function parseIsoDate(str) {
      if (!str || typeof str !== 'string') return null;
      const parts = str.split('-');
      if (parts.length !== 3) return null;
      const y = parseInt(parts[0], 10);
      const m = parseInt(parts[1], 10) - 1;
      const d = parseInt(parts[2], 10);
      if (isNaN(d) || isNaN(m) || isNaN(y)) return null;
      return new Date(y, m, d);
    }

    function mostrarToast(msg) {
      const toast = document.getElementById('toast-aviso');
      const toastMsg = document.getElementById('toast-aviso-msg');
      if (!toast || !toastMsg) return;
      toastMsg.textContent = msg;
      toast.classList.remove('translate-y-20', 'opacity-0', 'pointer-events-none');
      clearTimeout(window.__toastTimer);
      window.__toastTimer = setTimeout(() => {
        toast.classList.add('translate-y-20', 'opacity-0', 'pointer-events-none');
      }, 4000);
    }

    function getLatestAcervoDate() {
      let latest = null;
      Object.keys(atosPorDiaMap).forEach(d => {
        const dt = parseBrDate(d);
        if (dt && (!latest || dt > latest)) {
          latest = dt;
        }
      });
      return latest || new Date();
    }

    function formatIsoDate(d) {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return \`\${yyyy}-\${mm}-\${dd}\`;
    }

    let dataInicioFiltro = '';
    let dataFimFiltro = '';
    let filtroRapidoAtivo = '7_DIAS';
    let mesSelecionado = 'ALL';
    let diaSelecionado = null;
    const statsTotalGeral = statsData.totalNormas || graphData.nodes.filter(n => n.arquivo).length;

    const inputInicio = document.getElementById('filtro-data-inicio');
    const inputFim = document.getElementById('filtro-data-fim');

    function validarETruncarPeriodoMaximo() {
      if (!dataInicioFiltro || !dataFimFiltro) return;
      const dIni = parseIsoDate(dataInicioFiltro);
      const dFim = parseIsoDate(dataFimFiltro);
      if (!dIni || !dFim) return;

      const diffDays = Math.round((dFim - dIni) / (1000 * 60 * 60 * 24));
      if (diffDays > 60) {
        const novoFim = new Date(dIni);
        novoFim.setDate(novoFim.getDate() + 59);
        dataFimFiltro = formatIsoDate(novoFim);
        if (inputFim) inputFim.value = dataFimFiltro;
        mostrarToast('⚡ Limite de 60 dias: Para manter o grafo veloz, o intervalo máximo foi ajustado para 60 dias.');
      } else if (diffDays < 0) {
        dataFimFiltro = dataInicioFiltro;
        if (inputFim) inputFim.value = dataFimFiltro;
      }
    }

    function renderDailyTimeline() {
      let diasList = [];
      const dtIni = dataInicioFiltro ? parseIsoDate(dataInicioFiltro) : null;
      const dtFim = dataFimFiltro ? parseIsoDate(dataFimFiltro) : null;
      const isSingleDay = dataInicioFiltro && dataFimFiltro && dataInicioFiltro === dataFimFiltro;

      if (mesSelecionado !== 'ALL') {
        diasList = gerarDiasDoMes(mesSelecionado);
        if (!isSingleDay && (dtIni || dtFim)) {
          diasList = diasList.filter(item => {
            const dt = parseBrDate(item.data);
            if (!dt) return true;
            if (dtIni && dt < dtIni) return false;
            if (dtFim && dt > dtFim) return false;
            return true;
          });
        }
      } else {
        diasList = gerarDiasAcervo();
        if (!isSingleDay && (dtIni || dtFim)) {
          diasList = diasList.filter(item => {
            const dt = parseBrDate(item.data);
            if (!dt) return true;
            if (dtIni && dt < dtIni) return false;
            if (dtFim && dt > dtFim) return false;
            return true;
          });
        }
      }

      if (diasList.length === 0) {
        carouselContainer.innerHTML = \`
          <div class="w-full py-4 text-center text-xs text-slate-400">
            Nenhuma data com publicações no período selecionado.
          </div>
        \`;
        return;
      }
      
      let maxQtd = 0;
      diasList.forEach(item => {
        const q = atosPorDiaMap[item.data] || 0;
        if (q > maxQtd) maxQtd = q;
      });
      const peakThreshold = Math.max(20, Math.floor(maxQtd * 0.7));

      const MES_ABREV = {
        '01': 'Jan', '02': 'Fev', '03': 'Mar', '04': 'Abr',
        '05': 'Mai', '06': 'Jun', '07': 'Jul', '08': 'Ago',
        '09': 'Set', '10': 'Out', '11': 'Nov', '12': 'Dez'
      };

      carouselContainer.innerHTML = diasList.map(item => {
        const qtd = atosPorDiaMap[item.data] || 0;
        const isPeak = qtd >= peakThreshold && qtd > 0;
        const dtItem = parseBrDate(item.data);
        
        const isExactDay = isSingleDay && item.data === diaSelecionado;
        let isInRange = false;
        if (!isSingleDay && (dtIni || dtFim) && dtItem) {
          const aboveIni = !dtIni || dtItem >= dtIni;
          const belowFim = !dtFim || dtItem <= dtFim;
          isInRange = aboveIni && belowFim;
        }

        const mesPart = item.mesStr ? item.mesStr.split('/')[0] : '';
        const abrev = MES_ABREV[mesPart] || '';
        const rotuloSemana = (mesSelecionado === 'ALL' || !mesSelecionado)
          ? (abrev ? \`\${item.sem} • \${abrev}\` : item.sem)
          : item.sem;

        let cardStyle = 'bg-[#040e0a]/60 border-emerald-500/10 text-slate-500 opacity-60 hover:opacity-90';
        if (isExactDay) {
          cardStyle = 'active bg-emerald-500/30 border-emerald-400 text-white shadow-lg ring-2 ring-emerald-400/40';
        } else if (isInRange) {
          cardStyle = 'bg-emerald-500/15 border-emerald-500/40 text-emerald-100 shadow-sm';
        } else if (qtd > 0) {
          cardStyle = 'bg-[#081e15]/80 hover:bg-[#0c2a1e] border-emerald-500/20 text-slate-200';
        }

        return \`
          <button 
            onclick="filtrarPorDia('\${item.data}')" 
            class="timeline-pill flex-1 min-w-[76px] p-2.5 rounded-xl border flex flex-col items-center justify-between text-center transition cursor-pointer \${cardStyle}"
            title="\${item.data}: \${qtd} \${qtd === 1 ? 'ato' : 'atos'}"
          >
            <span class="text-[10px] uppercase font-semibold text-slate-400 whitespace-nowrap">\${rotuloSemana}</span>
            <span class="text-base font-extrabold font-mono text-white my-0.5">\${item.dia}</span>
            <span class="text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold \${
              isPeak ? 'bg-emerald-400 text-slate-950 neon-glow' :
              (qtd > 0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-slate-800/40 text-slate-500')
            }">
              \${qtd} \${qtd === 1 ? 'ato' : 'atos'}
            </span>
          </button>
        \`;
      }).join('');
    }

    renderDailyTimeline();

    // ==========================================
    // COMPONENTE DE CALENDÁRIO MODERNO DARK EMERALD
    // ==========================================
    const calPopover = document.getElementById('custom-calendar-popover');
    const calTriggerBtn = document.getElementById('calendar-trigger-btn');
    const calTriggerLabel = document.getElementById('calendar-trigger-label');
    const calTriggerChevron = document.getElementById('calendar-trigger-chevron');
    const calPickerWrapper = document.getElementById('calendar-picker-wrapper');
    const calMonthYearTitle = document.getElementById('cal-month-year-title');
    const calDaysGrid = document.getElementById('cal-days-grid');
    const calSummaryInicio = document.getElementById('cal-summary-inicio');
    const calSummaryFim = document.getElementById('cal-summary-fim');
    const calPromptMsg = document.getElementById('cal-prompt-msg');

    let calMesVisualizacao = null; // Date do mês em visualização
    let calTempStart = null;       // ISO 'YYYY-MM-DD'
    let calTempEnd = null;         // ISO 'YYYY-MM-DD'
    let calHoverDate = null;       // ISO 'YYYY-MM-DD'
    let calPickingState = 'IDLE';  // 'IDLE' ou 'PICKING_END'

    const NOMES_MESES = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];

    window.toggleCustomCalendar = function(e) {
      if (e) e.stopPropagation();
      if (!calPopover) return;
      const isHidden = calPopover.classList.contains('hidden');
      if (isHidden) {
        abrirCustomCalendar();
      } else {
        fecharCustomCalendar();
      }
    };

    window.abrirCustomCalendar = function() {
      if (!calPopover) return;
      calPopover.classList.remove('hidden');
      if (calTriggerChevron) calTriggerChevron.classList.add('rotate-180');

      calTempStart = dataInicioFiltro || formatIsoDate(new Date());
      calTempEnd = dataFimFiltro || calTempStart;
      calHoverDate = null;
      calPickingState = 'IDLE';

      const baseDate = parseIsoDate(calTempEnd) || parseIsoDate(calTempStart) || getLatestAcervoDate();
      calMesVisualizacao = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);

      atualizarResumoCalendario();
      renderCalGrid();
    };

    window.fecharCustomCalendar = function() {
      if (!calPopover) return;
      calPopover.classList.add('hidden');
      if (calTriggerChevron) calTriggerChevron.classList.remove('rotate-180');
      calHoverDate = null;
      calPickingState = 'IDLE';
    };

    // Fechar ao clicar fora do wrapper do calendário
    document.addEventListener('click', (e) => {
      if (calPickerWrapper && !calPickerWrapper.contains(e.target)) {
        fecharCustomCalendar();
      }
    });

    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') fecharCustomCalendar();
    });

    window.calNavegarMes = function(delta) {
      if (!calMesVisualizacao) return;
      calMesVisualizacao = new Date(calMesVisualizacao.getFullYear(), calMesVisualizacao.getMonth() + delta, 1);
      renderCalGrid();
    };

    function atualizarTriggerLabel() {
      if (!calTriggerLabel) return;
      if (dataInicioFiltro && dataFimFiltro) {
        if (dataInicioFiltro === dataFimFiltro) {
          const [y, m, d] = dataInicioFiltro.split('-');
          calTriggerLabel.textContent = \`\${d}/\${m}/\${y}\`;
        } else {
          const [y1, m1, d1] = dataInicioFiltro.split('-');
          const [y2, m2, d2] = dataFimFiltro.split('-');
          calTriggerLabel.textContent = \`\${d1}/\${m1} a \${d2}/\${m2}/\${y2}\`;
        }
      } else {
        calTriggerLabel.textContent = 'Selecionar período';
      }
    }

    function atualizarResumoCalendario() {
      if (calSummaryInicio) {
        if (calTempStart) {
          const [y, m, d] = calTempStart.split('-');
          calSummaryInicio.textContent = \`\${d}/\${m}/\${y}\`;
        } else {
          calSummaryInicio.textContent = '--/--/----';
        }
      }
      if (calSummaryFim) {
        if (calTempEnd) {
          const [y, m, d] = calTempEnd.split('-');
          calSummaryFim.textContent = \`\${d}/\${m}/\${y}\`;
        } else {
          calSummaryFim.textContent = calTempStart ? 'Selecione o fim...' : '--/--/----';
        }
      }
      if (calPromptMsg) {
        if (calPickingState === 'PICKING_END') {
          calPromptMsg.textContent = '👆 Clique no dia final do período (máx 60 dias)';
          calPromptMsg.className = 'text-[10px] text-amber-300 font-semibold pt-1 text-center';
        } else {
          calPromptMsg.textContent = 'Clique na data inicial e depois na data final';
          calPromptMsg.className = 'text-[10px] text-emerald-400/80 pt-1 text-center';
        }
      }
    }

    function renderCalGrid() {
      if (!calDaysGrid || !calMesVisualizacao) return;

      const ano = calMesVisualizacao.getFullYear();
      const mes = calMesVisualizacao.getMonth();

      if (calMonthYearTitle) {
        calMonthYearTitle.textContent = \`\${NOMES_MESES[mes]} \${ano}\`;
      }

      const primeiroDiaSemana = new Date(ano, mes, 1).getDay(); // 0 = Domingo
      const ultimoDiaMes = new Date(ano, mes + 1, 0).getDate();
      const ultimoDiaMesAnterior = new Date(ano, mes, 0).getDate();

      let html = '';

      // Dias do mês anterior para completar o grid inicial
      for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
        const diaNum = ultimoDiaMesAnterior - i;
        html += \`<div class="h-8 flex items-center justify-center text-slate-600 text-[11px] rounded-lg cursor-not-allowed select-none opacity-40">\${diaNum}</div>\`;
      }

      // Dias do mês atual
      for (let dia = 1; dia <= ultimoDiaMes; dia++) {
        const mm = String(mes + 1).padStart(2, '0');
        const dd = String(dia).padStart(2, '0');
        const iso = \`\${ano}-\${mm}-\${dd}\`;
        const br = \`\${dd}/\${mm}/\${ano}\`;
        const qtdAtos = atosPorDiaMap[br] || 0;

        const isStart = calTempStart === iso;
        const isEnd = calTempEnd === iso;

        let isInRange = false;
        if (calTempStart && calTempEnd) {
          isInRange = iso > calTempStart && iso < calTempEnd;
        } else if (calTempStart && calHoverDate && calPickingState === 'PICKING_END') {
          if (calHoverDate >= calTempStart) {
            isInRange = iso > calTempStart && iso <= calHoverDate;
          }
        }

        let diaClass = 'h-8 flex flex-col items-center justify-center rounded-lg text-xs font-medium cursor-pointer transition relative ';
        if (isStart && isEnd) {
          diaClass += 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/40 z-10';
        } else if (isStart) {
          diaClass += 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/40 rounded-r-none z-10';
        } else if (isEnd) {
          diaClass += 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/40 rounded-l-none z-10';
        } else if (isInRange) {
          diaClass += 'bg-emerald-500/20 text-emerald-200 rounded-none hover:bg-emerald-500/30';
        } else {
          diaClass += 'text-slate-200 hover:bg-emerald-500/15 hover:text-emerald-300';
        }

        const dotHtml = qtdAtos > 0 
          ? \`<span class="w-1 h-1 rounded-full \${isStart || isEnd ? 'bg-slate-950' : 'bg-emerald-400'} mt-0.5"></span>\` 
          : '';

        html += \`
          <button 
            type="button"
            onclick="calClickDia('\${iso}')"
            onmouseenter="calHoverDia('\${iso}')"
            class="\${diaClass}"
            title="\${br}: \${qtdAtos} \${qtdAtos === 1 ? 'ato' : 'atos'}"
          >
            <span class="leading-none text-[11px]">\${dia}</span>
            \${dotHtml}
          </button>
        \`;
      }

      // Dias do próximo mês para completar o grid final
      const totalCelulas = primeiroDiaSemana + ultimoDiaMes;
      const resto = totalCelulas % 7;
      if (resto !== 0) {
        const diasExtras = 7 - resto;
        for (let dia = 1; dia <= diasExtras; dia++) {
          html += \`<div class="h-8 flex items-center justify-center text-slate-600 text-[11px] rounded-lg cursor-not-allowed select-none opacity-40">\${dia}</div>\`;
        }
      }

      calDaysGrid.innerHTML = html;
    }

    window.calHoverDia = function(iso) {
      if (calPickingState === 'PICKING_END') {
        calHoverDate = iso;
        renderCalGrid();
      }
    };

    window.calClickDia = function(iso) {
      if (calPickingState === 'IDLE') {
        calTempStart = iso;
        calTempEnd = null;
        calPickingState = 'PICKING_END';
        atualizarResumoCalendario();
        renderCalGrid();
      } else {
        // Segundo clique
        if (iso < calTempStart) {
          calTempStart = iso;
          calTempEnd = null;
          calPickingState = 'PICKING_END';
        } else {
          const dIni = parseIsoDate(calTempStart);
          const dFim = parseIsoDate(iso);
          const diffDays = Math.round((dFim - dIni) / (1000 * 60 * 60 * 24));
          if (diffDays > 60) {
            const limite = new Date(dIni);
            limite.setDate(limite.getDate() + 59);
            calTempEnd = formatIsoDate(limite);
            mostrarToast('⚡ Limite de 60 dias: Para manter o grafo veloz, o intervalo máximo foi ajustado para 60 dias.');
          } else {
            calTempEnd = iso;
          }
          calPickingState = 'IDLE';
          calHoverDate = null;
        }
        atualizarResumoCalendario();
        renderCalGrid();
      }
    };

    window.calAplicarSelecao = function() {
      if (!calTempStart) {
        fecharCustomCalendar();
        return;
      }
      if (!calTempEnd) {
        calTempEnd = calTempStart;
      }

      dataInicioFiltro = calTempStart;
      dataFimFiltro = calTempEnd;
      filtroRapidoAtivo = 'CUSTOM';
      diaSelecionado = null;

      if (inputInicio) inputInicio.value = dataInicioFiltro;
      if (inputFim) inputFim.value = dataFimFiltro;

      // Desmarcar botões rápidos
      document.querySelectorAll('.filtro-rapido-btn').forEach(b => {
        b.className = 'filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition';
      });

      atualizarTriggerLabel();
      fecharCustomCalendar();

      alpha = 0.8;
      atualizarRadarBadge();
      renderDailyTimeline();
      aplicarFiltros();
      wakeRender();
    };

    // Filtros Globais
    let termoBusca = '';
    let tipoFiltro = 'ALL';

    function atualizarRadarBadge() {
      const radarBadge = document.getElementById('radar-badge-periodo');
      if (!radarBadge) return;

      if (dataInicioFiltro && dataFimFiltro && dataInicioFiltro === dataFimFiltro) {
        const [y, m, d] = dataInicioFiltro.split('-');
        radarBadge.textContent = \`📅 Dia: \${d}/\${m}/\${y}\`;
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-bold shadow-sm';
      } else if (filtroRapidoAtivo === '7_DIAS') {
        radarBadge.textContent = 'Últimos 7 dias';
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal';
      } else if (filtroRapidoAtivo === '14_DIAS') {
        radarBadge.textContent = 'Últimos 14 dias';
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal';
      } else if (filtroRapidoAtivo === '30_DIAS') {
        radarBadge.textContent = 'Últimos 30 dias';
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal';
      } else if (filtroRapidoAtivo === '60_DIAS') {
        radarBadge.textContent = 'Últimos 60 dias';
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal';
      } else if (dataInicioFiltro && dataFimFiltro) {
        const [y1, m1, d1] = dataInicioFiltro.split('-');
        const [y2, m2, d2] = dataFimFiltro.split('-');
        radarBadge.textContent = \`📅 \${d1}/\${m1}/\${y1} até \${d2}/\${m2}/\${y2}\`;
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-400 text-slate-950 font-bold shadow-sm';
      } else {
        radarBadge.textContent = 'Últimos 7 dias';
        radarBadge.className = 'text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-normal';
      }
    }

    window.aplicarFiltroRapido = function(tipo) {
      filtroRapidoAtivo = tipo;
      diaSelecionado = null;

      const fim = getLatestAcervoDate();
      const ini = new Date(fim);

      if (tipo === '7_DIAS') {
        ini.setDate(ini.getDate() - 6);
        dataInicioFiltro = formatIsoDate(ini);
        dataFimFiltro = formatIsoDate(fim);
        mesSelecionado = 'ALL';
      } else if (tipo === '14_DIAS') {
        ini.setDate(ini.getDate() - 13);
        dataInicioFiltro = formatIsoDate(ini);
        dataFimFiltro = formatIsoDate(fim);
        mesSelecionado = 'ALL';
      } else if (tipo === '30_DIAS') {
        ini.setDate(ini.getDate() - 29);
        dataInicioFiltro = formatIsoDate(ini);
        dataFimFiltro = formatIsoDate(fim);
        mesSelecionado = 'ALL';
      } else if (tipo === '60_DIAS') {
        ini.setDate(ini.getDate() - 59);
        dataInicioFiltro = formatIsoDate(ini);
        dataFimFiltro = formatIsoDate(fim);
        mesSelecionado = 'ALL';
      }

      if (inputInicio) inputInicio.value = dataInicioFiltro;
      if (inputFim) inputFim.value = dataFimFiltro;
      calTempStart = dataInicioFiltro;
      calTempEnd = dataFimFiltro;

      document.querySelectorAll('.filtro-rapido-btn').forEach(b => {
        if (b.dataset.filtro === tipo) {
          b.className = 'filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 transition';
        } else {
          b.className = 'filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition';
        }
      });

      atualizarTriggerLabel();
      alpha = 0.8;
      atualizarRadarBadge();
      renderDailyTimeline();
      aplicarFiltros();
      wakeRender();
    };

    function onDataManualChange() {
      dataInicioFiltro = inputInicio ? inputInicio.value : '';
      dataFimFiltro = inputFim ? inputFim.value : '';
      filtroRapidoAtivo = 'CUSTOM';
      diaSelecionado = null;

      validarETruncarPeriodoMaximo();

      const iniMatch = dataInicioFiltro.match(/^(\d{4})-(\d{2})/);
      const fimMatch = dataFimFiltro.match(/^(\d{4})-(\d{2})/);

      if (iniMatch && fimMatch && iniMatch[1] === fimMatch[1] && iniMatch[2] === fimMatch[2]) {
        mesSelecionado = \`\${iniMatch[2]}/\${iniMatch[1]}\`;
      } else if (iniMatch && !fimMatch) {
        mesSelecionado = \`\${iniMatch[2]}/\${iniMatch[1]}\`;
      } else if (!iniMatch && fimMatch) {
        mesSelecionado = \`\${fimMatch[2]}/\${fimMatch[1]}\`;
      } else if (!dataInicioFiltro && !dataFimFiltro) {
        aplicarFiltroRapido('7_DIAS');
        return;
      } else {
        mesSelecionado = 'ALL';
      }

      document.querySelectorAll('.filtro-rapido-btn').forEach(b => {
        b.className = 'filtro-rapido-btn px-2.5 py-1 rounded-lg text-xs font-semibold bg-transparent text-slate-300 hover:text-white transition';
      });

      atualizarTriggerLabel();
      alpha = 0.8;
      atualizarRadarBadge();
      renderDailyTimeline();
      aplicarFiltros();
      wakeRender();
    }

    if (inputInicio) inputInicio.addEventListener('change', onDataManualChange);
    if (inputFim) inputFim.addEventListener('change', onDataManualChange);

    window.filtrarPorDia = function(data) {
      alpha = 0.8;
      if (diaSelecionado === data) {
        diaSelecionado = null;
        const fim = getLatestAcervoDate();
        const ini = new Date(fim);
        if (filtroRapidoAtivo === '7_DIAS') {
          ini.setDate(ini.getDate() - 6);
        } else if (filtroRapidoAtivo === '14_DIAS') {
          ini.setDate(ini.getDate() - 13);
        } else if (filtroRapidoAtivo === '30_DIAS') {
          ini.setDate(ini.getDate() - 29);
        } else {
          ini.setDate(ini.getDate() - 59);
        }
        dataInicioFiltro = formatIsoDate(ini);
        dataFimFiltro = formatIsoDate(fim);
        mesSelecionado = 'ALL';
      } else {
        diaSelecionado = data;
        if (data && data.length === 10) {
          const [dd, mm, yyyy] = data.split('/');
          const iso = \`\${yyyy}-\${mm}-\${dd}\`;
          dataInicioFiltro = iso;
          dataFimFiltro = iso;
          if (mesSelecionado === 'ALL') {
            mesSelecionado = \`\${mm}/\${yyyy}\`;
          }
        }
      }

      if (inputInicio) inputInicio.value = dataInicioFiltro;
      if (inputFim) inputFim.value = dataFimFiltro;
      calTempStart = dataInicioFiltro;
      calTempEnd = dataFimFiltro;

      atualizarTriggerLabel();
      atualizarRadarBadge();
      renderDailyTimeline();
      aplicarFiltros();
      wakeRender();
    };

    const btnVerTodosDias = document.getElementById('btn-ver-todos-dias');
    if (btnVerTodosDias) {
      btnVerTodosDias.addEventListener('click', () => {
        aplicarFiltroRapido('60_DIAS');
      });
    }

    window.limparTodosFiltros = function() {
      termoBusca = '';
      tipoFiltro = 'ALL';
      alpha = 0.8;
      const searchEl = document.getElementById('search-input');
      if (searchEl) searchEl.value = '';
      
      document.querySelectorAll('.tipo-filter-btn').forEach(b => {
        b.classList.remove('bg-emerald-500', 'text-slate-950');
        b.classList.add('bg-[#092217]', 'text-slate-300');
        if (b.dataset.tipo === 'ALL') {
          b.classList.add('bg-emerald-500', 'text-slate-950');
        }
      });

      aplicarFiltroRapido('7_DIAS');
    };

    // Canvas & Grafo Engine
    const canvas = document.getElementById('graph-canvas');
    const ctx = canvas.getContext('2d');
    let width, height;

    function resizeCanvas() {
      width = canvas.parentElement.clientWidth || 700;
      height = canvas.parentElement.clientHeight || 480;
      const dpr = window.devicePixelRatio || 1;
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Distribuição inicial em Espiral Áurea concêntrica e estável
    const nodes = graphData.nodes.map((n, i) => {
      const angle = i * 2.39996;
      const r = Math.sqrt(i) * 11;
      return {
        ...n,
        x: (width || 700) / 2 + Math.cos(angle) * r,
        y: (height || 480) / 2 + Math.sin(angle) * r,
        vx: 0,
        vy: 0,
        radius: n.arquivo ? 6.5 : 4
      };
    });

    const nodeMap = new Map(nodes.map(n => [n.id, n]));
    const edges = graphData.edges
      .map(e => ({
        ...e,
        sourceNode: nodeMap.get(e.source),
        targetNode: nodeMap.get(e.target)
      }))
      .filter(e => e.sourceNode && e.targetNode);

    const adjacency = new Map();
    nodes.forEach(n => adjacency.set(n.id, new Set()));
    edges.forEach(e => {
      adjacency.get(e.source)?.add(e.target);
      adjacency.get(e.target)?.add(e.source);
    });

    let transform = { x: 0, y: 0, scale: 1 };
    let isDragging = false;
    let dragNode = null;
    let hoveredNode = null;
    let lastMouse = { x: 0, y: 0 };
    let selectedNode = nodes[0] || null;
    let focusedNodeId = null;
    let filteredNodeIds = new Set(nodes.map(n => n.id));
    let alpha = 1.0;

    function isNodeVisible(n) {
      return filteredNodeIds.has(n.id);
    }

    // Raio visual com compensação de zoom (Semantic Zoom) para não ficar gigante ao aproximar
    function getNodeRenderRadius(n, isHighlighted, isHovered) {
      const zoomCompensation = Math.pow(transform.scale, 0.72);
      const baseR = n.radius / zoomCompensation;
      if (isHighlighted) return baseR * 1.45;
      if (isHovered) return baseR * 1.25;
      return baseR;
    }

    // Física estável e amortecida com Spatial Hash Grid O(N) e resfriamento térmico
    function stepPhysics() {
      if (alpha < 0.005 && !dragNode) return;

      const repulsion = 450;
      const springLength = 45;
      const springK = 0.05;
      const damping = 0.82;

      const visibleList = nodes.filter(isNodeVisible);
      if (visibleList.length === 0) return;

      // Spatial Hash Grid O(N) para acelerar repulsão em mais de 40x
      const cellSize = 130;
      const grid = new Map();

      for (let i = 0; i < visibleList.length; i++) {
        const n = visibleList[i];
        const cx = Math.floor(n.x / cellSize);
        const cy = Math.floor(n.y / cellSize);
        const key = cx + ',' + cy;
        let cell = grid.get(key);
        if (!cell) {
          cell = [];
          grid.set(key, cell);
        }
        cell.push(n);
      }

      const neighborOffsets = [
        [0, 0], [1, 0], [-1, 0], [0, 1], [0, -1],
        [1, 1], [1, -1], [-1, 1], [-1, -1]
      ];

      for (let i = 0; i < visibleList.length; i++) {
        const n1 = visibleList[i];
        const cx = Math.floor(n1.x / cellSize);
        const cy = Math.floor(n1.y / cellSize);

        for (let o = 0; o < 9; o++) {
          const key = (cx + neighborOffsets[o][0]) + ',' + (cy + neighborOffsets[o][1]);
          const cell = grid.get(key);
          if (!cell) continue;

          for (let j = 0; j < cell.length; j++) {
            const n2 = cell[j];
            if (n1.id >= n2.id) continue;

            let dx = n2.x - n1.x;
            let dy = n2.y - n1.y;
            let distSq = dx * dx + dy * dy + 49;
            if (distSq < 16900) {
              let dist = Math.sqrt(distSq);
              let force = (repulsion / distSq) * alpha;
              force = Math.min(force, 8);
              let fx = (dx / dist) * force;
              let fy = (dy / dist) * force;
              n1.vx -= fx;
              n1.vy -= fy;
              n2.vx += fx;
              n2.vy += fy;
            }
          }
        }
      }

      // Molas das arestas com tensão balanceada
      edges.forEach(e => {
        if (!isNodeVisible(e.sourceNode) || !isNodeVisible(e.targetNode)) return;
        let dx = e.targetNode.x - e.sourceNode.x;
        let dy = e.targetNode.y - e.sourceNode.y;
        let dist = Math.sqrt(dx * dx + dy * dy) || 1;
        let force = (dist - springLength) * springK * alpha;
        force = Math.max(-10, Math.min(10, force));
        let fx = (dx / dist) * force;
        let fy = (dy / dist) * force;
        e.sourceNode.vx += fx;
        e.sourceNode.vy += fy;
        e.targetNode.vx -= fx;
        e.targetNode.vy -= fy;
      });

      // Gravidade central e amortecimento
      const centerX = width / 2;
      const centerY = height / 2;
      visibleList.forEach(n => {
        let dx = centerX - n.x;
        let dy = centerY - n.y;
        n.vx += dx * 0.02 * alpha;
        n.vy += dy * 0.02 * alpha;

        n.vx = Math.max(-10, Math.min(10, n.vx * damping));
        n.vy = Math.max(-10, Math.min(10, n.vy * damping));

        if (n !== dragNode) {
          n.x += n.vx;
          n.y += n.vy;
        }
      });

      alpha *= 0.96;
    }

    // Render loop sob demanda com Viewport Culling e Fast-Path
    let isRenderLoopActive = false;

    function wakeRender() {
      if (!isRenderLoopActive) {
        isRenderLoopActive = true;
        requestAnimationFrame(draw);
      }
    }

    function draw() {
      stepPhysics();

      const dpr = window.devicePixelRatio || 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      ctx.save();
      ctx.translate(transform.x, transform.y);
      ctx.scale(transform.scale, transform.scale);

      const invScale = 1 / transform.scale;
      const minX = -transform.x * invScale - 60;
      const minY = -transform.y * invScale - 60;
      const maxX = (width - transform.x) * invScale + 60;
      const maxY = (height - transform.y) * invScale + 60;

      function inViewport(x, y, r = 25) {
        return x + r >= minX && x - r <= maxX && y + r >= minY && y - r <= maxY;
      }

      const isFastPath = isDragging || dragNode;

      // Desenhar Arestas (apenas visíveis no viewport)
      edges.forEach(e => {
        if (!isNodeVisible(e.sourceNode) || !isNodeVisible(e.targetNode)) return;
        if (!inViewport(e.sourceNode.x, e.sourceNode.y, 20) && !inViewport(e.targetNode.x, e.targetNode.y, 20)) return;

        const isRelated = focusedNodeId && (e.source === focusedNodeId || e.target === focusedNodeId);
        ctx.beginPath();
        ctx.moveTo(e.sourceNode.x, e.sourceNode.y);
        ctx.lineTo(e.targetNode.x, e.targetNode.y);

        if (isRelated) {
          ctx.shadowColor = 'rgba(0, 255, 135, 0.45)';
          ctx.shadowBlur = isFastPath ? 0 : 8;
          ctx.strokeStyle = '#00ff87';
          ctx.lineWidth = 1.8 * invScale;
        } else {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = focusedNodeId ? 'rgba(16, 185, 129, 0.08)' : 'rgba(16, 185, 129, 0.18)';
          ctx.lineWidth = 1 * invScale;
        }
        ctx.stroke();
      });
      ctx.shadowBlur = 0;

      // Desenhar Nós (Viewport Culling: ignora nós fora da tela)
      nodes.forEach(n => {
        if (!isNodeVisible(n)) return;
        if (!inViewport(n.x, n.y, 35)) return;

        const isSelected = selectedNode && selectedNode.id === n.id;
        const isFocused = focusedNodeId && focusedNodeId === n.id;
        const isHovered = hoveredNode && hoveredNode.id === n.id;
        const isHighlighted = isSelected || isFocused;
        const isNeighbor = focusedNodeId && adjacency.get(focusedNodeId)?.has(n.id);
        const isDimmed = focusedNodeId && !isHighlighted && !isNeighbor;

        const r = getNodeRenderRadius(n, isHighlighted, isHovered);
        const baseColor = CORES[n.tipo] || CORES.OUTROS;

        ctx.save();
        if (isDimmed) {
          ctx.globalAlpha = 0.35;
        }

        // Halo externo translúcido para nós selecionados, vizinhos ou em hover
        if (isHighlighted || isHovered || isNeighbor) {
          ctx.beginPath();
          ctx.arc(n.x, n.y, r * (isHighlighted ? 1.65 : 1.4), 0, Math.PI * 2);
          ctx.fillStyle = isHighlighted ? 'rgba(0, 255, 135, 0.16)' : (baseColor + '24');
          ctx.fill();
        }

        // Shadow antes do fill (desativado durante arrasto para 60 FPS lisos)
        if (!isFastPath) {
          if (isHighlighted) {
            ctx.shadowColor = '#00ff87';
            ctx.shadowBlur = 18;
            ctx.shadowOffsetY = 0;
          } else if (isHovered || isNeighbor) {
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 14;
            ctx.shadowOffsetY = 2;
          } else {
            ctx.shadowColor = baseColor;
            ctx.shadowBlur = 9;
            ctx.shadowOffsetY = 3;
          }
        }

        // Esfera (Gradiente ou Flat no Fast-Path)
        ctx.beginPath();
        ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
        if (isFastPath) {
          ctx.fillStyle = baseColor;
        } else {
          const grad = ctx.createRadialGradient(
            n.x - r * 0.3,
            n.y - r * 0.3,
            r * 0.1,
            n.x,
            n.y,
            r
          );
          grad.addColorStop(0, '#ffffff');
          grad.addColorStop(0.28, baseColor);
          grad.addColorStop(1, baseColor);
          ctx.fillStyle = grad;
        }
        ctx.fill();

        // Resetar shadow para desenhar a borda nítida
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;

        if (isHighlighted) {
          ctx.strokeStyle = '#00ff87';
          ctx.lineWidth = 2.2 * invScale;
          ctx.stroke();
        } else if (isNeighbor || isHovered) {
          ctx.strokeStyle = '#e2f8ee';
          ctx.lineWidth = 1.5 * invScale;
          ctx.stroke();
        } else {
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
          ctx.lineWidth = 0.9 * invScale;
          ctx.stroke();
        }

        // Rótulo de texto com pill glassmórfico e tamanho proporcional na tela
        if (isHighlighted || isHovered || isNeighbor || n.tipo === 'RDC' || (transform.scale > 1.35 && n.arquivo)) {
          const fontSize = (isHighlighted ? 11 : 10) * invScale;
          ctx.font = (isHighlighted ? '600 ' : '500 ') + fontSize + 'px "Plus Jakarta Sans", sans-serif';
          const textWidth = ctx.measureText(n.id).width;
          const padX = 5 * invScale;
          const padY = 2.5 * invScale;
          const labelX = n.x + r + 5 * invScale;
          const labelY = n.y - fontSize / 2 - padY + 1 * invScale;
          const pillW = textWidth + padX * 2;
          const pillH = fontSize + padY * 2;
          const pillRadius = 4 * invScale;

          if (!isFastPath) {
            ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
            ctx.shadowBlur = 8;
            ctx.shadowOffsetY = 2;
          }

          ctx.beginPath();
          if (ctx.roundRect) {
            ctx.roundRect(labelX, labelY, pillW, pillH, pillRadius);
          } else {
            ctx.rect(labelX, labelY, pillW, pillH);
          }
          ctx.fillStyle = isHighlighted ? 'rgba(6, 28, 19, 0.92)' : 'rgba(5, 20, 13, 0.82)';
          ctx.fill();

          ctx.shadowBlur = 0;
          ctx.shadowOffsetY = 0;
          ctx.strokeStyle = isHighlighted ? 'rgba(0, 255, 135, 0.5)' : 'rgba(16, 185, 129, 0.22)';
          ctx.lineWidth = 0.8 * invScale;
          ctx.stroke();

          ctx.fillStyle = isHighlighted ? '#00ff87' : '#e6f4ee';
          ctx.textBaseline = 'middle';
          ctx.fillText(n.id, labelX + padX, n.y + 0.5 * invScale);
        }

        ctx.restore();
      });

      ctx.restore();

      // On-demand rendering loop: encerra quando estabiliza e não há interação
      if (alpha > 0.005 || dragNode || isDragging) {
        requestAnimationFrame(draw);
      } else {
        isRenderLoopActive = false;
      }
    }
    wakeRender();

    // Busca de nó sob o cursor respeitando o raio compensado pelo zoom
    function findNodeAt(mx, my) {
      const hitPadding = 4 / transform.scale;
      for (let i = nodes.length - 1; i >= 0; i--) {
        const n = nodes[i];
        if (!isNodeVisible(n)) continue;
        const isHighlighted = (selectedNode && selectedNode.id === n.id) || (focusedNodeId && focusedNodeId === n.id);
        const r = getNodeRenderRadius(n, isHighlighted, false);
        const dx = n.x - mx;
        const dy = n.y - my;
        if (Math.sqrt(dx * dx + dy * dy) <= r + hitPadding) {
          return n;
        }
      }
      return null;
    }

    function applyZoomAt(factor, pivotX, pivotY) {
      const newScale = Math.max(0.35, Math.min(4.5, transform.scale * factor));
      const ratio = newScale / transform.scale;
      transform.x = pivotX - (pivotX - transform.x) * ratio;
      transform.y = pivotY - (pivotY - transform.y) * ratio;
      transform.scale = newScale;
      wakeRender();
    }

    // Eventos do Canvas (Pan & Zoom)
    canvas.addEventListener('mousedown', e => {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - transform.x) / transform.scale;
      const my = (e.clientY - rect.top - transform.y) / transform.scale;

      const clicked = findNodeAt(mx, my);

      if (clicked) {
        dragNode = clicked;
        selecionarNo(clicked);
      } else {
        isDragging = true;
        lastMouse = { x: e.clientX, y: e.clientY };
      }
      wakeRender();
    });

    window.addEventListener('mousemove', e => {
      const rect = canvas.getBoundingClientRect();
      if (dragNode) {
        dragNode.x = (e.clientX - rect.left - transform.x) / transform.scale;
        dragNode.y = (e.clientY - rect.top - transform.y) / transform.scale;
        dragNode.vx = 0;
        dragNode.vy = 0;
        alpha = Math.max(alpha, 0.3);
        wakeRender();
      } else if (isDragging) {
        transform.x += (e.clientX - lastMouse.x);
        transform.y += (e.clientY - lastMouse.y);
        lastMouse = { x: e.clientX, y: e.clientY };
        wakeRender();
      } else if (e.target === canvas) {
        const mx = (e.clientX - rect.left - transform.x) / transform.scale;
        const my = (e.clientY - rect.top - transform.y) / transform.scale;
        const prevHover = hoveredNode;
        hoveredNode = findNodeAt(mx, my);
        canvas.style.cursor = hoveredNode ? 'pointer' : 'grab';
        if (prevHover !== hoveredNode) {
          wakeRender();
        }
      }
    });

    window.addEventListener('mouseup', () => {
      dragNode = null;
      isDragging = false;
      wakeRender();
    });

    canvas.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = canvas.getBoundingClientRect();
      const pivotX = e.clientX - rect.left;
      const pivotY = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.14 : 0.88;
      applyZoomAt(zoomFactor, pivotX, pivotY);
    });

    document.getElementById('btn-zoom-in').addEventListener('click', () => {
      applyZoomAt(1.25, width / 2, height / 2);
    });
    document.getElementById('btn-zoom-out').addEventListener('click', () => {
      applyZoomAt(0.8, width / 2, height / 2);
    });
    document.getElementById('btn-reset-view').addEventListener('click', () => {
      transform = { x: 0, y: 0, scale: 1 };
      focusedNodeId = null;
      document.getElementById('btn-clear-focus').classList.add('hidden');
      alpha = 0.8;
      wakeRender();
    });
    document.getElementById('btn-clear-focus').addEventListener('click', () => {
      focusedNodeId = null;
      document.getElementById('btn-clear-focus').classList.add('hidden');
      wakeRender();
    });

    // Função de Seleção e Atualização de Inspetor
    function selecionarNo(node) {
      selectedNode = node;
      focusedNodeId = node.id;
      document.getElementById('btn-clear-focus').classList.remove('hidden');
      wakeRender();

      const badgeSituacao = document.getElementById('selected-badge-situacao');
      badgeSituacao.textContent = node.situacao || 'vigente';
      if (node.situacao === 'revogada') {
        badgeSituacao.className = 'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30';
      } else {
        badgeSituacao.className = 'text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30';
      }

      const vizinhos = Array.from(adjacency.get(node.id) || []);

      const content = document.getElementById('inspector-content');
      content.innerHTML = \`
        <div class="space-y-3">
          <div>
            <h4 class="text-base font-bold text-white tracking-wide">\${node.id}</h4>
            <div class="flex items-center gap-2 text-slate-400 text-[11px] mt-0.5">
              <span>📅 \${node.data_ato || node.ano || 'Ano N/D'}</span>
              \${node.data_publicacao_dou ? \`<span class="text-emerald-400 font-mono">DOU: \${node.data_publicacao_dou}</span>\` : ''}
              <span class="px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-mono">\${node.tipo}</span>
            </div>
          </div>

          \${node.ementa ? \`
            <div class="bg-[#05140d] p-3 rounded-xl border border-emerald-500/20 space-y-1">
              <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80">Ementa Oficial:</span>
              <p class="text-slate-300 text-xs leading-relaxed">\${node.ementa}</p>
            </div>
          \` : ''}

          <!-- Conexões Diretas -->
          <div class="space-y-1.5 pt-1">
            <span class="text-[10px] font-bold uppercase tracking-wider text-emerald-400/80 flex items-center justify-between">
              <span>Relações no Grafo:</span>
              <span class="font-mono text-white">\${vizinhos.length}</span>
            </span>
            <div class="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
              \${vizinhos.length > 0 ? vizinhos.map(v => \`
                <button onclick="selecionarPorId('\${v}')" class="px-2 py-1 rounded-lg bg-[#082016] hover:bg-emerald-900/60 text-emerald-300 border border-emerald-500/30 text-[11px] font-mono transition">
                  \${v}
                </button>
              \`).join('') : '<span class="text-slate-500 italic">Nenhuma relação direta identificada.</span>'}
            </div>
          </div>

          \${node.arquivo ? \`
            <div class="pt-2 border-t border-emerald-500/15 flex items-center justify-between">
              <span class="text-[11px] text-slate-400 font-mono truncate max-w-[200px]">\${node.arquivo}</span>
              <a href="https://github.com/jadsonsanches/anvisa-normas/blob/main/\${node.arquivo.replace(/\\\\/g, '/')}" target="_blank" class="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[11px] font-semibold transition">
                Ver Markdown ↗
              </a>
            </div>
          \` : ''}
        </div>
      \`;
    }

    window.selecionarPorId = function(id) {
      const target = nodes.find(n => n.id === id);
      if (target) {
        selecionarNo(target);
      }
    };

    // Filtros e Renderização da Lista de Normas
    const normsContainer = document.getElementById('norms-list-container');
    const searchInput = document.getElementById('search-input');

    let listRenderLimit = 30;
    let currentFilteredList = [];

    function renderNormsList() {
      const listItems = currentFilteredList.filter(n => n.arquivo);
      if (listItems.length === 0) {
        normsContainer.innerHTML = \`
          <div class="text-xs text-slate-500 text-center py-8 bg-[#05140d] rounded-xl border border-emerald-500/10">
            Nenhuma norma encontrada para os filtros selecionados.
          </div>
        \`;
        return;
      }

      const visibleItems = listItems.slice(0, listRenderLimit);
      const hasMore = listItems.length > listRenderLimit;

      normsContainer.innerHTML = visibleItems.map(n => \`
        <div onclick="selecionarPorId('\${n.id}')" class="p-3 rounded-xl bg-[#061810]/90 hover:bg-[#0a261a] border border-emerald-500/20 cursor-pointer transition space-y-1.5 group">
          <div class="flex items-center justify-between">
            <span class="font-bold text-xs text-white group-hover:text-emerald-300 font-mono transition">\${n.id}</span>
            <span class="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full \${
              n.situacao === 'revogada' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
            }">\${n.situacao || 'vigente'}</span>
          </div>
          <div class="flex items-center justify-between text-[10px] text-slate-400 font-mono">
            <span>📅 \${n.data_ato || n.ano || 'N/D'}</span>
            \${n.data_publicacao_dou ? \`<span class="text-emerald-400 font-bold">DOU: \${n.data_publicacao_dou}</span>\` : ''}
          </div>
          \${n.ementa ? \`<p class="text-[11px] text-slate-300 line-clamp-2 leading-relaxed">\${n.ementa}</p>\` : ''}
        </div>
      \`).join('') + (hasMore ? \`
        <div class="pt-2 text-center">
          <button onclick="carregarMaisNormas()" class="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition active:scale-98">
            Carregar mais 30 normas (+\${listItems.length - listRenderLimit} restantes)
          </button>
        </div>
      \` : '');
    }

    window.carregarMaisNormas = function() {
      listRenderLimit += 30;
      renderNormsList();
    };

    function atualizarMetricas(filtered) {
      const internal = filtered.filter(n => n.arquivo);
      const total = internal.length;
      const vigentes = internal.filter(n => (n.situacao || 'vigente') === 'vigente').length;
      const pct = total > 0 ? Math.round((vigentes / total) * 100) : 100;

      const fSet = new Set(filtered.map(n => n.id));
      const edgesCount = graphData.edges.filter(e => fSet.has(e.source) && fSet.has(e.target)).length;

      // Calcular pico diário no período
      const contagemDias = {};
      internal.forEach(n => {
        const d = n.data_publicacao_dou || n.data_ato;
        if (d) contagemDias[d] = (contagemDias[d] || 0) + 1;
      });
      let picoQtd = 0;
      let picoData = '-';
      Object.entries(contagemDias).forEach(([d, q]) => {
        if (q > picoQtd) {
          picoQtd = q;
          picoData = d;
        }
      });

      const elTotal = document.getElementById('stat-total-normas');
      const elFiltradasBadge = document.getElementById('stat-filtradas-badge');
      const elVigentes = document.getElementById('stat-vigentes');
      const elVigentesPct = document.getElementById('stat-vigentes-pct');
      const elRelacoes = document.getElementById('stat-relacoes');
      const elPicoValor = document.getElementById('stat-pico-valor');
      const elPicoData = document.getElementById('stat-pico-data');
      const elPicoSub = document.getElementById('stat-pico-sub');

      // Opção 1: Card 1 fixo no total global do banco
      if (elTotal) elTotal.textContent = statsTotalGeral;
      if (elFiltradasBadge) {
        if (total < statsTotalGeral) {
          elFiltradasBadge.textContent = \`Exibindo \${total} no período\`;
        } else {
          elFiltradasBadge.textContent = \`Exibindo \${total} (tudo)\`;
        }
      }
      if (elVigentes) elVigentes.textContent = vigentes;
      if (elVigentesPct) elVigentesPct.textContent = \`\${pct}%\`;
      if (elRelacoes) elRelacoes.textContent = edgesCount;
      if (elPicoValor) elPicoValor.textContent = picoQtd;
      if (elPicoData) elPicoData.textContent = picoData !== '-' ? picoData.slice(0, 5) : '-';
      if (elPicoSub) {
        elPicoSub.textContent = picoData !== '-' ? \`Pico registrado em \${picoData}\` : 'Sem dados para o filtro';
      }
    }

    function aplicarFiltros() {
      const q = termoBusca.toLowerCase().trim();

      const dtIni = dataInicioFiltro ? parseIsoDate(dataInicioFiltro) : null;
      const dtFim = dataFimFiltro ? parseIsoDate(dataFimFiltro) : null;

      function estaNoPeriodo(dataStr) {
        if (!dataStr) return false;
        const dt = parseBrDate(dataStr);
        if (!dt) return false;
        if (dtIni && dt < dtIni) return false;
        if (dtFim && dt > dtFim) return false;
        return true;
      }

      // Se houver busca textual ativa, busca ampla em todo o banco e traz vizinhos imediatos
      let matchedByQuery = null;
      if (q) {
        matchedByQuery = new Set();
        nodes.forEach(n => {
          const inId = n.id.toLowerCase().includes(q);
          const inEmenta = n.ementa && n.ementa.toLowerCase().includes(q);
          const inAno = n.ano && n.ano.includes(q);
          const inDataAto = n.data_ato && n.data_ato.includes(q);
          const inDataDou = n.data_publicacao_dou && n.data_publicacao_dou.includes(q);
          if (inId || inEmenta || inAno || inDataAto || inDataDou) {
            matchedByQuery.add(n.id);
            const viz = adjacency.get(n.id);
            if (viz) {
              viz.forEach(v => matchedByQuery.add(v));
            }
          }
        });
      }

      // Mapear nós internos que atendem ao período
      const internalInPeriod = new Set();
      nodes.forEach(n => {
        if (!n.arquivo) return;
        if (!dtIni && !dtFim) {
          internalInPeriod.add(n.id);
          return;
        }
        if (estaNoPeriodo(n.data_publicacao_dou) || estaNoPeriodo(n.data_ato)) {
          internalInPeriod.add(n.id);
        }
      });

      const filtered = nodes.filter(n => {
        // Se houver busca de texto ativa, filtra pelo subgrafo da consulta
        if (matchedByQuery) {
          if (!matchedByQuery.has(n.id)) return false;
        } else if (dtIni || dtFim) {
          // Filtro por Período de Data
          if (n.arquivo) {
            if (!internalInPeriod.has(n.id)) return false;
          } else {
            const viz = adjacency.get(n.id);
            let hasConn = false;
            if (viz) {
              for (const v of viz) {
                if (internalInPeriod.has(v)) {
                  hasConn = true;
                  break;
                }
              }
            }
            if (!hasConn) return false;
          }
        }

        // Filtro por tipo
        if (tipoFiltro !== 'ALL' && n.tipo !== tipoFiltro) {
          return false;
        }

        return true;
      });

      filteredNodeIds = new Set(filtered.map(n => n.id));
      document.getElementById('count-filtered').textContent = \`\${filtered.length} de \${nodes.length} nós\`;

      const listStatus = document.getElementById('list-status-badge');
      const internalCount = filtered.filter(n => n.arquivo).length;
      if (q) {
        listStatus.textContent = \`Encontrados \${internalCount} atos para "\${q}"\`;
      } else if (dataInicioFiltro && dataFimFiltro && dataInicioFiltro === dataFimFiltro) {
        const [y, m, d] = dataInicioFiltro.split('-');
        listStatus.textContent = \`Exibindo \${internalCount} atos de \${d}/\${m}/\${y}\`;
      } else if (dataInicioFiltro && dataFimFiltro) {
        const [y1, m1, d1] = dataInicioFiltro.split('-');
        const [y2, m2, d2] = dataFimFiltro.split('-');
        listStatus.textContent = \`Exibindo \${internalCount} atos (\${d1}/\${m1} a \${d2}/\${m2}/\${y2})\`;
      } else if (filtroRapidoAtivo === '7_DIAS') {
        listStatus.textContent = \`Exibindo \${internalCount} atos dos últimos 7 dias\`;
      } else if (filtroRapidoAtivo === '14_DIAS') {
        listStatus.textContent = \`Exibindo \${internalCount} atos dos últimos 14 dias\`;
      } else if (filtroRapidoAtivo === '30_DIAS') {
        listStatus.textContent = \`Exibindo \${internalCount} atos dos últimos 30 dias\`;
      } else if (filtroRapidoAtivo === '60_DIAS') {
        listStatus.textContent = \`Exibindo \${internalCount} atos (últimos 60 dias)\`;
      } else {
        listStatus.textContent = \`Exibindo \${internalCount} atos\`;
      }

      atualizarMetricas(filtered);
      buildDonutChart(filtered);

      // Renderizar lista progressiva
      listRenderLimit = 30;
      currentFilteredList = filtered;
      renderNormsList();
    }

    let searchDebounceTimer = null;
    searchInput.addEventListener('input', e => {
      clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => {
        termoBusca = e.target.value;
        alpha = 0.8;
        aplicarFiltros();
        wakeRender();
      }, 150);
    });

    // Filtros por Tipo de Ato
    document.querySelectorAll('.tipo-filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.tipo-filter-btn').forEach(b => {
          b.classList.remove('bg-emerald-500', 'text-slate-950');
          b.classList.add('bg-[#092217]', 'text-slate-300');
        });
        btn.classList.remove('bg-[#092217]', 'text-slate-300');
        btn.classList.add('bg-emerald-500', 'text-slate-950');
        tipoFiltro = btn.dataset.tipo;
        alpha = 0.8;
        aplicarFiltros();
        wakeRender();
      });
    });

    // Construção do Donut Chart SVG dinâmico
    function buildDonutChart(filtered) {
      const targetNodes = filtered ? filtered.filter(n => n.arquivo) : nodes.filter(n => n.arquivo);
      const tiposCount = {};
      targetNodes.forEach(n => {
        tiposCount[n.tipo] = (tiposCount[n.tipo] || 0) + 1;
      });

      const total = Object.values(tiposCount).reduce((a, b) => a + b, 0) || 1;
      let acc = 0;

      const slices = Object.entries(tiposCount)
        .sort((a, b) => b[1] - a[1])
        .map(([tipo, count]) => {
          const pct = count / total;
          const start = acc;
          acc += pct;
          return { tipo, count, pct, start, end: acc, color: CORES[tipo] || '#64748b' };
        });

      if (slices.length === 0) {
        document.getElementById('donut-container').innerHTML = '<div class="text-xs text-slate-500 py-4">Sem dados.</div>';
        return;
      }

      const svg = \`
        <svg viewBox="0 0 100 100" class="w-20 h-20 transform -rotate-90 shrink-0">
          \${slices.map(s => {
            const a1 = s.start * 2 * Math.PI;
            const a2 = s.end * 2 * Math.PI;
            const x1 = 50 + 40 * Math.cos(a1);
            const y1 = 50 + 40 * Math.sin(a1);
            const x2 = 50 + 40 * Math.cos(a2);
            const y2 = 50 + 40 * Math.sin(a2);
            const largeArc = (s.end - s.start) > 0.5 ? 1 : 0;
            const d = s.pct >= 0.999 ? 'M 50 10 A 40 40 0 1 1 49.99 10 Z' :
                      \`M \${x1} \${y1} A 40 40 0 \${largeArc} 1 \${x2} \${y2}\`;
            return \`<path d="\${d}" fill="none" stroke="\${s.color}" stroke-width="16" class="donut-segment cursor-pointer transition">
              <title>\${s.tipo}: \${s.count} (\${Math.round(s.pct * 100)}%)</title>
            </path>\`;
          }).join('')}
        </svg>
        <div class="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          \${slices.slice(0, 4).map(s => \`
            <div class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full" style="background-color: \${s.color}"></span>
              <span class="text-slate-300 font-medium">\${s.tipo}:</span>
              <strong class="text-white font-mono">\${s.count}</strong>
            </div>
          \`).join('')}
        </div>
      \`;
      document.getElementById('donut-container').innerHTML = svg;
    }
    buildDonutChart();

    window.scrollToSection = function(id) {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
    };

    // Inicialização
    if (nodes.length > 0) {
      selecionarNo(nodes[0]);
    }
    aplicarFiltroRapido('7_DIAS');
    wakeRender();
  </script>
</body>
</html>
`;

// Salvar no repositório (visualizador.html e index.html para o GitHub Pages)
fs.writeFileSync(path.join(__dirname, '../visualizador.html'), htmlContent, 'utf8');
fs.writeFileSync(path.join(__dirname, '../index.html'), htmlContent, 'utf8');
console.log('✅ Novo visualizador Dark Emerald AI gerado com sucesso em visualizador.html e index.html!');
