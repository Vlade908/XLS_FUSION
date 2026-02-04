import express from 'express';
import { registerRoutes } from './routes';

const app = express();
app.use(express.json());

// Esta função vem do seu arquivo server/routes.ts
registerRoutes(app);

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 XLFusion Backend Ativo na porta ${PORT}`);
});