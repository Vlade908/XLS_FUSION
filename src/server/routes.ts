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
        return res.status(400).send("Arquivo não recebido pelo servidor.");
      }

      console.log("🔍 [TI LOG] Iniciando processamento de arquivo:", req.file.originalname);

      // Dados do Ambiente (Conforme seu console nam5 / formulario01)
      const DATABASE_UID = "formulario01"; 
      const LOCATION = "nam5";
      const DATABASE_ID = "formulario01";
      
      const mongoURI = `mongodb://enzoalves:YfRSv9oN02rXCKgnrZvni5Q2u57GpL_naCsZj7eKnAfHQfeQ@16158504-0949-4082-a560-03c600920d32.nam5.firestore.goog:443/formulario01?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false`;
      
      // 1. Instancia o GoogleAuth para buscar as credenciais do JSON
      const auth = new GoogleAuth({ 
        scopes: 'https://www.googleapis.com/auth/cloud-platform' 
      });

      console.log("🔗 Estabelecendo conexão com Firestore via Driver MongoDB...");

      // 2. Cria conexão persistente para o streaming do GridFS
      const conn = await mongoose.createConnection(mongoURI, {
        authMechanismProperties: {
          ENVIRONMENT: 'test',
          OIDC_CALLBACK: async () => {
            const client = await auth.getClient();
            const tokenResponse = await client.getAccessToken();
            return { 
              accessToken: tokenResponse.token!, 
              expiresInSeconds: 3600 
            };
          }
        },
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 15000,
        family: 4, // Prioriza IPv4 para evitar problemas de resolução no container
        retryWrites: false
      }).asPromise();

      console.log("✅ Conexão estabelecida. Iniciando Stream GridFS...");

      const bucket = new mongoose.mongo.GridFSBucket(conn.db, { 
        bucketName: 'planilhas_auditoria' 
      });

      const uploadStream = bucket.openUploadStream(req.file.originalname, {
        metadata: {
          worker: req.body.workerName || 'TI_ADMIN',
          uploadDate: new Date(),
          mimetype: req.file.mimetype
        }
      });
      
      // 3. Pipe: Lê do disco local e joga para o Google Cloud
      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('error', (streamErr) => {
          console.error("❌ Erro no Stream de upload:", streamErr);
          throw streamErr;
        })
        .on('finish', () => {
          console.log("🚀 SUCESSO: Arquivo persistido no Firestore Enterprise.");
          
          // Limpa o arquivo temporário
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          
          // Fecha a conexão para não deixar sockets pendentes
          conn.close();
          
          res.status(200).json({ 
            message: "Upload concluído com sucesso!",
            id: uploadStream.id 
          });
        });

    } catch (err: any) {
      console.error("❌ [TI ERROR] Falha na operação:", err.message);
      
      // Cleanup de segurança
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      // Status 500 com detalhamento do erro para debug
      res.status(500).send(`Erro de Infraestrutura: ${err.message}`);
    }
  });
}