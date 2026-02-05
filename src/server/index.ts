// src/server/index.ts
import express from 'express';
import { registerRoutes } from './routes.js'; // Adicione .js se estiver usando type: module

const app = express();

// Aumente o limite de tamanho para aceitar planilhas grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

app.get('/', (req, res) => {
  // Use res.json em vez de res.send para evitar problemas de Buffer no Bolt
  res.json({ message: "Servidor de API Ativo" });
});

// REGISTRO DAS ROTAS
registerRoutes(app);

// Rota de teste para sabermos se o backend está ok
// No src/server/index.ts
app.get('/api/health', (req, res) => {
  // Usamos status 200 puro primeiro para o Bolt não se perder com Buffers complexos
  res.status(200).end(); 
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVIDOR ATIVO EM: http://localhost:${PORT}`);
});