/** @format */

import { Express } from 'express';
import { upload } from './gridfs.js'; 
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
// Importação do Firestore (Certifique-se de que o pacote 'firebase-admin' esteja instalado se for usar via SDK)
// Para o Cloud Run, usaremos a lib oficial @google-cloud/firestore
import { Firestore } from '@google-cloud/firestore';

const storage = new Storage();
const firestore = new Firestore();
const BUCKET_NAME = 'auditoria-xls-fusion';

const sanitizePath = (text: string) => {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9.]/gi, '_')
    .trim();
};

export function registerRoutes(app: Express) {
  
  // ROTA: Criar um Novo Projeto de Auditoria (Admin)
  app.post('/api/criar-projeto', upload.fields([
    { name: 'rulesFile', maxCount: 1 },
    { name: 'baseFile', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { criador, mesAno, codigoProjeto, workerColors } = req.body;

    try {
      if (!files.rulesFile || !files.baseFile) throw new Error("Arquivos base faltando.");

      const bucket = storage.bucket(BUCKET_NAME);
      const pastaProjeto = `projetos/${codigoProjeto}`;

      // 1. Upload das Bases para o Bucket
      const rulesDest = `${pastaProjeto}/bases/regras.xlsx`;
      const baseDest = `${pastaProjeto}/bases/base.xlsx`;

      await bucket.upload(files.rulesFile[0].path, { destination: rulesDest });
      await bucket.upload(files.baseFile[0].path, { destination: baseDest });

      // 2. Salvar Metadados no Firestore
      await firestore.collection('projetos').doc(codigoProjeto).set({
        codigo: codigoProjeto,
        criador: criador,
        mesAno: mesAno,
        workerColors: JSON.parse(workerColors || '{}'),
        links: { rules: rulesDest, base: baseDest },
        criadoEm: new Date().toISOString(),
        status: 'ativo'
      });

      // Limpar temporários
      fs.unlinkSync(files.rulesFile[0].path);
      fs.unlinkSync(files.baseFile[0].path);

      res.status(200).json({ message: "Projeto Publicado!", link: `/responder?p=${codigoProjeto}` });

    } catch (err: any) {
      console.error("❌ [TI ERROR]:", err.message);
      res.status(500).json({ error: err.message });
    }
  });

  // ROTA: Salvar Resposta Final do Usuário
  app.post('/api/finalizar-resposta', upload.single('file'), async (req, res) => {
    const { codigoProjeto, responder } = req.body;
    const tempPath = req.file?.path;

    try {
      const safeResponder = sanitizePath(responder);
      const destFileName = `projetos/${codigoProjeto}/respostas/${safeResponder}_Final.xlsx`;

      await storage.bucket(BUCKET_NAME).upload(tempPath!, { destination: destFileName });
      
      // Registrar no Firestore que o usuário respondeu
      await firestore.collection('projetos').doc(codigoProjeto).collection('respostas').doc(safeResponder).set({
        nome: responder,
        arquivo: destFileName,
        respondidoEm: new Date().toISOString()
      });

      if (tempPath) fs.unlinkSync(tempPath);
      res.status(200).json({ message: "Respostas salvas na nuvem!" });
    } catch (err: any) {
      if (tempPath) fs.unlinkSync(tempPath);
      res.status(500).send(err.message);
    }
  });

  // MANTEMOS A ROTA DE ANEXO PARA USO DURANTE O FORMULÁRIO (Opção do usuário)
  app.post('/api/upload-anexo', upload.single('file'), async (req, res) => {
    const { responder, questionNumber, codigoProjeto } = req.body;
    const tempPath = req.file?.path;
    try {
      const safeResponder = sanitizePath(String(responder));
      const safeQ = sanitizePath(String(questionNumber));
      const dest = `projetos/${codigoProjeto}/anexos/${safeResponder}/Q${safeQ}/${Date.now()}-${req.file?.originalname}`;
      await storage.bucket(BUCKET_NAME).upload(tempPath!, { destination: dest });
      if (tempPath) fs.unlinkSync(tempPath);
      res.status(200).json({ path: dest });
    } catch (err: any) {
      if (tempPath) fs.unlinkSync(tempPath);
      res.status(500).send(err.message);
    }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}