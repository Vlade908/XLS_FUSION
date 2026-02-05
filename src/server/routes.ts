import { Express } from 'express';
import { upload } from './gridfs.js';
import { MongoClient, GridFSBucket } from 'mongodb';
import fs from 'fs';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) return res.status(400).send("Arquivo não recebido.");

      console.log("📁 [TI] Arquivo em disco:", req.file.originalname);

      // Usando a sua URI exata com SCRAM-SHA-256
      const mongoURI = `mongodb://enzoalves:YfRSv9oN02rXCKgnrZvni5Q2u57GpL_naCsZj7eKnAfHQfeQ@16158504-0949-4082-a560-03c600920d32.nam5.firestore.goog:443/formulario01?loadBalanced=true&tls=true&authMechanism=SCRAM-SHA-256&retryWrites=false`;

      console.log("📡 [TI] Tentando handshake SCRAM-SHA-256...");

      // Ajuste de agressividade para redes instáveis/bloqueadas
      const client = new MongoClient(mongoURI, {
        serverSelectionTimeoutMS: 20000, // Aumentamos para 20s
        connectTimeoutMS: 20000,
        tls: true,
        tlsInsecure: true, // Ignora erros de certificado que o Bolt pode causar
        family: 4,
        maxPoolSize: 1
      });

      await client.connect();
      console.log("✅ [TI] CONEXÃO ESTABELECIDA VIA SCRAM!");

      const db = client.db('formulario01');
      const bucket = new GridFSBucket(db, { bucketName: 'planilhas_auditoria' });

      console.log("📤 [TI] Iniciando stream GridFS...");
      const uploadStream = bucket.openUploadStream(req.file.originalname);

      fs.createReadStream(tempPath!).pipe(uploadStream)
        .on('error', (err) => { throw err; })
        .on('finish', async () => {
          console.log("🚀 [TI] PERSISTÊNCIA CONCLUÍDA!");
          if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
          await client.close();
          res.status(200).end("Sucesso: Arquivo salvo no Firestore!");
        });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).setHeader('Content-Type', 'text/plain').end(`Falha na Conexão: ${err.message}`);
    }
  });
}