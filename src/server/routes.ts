import { Express } from 'express';
import { upload } from './gridfs.js';
import fs from 'fs';
import path from 'path';
import axios from 'axios';
import { GoogleAuth } from 'google-auth-library';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) return res.status(400).send("Arquivo não subiu.");

      console.log("📁 [TI] Forçando upload para o Bucket na mão...");

      // 1. Pegar o Token manualmente sem usar a função que dá erro
      // Se a google-auth-library continuar dando erro, você terá que gerar um token
      // no console do Google e colar aqui como string para testar.
      const auth = new GoogleAuth({
        keyFile: path.join(process.cwd(), 'google-credentials.json'),
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });
      
      const client = await auth.getClient();
      const tokenResponse = await client.getAccessToken();
      const token = tokenResponse.token;

      if (!token) throw new Error("Token não gerado.");

      const BUCKET_NAME = 'auditoria-xls-fusion';
      const destFileName = `auditorias/${Date.now()}-${req.file.originalname}`;
      
      // 2. Upload via Axios (HTTPS PURO)
      // A URL de 'Simple Upload' do Google Storage
      const url = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(destFileName)}`;

      console.log("📡 [TI] Batendo na API do Google via Axios...");

      const fileData = fs.readFileSync(tempPath!);

      await axios.post(url, fileData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        }
      });

      console.log("🚀 [TI] FINALMENTE! Tá no Bucket!");

      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      res.status(200).json({ message: "SALVO NO BUCKET!" });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      
      // Se der erro de biblioteca aqui, o plano final de TI é: 
      // COLAR O TOKEN MANUALMENTE NO CÓDIGO SÓ PARA O UPLOAD FUNCIONAR HOJE.
      res.status(500).send(`Erro: ${err.message}`);
    }
  });
}