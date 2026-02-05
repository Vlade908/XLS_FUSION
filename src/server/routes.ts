import { Express } from 'express';
import { upload } from './gridfs.js';
import mongoose from 'mongoose';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    // Referência do arquivo para deletar depois, mesmo em caso de erro
    const tempPath = req.file?.path;

    try {
      if (!req.file) {
        return res.status(400).json({ error: "Arquivo não recebido." });
      }

      console.log("📁 Arquivo recebido com segurança no Bolt:", tempPath);

      // Dados do Firestore Enterprise (vistos na sua imagem)
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      const DATABASE_ID = "formulario01";
      
      const mongoURI = `mongodb://${DATABASE_UID}.${LOCATION}.firestore.goog:443/${DATABASE_ID}?authMechanism=MONGODB-OIDC&ssl=true&retryWrites=false`;
      
      const auth = new GoogleAuth({ 
        scopes: 'https://www.googleapis.com/auth/cloud-platform' 
      });
      
      // Criando a conexão com timeouts curtos para evitar o erro de ArrayBuffer no Bolt
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
        serverSelectionTimeoutMS: 8000, // Desiste em 8s para não travar o Bolt
        connectTimeoutMS: 8000,
        family: 4 // Força IPv4 (mais estável no ambiente de container)
      }).asPromise();

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { 
        bucketName: 'planilhas_auditoria' 
      });

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          worker: req.body.workerName || 'Desconhecido',
          uploadDate: new Date()
        }
      });
      
      // Pipe do arquivo do "disco" virtual para o Firestore
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('error', (streamErr) => {
          console.error("❌ Erro no Stream de upload:", streamErr);
          throw streamErr;
        })
        .on('finish', () => {
          console.log("✅ Upload concluído para o Google Cloud!");
          // Limpa o arquivo temporário após o sucesso
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          
          res.status(200).json({ message: "Sucesso no Google Cloud!" });
          
          // Fecha a conexão para liberar memória no Bolt
          conn.close();
        });

    } catch (err: any) {
      console.error("❌ Erro no processo de upload:", err.message);
      
      // Limpa o arquivo temporário em caso de falha
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      // Resposta amigável para o front-end
      res.status(500).json({ 
        error: "O servidor recebeu o arquivo, mas a conexão com o Google Cloud falhou.",
        details: err.message 
      });
    }
  });
}