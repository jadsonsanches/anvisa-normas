---
name: anv-auditoria-integridade
description: Procedimento para auditoria de integridade do acervo normativo da Anvisa, verificando encoding (mojibake), schema do frontmatter YAML, links órfãos e consistência sintática dos scripts.
---

# Skill: Auditoria e Integridade do Acervo

Esta skill define os testes e verificações de qualidade aplicados aos dados coletados e ao código da aplicação.

## 1. Verificações Rápidas

Execute os comandos de integridade padrão do repositório:

```bash
# 1. Valida a sintaxe JavaScript de todos os scripts
npm run test:syntax

# 2. Executa a suíte de testes unitários do Node.js
npm test

# 3. Executa o ciclo completo de reconstrução e integridade
npm run test:integrity
```

---

## 2. Auditoria de Encoding e Mojibake

Arquivos do Datalegis frequentemente usam ISO-8859-1 (Latin1) e podem ser corrompidos se não forem decodificados corretamente.

Para auditar se há caracteres corrompidos em `data/normas/`:
```bash
node -e "
const fs = require('fs');
const path = require('path');

function checkDir(dir) {
  for (const item of fs.readdirSync(dir)) {
    const full = path.join(dir, item);
    if (fs.statSync(full).isDirectory()) checkDir(full);
    else if (full.endsWith('.md')) {
      const content = fs.readFileSync(full, 'utf8');
      if (content.includes('\uFFFD') || /[\xC0-\xDF][\x80-\xBF]/.test(content) && content.includes('Ã')) {
        console.warn('[ALERTA DE ENCODING]:', full);
      }
    }
  }
}
checkDir('data/normas');
console.log('Auditoria de encoding concluída!');
"
```

---

## 3. Auditoria de Frontmatter e Schema

Garantir que todo arquivo `.md` contenha:
- `tipo`, `numero`, `ano`, `data`, `situacao`, `ementa`, `fonte` preenchidos;
- Listas de relacionamento (`revoga`, `revogada_por`, `altera`, `leis_base`, `relacionadas`) estruturadas como arrays;
- Ausência de tags HTML ou classes remanescentes de UI do Datalegis na ementa ou corpo.

---

## 4. Auditoria de Colisões e Órfãos no Grafo

Após rodar `node scripts/grafo.js`, inspecione `data/grafo/estatisticas.json`:
- Confirmar total de nós e arestas ativas;
- Verificar se a proporção de normas vigentes vs revogadas está coerente;
- Verificar se existem nós criados com nomes duplicados ou grafias inconsistentes (ex: `RDC-0834` vs `RDC-834`).
