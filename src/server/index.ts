import express from 'express';
import { registerRoutes } from './routes.js';

const app = express();
app.use(express.json());

// Registra as rotas (o Multer/GridFS só vai acordar quando a rota for chamada)
registerRoutes(app);

app.get('/', (req, res) => res.json({ status: "Online" }));

const PORT = 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Servidor aguardando requisições na porta ${PORT}`);
});