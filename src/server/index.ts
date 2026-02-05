import express from 'express';
import { registerRoutes } from './routes.js';

const app = express();

// Aumente o limite de corpo de requisição, mas sem usar loggers pesados por enquanto
app.use(express.json());

registerRoutes(app);

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 API Pronta`);
});