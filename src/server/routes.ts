/** @format */

import { Express } from 'express';
import { upload } from './gridfs.js'; 
import fs from 'fs';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const BUCKET_NAME = 'auditoria-xls-fusion';

// Função auxiliar de TI para limpar nomes de arquivos/pastas sem perder a legibilidade
const sanitizePath = (text: string) => {
  return text
    .normalize("NFD") // Decompõe caracteres acentuados (ex: é -> e + ´)
    .replace(/[\u0300-\u036f]/g, "") // Remove os acentos
    .replace(/[^a-z0-9.]/gi, '_') // Substitui o que sobrar de especial por underline
    .trim();
};

export function registerRoutes(app: Express) {
  
  app.post('/api/upload-anexo', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;
    const { responder, questionNumber, formName } = req.body;

    try {
      if (!req.file) return res.status(400).send("Arquivo não encontrado.");

      const bucket = storage.bucket(BUCKET_NAME);
      
      // Aplicando a sanitização inteligente
      const safeResponder = sanitizePath(String(responder));
      const safeForm = sanitizePath(String(formName || 'geral'));
      const safeQNumber = sanitizePath(String(questionNumber));
      
      const destFileName = `anexos/${safeForm}/${safeResponder}/Questao_${safeQNumber}/${Date.now()}-${req.file.originalname}`;

      await bucket.upload(tempPath!, {
        destination: destFileName,
        metadata: { contentType: req.file.mimetype },
      });

      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      res.status(200).json({ 
        message: "Anexo salvo com sucesso!",
        path: destFileName 
      });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    const tempPath = req.file?.path;
    try {
      if (!req.file) return res.status(400).send("Arquivo não encontrado.");
      const destFileName = `auditorias/${Date.now()}-${req.file.originalname}`;
      await storage.bucket(BUCKET_NAME).upload(tempPath!, {
        destination: destFileName,
        metadata: { contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
      });
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(200).json({ message: "Planilha salva!", file: destFileName });
    } catch (err: any) {
      if (tempPath && fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}