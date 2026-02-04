import express from 'express';
import { registerRoutes } from './routes';

const app = express();
app.use(express.json());

// Registra as rotas que criamos (incluindo o upload)
registerRoutes(app);

// A porta deve ser a mesma definida no vite.config.ts (5000)
const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Backend rodando na porta ${PORT}`);
});