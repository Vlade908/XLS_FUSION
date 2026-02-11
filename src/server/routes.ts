/** @format */
import { Express } from 'express';
import { upload } from './gridfs.js'; 
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';

const PROJECT_ID = 'teste-f9d4e';
const BUCKET_NAME = 'auditoria-xls-fusion';
const DATABASE_ID = 'xls-fusion';

const storage = new Storage({ projectId: PROJECT_ID });
const firestore = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID });

export function registerRoutes(app: Express) {
  
  // Lista formulários criados pelo usuário (Admin)
  app.get('/api/meus-formularios', async (req, res) => {
    try {
      const email = String(req.query.email || "").toLowerCase().trim();
      const snapshot = await firestore.collection('projetos')
        .where('criadorEmail', '==', email)
        .orderBy('criadoEm', 'desc').get();
      res.status(200).json(snapshot.docs.map(doc => doc.data()));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // ROTA DO PROJETO LISTADERESPOSTA (Exige Índice de Collection Group)
  app.get('/api/minhas-respostas', async (req, res) => {
    try {
      const email = String(req.query.email || "").toLowerCase().trim();
      console.log(`🔍 [TI]: Buscando grupo de respostas para: ${email}`);
      
      const snapshot = await firestore.collectionGroup('respostas')
        .where('emailRespondente', '==', email)
        .orderBy('respondidoEm', 'desc').get();
      
      const dados = snapshot.docs.map(doc => doc.data());
      console.log(`✅ [TI]: ${dados.length} respostas encontradas.`);
      res.status(200).json(dados);
    } catch (err: any) { 
      console.error("❌ [TI ERROR - LISTADERESPOSTA]:", err.message);
      // Se der erro de índice, o link para criar aparecerá no log do Cloud Run
      res.status(500).json({ error: err.message }); 
    }
  });

  app.get('/api/projeto/:codigo/detalhes', async (req, res) => {
    try {
      const doc = await firestore.collection('projetos').doc(req.params.codigo).get();
      if (!doc.exists) return res.status(404).send("Projeto não encontrado");
      const projeto = doc.data();
      const respSnapshot = await firestore.collection('projetos').doc(req.params.codigo).collection('respostas').get();
      const respostas = respSnapshot.docs.map(d => d.data());
      res.json({ ...projeto, respostas });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  app.get('/api/download-arquivo', async (req, res) => {
    const { path } = req.query;
    try {
      const [content] = await storage.bucket(BUCKET_NAME).file(String(path)).download();
      res.json({ base64: content.toString('base64') });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  app.post('/api/finalizar-resposta-nuvem', upload.single('file'), async (req, res) => {
    const { codigoProjeto, responder, emailRespondente } = req.body;
    try {
      const safeResponder = responder.replace(/[^a-z0-9]/gi, '_');
      const dest = `projetos/${codigoProjeto}/respostas/${safeResponder}_Final.xlsx`;
      
      await storage.bucket(BUCKET_NAME).upload(req.file!.path, { destination: dest });
      
      await firestore.collection('projetos').doc(codigoProjeto).collection('respostas').doc(safeResponder).set({
        nome: responder,
        emailRespondente: emailRespondente?.toLowerCase() || 'anonimo',
        arquivo: dest,
        codigoProjeto,
        respondidoEm: new Date().toISOString()
      });

      if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
      res.status(200).json({ message: "Sucesso!" });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  app.post('/api/criar-projeto', upload.fields([
    { name: 'rulesFile', maxCount: 1 }, { name: 'baseFile', maxCount: 1 }, { name: 'templateFile', maxCount: 1 }
  ]), async (req, res) => {
    const files = req.files as { [fieldname: string]: Express.Multer.File[] };
    const { criadorNome, criadorEmail, mesAno, codigoProjeto, workerColors } = req.body;
    try {
      const bucket = storage.bucket(BUCKET_NAME);
      const pasta = `projetos/${codigoProjeto}`;
      await Promise.all([
        bucket.upload(files.rulesFile[0].path, { destination: `${pasta}/bases/regras.xlsx` }),
        bucket.upload(files.baseFile[0].path, { destination: `${pasta}/bases/base_respostas.xlsx` }),
        bucket.upload(files.templateFile[0].path, { destination: `${pasta}/bases/template_tags.xlsx` })
      ]);
      await firestore.collection('projetos').doc(codigoProjeto).set({
        codigo: codigoProjeto, criadorNome, criadorEmail: criadorEmail.toLowerCase(), mesAno,
        workerColors: JSON.parse(workerColors || '{}'),
        links: { rules: `${pasta}/bases/regras.xlsx`, baseRespostas: `${pasta}/bases/base_respostas.xlsx`, templateTags: `${pasta}/bases/template_tags.xlsx` },
        criadoEm: new Date().toISOString(), status: 'ativo'
      });
      res.status(200).json({ message: "Sucesso" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}