// src/server/routes.ts
import { Express } from 'express';
import { upload } from './gridfs.js'; // Adicione .js

export function registerRoutes(app: Express) {
  // Rota de Upload
  app.post('/api/upload-planilha', (req, res) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        console.error("Erro Multer:", err);
        return res.status(500).json({ error: "Erro no processamento do arquivo fatiado." });
      }
      
      if (!req.file) {
        return res.status(400).json({ error: "Nenhum arquivo chegou ao servidor." });
      }

      console.log("✅ Planilha fatiada e salva no GridFS:", req.file.filename);
      res.status(200).json({ message: "Upload concluído!", id: req.file.id });
    });
  });
}