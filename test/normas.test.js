const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

function listarArquivosMarkdown(dir) {
  let resultados = [];
  if (!fs.existsSync(dir)) return resultados;
  const entradas = fs.readdirSync(dir, { withFileTypes: true });
  for (const entrada of entradas) {
    const caminhoCompleto = path.join(dir, entrada.name);
    if (entrada.isDirectory()) {
      resultados = resultados.concat(listarArquivosMarkdown(caminhoCompleto));
    } else if (entrada.name.endsWith('.md')) {
      resultados.push(caminhoCompleto);
    }
  }
  return resultados;
}

test('Integridade e validação de YAML frontmatter em todos os arquivos Markdown de data/normas/', () => {
  const dirNormas = path.resolve(__dirname, '../data/normas');
  const arquivos = listarArquivosMarkdown(dirNormas);

  assert(arquivos.length > 0, 'O repositório deve conter arquivos de normas em data/normas/');

  for (const arquivo of arquivos) {
    const relPath = path.relative(path.resolve(__dirname, '..'), arquivo);
    const conteudo = fs.readFileSync(arquivo, 'utf8');

    const matchFrontmatter = conteudo.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    assert(matchFrontmatter, `Arquivo ${relPath} não possui delimitadores YAML frontmatter válidos`);

    const yamlTexto = matchFrontmatter[1];
    assert(yamlTexto.includes('tipo:'), `Propriedade 'tipo' ausente no frontmatter de ${relPath}`);
    assert(yamlTexto.includes('numero:'), `Propriedade 'numero' ausente no frontmatter de ${relPath}`);
    assert(yamlTexto.includes('ano:'), `Propriedade 'ano' ausente no frontmatter de ${relPath}`);
    assert(yamlTexto.includes('situacao:'), `Propriedade 'situacao' ausente no frontmatter de ${relPath}`);
  }
});
