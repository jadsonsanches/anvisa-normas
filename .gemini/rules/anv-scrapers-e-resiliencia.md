# Scrapers, Limpeza de Dados e Resiliência

## Propósito
Garantir que as rotinas de coleta do Datalegis/Anvisa sejam respeitosas, estáveis e imunes a corrupção de dados por falhas parciais de rede.

## Diretrizes de Coleta e Scraper

1. **Polite Crawling (Taxa de Requisições):**
   - Respeitar limites razoáveis de requisição ao servidor do Datalegis/Anvisa.
   - Manter atraso (delay/throttle) entre as requisições subsequentes para evitar bloqueio por IP ou sobrecarga do servidor de origem.
   - Implementar tentativas com backoff exponencial para falhas temporárias (HTTP 429, 502, 503, 504 ou timeout).

2. **Idempotência e Proteção Contra Corrupção:**
   - **Nunca** sobrescrever uma norma local existente com uma resposta de erro, página de manutenção ou payload vazio/truncado.
   - Validar que a resposta contém a estrutura mínima da norma (`.ato` ou corpo legislativo reconhecível) antes de gravar no disco.

3. **Higienização de Conteúdo (HTML -> Markdown):**
   - Utilizar Cheerio e Turndown com remoção ativa de ruídos de interface:
     - Tags de script, style, header, footer e navegação.
     - Elementos com classes utilitárias de impressão/UI: `.noprint`, `#loading`, `.btn`, `.navbar`, `.menu`.
     - Avisos repetitivos de rodapé (ex: *"Este texto não substitui a Publicação Oficial"*).
     - Botões de ação do portal (ex: *"Voltar"*, *"IMPRIMIR"*, *"COPIAR LINK"*, *"VER NOTAS"*, *"PDF"*).
     - Links `javascript:` ou âncoras vazias `#`.
   - Manter preservadas tabelas legislativas, anexos técnicos, fórmulas e estruturas de artigos/parágrafos/incisos.
