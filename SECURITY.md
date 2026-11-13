# Política de Segurança — Anvisa-Normas 🛡️

A segurança e a confiabilidade do repositório **Anvisa-Normas** e dos dados nele disponibilizados são prioridades fundamentais. Levamos a sério a proteção das nossas esteiras de automação, ferramentas de compilação, bancos de dados consolidados e visualizadores públicos.

Este documento detalha as versões suportadas, o escopo de segurança, o procedimento para divulgação responsável e os prazos de resposta adotados pela equipe mantenedora.

---

## 1. Versões Suportadas

Como este projeto opera sob um modelo de integração e entrega contínua com atualizações frequentes de dados e código, apenas a versão mais recente na branch principal (`main`) recebe patches de segurança ativos:

| Versão / Branch | Suportada? | Observações |
| :--- | :--- | :--- |
| `main` (Latest) | ✅ Sim | Recebe correções ativas de segurança, patches de dependências e melhorias. |
| Tags / Commits antigos | ❌ Não | Não recebem backport de correções. Recomendamos atualizar sempre para a `main`. |

---

## 2. Escopo de Segurança

### O que é considerado uma Vulnerabilidade de Segurança:
* **Execução Arbitrária de Código ou Injeção:** Falhas nos scripts de extração e conversão (`scripts/parser.js`, `scripts/scraper.js`) que possam levar à execução indevida de código ou injeção maliciosa de comandos durante o pipeline.
* **Cross-Site Scripting (XSS):** Vetores de injeção no visualizador web interativo (`index.html` ou `visualizador.html`) ao renderizar títulos, ementas ou metadados de normas.
* **SQL Injection / Corrupção de Dados:** Falhas na construção das tabelas e comandos SQL em `scripts/exportar-bancos.js` que possam comprometer a integridade do banco SQLite (`anvisa.db`).
* **Comprometimento de CI/CD e Segredos:** Exposição não intencional de credenciais, chaves de API, tokens de acesso em workflows (`.github/workflows/`) ou logs de execução.
* **Vulnerabilidades em Dependências:** Falhas críticas identificadas nas bibliotecas listadas no `package.json` (`cheerio`, `turndown`, `sql.js`, etc.).

### O que NÃO é considerado uma Vulnerabilidade de Segurança:
* **Inconsistências em Textos Regulatórios:** Erros de digitação, grafias arcaicas ou conflitos normativos oriundos dos documentos originais publicados pela Anvisa ou no DOU (trata-se de fidelidade de dados públicos e deve ser reportado via Issue comum).
* **Mudanças Estruturais no Portal Oficial:** Alterações de layout no portal AnvisaLegis que resultem em quebra de scraping (deve ser aberto como Issue de bug comum).
* **Ataques de Negação de Serviço (DoS) contra Portais Externos:** Tentativas de esgotamento de taxa contra os servidores da Anvisa não são toleradas e constituem violação de conduta.

---

## 3. Como Reportar uma Vulnerabilidade (Divulgação Responsável)

**Por favor, NÃO reporte vulnerabilidades de segurança por meio de Issues públicas do GitHub ou discussões abertas.**

Caso você identifique uma vulnerabilidade de segurança potencial ou confirmada, solicitamos que utilize um dos canais confidenciais abaixo:

### Canal Preferencial: GitHub Private Security Advisories
1. Acesse a aba **[Security](../../security)** deste repositório no GitHub.
2. Clique na seção **Advisories** (Avisos de Segurança).
3. Selecione a opção **"Report a vulnerability"** (Reportar uma vulnerabilidade).
4. Preencha o formulário detalhado em ambiente restrito e submeta. Este canal cria uma sala de discussão privada e segura diretamente com os mantenedores.

### Canal Alternativo: Contato Direto com o Mantenedor
Se o recurso de Advisories não estiver disponível ou acessível, envie um e-mail confidencial para:
* **Responsável:** Jadson Sanches
* **E-mail:** `jadson.sanches@users.noreply.github.com` (ou mensagem direta via perfil GitHub `@jadsonsanches`)
* **Assunto:** `[SECURITY] Vulnerabilidade no repositório anvisa-normas`

---

## 4. Informações Necessárias no Relatório

Para acelerar a triagem e a resolução, inclua no seu reporte:
1. **Tipo de vulnerabilidade:** (ex: XSS refletido, injeção de dependência, exposição de credencial).
2. **Localização no código:** Arquivo(s) e linha(s) de código afetados.
3. **Passos para reprodução (Proof of Concept - PoC):** Comandos detalhados, payloads ou roteiro passo a passo.
4. **Impacto potencial:** O que um atacante poderia alcançar explorando a falha.
5. **Sugestão de mitigação:** Se você tiver uma proposta de correção (patch ou pull request privado), informe-a.

---

## 5. Prazos e Processo de Resposta

Seguimos o princípio da **Divulgação Coordenada de Vulnerabilidades (Coordinated Vulnerability Disclosure)**:
* **Confirmação de Recebimento:** O mantenedor acusará recebimento do reporte em até **48 a 72 horas úteis**.
* **Triagem e Avaliação:** Uma análise técnica inicial será concluída em até **5 dias úteis**, definindo a gravidade e o plano de ação.
* **Desenvolvimento e Teste do Patch:** A correção será desenvolvida em um fork ou branch privada.
* **Publicação e Reconhecimento:** Uma vez validada e aplicada a correção na branch `main`, será publicado um aviso de segurança (caso aplicável) e o autor do reporte receberá o devido crédito de agradecimento (se assim desejar).

Pedimos que você mantenha as informações em sigilo até que a correção esteja oficialmente disponibilizada para os usuários.

---

## 6. Boas Práticas para Consumidores dos Dados

Para desenvolvedores e cientistas de dados que integram os arquivos deste repositório em suas aplicações:
* Ao consultar o arquivo `anvisa.db` (SQLite), utilize sempre **consultas parametrizadas (Prepared Statements)** para evitar vulnerabilidades de SQL injection em suas próprias camadas de aplicação.
* Ao renderizar conteúdos Markdown ou HTML das normas em interfaces web de terceiros, utilize sanitizadores de HTML adequados (como DOMPurify) para prevenir riscos de XSS.
