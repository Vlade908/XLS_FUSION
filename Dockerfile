FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN apt-get update && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*
RUN npm install

COPY . .
RUN npx prisma generate

# TI: ESTA LINHA É O SEGREDO. Ela força o build e nos mostra se a chave existe (mas não a exibe inteira por segurança)
RUN echo "Iniciando build para o projeto: ${VITE_FIREBASE_PROJECT_ID}" && npm run build

ENV PORT=8080
EXPOSE 8080

CMD ["npm", "run", "start"]