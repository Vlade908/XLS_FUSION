import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    if (!req.file) return res.status(400).json({ error: "Arquivo não recebido." });

    console.log("📁 Arquivo local pronto:", req.file.originalname);

    try {
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_UID}?authMechanism=MONGODB-OIDC&ssl=true`;
      
      const auth = new GoogleAuth({ scopes: 'https://www.googleapis.com/auth/cloud-platform' });
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const token = tokenResponse.token;

      if (!token) throw new Error("Não foi possível gerar o token do Google.");

      console.log("🔑 Token gerado. Tentando abrir túnel com Firestore...");

      // Conexão direta via Mongoose
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => ({ accessToken: token, expiresInSeconds: 3600 })
        },
        serverSelectionTimeoutMS: 10000,
        family: 4
      }).asPromise();

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { bucketName: 'planilhas_auditoria' });
      const uploadStream = bucket.openUploadStream(req.file.originalname);
      
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('finish', () => {
          console.log("🚀 SUCESSO NO FIRESTORE!");
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          conn.close();
          res.status(200).json({ message: "Enviado com sucesso!" });
        });

    } catch (err: any) {
      console.error("❌ ERRO DE TI:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).send(`Erro de TI: ${err.message}`);
    }
  });
}