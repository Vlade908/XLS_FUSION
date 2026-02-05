import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      console.log("📁 Arquivo em disco virtual:", tempPath);

      // IDs extraídos das suas imagens do console
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      
      // URI formatada exatamente para o Firestore MongoDB Compatibility
      const mongoURI = "mongodb+srv://vlade908_db_user:<db_password>@cluster0.uppexhj.mongodb.net/?appName=Cluster0";
      
      const auth = new GoogleAuth({ 
        scopes: 'https://www.googleapis.com/auth/cloud-platform' 
      });
      
      console.log("🔗 Tentando conexão com Firestore Enterprise...");

      // Conexão com limites rígidos para o Bolt não 'explodir' a memória
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => {
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            return { 
              accessToken: tokenResponse.token, 
              expiresInSeconds: 3600 
            };
          }
        },
        serverSelectionTimeoutMS: 10000, // 10 segundos de limite
        connectTimeoutMS: 10000,
        family: 4, // Força IPv4 (essencial para evitar timeout no Bolt)
        retryWrites: false
      }).asPromise();

      console.log("✅ Conectado ao banco!");

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { 
        bucketName: 'planilhas_auditoria' 
      });

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          worker: req.body.workerName || 'Desconhecido',
          uploadDate: new Date()
        }
      });
      
      // Pipe do arquivo temporário para o banco
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('error', (streamErr) => {
          console.error("❌ Erro no Stream:", streamErr);
          throw streamErr;
        })
        .on('finish', () => {
          console.log("🚀 Planilha salva com sucesso!");
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          
          // Importante: Fecha a conexão para liberar o buffer do Bolt
          conn.close();
          
          res.status(200).json({ message: "Sucesso no Google Cloud!" });
        });

    } catch (err: any) {
      console.error("❌ Erro no processo:", err.message);
      
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      // Usamos res.status().send() para evitar que o JSON cause DataCloneError
      res.status(500).send(`Erro de conexão: ${err.message}`);
    }
  });
}