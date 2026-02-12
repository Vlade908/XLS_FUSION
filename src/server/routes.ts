/** @format */
import { Express } from 'express';
import { upload } from './gridfs.js'; 
import fs from 'fs';
import { Storage } from '@google-cloud/storage';
import { Firestore } from '@google-cloud/firestore';

// TI: Função interna de normalização para o backend (Remove acentos e espaços)
const backendNorm = (val: string) => 
  val.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")
    .trim();

const PROJECT_ID = 'teste-f9d4e';
const BUCKET_NAME = 'auditoria-xls-fusion';
const DATABASE_ID = 'xls-fusion';

const storage = new Storage({ projectId: PROJECT_ID });
const firestore = new Firestore({ projectId: PROJECT_ID, databaseId: DATABASE_ID });

export function registerRoutes(app: Express) {
  
  // Lista formulários criados por um usuário específico
  app.get('/api/meus-formularios', async (req, res) => {
    try {
      const email = String(req.query.email || "").toLowerCase().trim();
      const snapshot = await firestore.collection('projetos')
        .where('criadorEmail', '==', email)
        .orderBy('criadoEm', 'desc').get();
      res.status(200).json(snapshot.docs.map(doc => doc.data()));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Lista respostas enviadas por um usuário específico (Histórico)
  app.get('/api/minhas-respostas', async (req, res) => {
    try {
      const email = String(req.query.email || "").toLowerCase().trim();
      const snapshot = await firestore.collectionGroup('respostas')
        .where('emailRespondente', '==', email)
        .orderBy('respondidoEm', 'desc').get();
      res.status(200).json(snapshot.docs.map(doc => doc.data()));
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  // Busca detalhes de um projeto específico e suas respostas
  app.get('/api/projeto/:codigo', async (req, res) => {
    try {
      const doc = await firestore.collection('projetos').doc(req.params.codigo).get();
      if (!doc.exists) return res.status(404).send("Projeto não encontrado");
      const projeto = doc.data();
      const respSnapshot = await firestore.collection('projetos').doc(req.params.codigo).collection('respostas').get();
      const respostas = respSnapshot.docs.map(d => d.data());
      res.json({ ...projeto, respostas });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  // Lista arquivos de resposta no Storage para um projeto
  app.get('/api/projeto/:codigo/respostas', async (req, res) => {
    try {
      const prefix = `projetos/${req.params.codigo}/respostas/`;
      const [files] = await storage.bucket(BUCKET_NAME).getFiles({ prefix });
      const fileData = await Promise.all(files.map(async (file) => {
        const [content] = await file.download();
        return { name: file.name.split('/').pop(), base64: content.toString('base64') };
      }));
      res.json(fileData);
    } catch (err: any) { res.status(500).send(err.message); }
  });

  // Download genérico de arquivos do Bucket (Base64)
  app.get('/api/download-arquivo', async (req, res) => {
    const { path } = req.query;
    try {
      const [content] = await storage.bucket(BUCKET_NAME).file(String(path)).download();
      res.json({ base64: content.toString('base64') });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  // ROTA CORRIGIDA: Upload de anexos individuais (fotos/comprovantes)
  app.post('/api/upload-anexo', upload.single('file'), async (req, res) => {
    const { codigoProjeto, responder, quesitoId } = req.body;
    try {
      if (!req.file) throw new Error("Arquivo não recebido pelo servidor.");
      
      const safeResponder = backendNorm(responder);
      // Remove espaços do nome original para evitar erros de URL
      const originalName = req.file.originalname.replace(/\s+/g, '_');
      
      const dest = `projetos/${codigoProjeto}/anexos/${safeResponder}/${quesitoId}_${originalName}`;
      
      await storage.bucket(BUCKET_NAME).upload(req.file.path, { 
        destination: dest,
        metadata: { contentType: req.file.mimetype }
      });

      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      
      res.status(200).json({ message: "Anexo enviado", path: dest });
    } catch (err: any) { 
      console.error("❌ Erro no Upload de Anexo:", err.message);
      res.status(500).send(err.message); 
    }
  });

  // Finaliza a auditoria: sobe o Excel final e registra no Firestore
  app.post('/api/finalizar-resposta-nuvem', upload.single('file'), async (req, res) => {
    const { codigoProjeto, responder, emailRespondente } = req.body;
    try {
      const safeResponder = backendNorm(responder);
      const dest = `projetos/${codigoProjeto}/respostas/${safeResponder}_Final.xlsx`;
      
      await storage.bucket(BUCKET_NAME).upload(req.file!.path, { destination: dest });
      
      await firestore.collection('projetos').doc(codigoProjeto).collection('respostas').doc(safeResponder).set({
        nome: responder,
        nomeLimpo: safeResponder,
        emailRespondente: emailRespondente?.toLowerCase() || 'anonimo',
        arquivo: dest,
        codigoProjeto,
        respondidoEm: new Date().toISOString()
      });

      if (fs.existsSync(req.file!.path)) fs.unlinkSync(req.file!.path);
      res.status(200).json({ message: "Sucesso!" });
    } catch (err: any) { res.status(500).send(err.message); }
  });

  // Criação de novos projetos (Upload das 3 bases obrigatórias)
  app.post('/api/criar-projeto', upload.fields([
    { name: 'rulesFile', maxCount: 1 }, 
    { name: 'baseFile', maxCount: 1 }, 
    { name: 'templateFile', maxCount: 1 }
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
        codigo: codigoProjeto, 
        criadorNome, 
        criadorEmail: criadorEmail.toLowerCase(), 
        mesAno,
        workerColors: JSON.parse(workerColors || '{}'),
        links: { 
          rules: `${pasta}/bases/regras.xlsx`, 
          baseRespostas: `${pasta}/bases/base_respostas.xlsx`, 
          templateTags: `${pasta}/bases/template_tags.xlsx` 
        },
        criadoEm: new Date().toISOString(), 
        status: 'ativo'
      });

      // Limpeza de temporários
      [files.rulesFile[0], files.baseFile[0], files.templateFile[0]].forEach(f => {
        if (fs.existsSync(f.path)) fs.unlinkSync(f.path);
      });

      res.status(200).json({ message: "Sucesso" });
    } catch (err: any) { res.status(500).json({ error: err.message }); }
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));
}