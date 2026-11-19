const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const workflowsDir = path.resolve(__dirname, '../.github/workflows');
const atualizaPath = path.join(workflowsDir, 'atualiza.yml');
const ciPath = path.join(workflowsDir, 'ci.yml');

function validateWorkflowStructure(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  assert.ok(content.trim().length > 0, `${path.basename(filePath)} não pode estar vazio`);
  assert.ok(!content.includes('\t'), `${path.basename(filePath)} não pode conter caracteres TAB`);

  const lines = content.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const leadingSpaces = line.match(/^( *)/)[1].length;
    assert.equal(
      leadingSpaces % 2,
      0,
      `${path.basename(filePath)}:${i + 1} possui indentação ímpar (${leadingSpaces} espaços)`
    );
  }
  return { content, lines };
}

test('R3: .github/workflows/atualiza.yml possui YAML estruturalmente válido e timeout-minutes: 30 em atualizar-acervo', () => {
  const { content, lines } = validateWorkflowStructure(atualizaPath);

  assert.match(content, /^name:\s+.+/m);
  assert.match(content, /^on:\s*$/m);
  assert.match(content, /^jobs:\s*$/m);

  // Localiza exatamente o bloco jobs.atualizar-acervo
  const jobHeaderIdx = lines.findIndex((l) => /^  atualizar-acervo:\s*$/.test(l));
  assert.ok(jobHeaderIdx !== -1, 'Job atualizar-acervo deve estar definido sob jobs:');

  const jobBodyLines = [];
  for (let i = jobHeaderIdx + 1; i < lines.length; i++) {
    const l = lines[i];
    if (/^[^\s]/.test(l) || /^  [a-zA-Z0-9_-]+:\s*$/.test(l)) {
      break;
    }
    jobBodyLines.push(l);
  }

  const jobBody = jobBodyLines.join('\n');
  assert.match(jobBody, /^    runs-on:\s+ubuntu-latest\s*$/m);
  assert.match(jobBody, /^    timeout-minutes:\s+30\s*$/m, 'Job atualizar-acervo deve definir timeout-minutes: 30');
  assert.match(jobBody, /^    permissions:\s*$/m);
  assert.match(jobBody, /^    steps:\s*$/m);
  assert.match(jobBody, /run:\s+node scripts\/pipeline\.js/);
});

test('R3: .github/workflows/ci.yml mantém estrutura YAML válida e timeout-minutes definido', () => {
  const { content } = validateWorkflowStructure(ciPath);
  assert.match(content, /^    timeout-minutes:\s+\d+/m);
});
