import * as fs from 'fs';
import * as path from 'path';
import initSqlJs, { Database, SqlJsStatic } from 'sql.js';
import { DatabaseProvider } from './provider.js';
import { resolveDbPath, resolveDataDir } from '../config.js';
import {
  NormaRegistro,
  EstatisticasAcervo,
  EstatisticasPorTipo,
  VigenciaInfo,
  RelacoesInfo,
  FiltrosBusca,
} from '../types/index.js';

/**
 * Remove acentuação e converte para minúsculas (para busca tolerante a acentos em português)
 */
export function unaccent(str: string): string {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

/**
 * Normaliza referências informais para o padrão canônico (ex: 'rdc nº 658/2022' -> 'RDC 658/2022')
 */
export function normalizeId(id: string): string {
  if (!id) return '';
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

export class SqlJsDatabaseProvider implements DatabaseProvider {
  private db: Database | null = null;
  private dbPath: string;
  private isInitialized = false;

  constructor(customDbPath?: string) {
    this.dbPath = customDbPath || resolveDbPath();
  }

  async init(): Promise<void> {
    if (this.isInitialized && this.db) {
      return;
    }

    if (!fs.existsSync(this.dbPath)) {
      throw new Error(
        `Banco de dados SQLite consolidado da Anvisa não foi encontrado em: ${this.dbPath}`
      );
    }

    const fileBuffer = fs.readFileSync(this.dbPath);
    const SQL: SqlJsStatic = await initSqlJs();
    this.db = new SQL.Database(fileBuffer);

    // Registra a UDF unaccent(str) no SQLite para busca tolerante a acentuação
    this.db.create_function('unaccent', (str: string) => unaccent(str));

    // Cria índices em memória para consultas instantâneas (< 1ms)
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

  private checkDb(): Database {
    if (!this.db || !this.isInitialized) {
      throw new Error(
        'DatabaseProvider não inicializado. Chame await provider.init() antes de executar operações.'
      );
    }
    return this.db;
  }

  async close(): Promise<void> {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
    this.isInitialized = false;
  }

  async buscarNormas(
    filtros: FiltrosBusca
  ): Promise<Omit<NormaRegistro, 'texto_markdown'>[]> {
    const db = this.checkDb();
    const conditions: string[] = [];
    const params: Record<string, string | number> = {};

    const termo = filtros.termo || filtros.query;
    if (termo && termo.trim()) {
      const normTerm = unaccent(termo.trim());
      conditions.push('(unaccent(ementa) LIKE :termo OR unaccent(id) LIKE :termo)');
      params[':termo'] = `%${normTerm}%`;
    }

    if (filtros.tipo && filtros.tipo.trim()) {
      conditions.push('UPPER(tipo) = :tipo');
      params[':tipo'] = filtros.tipo.trim().toUpperCase();
    }

    if (filtros.ano) {
      conditions.push('ano = :ano');
      params[':ano'] = Number(filtros.ano);
    }

    if (filtros.situacao) {
      conditions.push('situacao = :situacao');
      params[':situacao'] = filtros.situacao.toLowerCase();
    }

    if (filtros.data && filtros.data.trim()) {
      let dataFmt = filtros.data.trim();
      const isoMatch = dataFmt.match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (isoMatch) {
        dataFmt = `${isoMatch[3]}/${isoMatch[2]}/${isoMatch[1]}`;
      }
      conditions.push('(data_publicacao_dou = :data OR data_ato = :data OR data_promulgacao = :data)');
      params[':data'] = dataFmt;
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const limite = Math.min(Math.max(filtros.limite || 20, 1), 100);

    const orderClause = filtros.ordenar_por === 'id'
      ? 'ORDER BY ano DESC, id DESC'
      : `ORDER BY 
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

    const resultados: Omit<NormaRegistro, 'texto_markdown'>[] = [];
    while (stmt.step()) {
      resultados.push(stmt.getAsObject() as unknown as Omit<NormaRegistro, 'texto_markdown'>);
    }
    stmt.free();

    return resultados;
  }

  async obterNorma(
    id: string
  ): Promise<Omit<NormaRegistro, 'texto_markdown'> | null> {
    const db = this.checkDb();
    if (!id || !id.trim()) return null;

    const trimmed = id.trim();
    const normalized = normalizeId(trimmed);

    // 1. Busca exata por ID canônico
    let stmt = db.prepare(`
      SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
             situacao, ementa, leis_base, relacionadas, arquivo, fonte
      FROM normas WHERE id = :id
    `);
    stmt.bind({ ':id': trimmed });
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as Omit<NormaRegistro, 'texto_markdown'>;
      stmt.free();
      return row;
    }
    stmt.free();

    // 2. Busca por ID normalizado
    if (normalized !== trimmed) {
      stmt = db.prepare(`
        SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
               situacao, ementa, leis_base, relacionadas, arquivo, fonte
        FROM normas WHERE id = :id
      `);
      stmt.bind({ ':id': normalized });
      if (stmt.step()) {
        const row = stmt.getAsObject() as unknown as Omit<NormaRegistro, 'texto_markdown'>;
        stmt.free();
        return row;
      }
      stmt.free();
    }

    // 3. Busca insensível a maiúsculas/espaços
    stmt = db.prepare(`
      SELECT id, tipo, numero, ano, data_ato, data_promulgacao, data_publicacao_dou,
             situacao, ementa, leis_base, relacionadas, arquivo, fonte
      FROM normas WHERE UPPER(TRIM(id)) = :id
    `);
    stmt.bind({ ':id': trimmed.toUpperCase() });
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as Omit<NormaRegistro, 'texto_markdown'>;
      stmt.free();
      return row;
    }
    stmt.free();

    return null;
  }

  async obterTextoNorma(
    id: string,
    limiteCaracteres?: number
  ): Promise<string | null> {
    const db = this.checkDb();
    if (!id || !id.trim()) return null;

    const trimmed = id.trim();
    const normalized = normalizeId(trimmed);

    const stmt = db.prepare(`
      SELECT texto_markdown, arquivo FROM normas
      WHERE id = :id OR id = :normId OR UPPER(TRIM(id)) = :upperId
    `);
    stmt.bind({
      ':id': trimmed,
      ':normId': normalized,
      ':upperId': trimmed.toUpperCase(),
    });

    let texto: string | null = null;
    let arquivo: string | null = null;

    if (stmt.step()) {
      const row = stmt.getAsObject();
      texto = (row.texto_markdown as string) || null;
      arquivo = (row.arquivo as string) || null;
    }
    stmt.free();

    // Fallback: se o banco não contiver texto, lê do arquivo markdown no disco
    if ((!texto || !texto.trim()) && arquivo) {
      const fullPath = path.resolve(resolveDataDir(), '..', arquivo);
      if (fs.existsSync(fullPath)) {
        try {
          texto = fs.readFileSync(fullPath, 'utf8');
        } catch {
          // Mantém null se falhar a leitura
        }
      }
    }

    if (!texto) {
      return null;
    }

    if (limiteCaracteres && limiteCaracteres > 0 && texto.length > limiteCaracteres) {
      const originalLen = texto.length;
      texto =
        texto.slice(0, limiteCaracteres) +
        `\n\n... [Texto truncado no limite de ${limiteCaracteres} caracteres. Total original: ${originalLen} caracteres]`;
    }

    return texto;
  }

  async verificarVigencia(id: string): Promise<VigenciaInfo> {
    const db = this.checkDb();
    if (!id || !id.trim()) {
      return {
        id: '',
        situacao: 'desconhecida',
        detalhes: 'Identificador de norma não informado.',
      };
    }

    const norma = await this.obterNorma(id);

    if (norma) {
      const canonicalId = norma.id;
      const isRevogada = norma.situacao === 'revogada';

      if (isRevogada) {
        let atoRevogador: string | undefined;

        // Procura menção ao ato revogador no início do texto markdown
        const stmtText = db.prepare(
          'SELECT texto_markdown FROM normas WHERE id = :id'
        );
        stmtText.bind({ ':id': canonicalId });
        if (stmtText.step()) {
          const fullText =
            (stmtText.getAsObject().texto_markdown as string) || '';
          const match =
            fullText.match(/Revogada pela?\s+\[([^\]]+)\]/i) ||
            fullText.match(/Revogada pela?\s+([^\n\r.]+)/i);
          if (match) {
            atoRevogador = match[1].trim();
          }
        }
        stmtText.free();

        // Procura relações no grafo onde a norma foi citada ou revogada
        const stmtRel = db.prepare(
          'SELECT origem, tipo_relacao FROM relacoes WHERE destino = :id'
        );
        stmtRel.bind({ ':id': canonicalId });
        const historico: string[] = [];
        while (stmtRel.step()) {
          const r = stmtRel.getAsObject();
          historico.push(`Referenciada por ${r.origem} (${r.tipo_relacao})`);
        }
        stmtRel.free();

        return {
          id: canonicalId,
          situacao: 'revogada',
          detalhes: atoRevogador
            ? `Norma revogada. Ato revogador identificado: ${atoRevogador}.`
            : 'Norma revogada conforme cadastro oficial da Anvisa.',
          atoRevogador,
          historico: historico.length > 0 ? historico : undefined,
        };
      } else {
        return {
          id: canonicalId,
          situacao: 'vigente',
          detalhes:
            'Norma vigente no acervo regulatório da Anvisa sem registros de revogação.',
        };
      }
    }

    // Se não encontrada na tabela de normas, verifica se consta no grafo de relações
    const normalized = normalizeId(id);
    const stmtGrafo = db.prepare(`
      SELECT origem, tipo_relacao FROM relacoes
      WHERE destino = :id OR destino = :normId
    `);
    stmtGrafo.bind({ ':id': id.trim(), ':normId': normalized });
    const citacoes: string[] = [];
    while (stmtGrafo.step()) {
      const r = stmtGrafo.getAsObject();
      citacoes.push(`${r.origem} (${r.tipo_relacao})`);
    }
    stmtGrafo.free();

    if (citacoes.length > 0) {
      return {
        id: normalized,
        situacao: 'desconhecida',
        detalhes: `A norma '${normalized}' não possui texto integral consolidado na base principal local, mas consta no grafo regulatório sendo referenciada por ${citacoes.length} ato(s).`,
        historico: citacoes,
      };
    }

    return {
      id: normalized || id,
      situacao: 'desconhecida',
      detalhes: `Norma '${id}' não foi localizada no cadastro nem no grafo regulatório da Anvisa.`,
    };
  }

  async consultarRelacoes(
    id: string,
    direcao: 'todas' | 'saida' | 'entrada' = 'todas',
    tipoRelacao: string = 'todas'
  ): Promise<RelacoesInfo> {
    const db = this.checkDb();
    const normalized = normalizeId(id);
    let targetId = normalized;

    const norma = await this.obterNorma(id);
    if (norma) {
      targetId = norma.id;
    }

    const relacoesSaida: { destino: string; tipo: string }[] = [];
    const relacoesEntrada: { origem: string; tipo: string }[] = [];

    const filtrarTipo = tipoRelacao && tipoRelacao !== 'todas';

    // Relações de saída (origem = targetId)
    if (direcao === 'todas' || direcao === 'saida') {
      let sql = 'SELECT destino, tipo_relacao FROM relacoes WHERE origem = :id';
      if (filtrarTipo) {
        sql += ' AND tipo_relacao = :tipoRelacao';
      }
      const stmt = db.prepare(sql);
      const params: Record<string, string> = { ':id': targetId };
      if (filtrarTipo) {
        params[':tipoRelacao'] = tipoRelacao;
      }
      stmt.bind(params);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        relacoesSaida.push({
          destino: r.destino as string,
          tipo: r.tipo_relacao as string,
        });
      }
      stmt.free();
    }

    // Relações de entrada (destino = targetId)
    if (direcao === 'todas' || direcao === 'entrada') {
      let sql = 'SELECT origem, tipo_relacao FROM relacoes WHERE destino = :id';
      if (filtrarTipo) {
        sql += ' AND tipo_relacao = :tipoRelacao';
      }
      const stmt = db.prepare(sql);
      const params: Record<string, string> = { ':id': targetId };
      if (filtrarTipo) {
        params[':tipoRelacao'] = tipoRelacao;
      }
      stmt.bind(params);
      while (stmt.step()) {
        const r = stmt.getAsObject();
        relacoesEntrada.push({
          origem: r.origem as string,
          tipo: r.tipo_relacao as string,
        });
      }
      stmt.free();
    }

    return {
      norma: targetId,
      relacoesSaida,
      relacoesEntrada,
    };
  }

  async obterEstatisticas(
    tipo?: string
  ): Promise<EstatisticasAcervo | EstatisticasPorTipo> {
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
      stmt.bind({ ':tipo': normTipo });
      stmt.step();
      const res = stmt.getAsObject();
      stmt.free();

      return {
        tipo: normTipo,
        total: Number(res.total || 0),
        vigentes: Number(res.vigentes || 0),
        revogadas: Number(res.revogadas || 0),
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
      'SELECT COUNT(*) as totalRelacoes FROM relacoes'
    );
    stmtRel.step();
    const rRes = stmtRel.getAsObject();
    stmtRel.free();

    const stmtTipos = db.prepare(
      'SELECT tipo, COUNT(*) as qtd FROM normas GROUP BY tipo ORDER BY qtd DESC'
    );
    const porTipo: Record<string, number> = {};
    while (stmtTipos.step()) {
      const row = stmtTipos.getAsObject();
      porTipo[row.tipo as string] = Number(row.qtd);
    }
    stmtTipos.free();

    return {
      totalNormas: Number(gRes.totalNormas || 0),
      vigentes: Number(gRes.vigentes || 0),
      revogadas: Number(gRes.revogadas || 0),
      totalRelacoes: Number(rRes.totalRelacoes || 0),
      porTipo,
    };
  }
}
