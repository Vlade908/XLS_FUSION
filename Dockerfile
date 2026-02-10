FROM node:20-slim

WORKDIR /app

# Instalamos dependências necessárias
RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

COPY package*.json ./

# Instalamos tudo
RUN npm install

COPY . .

# Fazemos o build do Front-end
RUN npm run build

# O Cloud Run exige a porta 8080
ENV PORT=8080
EXPOSE 8080

# COMANDO AJUSTADO: 
# Usamos o node com o loader do tsx explicitamente para evitar o erro de "module not found"
CMD ["npx", "tsx", "src/server/index.ts"]