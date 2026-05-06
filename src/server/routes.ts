/** @format */

import { Express } from 'express';
import { upload } from './gridfs.js';

const sanitizePath = (text: string) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9.]/gi, '_')
    .trim();
};

export function registerRoutes(app: Express) {
  app.post('/api/upload-anexo', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('Arquivo não encontrado.');

      const safeResponder = sanitizePath(String(req.body.responder || 'desconhecido'));
      const safeForm = sanitizePath(String(req.body.formName || 'geral'));
      const safeQNumber = sanitizePath(String(req.body.questionNumber || '0'));

      const fileInfo = {
        id: req.file.id,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        responder: safeResponder,
        questionNumber: safeQNumber,
        formName: safeForm,
      };

      res.status(201).json({ message: 'Anexo salvo com sucesso!', file: fileInfo });
    } catch (err: any) {
      console.error('❌ [UPLOAD ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upload-planilha', upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('Arquivo não encontrado.');

      const fileInfo = {
        id: req.file.id,
        filename: req.file.filename,
        originalname: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
      };

      res.status(201).json({ message: 'Planilha salva!', file: fileInfo });
    } catch (err: any) {
      console.error('❌ [UPLOAD ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}