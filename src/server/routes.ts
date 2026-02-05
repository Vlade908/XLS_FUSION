import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  // Rota de upload usando o disco virtual do Bolt
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      // Se chegou aqui, a barra de progresso no Front já deve ter ido a 100%
      console.log("✅ Arquivo recebido pelo servidor local:", req.file.originalname);
      console.log("🔗 Iniciando ponte com Firestore Enterprise...");

      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_UID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;
      
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      
      // Criamos a conexão com um timeout bem curto para não congelar o Bolt
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => {
            const client = await auth.getClient();
            const token = await client.getAccessToken();
            return { accessToken: token.token, expiresInSeconds: 3600 };
          }
        },
        serverSelectionTimeoutMS: 5000, // Desiste em 5s se o Google não responder
        connectTimeoutMS: 5000,
        family: 4
      }).asPromise();

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'planilhas_auditoria' });
      const uploadStream = bucket.openUploadStream(req.file.originalname);
      
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('finish', () => {
          console.log("🚀 Enviado para o Google Cloud com sucesso!");
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          conn.close();
          res.status(200).json({ message: "Salvo no Google Cloud!" });
        });

    } catch (err: any) {
      console.error("❌ Falha na conexão final:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      
      // Retornamos o erro sem quebrar o servidor
      res.status(500).send(`O servidor recebeu o arquivo, mas o Google Cloud recusou a conexão (Timeout).`);
    }
  });
}