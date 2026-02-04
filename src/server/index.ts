// src/server/index.ts
import express from 'express';
import { registerRoutes } from './routes.js'; // Adicione .js se estiver usando type: module

const app = express();

// Aumente o limite de tamanho para aceitar planilhas grandes
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// REGISTRO DAS ROTAS
registerRoutes(app);

// Rota de teste para sabermos se o backend está ok
app.get('/api/health', (req, res) => {
  res.json({ status: 'Backend XLFusion está operando!' });
});

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 SERVIDOR ATIVO EM: http://localhost:${PORT}`);
});