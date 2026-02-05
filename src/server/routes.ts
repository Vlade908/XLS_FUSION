import { Express } from 'express';
import { upload } from './gridfs.js'; // Mantemos o multer para receber o arquivo no Bolt
import { Storage } from '@google-cloud/storage';
import path from 'path';
import fs from 'fs';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) return res.status(400).send("Arquivo não recebido.");

      console.log("📁 [TI] Preparando upload via HTTPS para Cloud Storage...");

      // 1. Configura o Cliente do Storage (Ele lê o JSON automaticamente se o GOOGLE_APPLICATION_CREDENTIALS estiver setado)
      const storage = new Storage({
        keyFilename: path.join(process.cwd(), 'google-credentials.json'),
        projectId: 'teste-f9d4e' // <-- TROQUE PELO ID DO SEU PROJETO NO GOOGLE
      });

      const BUCKET_NAME = 'auditoria-xls-fusion'; // <-- TROQUE PELO NOME DO BUCKET QUE VOCÊ CRIOU
      const destFileName = `auditorias/${Date.now()}-${req.file.originalname}`;

      console.log(`📡 [TI] Enviando para o Bucket: ${BUCKET_NAME}...`);

      // 2. Faz o upload direto do arquivo que está no disco virtual do Bolt
      await storage.bucket(BUCKET_NAME).upload(tempPath!, {
        destination: destFileName,
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          metadata: {
            worker: req.body.workerName || 'Alisson',
            uploadDate: new Date().toISOString()
          }
        }
      });

      console.log("🚀 [TI] SUCESSO TOTAL! Arquivo disponível no Cloud Storage.");

      // Limpeza do arquivo temporário no Bolt
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      res.status(200).json({ 
        message: "Enviado com sucesso para o Cloud Storage!",
        url: `gs://${BUCKET_NAME}/${destFileName}`
      });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      
      // Como o Cloud Storage usa HTTPS, se der erro aqui, o log vai te dizer exatamente por que (ex: permissão negada)
      res.status(500).send(`Falha no Storage: ${err.message}`);
    }
  });
}