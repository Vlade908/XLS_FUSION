import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).json({ error: "Arquivo não recebido." });

      console.log("📁 Arquivo recebido com segurança no Bolt:", req.file.path);

      // AQUI ENTRA A CONEXÃO COM A PREFEITURA
      // Se o Bolt travar aqui, saberemos que é na CONEXÃO, não no UPLOAD
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      
     const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/formulario01?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;
      
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => {
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            return { accessToken: token.token, expiresInSeconds: 3600 };
          }
        }
      }).asPromise();

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'planilhas_auditoria' });
      const uploadStream = bucket.openUploadStream(req.file.originalname);
      
      // Lê o arquivo do "disco" e manda pro Google
      fs.createReadStream(req.file.path).pipe(uploadStream)
        .on('finish', () => {
          fs.unlinkSync(req.file!.path); // Deleta o temporário
          res.status(200).json({ message: "Sucesso no Google Cloud!" });
        });

    } catch (err: any) {
      console.error("❌ Erro:", err.message);
      res.status(500).json({ error: "O arquivo chegou ao servidor, mas falhou ao conectar com o Google Cloud." });
    }
  });
}