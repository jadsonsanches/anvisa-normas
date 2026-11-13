# Guia de Configuração de Proteção de Branches e Rulesets no GitHub

> **Repositório:** [jadsonsanches/anvisa-normas](https://github.com/jadsonsanches/anvisa-normas)  
> **Branch Alvo:** `main`  
> **Público-alvo:** Mantenedores e Administradores do Projeto  
> **Data de Atualização:** Novembro/2026  

---

## 1. Visão Geral e Arquitetura de Segurança

A proteção da branch principal (`main`) é o pilar central de governança técnica do repositório **anvisa-normas**. Ela assegura que:
1. Nenhuma alteração seja mesclada sem validação prévia de sintaxe e integridade dos scripts (`scripts/*.js`).
2. Todo código passe por revisão através de Pull Requests com no mínimo 1 aprovação.
3. Não ocorram sobrescritas acidentais de histórico (`force push`) ou exclusões indevidas da branch.
4. Automações legítimas (como o workflow periódico de coleta `.github/workflows/atualiza.yml`) e intervenções administrativas de emergência possuam caminhos controlados e seguros de bypass.

O GitHub disponibiliza duas abordagens para essa finalidade:
* **GitHub Repository Rulesets (Moderno - Recomendado):** Arquitetura flexível e modular, suporte a múltiplos modos de aplicação (`Active`, `Evaluate`, `Disabled`), listas granulares de bypass por papéis e apps, e regras explícitas para branches e metadados.
* **GitHub Classic Branch Protection Rules (Legado):** Configuração clássica por padrão de branch, mais simples, porém com controle de bypass monolítico e menor flexibilidade para bots.

Ambas as abordagens estão disponíveis **gratuitamente** para repositórios públicos como o `anvisa-normas`. A seguir, apresentamos o passo a passo detalhado para ambas as opções, com recomendação expressa pelo uso de **Rulesets**.

---

## 2. Abordagem 1: Configuração via GitHub Repository Rulesets (Recomendada)

Os **Rulesets** são a solução oficial e moderna do GitHub para governança de código.

### 2.1. Navegação na Interface Web
1. Acesse a página principal do repositório no GitHub: `https://github.com/jadsonsanches/anvisa-normas`.
2. Clique na aba superior **Settings** (Configurações).
3. Na barra de navegação lateral esquerda, localize o bloco **Code and automation** e clique em **Rules** -> **Rulesets**.
4. No canto superior direito da página, clique no botão verde **New ruleset** e selecione a opção **New branch ruleset**.

---

### 2.2. Configuração Geral e Modo de Execução
* **Ruleset Name:** `Proteção da Branch Principal (main)`
* **Enforcement status:**
  * Selecione **Active** para aplicar imediatamente as restrições.
  * *(Dica operacional)*: Se quiser testar o impacto sem bloquear desenvolvedores, selecione temporariamente **Evaluate** para monitorar as ações antes de torná-lo ativo.

---

### 2.3. Configuração da Lista de Bypass (Bypass List)
A lista de bypass permite que determinados papéis ou automações contornem regras específicas em situações excepcionais ou de rotina programada.

1. Na seção **Bypass list**, clique no botão **Add bypass**.
2. **Para Administradores (Intervenções de Emergência e Hotfixes):**
   * Selecione **Role** -> **Repository admin**.
   * No seletor **Bypass mode**, configure:
     * `Always`: Permite que o administrador `@jadsonsanches` realize merges ou correções diretas em caso de emergência ou incidentes de produção.
     * `Only for pull requests`: Exige abertura de PR, mas permite que o administrador aprove e realize o merge sem depender de terceiros.
3. **Para Automações / Bots de Atualização:**
   * Caso o workflow `.github/workflows/atualiza.yml` continue realizando `git push` direto na `main`, é necessário garantir que a identidade do executor possua permissão de bypass. Adicione a **GitHub App** ou actor correspondente caso utilize automação corporativa, ou configure uma Fine-Grained Personal Access Token (PAT) vinculada a um admin. *(Veja a Seção 4 para detalhes operacionais de automação).*

---

### 2.4. Seleção da Branch Alvo (Target Branches)
1. Na seção **Target branches**, clique em **Add target**.
2. Selecione **Include default branch**.
   *(Opcional: você também pode selecionar **Include by pattern** e preencher `main`).*

---

### 2.5. Regras de Proteção de Branches (Branch Rules)

Marque e configure as seguintes opções:

#### A. Restrições de Operações Git Diretas
* [x] **Restrict creations:** Impede que novas branches sejam criadas diretamente violando padrões.
* [x] **Restrict updates:** Impede que a branch seja atualizada diretamente sem seguir as regras de PR.
* [x] **Restrict deletions:** Bloqueia a exclusão da branch `main` por qualquer usuário sem bypass explícito.
* [x] **Block force pushes:** Impede comandos como `git push --force` ou `git push -f`, preservando a integridade histórica dos commits.

#### B. Exigência de Pull Request antes do Merge
* [x] **Require a pull request before merging:**
  * **Required approvals:** Configure para `1` aprovação mínima.
  * [x] **Dismiss stale pull request approvals when new commits are pushed:** Marque esta opção. Sempre que um autor adicionar novos commits a um PR já aprovado, a aprovação é invalidada, exigindo nova revisão do código.
  * [x] **Require review from Code Owners:** Marque esta opção. Vincula a aprovação aos mantenedores declarados no arquivo `CODEOWNERS` (ex: `@jadsonsanches`).
  * [x] **Require approval of the most recent reviewable push:** Garante que a aprovação contemple o estado exato do último push do PR.
  * [x] **Require conversation resolution before merging:** Exige que todas as conversas e comentários em linhas de código sejam marcados como resolvidos antes de permitir o merge.

#### C. Exigência de Status Checks Aprovados (CI)
* [x] **Require status checks to pass:**
  * [x] **Require branches to be up to date before merging:** Ative esta opção. Isso exige que o PR esteja sincronizado com a última versão da `main` antes do merge, prevenindo regressões de integração.
  * Em **Status checks that are required**, clique no botão **+ Add checks**.
  * No campo de busca, pesquise pelo nome do job do workflow de CI implementado em `.github/workflows/ci.yml`.
    * Exemplo de busca: `Validação e Testes de Integridade` (conforme o atributo `name:` do job).
    * Selecione o check correspondente.
    * *(Nota importante)*: Se o check ainda não aparecer na busca do GitHub, consulte a **Seção 5 (Solução de Problemas)** deste guia.

---

### 2.6. Salvando o Ruleset
Role até o final da página e clique no botão verde **Create** (ou **Save changes**). O Ruleset entrará em vigor imediatamente.

---

## 3. Abordagem 2: Configuração via Classic Branch Protection Rules (Legada)

Caso opte pela interface tradicional de proteção de branches:

### 3.1. Navegação na Interface Web
1. Acesse o repositório no GitHub: `https://github.com/jadsonsanches/anvisa-normas`.
2. Clique na aba superior **Settings**.
3. Na barra lateral esquerda, clique em **Branches** (sob a categoria **Code and automation**).
4. Na seção **Branch protection rules**, clique no botão **Add branch protection rule** (ou **Add rule**).

---

### 3.2. Padrão da Branch
* No campo **Branch name pattern**, digite exatamente: `main`.

---

### 3.3. Configurações de Regra

Marque os seguintes itens:

* [x] **Require a pull request before merging:**
  * **Require approvals:** Defina para `1`.
  * [x] **Dismiss stale pull request approvals when new commits are pushed:** Marcado.
  * [x] **Require review from Code Owners:** Marcado (integração com `CODEOWNERS`).
  * [x] **Require conversation resolution before merging:** Marcado.
* [x] **Require status checks to pass before merging:**
  * [x] **Require branches to be up to date before merging:** Marcado.
  * No campo **Status checks found in the last week for this repo**, digite o nome do job do workflow `ci.yml` (`Validação e Testes de Integridade`) e marque a caixa de seleção correspondente.
* [x] **Require linear history:** (Opcional, mas recomendado) Evita commits de merge poluídos, favorecendo histórico linear.
* [ ] **Do not allow bypassing the above settings (Include administrators):**
  * **ATENÇÃO:** Mantenha esta opção **DESMARCADA**. Se for marcada, administradores não poderão fazer correções emergenciais sem abrir PR e esperar aprovações, e qualquer script automatizado que utilize tokens de admin para atualizações será rejeitado.
* [ ] **Allow force pushes:** Mantenha **DESMARCADO** (impede sobrescrita forçada do histórico).
* [ ] **Allow deletions:** Mantenha **DESMARCADO** (impede deleção acidental da branch `main`).

---

### 3.4. Salvando a Regra Clássica
Clique no botão verde **Create** (ou **Save changes**) no rodapé da página. Confirme com sua senha ou 2FA se solicitado pelo GitHub.

---

## 4. Tratamento Especial: O Workflow de Atualização Contínua (`atualiza.yml`)

O repositório `anvisa-normas` possui uma rotina de ingestão automática em `.github/workflows/atualiza.yml` acionada a cada 6 horas (`cron: '0 */6 * * *'`), que executa:
```bash
git add data/ index.html visualizador.html
git commit -m "chore(dados): atualização automática do acervo e grafo [skip ci]"
git push
```

### O Desafio
O `GITHUB_TOKEN` padrão utilizado em workflows do GitHub Actions atua como um usuário comum sem privilégios de administrador. Ao ativar a exigência de Pull Request na branch `main`, o comando `git push` executado pelo bot resultará no seguinte erro de rejeição:
```text
remote: error: GH006: Protected branch update failed for refs/heads/main.
remote: error: At least 1 approving review is required by reviewers with write access.
To https://github.com/jadsonsanches/anvisa-normas.git
 ! [remote rejected] main -> main (protected branch hook declined)
```

### Estratégias Recomendadas de Resolução

1. **Estratégia A — Bypass List em Rulesets (Recomendada):**
   * Configurar um **Fine-Grained Personal Access Token (PAT)** ou uma **GitHub App** com permissões de leitura/escrita e privilégio administrativo.
   * Salvar esse token nos Secrets do repositório como `AUTO_UPDATE_TOKEN`.
   * No workflow `atualiza.yml`, configurar o checkout e push utilizando esse token.
   * No GitHub Rulesets, adicionar o usuário/app associado na **Bypass list** com `Bypass mode: Always`.

2. **Estratégia B — PR Automatizado com Auto-Merge:**
   * Modificar o workflow `atualiza.yml` para criar uma branch efêmera (ex: `bot/atualiza-acervo-20261113`) e abrir um Pull Request automatizado utilizando a action `peter-evans/create-pull-request`.
   * Configurar auto-merge (`gh pr merge --auto --squash`) caso os testes passem.
   * Essa estratégia mantém 100% da rastreabilidade sem abrir exceções de push direto na branch `main`.

3. **Estratégia C — Bypass Administrativo Clássico:**
   * Utilizar a regra clássica com **"Do not allow bypassing the above settings" desmarcado**, utilizando uma credencial do mantenedor `@jadsonsanches` para push das coletas periódicas.

---

## 5. Solução de Problemas Comuns (Troubleshooting)

### Problema 1: O status check do CI não aparece na lista de busca do GitHub
* **Causa:** O GitHub só indexa status checks após eles terem sido disparados e reportados à Checks API pelo menos uma vez no repositório.
* **Solução:**
  1. Conclua a criação do arquivo `.github/workflows/ci.yml`.
  2. Abra um Pull Request de teste ou envie um commit para uma branch secundária que dispare o workflow.
  3. Aguarde o término da execução do job no GitHub Actions.
  4. Recarregue a página de configuração do Ruleset / Branch Protection. O nome exato do job estará visível e autocompletável.
  5. *(Alternativa)*: No campo de busca do Ruleset, digite o nome exato do job (`Validação e Testes de Integridade`) e pressione `Enter`.

### Problema 2: O mantenedor não consegue realizar merge dos próprios Pull Requests
* **Causa:** Foi configurado `Required approvals: 1` e o GitHub impede que o autor do PR aprove o próprio PR por padrão.
* **Solução:**
  * Se o mantenedor for o único colaborador ativo em determinado momento, ele pode:
    1. Utilizar a permissão de **Bypass** concedida a `Repository Admin` para realizar o merge administrativo.
    2. Ou temporariamente ajustar as aprovações exigidas para `0` durante o desenvolvimento solo, ativando `1` para contribuições externas.

### Problema 3: "Require branches to be up to date" bloqueia o merge frequentemente
* **Causa:** Outros commits foram integrados à `main` enquanto o PR estava aberto.
* **Solução:** No painel do Pull Request no GitHub, clique no botão **Update branch** (ou execute `git merge main` / `git rebase main` localmente e envie o push). O CI revalidará o código antes do merge.

---

## 6. Checklist de Validação Pós-Configuração

Após concluir a configuração no GitHub, execute o seguinte checklist para validar a eficácia das regras:

- [ ] **Tentativa de Push Direto:** Tente executar `git push origin main` a partir de uma branch local com usuário sem bypass -> O GitHub deve rejeitar com erro de branch protegida.
- [ ] **Tentativa de Force Push:** Tente executar `git push origin main --force` -> O GitHub deve rejeitar terminantemente a operação.
- [ ] **Abertura de Pull Request:** Crie uma branch de teste `feature/teste-protecao`, envie commits e abra um Pull Request para `main`:
  - [ ] O workflow de CI (`ci.yml`) é acionado automaticamente.
  - [ ] O botão de merge fica bloqueado aguardando a finalização com sucesso do status check (`Validação e Testes de Integridade`).
  - [ ] O botão de merge exige aprovação formal (quando aplicável).
- [ ] **Execução Periódica do Bot:** Execute manualmente o workflow `atualiza.yml` via `workflow_dispatch` e certifique-se de que a atualização conclui com sucesso sem violação de permissão.
