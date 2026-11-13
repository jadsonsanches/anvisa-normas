## 📌 Descrição da Alteração
<!-- Descreva de forma concisa e clara o que foi modificado e qual é a motivação técnica ou de negócio desta alteração. -->


---

## 🏷️ Tipo de Mudança
<!-- Marque com um "x" as opções aplicáveis -->
- [ ] 🐛 **Correção de bug** (*bug fix*, alteração que não quebra compatibilidade e corrige um erro)
- [ ] ✨ **Nova funcionalidade** (*feature*, alteração que não quebra compatibilidade e adiciona recurso)
- [ ] 📚 **Documentação** (alterações exclusivas em README, guias, governança ou comentários)
- [ ] 🧹 **Refatoração / Estilo** (melhoria estrutural de código sem alteração funcional)
- [ ] ⚡ **Performance** (otimização de tempo de execução, scraping ou memória)
- [ ] 🤖 **CI/CD & Automação** (alterações em workflows do GitHub Actions ou pipelines)
- [ ] 📊 **Dados Normativos** (correção de metadados ou acervo de normas da Anvisa)
- [ ] 🧪 **Testes Automatizados** (novos testes unitários ou de integridade)

---

## 🎯 Escopo e Módulos Afetados
<!-- Marque as pastas/módulos que foram modificados -->
- [ ] `scripts/` (scraper, parser, grafo, exportação de bancos)
- [ ] `test/` (suíte de testes automatizados `node:test`)
- [ ] `data/normas/` (arquivos Markdown das normas)
- [ ] `data/dist/` (bancos SQLite, JSON ou CSV consolidados)
- [ ] `data/grafo/` (relacoes.json ou estatisticas.json)
- [ ] `index.html` / `visualizador.html` (interface web Canvas e busca)
- [ ] `.github/` (workflows, governança, templates)
- [ ] Outro: `[especifique aqui]`

---

## 🔗 Issues Vinculadas
<!-- Indique as issues associadas a este Pull Request (ex: Closes #123, Fixes #456) -->
- Closes #

---

## 🧪 Como foi Testado?
<!-- Descreva os comandos executados e o ambiente utilizado para validar as modificações localmente -->
1. Comandos executados:
   ```bash
   # Exemplo: npm test ou npm run test:syntax ou npm run test:integrity
   ```
2. Resultados obtidos:
   <!-- Insira evidências, logs limpos ou descrição do teste -->

---

## 🖼️ Capturas de Tela / Evidências Visuais (se aplicável)
<!-- Caso tenha modificado o visualizador web (`index.html` / `visualizador.html`), adicione capturas de tela do antes e depois -->

| Antes | Depois |
| :---: | :----: |
| *(Imagem)* | *(Imagem)* |

---

## ✅ Checklist do Autor
<!-- Marque todos os itens após verificar sua conformidade -->
- [ ] Li e segui as diretrizes do [`CONTRIBUTING.md`](../CONTRIBUTING.md).
- [ ] Minhas mensagens de commit seguem o padrão **Conventional Commits** (ex: `feat(...)`, `fix(...)`, `docs(...)`).
- [ ] Executei a suíte de testes / validações locais (`npm test`, `npm run test:syntax`, `npm run test:integrity`) com sucesso e com código de saída 0.
- [ ] Minhas alterações não geram avisos (*warnings*) de sintaxe ou erros de execução.
- [ ] Atualizei a documentação correspondente (`README.md`, comentários, etc.) se necessário.
- [ ] Minha branch local está rebaseada / sincronizada com a versão mais recente da branch `main`.
- [ ] Garanti que nenhum arquivo temporário, credencial, token ou `.env` foi incluído acidentalmente.
