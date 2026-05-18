import express from 'express';
const app = express();
import { registerRoutes } from './src/server/routes';
registerRoutes(app);
app.listen(8082, () => console.log('started'));
