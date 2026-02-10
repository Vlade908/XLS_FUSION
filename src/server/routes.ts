/** @format */

import { Express } from 'express';
import { upload } from './gridfs.js'; 
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
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
  
  // ROTA: Listar Histórico do Usuário
  app.get('/api/meus-formularios', async (req, res) => {
    const { email } = req.query; // Recebe o e-mail do usuário logado
    try {
      const snapshot = await firestore.collection('projetos')
        .where('criadorEmail', '==', email)
        .orderBy('criadoEm', 'desc')
        .get();
      
      const projetos = snapshot.docs.map(doc => doc.data());
      res.status(200).json(projetos);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ROTA: Criar Projeto (Agora salvando o e-mail do criador)
  app.post('/api/criar-projeto', upload.fields([
    { name: 'rulesFile', maxCount: 1 },
    { name: 'baseFile', maxCount: 1 },
    { name: 'templateFile', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { criadorNome, criadorEmail, mesAno, codigoProjeto, workerColors } = req.body;

    try {
      if (!files.rulesFile || !files.baseFile || !files.templateFile) throw new Error("Arquivos faltando.");

      const bucket = storage.bucket(BUCKET_NAME);
      const pastaProjeto = `projetos/${codigoProjeto}`;

      const rulesDest = `${pastaProjeto}/bases/regras.xlsx`;
      const baseDest = `${pastaProjeto}/bases/base_respostas.xlsx`;
      const templateDest = `${pastaProjeto}/bases/template_tags.xlsx`;

      await Promise.all([
        bucket.upload(files.rulesFile[0].path, { destination: rulesDest }),
        bucket.upload(files.baseFile[0].path, { destination: baseDest }),
        bucket.upload(files.templateFile[0].path, { destination: templateDest })
      ]);

      await firestore.collection('projetos').doc(codigoProjeto).set({
        codigo: codigoProjeto,
        criadorNome: criadorNome,
        criadorEmail: criadorEmail, // CHAVE PARA O HISTÓRICO
        mesAno: mesAno,
        workerColors: JSON.parse(workerColors || '{}'),
        links: { rules: rulesDest, baseRespostas: baseDest, templateTags: templateDest },
        criadoEm: new Date().toISOString(),
        status: 'ativo'
      });

      [files.rulesFile[0], files.baseFile[0], files.templateFile[0]].forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });

      res.status(200).json({ message: "Projeto Publicado!", link: `/responder?p=${codigoProjeto}` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // MANTEMOS AS ROTAS DE RESPOSTA E ANEXO (Não precisam de login)
  app.post('/api/finalizar-resposta', upload.single('file'), async (req, res) => {
    const { codigoProjeto, responder } = req.body;
    const tempPath = req.file?.path;
    try {
      const safeResponder = sanitizePath(responder);
      const destFileName = `projetos/${codigoProjeto}/respostas/${safeResponder}_Final.xlsx`;
      await storage.bucket(BUCKET_NAME).upload(tempPath!, { destination: destFileName });
      await firestore.collection('projetos').doc(codigoProjeto).collection('respostas').doc(safeResponder).set({
        nome: responder,
        arquivo: destFileName,
        respondidoEm: new Date().toISOString()
      });
      if (tempPath) fs.unlinkSync(tempPath);
      res.status(200).json({ message: "Sucesso!" });
    } catch (err) { res.status(500).send(err); }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}