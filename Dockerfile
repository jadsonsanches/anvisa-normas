# Imagem base leve com Node.js 20 LTS
FROM node:20-slim AS builder

WORKDIR /app

# Copia arquivos de definição de pacotes
COPY package*.json tsconfig.json tsup.config.ts ./

# Instala dependências
RUN npm ci

# Copia código-fonte e dados necessários
COPY src/ ./src/
COPY data/ ./data/

# Compila o projeto TypeScript
RUN npm run build

# Stage de produção leve
FROM node:20-slim AS runner

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=8080

# Copia apenas as dependências de produção
COPY --chown=node:node package*.json ./
RUN npm ci --omit=dev && npm cache clean --force && chown -R node:node /app

# Copia os arquivos compilados e a base de dados com propriedade de node:node
COPY --chown=node:node --from=builder /app/dist ./dist
COPY --chown=node:node --from=builder /app/data ./data

# Executa como usuário não-privilegiado
USER node

EXPOSE 8080

CMD ["node", "dist/bin/sse.js"]
