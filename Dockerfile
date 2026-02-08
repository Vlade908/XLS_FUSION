FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Instalamos tudo, inclusive as libs de tipagem que corrigimos
RUN npm install

COPY . .

# Faz o build (Gera a pasta /dist)
RUN npm run build

# O Cloud Run exige a porta 8080
ENV PORT=8080
EXPOSE 8080

# COMANDO SEGURO: Rodar direto o index.js que o build gerou
# Geralmente o vite-node ou tsc joga para dist/server/index.js ou dist/index.js
# Vamos usar o tsx diretamente mas com a flag de produção para ser mais rápido
CMD ["npx", "tsx", "src/server/index.ts"]