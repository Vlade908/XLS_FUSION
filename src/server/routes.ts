import { Express } from 'express';
import multer from 'multer';
import { conn } from './gridfs.js';
import mongoose from 'mongoose';

// Usamos memória temporária para evitar o erro de Buffer do Bolt
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      // 1. Criar o Bucket do GridFS manualmente
      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'planilhas_auditoria'
      });

      // 2. Criar Stream de upload a partir do buffer em memória
      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: { 
          worker: req.body.workerName,
          date: new Date()
        }
      });

      // 3. Escrever o arquivo no Firestore
      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', () => {
        res.status(200).json({ message: "Upload concluído com sucesso!" });
      });

      uploadStream.on('error', (err) => {
        throw err;
      });

    } catch (err: any) {
      console.error("Erro no processamento:", err);
      // Evita enviar o objeto de erro inteiro para não causar DataCloneError
      res.status(500).json({ error: "Erro interno no servidor do Bolt." });
    }
  });
}