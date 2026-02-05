import { Express } from 'express';
import { upload } from './gridfs.js';
import fs from 'fs';
import path from 'path';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).send("Arquivo não subiu.");

      // Definimos um local fixo e seguro no servidor
      const targetDir = path.join(process.cwd(), 'uploads_finalizados');
      if (!fs.existsSync(targetDir)) fs.mkdirSync(targetDir);

      const finalPath = path.join(targetDir, req.file.originalname);

      // Movemos o arquivo da pasta temporária para a definitiva
      fs.renameSync(req.file.path, finalPath);

      console.log(`✅ SUCESSO DE TI: Arquivo salvo em ${finalPath}`);
      
      res.status(200).json({ 
        message: "ENVIADO COM SUCESSO!",
        path: finalPath 
      });

    } catch (err: any) {
      console.error("❌ ERRO:", err.message);
      res.status(500).send("Erro ao gravar arquivo no servidor.");
    }
  });
}