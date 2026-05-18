/** @format */

import dotenv from "dotenv";

// Carrega .env primeiro, depois .env.local (que sobrescreve)
dotenv.config({ override: true });
if (process.env.NODE_ENV !== 'production') {
  dotenv.config({ path: '.env.local', override: true });
}

import express from "express";
import path from "path";
import helmet from "helmet";
import cors from "cors";

const app = express();

app.use(helmet());
app.use(cors({ origin: true }));
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: false, limit: '5mb' }));

const { connectDB } = await import('./db.ts');
const { registerRoutes } = await import('./routes');

await connectDB();

// 1. Registra as rotas da API primeiro
registerRoutes(app);

// 2. Define o caminho da pasta dist
const distPath = path.join(process.cwd(), 'dist');

// 3. Serve os arquivos estáticos
app.use(express.static(distPath));

// 4. ROTA CORRIGIDA (Regex Pura):
// Em vez de '*', usamos /.*/ que é aceito por qualquer versão do Express
app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 BACKEND_OK on port ${PORT}`);
});
