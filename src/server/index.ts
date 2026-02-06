/** @format */

import express from "express";
import { registerRoutes } from "./routes.js";

const app = express();
app.use(express.json());

// Registra apenas as rotas funcionais
registerRoutes(app);

// REMOVEMOS o app.get('/') e o app.get('/api/health')
// Se o Bolt não encontrar nada na raiz, ele não tentará processar buffers de resposta.

const PORT = process.env.PORT || 8080;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 BACKEND_OK`);
});
