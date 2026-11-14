# Determinismo Jurídico e Integridade do Grafo

## Propósito
Este projeto serve como fonte pública e confiável de regulação sanitária (Anvisa). Erros de interpretação jurídica podem causar prejuízos regulatórios e de compliance. O determinismo nas relações normativas é um pilar inviolável.

## Diretrizes Mandatórias

1. **Zero Alucinação de Relacionamentos:**
   - **Nunca** inferir ou deduzir revogações tácitas, alterações ou vínculos regulatórios por suposição de IA.
   - Toda aresta do grafo e campo de relacionamento (`revoga`, `revogada_por`, `altera`, `leis_base`, `relacionadas`) deve originar-se exclusivamente de:
     - Chamadas de metadados oficiais do Datalegis (ex: chamadas `LinkTexto('TIPO', 'NUM', 'SEQ', 'ANO', 'ORGAO')`);
     - Relações expressas no texto normativo oficial (ex: "Fica revogada a Resolução RDC nº X, de Y").

2. **Tipificação e Padronização Canônica de Normas:**
   - Sempre normalizar a sigla do tipo para letras maiúsculas sem pontos:
     - `RDC` (Resolução da Diretoria Colegiada)
     - `IN` (Instrução Normativa - normalizar variações como `INM`)
     - `PORTARIA` (Portarias - normalizar `POR`)
     - `RE` (Resolução Específica - normalizar `RES`)
   - Manter números limpos, sem pontuação interna e sem zeros à esquerda no identificador padrão (ex: `RDC-834`, e não `RDC-0834` ou `RDC-834.md`).

3. **Status de Vigência:**
   - A situação da norma deve refletir fielmente o ato oficial:
     - `Vigente`
     - `Revogada`
     - `Alterada` (quando vigente com modificações de redação)
   - Se uma norma for marcada como `Revogada`, o campo `revogada_por` deve obrigatoriamente conter a norma revogadora assim que identificado o ato que a revogou.
