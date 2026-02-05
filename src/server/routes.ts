import { Express } from 'express';
import { upload } from './gridfs.js';

export function registerRoutes(app: Express) {
  // O middleware 'upload.single' aqui já faz a conexão OIDC, 
  // fatia o arquivo em chunks e salva no Firestore Enterprise.
  app.post('/api/upload-planilha', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "O arquivo não foi recebido pelo servidor." });
      }

      console.log("✅ Upload realizado com sucesso via GridFS:", req.file.filename);
      
      return res.status(200).json({ 
        message: "Planilha enviada com sucesso para o Google Cloud!",
        fileId: (req.file as any).id 
      });

    } catch (err: any) {
      console.error("❌ Erro na rota de upload:", err);
      return res.status(500).json({ error: "Erro interno ao processar o upload." });
    }
  });
}