/** @format */

import { Express } from 'express';
import { upload } from './gridfs.js'; // Mantendo seu multer configurado
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

// Inicializa o Storage (No Cloud Run, ele busca as credenciais automaticamente)
const storage = new Storage();
const BUCKET_NAME = 'auditoria-xls-fusion';

export function registerRoutes(app: Express) {
  
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).send("Arquivo não encontrado no upload.");
      }

      console.log(`📁 [TI] Iniciando upload para o Bucket: ${BUCKET_NAME}`);

      const destFileName = `auditorias/${Date.now()}-${req.file.originalname}`;
      const bucket = storage.bucket(BUCKET_NAME);
      
      // Realiza o upload usando a biblioteca oficial
      await bucket.upload(tempPath!, {
        destination: destFileName,
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      console.log("🚀 [TI] SUCESSO: Arquivo salvo no Cloud Storage!");

      // Remove o arquivo temporário do servidor para não encher o container
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      res.status(200).json({ 
        message: "Upload realizado com sucesso!",
        file: destFileName 
      });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      
      // Limpa o arquivo temporário mesmo em caso de erro
      if (tempPath && fs.existsSync(tempPath)) {
        fs.unlinkSync(tempPath);
      }

      res.status(500).json({ 
        error: "Erro ao salvar no Cloud Storage", 
        details: err.message 
      });
    }
  });

  // Rota de saúde para o Cloud Run verificar se o servidor está vivo
  app.get('/api/health', (_req, res) => {
    res.status(200).send('OK');
  });
}