/** @format */

import express from "express";
import path from "path";
import { registerRoutes } from "./routes.js";

const app = express();
app.use(express.json());

// 1. Registra as rotas da API (Obrigatório vir primeiro)
registerRoutes(app);

// 2. Define o caminho da pasta dist
const distPath = path.join(process.cwd(), 'dist');

// 3. Serve os arquivos estáticos (CSS, JS, Imagens)
app.use(express.static(distPath));

// 4. ROTA DE FALLBACK BLINDADA (TI):
// Só entrega o index.html se a rota NÃO começar com /api
app.get(/^((?!\/api).)*$/, (_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// 5. Porta dinâmica para o Cloud Run
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [TI] XLFUSION OPERACIONAL NA PORTA ${PORT}`);
});