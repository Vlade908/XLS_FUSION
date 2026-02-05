import { Express } from 'express';
import multer from 'multer';
import { conn } from './gridfs.js'; // Importação do conn corrigida
import mongoose from 'mongoose';

const storage = multer.memoryStorage();
const upload = multer({ storage });

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      // Verificação de segurança para o Bolt
      if (!conn.db) {
        return res.status(500).json({ error: "O banco de dados ainda está conectando. Tente em 5 segundos." });
      }

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, {
        bucketName: 'planilhas_auditoria'
      });

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: { 
          worker: req.body.workerName,
          date: new Date()
        }
      });

      uploadStream.end(req.file.buffer);

      uploadStream.on('finish', () => {
        console.log("✅ Planilha salva no Firestore via GridFS");
        res.status(200).json({ message: "Sucesso!" });
      });

    } catch (err: any) {
      console.error("Erro no processamento:", err);
      res.status(500).json({ error: "Falha interna no processamento." });
    }
  });
}