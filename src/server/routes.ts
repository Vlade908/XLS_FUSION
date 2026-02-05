import { Express } from 'express';
import { upload } from './gridfs.js';
import fs from 'fs';
import { GoogleAuth } from 'google-auth-library';
import path from 'path';

export function registerRoutes(app: Express) {
  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;

    try {
      if (!req.file) return res.status(400).send("Arquivo não recebido.");

      console.log("📁 [TI] Preparando upload via REST API para Cloud Storage...");

      // 1. Autenticação Manual (Pega o token do seu JSON)
      const auth = new GoogleAuth({
        keyFile: path.join(process.cwd(), 'google-credentials.json'),
        scopes: 'https://www.googleapis.com/auth/cloud-platform',
      });
      const authToken = await auth.getAccessToken();

      const PROJECT_ID = 'teste-f9d4e';
      const BUCKET_NAME = 'auditoria-xls-fusion';
      const destFileName = `auditorias/${Date.now()}-${req.file.originalname}`;

      console.log(`📡 [TI] Enviando via HTTPS para: ${BUCKET_NAME}`);

      // 2. Leitura do arquivo para Buffer
      const fileBuffer = fs.readFileSync(tempPath!);

      // 3. Upload via Fetch (API REST do Google)
      // Usamos a URL de upload simples do Google Cloud Storage
      const uploadUrl = `https://storage.googleapis.com/upload/storage/v1/b/${BUCKET_NAME}/o?uploadType=media&name=${encodeURIComponent(destFileName)}`;

      const response = await fetch(uploadUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${authToken}`,
          'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
        body: fileBuffer
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google API Error: ${errorText}`);
      }

      console.log("🚀 [TI] SUCESSO! Arquivo salvo no Bucket via REST.");

      // Limpeza
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      res.status(200).json({ message: "Sucesso no Cloud Storage!" });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).send(`Erro de TI: ${err.message}`);
    }
  });
}