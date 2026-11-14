---
name: anv-coleta-e-ingestao
description: Procedimento operacional para coleta e ingestão de normas da Anvisa via Datalegis. Suporta coleta por data específica, mês fechado, período customizado, ano ou acervo histórico completo.
---

# Skill: Coleta e Ingestão de Normas da Anvisa

Esta skill orienta a execução segura e idempotente das rotinas de coleta do acervo normativo da Anvisa.

## 1. Comandos de Coleta

O orquestrador principal é o script `scripts/pipeline.js` (ou diretamente `scripts/scraper.js`).

### A. Coleta por Data Específica (ex: 01 de Outubro de 2026)
Para baixar os atos publicados em um único dia:
```bash
node scripts/pipeline.js --data 01/10/2026
```
*(Se quiser forçar re-download mesmo se os arquivos já existirem localmente, adicione a flag `--force`)*:
```bash
node scripts/pipeline.js --data 01/10/2026 --force
```

### B. Coleta de um Mês Inteiro (ex: Outubro de 2026)
Para varrer todos os dias do mês:
```bash
node scripts/pipeline.js --mes 10/2026
```
Também aceita formato ISO:
```bash
node scripts/pipeline.js --mes 2026-10
```

### C. Coleta por Período Customizado
Para coletar um intervalo entre duas datas:
```bash
node scripts/pipeline.js --periodo 01/10/2026 15/10/2026
```

### D. Coleta por Ano (Resenha Anual do Datalegis)
Para buscar pela resenha do ano completo:
```bash
node scripts/pipeline.js --ano 2024
```

### E. Coleta Histórica Completa (1999 até o ano atual)
```bash
node scripts/pipeline.js --full
```

---

## 2. Checklist Pós-Coleta

Sempre que concluir uma coleta:
1. **Verificar novos arquivos criados:**
   - Conferir se os arquivos foram salvos em `data/normas/{TIPO}/{ANO}/{TIPO}-{NUMERO}.md`.
2. **Validar ausência de respostas corrompidas:**
   - Conferir se o conteúdo possui frontmatter YAML válido e se o corpo contém artigos/texto normativo (e não HTML de erro 500/bloqueio ou "Sessão expirada").
3. **Sincronia automática do pipeline:**
   - Notar que o `scripts/pipeline.js` já executa automaticamente ao final:
     1. Atualização do grafo (`scripts/grafo.js`);
     2. Reconstrução do `visualizador.html`;
     3. Exportação do banco SQLite (`data/bancos/anvisa-normas.db`) e JSONs consolidados.
