import express from "express";
import { registerRoutes } from "./routes"; // Certifique-se de que o import está correto

const app = express();
app.use(express.json());

// CRÍTICO: Esta função precisa ser chamada para "ativar" as rotas de API
registerRoutes(app);

const PORT = 5000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});