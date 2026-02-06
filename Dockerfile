# 1. Escolhemos a imagem base (os talheres da marmita)
# Usamos o Node 20, que é a versão estável atual
FROM node:20-slim

# 2. Criamos uma pasta dentro do container para o projeto
WORKDIR /app

# 3. Copiamos os arquivos de dependências primeiro
# Isso acelera o build se você não mudar as bibliotecas
COPY package*.json ./

# 4. Instalamos as bibliotecas (o tempero)
RUN npm install

# 5. Copiamos o restante dos arquivos do projeto
COPY . .

# 6. Rodamos o comando de build (gera a pasta /dist que o navegador usa)
RUN npm run build

# 7. Expomos a porta que o Cloud Run exige (geralmente 8080)
EXPOSE 8080

# 8. Comando para ligar o servidor
# Note que usamos o comando que inicia o seu backend (tsx ou node)
CMD ["npm", "run", "server"]