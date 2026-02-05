import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      console.log("📁 Arquivo recebido no Bolt:", req.file.originalname);

      // SUA URL DO MONGODB ATLAS
      const mongoURI = "mongodb+srv://vlade908_db_user:aScDeGvPyqOiKlFo@cluster0.uppexhj.mongodb.net/xls_fusion_db?retryWrites=true&w=majority&appName=Cluster0";

      console.log("🔗 Conectando ao MongoDB Atlas...");

      // Conexão direta com o Atlas
      const conn = await mongoose.createConnection(mongoURI, {
        serverSelectionTimeoutMS: 15000,
        family: 4 // Força IPv4 para estabilidade no Bolt
      }).asPromise();

      console.log("✅ Conectado ao MongoDB Atlas!");

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { 
        bucketName: 'planilhas_auditoria' 
      });

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          worker: req.body.workerName || 'Alisson',
          uploadDate: new Date(),
          projeto: 'XLS Fusion Auditoria'
        }
      });
      
      // Pipe do arquivo do disco virtual para o Atlas
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('error', (streamErr) => {
          console.error("❌ Erro no Stream de upload:", streamErr);
          throw streamErr;
        })
        .on('finish', () => {
          console.log("🚀 Planilha salva com sucesso no ATLAS!");
          
          // Limpeza do arquivo temporário
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          
          conn.close(); // Fecha conexão para poupar memória
          res.status(200).json({ message: "Sucesso! Salvo no Atlas." });
        });

    } catch (err: any) {
      console.error("❌ Erro no processo Atlas:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      
      // Resposta segura para o Bolt não travar
      res.status(500).send(`Erro: ${err.message}`);
    }
  });
}