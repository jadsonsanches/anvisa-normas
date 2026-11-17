#!/usr/bin/env node
import express from 'express';
import cors from 'cors';
import { randomUUID, timingSafeEqual } from 'crypto';
import { SSEServerTransport } from '@modelcontextprotocol/sdk/server/sse.js';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';
import * as fs from 'fs';
import * as path from 'path';
import initSqlJs from 'sql.js';
import { fileURLToPath } from 'url';
import { McpServer, ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

function getDirname() {
  try {
    return path.dirname(fileURLToPath(import.meta.url));
  } catch {
    return process.cwd();
  }
}
function resolveDbPath() {
  if (process.env.ANVISA_DB_PATH && fs.existsSync(process.env.ANVISA_DB_PATH)) {
    return path.resolve(process.env.ANVISA_DB_PATH);
  }
  const currentDir = getDirname();
  const candidates = [
    // Se executado de dist/bin/mcp.js
    path.resolve(currentDir, "../../data/dist/anvisa.db"),
    // Se executado de dist/config.js ou dist/index.js
    path.resolve(currentDir, "../data/dist/anvisa.db"),
    // Se executado de src/config.ts com tsx
    path.resolve(currentDir, "../data/dist/anvisa.db"),
    // Se executado a partir da raiz do repositório
    path.resolve(process.cwd(), "data/dist/anvisa.db")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "data/dist/anvisa.db");
}
function resolveDataDir() {
  if (process.env.ANVISA_DATA_DIR && fs.existsSync(process.env.ANVISA_DATA_DIR)) {
    return path.resolve(process.env.ANVISA_DATA_DIR);
  }
  const currentDir = getDirname();
  const candidates = [
    path.resolve(currentDir, "../../data"),
    path.resolve(currentDir, "../data"),
    path.resolve(process.cwd(), "data")
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return path.resolve(process.cwd(), "data");
}

// src/db/sqljs-provider.ts
function unaccent(str) {
  if (!str) return "";
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
}
function normalizeId(id) {
  if (!id) return "";
  const trimmed = id.trim();
  const match = trimmed.match(
    /^([a-zA-ZáéíóúÁÉÍÓÚçÇ]+)\s*(?:n[º°.]?\s*)?(\d+)[/\s\-de]+(\d{4})$/i
  );
  if (match) {
    const tipo = match[1].toUpperCase();
    const numero = match[2];
    const ano = match[3];
    return `${tipo} ${numero}/${ano}`;
  }
  return trimmed.toUpperCase();
}
var SqlJsDatabaseProvider = class {
  db = null;
  dbPath;
  isInitialized = false;
  constructor(customDbPath) {
    this.dbPath = customDbPath || resolveDbPath();
  }
  async init() {
    if (this.isInitialized && this.db) {
      return;
    }
    if (!fs.existsSync(this.dbPath)) {
      throw new Error(
        `Banco de dados SQLite consolidado da Anvisa n\xE3o foi encontrado em: ${this.dbPath}`
      );
    }
    const fileBuffer = fs.readFileSync(this.dbPath);
    const SQL = await initSqlJs();
    this.db = new SQL.Database(fileBuffer);
    this.db.create_function("unaccent", (str) => unaccent(str));
    this.db.run(`
      CREATE INDEX IF NOT EXISTS idx_normas_tipo ON normas(tipo);
      CREATE INDEX IF NOT EXISTS idx_normas_ano ON normas(ano);
      CREATE INDEX IF NOT EXISTS idx_normas_situacao ON normas(situacao);
      CREATE INDEX IF NOT EXISTS idx_relacoes_origem ON relacoes(origem);
      CREATE INDEX IF NOT EXISTS idx_relacoes_destino ON relacoes(destino);
      CREATE INDEX IF NOT EXISTS idx_relacoes_tipo ON relacoes(tipo_relacao);
    `);
    this.isInitialized = true;
  }
  checkDb() {
    if (!this.db || !this.isInitialized) {
      throw new Error(
        "DatabaseProvider n\xE3o inicializado. Chame await provider.init() antes de executar opera\xE7\xF5es."
      );
    }
    return this.db;
  }
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }
  async buscarNormas(filtros) {
    const db = this.checkDb();
    const conditions = [];
    const params = {};
    const termo = filtros.termo || filtros.query;
    if (termo && termo.trim()) {
      const normTerm = unaccent(termo.trim());
      conditions.push("(unaccent(ementa) LIKE :termo OR unaccent(id) LIKE :termo)");
      params[":termo"] = `%${normTerm}%`;
    }
    if (filtros.tipo && filtros.tipo.trim()) {
      conditions.push("UPPER(tipo) = :tipo");
      params[":tipo"] = filtros.tipo.trim().toUpperCase();
    }
    if (filtros.ano) {
      conditions.push("ano = :ano");
      params[":ano"] = Number(filtros.ano);
    }
    if (filtros.situacao) {
      conditions.push("situacao = :situacao");
      params[":situacao"] = filtros.situacao.toLowerCase();
    }
    if (filtros.data && filtros.data.trim()) {
      let dataFmt = filtros.data.trim();
      const isoMatch = dataFmt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        dataFmt = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
      }
      conditions.push("(data_publicacao_dou = :data OR data_ato = :data OR data_promulgacao = :data)");
      params[":data"] = dataFmt;
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const limite = Math.min(Math.max(filtros.limite || 20, 1), 100);
    const orderClause = filtros.ordenar_por === "id" ? "ORDER BY ano DESC, id DESC" : `ORDER BY 
           SUBSTR(COALESCE(NULLIF(data_publicacao_dou, ''), NULLIF(data_ato, ''), '01/01/1900'), 7, 4) || '-' ||
           SUBSTR(COALESCE(NULLIF(data_publicacao_dou, ''), NULLIF(data_ato, ''), '01/01/1900'), 4, 2) || '-' ||
           SUBSTR(COALESCE(NULLIF(data_publicacao_dou, ''), NULLIF(data_ato, ''), '01/01/1900'), 1, 2) DESC,
           id DESC`;
    const sql = `
      SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
             situacao, ementa, leis_base, relacionadas, arquivo, fonte
      FROM normas
      ${whereClause}
      ${orderClause}
      LIMIT ${limite}
    `;
    const stmt = db.prepare(sql);
    stmt.bind(params);
    const resultados = [];
    while (stmt.step()) {
      resultados.push(stmt.getAsObject());
    }
    stmt.free();
    return resultados;
  }
  async obterNorma(id) {
    const db = this.checkDb();
    if (!id || !id.trim()) return null;
    const trimmed = id.trim();
    const normalized = normalizeId(trimmed);
    let stmt = db.prepare(`
      SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
             situacao, ementa, leis_base, relacionadas, arquivo, fonte
      FROM normas WHERE id = :id
    `);
    stmt.bind({ ":id": trimmed });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    if (normalized !== trimmed) {
      stmt = db.prepare(`
        SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
               situacao, ementa, leis_base, relacionadas, arquivo, fonte
        FROM normas WHERE id = :id
      `);
      stmt.bind({ ":id": normalized });
      if (stmt.step()) {
        const row = stmt.getAsObject();
        stmt.free();
        return row;
      }
      stmt.free();
    }
    stmt = db.prepare(`
      SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
             situacao, ementa, leis_base, relacionadas, arquivo, fonte
      FROM normas WHERE UPPER(TRIM(id)) = :id
    `);
    stmt.bind({ ":id": trimmed.toUpperCase() });
    if (stmt.step()) {
      const row = stmt.getAsObject();
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  }
  async obterTextoNorma(id, limiteCaracteres) {
    const db = this.checkDb();
    if (!id || !id.trim()) return null;
    const trimmed = id.trim();
    const normalized = normalizeId(trimmed);
    const stmt = db.prepare(`
      SELECT texto_markdown, arquivo FROM normas
      WHERE id = :id OR id = :normId OR UPPER(TRIM(id)) = :upperId
    `);
    stmt.bind({
      ":id": trimmed,
      ":normId": normalized,
      ":upperId": trimmed.toUpperCase()
    });
    let texto = null;
    let arquivo = null;
    if (stmt.step()) {
      const row = stmt.getAsObject();
      texto = row.texto_markdown || null;
      arquivo = row.arquivo || null;
    }
    stmt.free();
    if ((!texto || !texto.trim()) && arquivo) {
      const fullPath = path.resolve(resolveDataDir(), "..", arquivo);
      if (fs.existsSync(fullPath)) {
        try {
          texto = fs.readFileSync(fullPath, "utf8");
        } catch {
        }
      }
    }
    if (!texto) {
      return null;
    }
    if (limiteCaracteres && limiteCaracteres > 0 && texto.length > limiteCaracteres) {
      const originalLen = texto.length;
      texto = texto.slice(0, limiteCaracteres) + `

... [Texto truncado no limite de ${limiteCaracteres} caracteres. Total original: ${originalLen} caracteres]`;
    }
    return texto;
  }
  async verificarVigencia(id) {
    const db = this.checkDb();
    if (!id || !id.trim()) {
      return {
        id: "",
        situacao: "desconhecida",
        detalhes: "Identificador de norma n\xE3o informado."
      };
    }
    const norma = await this.obterNorma(id);
    if (norma) {
      const canonicalId = norma.id;
      const isRevogada = norma.situacao === "revogada";
      if (isRevogada) {
        let atoRevogador;
        const stmtText = db.prepare(
          "SELECT texto_markdown FROM normas WHERE id = :id"
        );
        stmtText.bind({ ":id": canonicalId });
        if (stmtText.step()) {
          const fullText = stmtText.getAsObject().texto_markdown || "";
          const match = fullText.match(/Revogada pela?\s+\[([^\]]+)\]/i) || fullText.match(/Revogada pela?\s+([^\n\r.]+)/i);
          if (match) {
            atoRevogador = match[1].trim();
          }
        }
        stmtText.free();
        const stmtRel = db.prepare(
          "SELECT origem, tipo_relacao FROM relacoes WHERE destino = :id"
        );
        stmtRel.bind({ ":id": canonicalId });
        const historico = [];
        while (stmtRel.step()) {
          const r = stmtRel.getAsObject();
          historico.push(`Referenciada por ${r.origem} (${r.tipo_relacao})`);
        }
        stmtRel.free();
        return {
          id: canonicalId,
          situacao: "revogada",
          detalhes: atoRevogador ? `Norma revogada. Ato revogador identificado: ${atoRevogador}.` : "Norma revogada conforme cadastro oficial da Anvisa.",
          atoRevogador,
          historico: historico.length > 0 ? historico : void 0
        };
      } else {
        return {
          id: canonicalId,
          situacao: "vigente",
          detalhes: "Norma vigente no acervo regulat\xF3rio da Anvisa sem registros de revoga\xE7\xE3o."
        };
      }
    }
    const normalized = normalizeId(id);
    const stmtGrafo = db.prepare(`
      SELECT origem, tipo_relacao FROM relacoes
      WHERE destino = :id OR destino = :normId
    `);
    stmtGrafo.bind({ ":id": id.trim(), ":normId": normalized });
    const citacoes = [];
    while (stmtGrafo.step()) {
      const r = stmtGrafo.getAsObject();
      citacoes.push(`${r.origem} (${r.tipo_relacao})`);
    }
    stmtGrafo.free();
    if (citacoes.length > 0) {
      return {
        id: normalized,
        situacao: "desconhecida",
        detalhes: `A norma '${normalized}' n\xE3o possui texto integral consolidado na base principal local, mas consta no grafo regulat\xF3rio sendo referenciada por ${citacoes.length} ato(s).`,
        historico: citacoes
      };
    }
    return {
      id: normalized || id,
      situacao: "desconhecida",
      detalhes: `Norma '${id}' n\xE3o foi localizada no cadastro nem no grafo regulat\xF3rio da Anvisa.`
    };
  }
  async consultarRelacoes(id, direcao = "todas", tipoRelacao = "todas") {
    const db = this.checkDb();
    const normalized = normalizeId(id);
    let targetId = normalized;
    const norma = await this.obterNorma(id);
    if (norma) {
      targetId = norma.id;
    }
    const relacoesSaida = [];
    const relacoesEntrada = [];
    const filtrarTipo = tipoRelacao && tipoRelacao !== "todas";
    if (direcao === "todas" || direcao === "saida") {
      let sql = "SELECT destino, tipo_relacao FROM relacoes WHERE origem = :id";
      if (filtrarTipo) {
        sql += " AND tipo_relacao = :tipoRelacao";
      }
      const stmt = db.prepare(sql);
      const params = { ":id": targetId };
      if (filtrarTipo) {
        params[":tipoRelacao"] = tipoRelacao;
      }
      stmt.bind(params);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        relacoesSaida.push({
          destino: r.destino,
          tipo: r.tipo_relacao
        });
      }
      stmt.free();
    }
    if (direcao === "todas" || direcao === "entrada") {
      let sql = "SELECT origem, tipo_relacao FROM relacoes WHERE destino = :id";
      if (filtrarTipo) {
        sql += " AND tipo_relacao = :tipoRelacao";
      }
      const stmt = db.prepare(sql);
      const params = { ":id": targetId };
      if (filtrarTipo) {
        params[":tipoRelacao"] = tipoRelacao;
      }
      stmt.bind(params);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        relacoesEntrada.push({
          origem: r.origem,
          tipo: r.tipo_relacao
        });
      }
      stmt.free();
    }
    return {
      norma: targetId,
      relacoesSaida,
      relacoesEntrada
    };
  }
  async obterEstatisticas(tipo) {
    const db = this.checkDb();
    if (tipo && tipo.trim()) {
      const normTipo = tipo.trim().toUpperCase();
      const stmt = db.prepare(`
        SELECT 
          COUNT(*) as total, 
          SUM(CASE WHEN situacao = 'vigente' THEN 1 ELSE 0 END) as vigentes, 
          SUM(CASE WHEN situacao = 'revogada' THEN 1 ELSE 0 END) as revogadas 
        FROM normas WHERE UPPER(tipo) = :tipo
      `);
      stmt.bind({ ":tipo": normTipo });
      stmt.step();
      const res = stmt.getAsObject();
      stmt.free();
      return {
        tipo: normTipo,
        total: Number(res.total || 0),
        vigentes: Number(res.vigentes || 0),
        revogadas: Number(res.revogadas || 0)
      };
    }
    const stmtGlobal = db.prepare(`
      SELECT 
        COUNT(*) as totalNormas, 
        SUM(CASE WHEN situacao = 'vigente' THEN 1 ELSE 0 END) as vigentes, 
        SUM(CASE WHEN situacao = 'revogada' THEN 1 ELSE 0 END) as revogadas 
      FROM normas
    `);
    stmtGlobal.step();
    const gRes = stmtGlobal.getAsObject();
    stmtGlobal.free();
    const stmtRel = db.prepare(
      "SELECT COUNT(*) as totalRelacoes FROM relacoes"
    );
    stmtRel.step();
    const rRes = stmtRel.getAsObject();
    stmtRel.free();
    const stmtTipos = db.prepare(
      "SELECT tipo, COUNT(*) as qtd FROM normas GROUP BY tipo ORDER BY qtd DESC"
    );
    const porTipo = {};
    while (stmtTipos.step()) {
      const row = stmtTipos.getAsObject();
      porTipo[row.tipo] = Number(row.qtd);
    }
    stmtTipos.free();
    return {
      totalNormas: Number(gRes.totalNormas || 0),
      vigentes: Number(gRes.vigentes || 0),
      revogadas: Number(gRes.revogadas || 0),
      totalRelacoes: Number(rRes.totalRelacoes || 0),
      porTipo
    };
  }
};
var buscarNormasSchema = {
  termo: z.string().optional().describe(
    'Termo de busca textual para filtrar na ementa ou identificador (tolerante a acentos, ex: "sanitaria", "rotulagem", "medicamento")'
  ),
  query: z.string().optional().describe("Alias para o par\xE2metro termo de busca textual"),
  tipo: z.string().optional().describe(
    'Sigla do tipo de ato regulat\xF3rio (ex: "RDC", "IN", "PORTARIA", "RE", "AFA", "NOM")'
  ),
  ano: z.number().int().optional().describe("Ano da norma (ex: 2024, 2025, 2026)"),
  situacao: z.enum(["vigente", "revogada"]).optional().describe("Filtro por situa\xE7\xE3o de vig\xEAncia da norma"),
  data: z.string().optional().describe(
    'Filtro por data exata da norma ou publica\xE7\xE3o no DOU (aceita formato DD/MM/AAAA ou AAAA-MM-DD, ex: "16/11/2026" ou "2026-11-16")'
  ),
  ordenar_por: z.enum(["recentes", "id"]).optional().default("recentes").describe(
    'Crit\xE9rio de ordena\xE7\xE3o dos resultados: "recentes" (padr\xE3o, normas publicadas mais recentemente primeiro) ou "id"'
  ),
  limite: z.number().int().min(1).max(100).default(20).describe("Quantidade m\xE1xima de resultados a retornar (padr\xE3o: 20, m\xE1x: 100)")
};
function registerBuscarNormasTool(server, dbProvider) {
  server.tool(
    "buscar_normas",
    "Busca normas regulat\xF3rias da Anvisa por termo textual na ementa (insens\xEDvel a acentua\xE7\xE3o), tipo de ato, ano ou situa\xE7\xE3o de vig\xEAncia. Retorna lista de metadados essenciais.",
    buscarNormasSchema,
    async (args) => {
      try {
        const termo = args.termo || args.query;
        const normas = await dbProvider.buscarNormas({
          termo,
          tipo: args.tipo,
          ano: args.ano,
          situacao: args.situacao,
          data: args.data,
          ordenar_por: args.ordenar_por,
          limite: args.limite
        });
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  total_encontrado: normas.length,
                  filtros_aplicados: {
                    termo: termo || null,
                    tipo: args.tipo || null,
                    ano: args.ano || null,
                    situacao: args.situacao || null,
                    data: args.data || null,
                    ordenar_por: args.ordenar_por || "recentes",
                    limite: args.limite
                  },
                  normas
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao buscar normas: ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterNormaSchema = {
  id: z.string().describe(
    'Identificador oficial da norma da Anvisa (ex: "RDC 658/2022", "IN 343/2025", "PORTARIA 344/1998")'
  )
};
function registerObterNormaTool(server, dbProvider) {
  server.tool(
    "obter_norma",
    "Obt\xE9m metadados cadastrais completos de uma norma da Anvisa a partir de seu identificador (id). N\xE3o inclui o texto integral; para ler o texto use obter_texto_norma.",
    obterNormaSchema,
    async (args) => {
      try {
        const norma = await dbProvider.obterNorma(args.id);
        if (!norma) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    encontrada: false,
                    mensagem: `Norma com identificador '${args.id}' n\xE3o foi encontrada no acervo cadastral consolidado da Anvisa.`,
                    sugestao: "Tente utilizar a ferramenta buscar_normas para pesquisar por palavras-chave na ementa ou verificar_vigencia para consultar o grafo regulat\xF3rio."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  encontrada: true,
                  norma
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var verificarVigenciaSchema = {
  id: z.string().describe(
    'Identificador da norma para verifica\xE7\xE3o de vig\xEAncia (ex: "DCP 108/2025", "RDC 658/2022", "RDC 153/2017")'
  )
};
function registerVerificarVigenciaTool(server, dbProvider) {
  server.tool(
    "verificar_vigencia",
    "Verifica se uma norma regulat\xF3ria da Anvisa est\xE1 VIGENTE ou REVOGADA, identificando o ato revogador e o hist\xF3rico de refer\xEAncias no grafo regulat\xF3rio.",
    verificarVigenciaSchema,
    async (args) => {
      try {
        const resultado = await dbProvider.verificarVigencia(args.id);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(resultado, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao verificar vig\xEAncia da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var consultarRelacoesSchema = {
  id: z.string().describe(
    'Identificador da norma para consulta de relacionamentos no grafo (ex: "ACM 1/2025", "RDC 1039/2026", "RDC 153/2017")'
  ),
  direcao: z.enum(["todas", "saida", "entrada"]).default("todas").describe(
    'Dire\xE7\xE3o das rela\xE7\xF5es no grafo: "saida" (atos referenciados por esta norma), "entrada" (atos que referenciam esta norma) ou "todas"'
  ),
  tipo_relacao: z.enum(["todas", "cita", "baseada_em"]).default("todas").describe(
    'Filtro por tipo de rela\xE7\xE3o regulat\xF3ria: "cita", "baseada_em" ou "todas"'
  )
};
function registerConsultarRelacoesTool(server, dbProvider) {
  server.tool(
    "consultar_relacoes",
    "Navega no grafo de rela\xE7\xF5es regulat\xF3rias da Anvisa, identificando fundamentos jur\xEDdicos (leis de base), normas citadas e normas que referenciam o ato.",
    consultarRelacoesSchema,
    async (args) => {
      try {
        const resultado = await dbProvider.consultarRelacoes(
          args.id,
          args.direcao,
          args.tipo_relacao
        );
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(
                {
                  norma: resultado.norma,
                  total_saida: resultado.relacoesSaida.length,
                  total_entrada: resultado.relacoesEntrada.length,
                  relacoes_saida: resultado.relacoesSaida,
                  relacoes_entrada: resultado.relacoesEntrada
                },
                null,
                2
              )
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao consultar rela\xE7\xF5es da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterEstatisticasSchema = {
  tipo: z.string().optional().describe(
    'Sigla de um tipo de ato regulat\xF3rio para recorte estat\xEDstico espec\xEDfico (ex: "RDC", "IN", "PORTARIA", "RE")'
  )
};
function registerObterEstatisticasTool(server, dbProvider) {
  server.tool(
    "obter_estatisticas",
    "Retorna dados estat\xEDsticos consolidados do acervo regulat\xF3rio da Anvisa: total geral de normas, contagem de vigentes vs revogadas, total de arestas no grafo e distribui\xE7\xE3o por tipo de ato.",
    obterEstatisticasSchema,
    async (args) => {
      try {
        const stats = await dbProvider.obterEstatisticas(args.tipo);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(stats, null, 2)
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter estat\xEDsticas: ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}
var obterTextoNormaSchema = {
  id: z.string().describe(
    'Identificador oficial da norma cujo texto integral deve ser recuperado (ex: "RDC 958/2024", "DCP 108/2025")'
  ),
  limite_caracteres: z.number().int().min(100).max(5e5).optional().describe(
    "Limite m\xE1ximo de caracteres a retornar para proteger a janela de contexto de modelos menores (opcional)"
  )
};
function registerObterTextoNormaTool(server, dbProvider) {
  server.tool(
    "obter_texto_norma",
    "Recupera o texto integral da norma da Anvisa em formato Markdown original, permitindo leitura completa de artigos, par\xE1grafos, incisos e anexos.",
    obterTextoNormaSchema,
    async (args) => {
      try {
        const texto = await dbProvider.obterTextoNorma(
          args.id,
          args.limite_caracteres
        );
        if (!texto) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify(
                  {
                    encontrado: false,
                    mensagem: `Texto integral da norma '${args.id}' n\xE3o foi localizado no acervo consolidado.`,
                    sugestao: "A norma pode ser externa (como Leis Federais) ou ato hist\xF3rico anterior ao per\xEDodo de consolida\xE7\xE3o completa. Use verificar_vigencia ou consultar_relacoes para verificar refer\xEAncias no grafo."
                  },
                  null,
                  2
                )
              }
            ]
          };
        }
        return {
          content: [
            {
              type: "text",
              text: texto
            }
          ]
        };
      } catch (error) {
        return {
          isError: true,
          content: [
            {
              type: "text",
              text: `Erro ao obter texto da norma '${args.id}': ${error?.message || String(error)}`
            }
          ]
        };
      }
    }
  );
}

// src/tools/index.ts
function registerTools(server, dbProvider) {
  registerBuscarNormasTool(server, dbProvider);
  registerObterNormaTool(server, dbProvider);
  registerVerificarVigenciaTool(server, dbProvider);
  registerConsultarRelacoesTool(server, dbProvider);
  registerObterEstatisticasTool(server, dbProvider);
  registerObterTextoNormaTool(server, dbProvider);
}
function registerResources(server, dbProvider) {
  server.resource(
    "norma-texto",
    new ResourceTemplate("normas://{+id}", { list: void 0 }),
    {
      description: "Recupera o texto integral em Markdown e metadados de uma norma da Anvisa pelo identificador URI.",
      mimeType: "text/markdown"
    },
    async (uri, { id }) => {
      const rawId = Array.isArray(id) ? id.join("/") : String(id || "");
      const decodedId = decodeURIComponent(rawId).replace(/_/g, " ");
      const texto = await dbProvider.obterTextoNorma(decodedId);
      const norma = await dbProvider.obterNorma(decodedId);
      if (!texto && !norma) {
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: "text/markdown",
              text: `# Norma '${decodedId}' n\xE3o encontrada

A norma solicitada n\xE3o foi localizada no acervo consolidado da Anvisa.`
            }
          ]
        };
      }
      let conteudo = texto || "";
      if (!conteudo && norma) {
        conteudo = `# ${norma.id}

**Ementa:** ${norma.ementa}

**Situa\xE7\xE3o:** ${norma.situacao}
**Data do Ato:** ${norma.data_ato}`;
      }
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "text/markdown",
            text: conteudo
          }
        ]
      };
    }
  );
  server.resource(
    "estatisticas-acervo",
    "normas://estatisticas",
    {
      description: "Estat\xEDsticas agregadas globais do acervo regulat\xF3rio da Anvisa em formato JSON.",
      mimeType: "application/json"
    },
    async (uri) => {
      const stats = await dbProvider.obterEstatisticas();
      return {
        contents: [
          {
            uri: uri.href,
            mimeType: "application/json",
            text: JSON.stringify(stats, null, 2)
          }
        ]
      };
    }
  );
}
function registerPrompts(server) {
  server.prompt(
    "analise_conformidade_anvisa",
    "Roteiro estruturado para an\xE1lise de conformidade e auditoria de requisitos regulat\xF3rios perante normas da Anvisa.",
    {
      tema: z.string().describe(
        'Tema, setor ou produto a ser analisado (ex: "Boas Pr\xE1ticas de Fabrica\xE7\xE3o de Medicamentos", "Rotulagem Nutricional de Alimentos", "Software como Dispositivo M\xE9dico (SaMD)")'
      ),
      normas_especificas: z.string().optional().describe(
        'Identificadores de normas conhecidas para focar a auditoria (opcional, ex: "RDC 658/2022", "IN 343/2025")'
      )
    },
    ({ tema, normas_especificas }) => {
      let promptText = `Voc\xEA \xE9 um Auditor Regulat\xF3rio S\xEAnior e Especialista em Assuntos Regulat\xF3rios da Anvisa (Ag\xEAncia Nacional de Vigil\xE2ncia Sanit\xE1ria).

`;
      promptText += `Objetivo: Conduzir uma An\xE1lise de Conformidade Regulat\xF3ria Sanit\xE1ria completa sobre o seguinte tema:
`;
      promptText += `**Tema:** ${tema}
`;
      if (normas_especificas) {
        promptText += `**Normas Especificadas:** ${normas_especificas}
`;
      }
      promptText += `
Passo a passo mandat\xF3ria com as ferramentas dispon\xEDveis:
`;
      promptText += `1. Utilize a ferramenta 'buscar_normas' para identificar todas as RDCs, INs e Portarias relevantes sobre '${tema}', filtrando preferencialmente por normas vigentes.
`;
      promptText += `2. Para cada norma relevante identificada (ou especificada pelo usu\xE1rio), execute 'verificar_vigencia' para assegurar que n\xE3o foram revogadas ou alteradas recentemente.
`;
      promptText += `3. Execute 'consultar_relacoes' para mapear as Leis de base que d\xE3o suporte ao regulamento e normas complementares/subsidi\xE1rias.
`;
      promptText += `4. Acesse os artigos e anexos pertinentes atrav\xE9s de 'obter_texto_norma'.
`;
      promptText += `5. Elabore um Relat\xF3rio Executivo de Conformidade contendo:
`;
      promptText += `   - Sum\xE1rio do arcabou\xE7o legal vigente aplic\xE1vel;
`;
      promptText += `   - Checklist de Requisitos Obrigat\xF3rios;
`;
      promptText += `   - Riscos Sanit\xE1rios e penalidades previstas por n\xE3o-conformidade;
`;
      promptText += `   - Recomenda\xE7\xF5es pr\xE1ticas e cronograma de adequa\xE7\xE3o.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "verificar_revogacao",
    "Investiga\xE7\xE3o detalhada da linha sucess\xF3ria, vig\xEAncia e atos revogadores de uma norma da Anvisa.",
    {
      norma_id: z.string().describe(
        'Identificador da norma a ser investigada (ex: "DCP 108/2025", "RDC 301/2019", "PORTARIA 344/1998")'
      )
    },
    ({ norma_id }) => {
      let promptText = `Voc\xEA \xE9 um Consultor Jur\xEDdico especializado em Direito Sanit\xE1rio e Regula\xE7\xE3o da Anvisa.

`;
      promptText += `Objetivo: Investigar exaustivamente o status de vig\xEAncia, hist\xF3rico e eventual sucess\xE3o do seguinte ato normativo:
`;
      promptText += `**Norma:** ${norma_id}

`;
      promptText += `Procedimento obrigat\xF3rio utilizando as ferramentas do AnvisaNormas MCP:
`;
      promptText += `1. Execute 'verificar_vigencia' para '${norma_id}' para obter a situa\xE7\xE3o cadastral formal (vigente vs revogada) e identificar men\xE7\xF5es a ato revogador.
`;
      promptText += `2. Execute 'obter_norma' para examinar as datas de publica\xE7\xE3o no DOU, promulga\xE7\xE3o e ementa oficial.
`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='todas' para inspecionar todas as arestas do grafo regulat\xF3rio (normas que citam ou s\xE3o citadas por este ato).
`;
      promptText += `4. Caso a norma esteja revogada ou substitua ato anterior, recupere o texto integral do ato revogador com 'obter_texto_norma' para confirmar o alcance da revoga\xE7\xE3o (total ou parcial).
`;
      promptText += `5. Apresente um Parecer de Vig\xEAncia claro indicando: status atual, linha do tempo sucess\xF3ria e o dispositivo atualmente em vigor.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
  server.prompt(
    "analisar_impacto_regulatorio",
    "Mapeamento de efeito cascata e depend\xEAncias normativas atrav\xE9s da navega\xE7\xE3o no grafo de rela\xE7\xF5es.",
    {
      norma_id: z.string().describe(
        'Identificador da norma central para an\xE1lise de impacto (ex: "RDC 658/2022", "RDC 958/2024", "ACM 1/2025")'
      )
    },
    ({ norma_id }) => {
      let promptText = `Voc\xEA \xE9 um Analista de Pol\xEDticas P\xFAblicas e Impacto Regulat\xF3rio (AIR) da Anvisa.

`;
      promptText += `Objetivo: Mapear o Efeito Cascata e o Grafo de Depend\xEAncias Normativas gerado a partir do seguinte ato regulat\xF3rio:
`;
      promptText += `**Norma de Refer\xEAncia:** ${norma_id}

`;
      promptText += `Roteiro anal\xEDtico:
`;
      promptText += `1. Execute 'obter_norma' para '${norma_id}' para compreender seu escopo e categoria.
`;
      promptText += `2. Execute 'consultar_relacoes' com direcao='saida' para verificar quais leis federais e normas estruturantes fundamentam este ato (baseada_em / cita).
`;
      promptText += `3. Execute 'consultar_relacoes' com direcao='entrada' para verificar quais normas, instru\xE7\xF5es normativas ou decis\xF5es posteriores foram criadas com base nela.
`;
      promptText += `4. Para os n\xF3s mais cr\xEDticos conectados no grafo, consulte 'verificar_vigencia'.
`;
      promptText += `5. Conclua com uma Matriz de Impacto Regulat\xF3rio, destacando o grau de acoplamento do setor com esta norma e o risco sist\xEAmico de eventuais altera\xE7\xF5es.
`;
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: promptText
            }
          }
        ]
      };
    }
  );
}

// src/server.ts
function createAnvisaMcpServer(dbProvider) {
  const server = new McpServer(
    {
      name: "anvisa-normas-mcp",
      version: "1.0.0"
    },
    {
      capabilities: {
        tools: {},
        resources: {},
        prompts: {},
        logging: {}
      }
    }
  );
  registerTools(server, dbProvider);
  registerResources(server, dbProvider);
  registerPrompts(server);
  return server;
}

// src/bin/sse.ts
var configuredKeys = (process.env.MCP_API_KEY || "").split(",").map((k) => k.trim()).filter((k) => k.length > 0);
var isAuthEnabled = configuredKeys.length > 0;
function isValidApiKey(providedKey, validKeys) {
  const provBuf = Buffer.from(providedKey);
  for (const validKey of validKeys) {
    const validBuf = Buffer.from(validKey);
    if (provBuf.length === validBuf.length && timingSafeEqual(provBuf, validBuf)) {
      return true;
    }
  }
  return false;
}
function extractApiKey(req) {
  const authHeader = req.headers["authorization"];
  if (authHeader) {
    const parts = authHeader.split(" ");
    if (parts.length === 2 && /^bearer$/i.test(parts[0])) {
      return parts[1].trim();
    }
    return authHeader.trim();
  }
  const customHeader = req.headers["x-api-key"] || req.headers["mcp-api-key"];
  if (customHeader) {
    return customHeader.trim();
  }
  const queryKey = req.query.apiKey || req.query.api_key || req.query.key;
  if (queryKey) {
    return queryKey.trim();
  }
  return null;
}
async function main() {
  console.error("[anvisa-normas-mcp-web] Inicializando servidor Web/SSE MCP AnvisaNormas...");
  if (isAuthEnabled) {
    console.error(
      `[anvisa-normas-mcp-web] \u{1F512} Autentica\xE7\xE3o MCP ATIVADA com ${configuredKeys.length} chave(s) autorizada(s).`
    );
  } else {
    console.error(
      "[anvisa-normas-mcp-web] \u26A0\uFE0F AVISO: Autentica\xE7\xE3o MCP DESATIVADA (vari\xE1vel MCP_API_KEY n\xE3o configurada). Servidor aberto."
    );
  }
  const app = express();
  app.use(cors());
  let isReady = false;
  let initError = null;
  const dbPath = resolveDbPath();
  const dbProvider = new SqlJsDatabaseProvider(dbPath);
  const authenticatedSessions = /* @__PURE__ */ new Set();
  const authMiddleware = (req, res, next) => {
    if (!isAuthEnabled) {
      return next();
    }
    const sessionId = req.headers["mcp-session-id"] || req.query.sessionId;
    if (sessionId && authenticatedSessions.has(sessionId)) {
      return next();
    }
    const key = extractApiKey(req);
    if (key && isValidApiKey(key, configuredKeys)) {
      if (sessionId) {
        authenticatedSessions.add(sessionId);
      }
      return next();
    }
    res.status(401).json({
      error: "Unauthorized",
      message: "Acesso negado: chave de autentica\xE7\xE3o MCP_API_KEY ausente ou inv\xE1lida.",
      docs: 'Forne\xE7a a chave via header "Authorization: Bearer <key>", "x-api-key: <key>" ou query parameter "?apiKey=<key>".'
    });
  };
  const initPromise = (async () => {
    try {
      console.error(`[anvisa-normas-mcp-web] Carregando banco de dados: ${dbPath}`);
      await dbProvider.init();
      isReady = true;
      console.error("[anvisa-normas-mcp-web] Banco SQLite carregado em mem\xF3ria com sucesso.");
    } catch (err) {
      initError = err;
      console.error("[anvisa-normas-mcp-web] Erro ao carregar banco SQLite:", err);
    }
  })();
  const ensureReady = async (_req, res, next) => {
    if (!isReady) {
      if (initError) {
        res.status(500).json({ error: "Falha interna na inicializa\xE7\xE3o do acervo regulat\xF3rio." });
        return;
      }
      await initPromise;
    }
    next();
  };
  const streamableSessions = /* @__PURE__ */ new Map();
  const handleStreamableRequest = async (req, res) => {
    try {
      const sessionId = req.headers["mcp-session-id"];
      let transport = sessionId ? streamableSessions.get(sessionId) : null;
      if (!transport) {
        const newSessionId = randomUUID();
        authenticatedSessions.add(newSessionId);
        transport = new StreamableHTTPServerTransport({
          sessionIdGenerator: () => newSessionId,
          onsessionclosed: (id) => {
            streamableSessions.delete(id);
            authenticatedSessions.delete(id);
          }
        });
        const server = createAnvisaMcpServer(dbProvider);
        await server.connect(transport);
        streamableSessions.set(newSessionId, transport);
      }
      await transport.handleRequest(req, res);
    } catch (err) {
      console.error("[anvisa-normas-mcp-web] Erro no Streamable HTTP:", err);
      if (!res.headersSent) {
        res.status(500).json({ error: err?.message || "Internal Server Error" });
      }
    }
  };
  app.get("/health", (_req, res) => {
    res.json({
      status: isReady ? "healthy" : "initializing",
      ready: isReady,
      auth_required: isAuthEnabled,
      name: "anvisa-normas-mcp",
      description: "Servidor MCP Oficial do acervo de normas da Anvisa",
      version: "1.0.0"
    });
  });
  app.get("/", (req, res, next) => {
    if (req.headers.accept?.includes("text/event-stream")) {
      return authMiddleware(
        req,
        res,
        () => ensureReady(req, res, () => handleStreamableRequest(req, res))
      );
    }
    res.json({
      status: isReady ? "healthy" : "initializing",
      ready: isReady,
      auth_required: isAuthEnabled,
      name: "anvisa-normas-mcp",
      description: "Servidor MCP Oficial do acervo de normas da Anvisa",
      version: "1.0.0",
      endpoints: {
        streamableHttp: "/mcp",
        sse: "/sse",
        health: "/health"
      }
    });
  });
  app.all("/mcp", authMiddleware, ensureReady, handleStreamableRequest);
  app.post("/", authMiddleware, ensureReady, handleStreamableRequest);
  app.post("/sse", authMiddleware, ensureReady, handleStreamableRequest);
  const sseTransports = /* @__PURE__ */ new Map();
  app.get("/sse", authMiddleware, ensureReady, async (req, res) => {
    console.error(`[anvisa-normas-mcp-web] Nova conex\xE3o SSE autorizada de ${req.ip}`);
    try {
      const transport = new SSEServerTransport("/messages", res);
      const sessionId = transport.sessionId;
      sseTransports.set(sessionId, transport);
      authenticatedSessions.add(sessionId);
      transport.onclose = () => {
        console.error(`[anvisa-normas-mcp-web] Conex\xE3o SSE encerrada (sess\xE3o ${sessionId})`);
        sseTransports.delete(sessionId);
        authenticatedSessions.delete(sessionId);
      };
      const server = createAnvisaMcpServer(dbProvider);
      await server.connect(transport);
      console.error(`[anvisa-normas-mcp-web] Sess\xE3o SSE iniciada com sucesso (sess\xE3o ${sessionId})`);
    } catch (err) {
      console.error("[anvisa-normas-mcp-web] Erro ao iniciar conex\xE3o SSE:", err);
      if (!res.headersSent) {
        res.status(500).send("Internal Server Error");
      }
    }
  });
  app.post("/messages", authMiddleware, ensureReady, async (req, res) => {
    const sessionId = req.query.sessionId;
    if (!sessionId) {
      res.status(400).json({ error: "sessionId query parameter is required" });
      return;
    }
    const transport = sseTransports.get(sessionId);
    if (!transport) {
      res.status(404).json({ error: `Session not found: ${sessionId}` });
      return;
    }
    try {
      await transport.handlePostMessage(req, res);
    } catch (err) {
      console.error(`[anvisa-normas-mcp-web] Erro ao processar mensagem na sess\xE3o ${sessionId}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ error: "Failed to process message" });
      }
    }
  });
  const port = process.env.PORT ? parseInt(process.env.PORT, 10) : 8080;
  const host = "0.0.0.0";
  const httpServer = app.listen(port, host, () => {
    console.error(`[anvisa-normas-mcp-web] Servidor Web MCP escutando em http://${host}:${port}`);
    console.error(`[anvisa-normas-mcp-web] Endpoint SSE dispon\xEDvel em: http://${host}:${port}/sse`);
    console.error(`[anvisa-normas-mcp-web] Endpoint Streamable HTTP dispon\xEDvel em: http://${host}:${port}/mcp`);
  });
  const shutdown = async (signal) => {
    console.error(`[anvisa-normas-mcp-web] Encerrando servidor HTTP (sinal ${signal})...`);
    httpServer.close(async () => {
      try {
        await dbProvider.close();
        console.error("[anvisa-normas-mcp-web] Servidor encerrado com sucesso.");
        process.exit(0);
      } catch (err) {
        console.error("[anvisa-normas-mcp-web] Erro durante o encerramento:", err);
        process.exit(1);
      }
    });
  };
  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}
main().catch((error) => {
  console.error("[anvisa-normas-mcp-web] Falha fatal ao iniciar o servidor Web MCP:", error);
  process.exit(1);
});
//# sourceMappingURL=sse.js.map
//# sourceMappingURL=sse.js.map