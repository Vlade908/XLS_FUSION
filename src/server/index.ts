/** @format */

import express from "express";
import path from "path";
import { registerRoutes } from "./routes.js";

const app = express();
app.use(express.json());

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

// 5. Porta dinâmica para o Cloud Run
const PORT = Number(process.env.PORT) || 8080;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 [TI] XLFUSION OPERACIONAL NA PORTA ${PORT}`);
});