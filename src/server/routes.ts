/** @format */

import { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { upload } from './gridfs';
import { FormModel, AccessRequestModel, SharedSpreadsheetModel, UserModel } from './models';
import { createAuthToken, getAuthUserFromToken, getTokenFromHeader, hashPassword, verifyPassword } from './auth';

const sanitizePath = (text: string) => {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9.]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .replace(/_+/g, '_')
    .trim();
};

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const token = getTokenFromHeader(req.headers.authorization);
  if (!token) {
    return res.status(401).json({ error: 'Token de autenticação não fornecido.' });
  }

  const user = getAuthUserFromToken(token);
  if (!user) {
    return res.status(401).json({ error: 'Token inválido ou expirado.' });
  }

  req.user = user;
  next();
}

export function registerRoutes(app: Express) {
  app.post('/api/signup', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const existingUser = await UserModel.findOne({ email: normalizedEmail });
      if (existingUser) {
        return res.status(409).json({ error: 'Usuário já existe.' });
      }

      const passwordHash = await hashPassword(String(password));
      const user = await UserModel.create({ email: normalizedEmail, passwordHash });
      const token = createAuthToken({ userId: user._id.toString(), email: user.email });
      return res.status(201).json({ token, user: { email: user.email } });
    } catch (err: any) {
      console.error('❌ [SIGNUP ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios.' });
      }

      const normalizedEmail = String(email).trim().toLowerCase();
      const user = await UserModel.findOne({ email: normalizedEmail });
      if (!user) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const valid = await verifyPassword(String(password), user.passwordHash);
      if (!valid) {
        return res.status(401).json({ error: 'Credenciais inválidas.' });
      }

      const token = createAuthToken({ userId: user._id.toString(), email: user.email });
      return res.status(200).json({ token, user: { email: user.email } });
    } catch (err: any) {
      console.error('❌ [LOGIN ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/me', requireAuth, async (req, res) => {
    const email = req.user?.email || null;
    return res.status(200).json({ user: { email } });
  });

  app.get('/api/health', (_req, res) => res.status(200).send('OK'));

  app.get('/api/share/:hash', async (req, res) => {
    try {
      const { hash } = req.params;
      const share = await SharedSpreadsheetModel.findOne({ hash }).lean();
      if (!share) return res.status(404).json({ error: 'Link de compartilhamento não encontrado.' });

      res.status(200).json({
        hash: share.hash,
        originalname: share.originalname,
        ownerEmail: share.ownerEmail,
        description: share.description,
        createdAt: share.createdAt,
        downloadUrl: `/api/share/${share.hash}/download`,
      });
    } catch (err: any) {
      console.error('❌ [SHARE INFO ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/share/:hash/download', async (req, res) => {
    try {
      const { hash } = req.params;
      const share = await SharedSpreadsheetModel.findOne({ hash }).lean();
      if (!share) return res.status(404).json({ error: 'Link de compartilhamento não encontrado.' });

      const fileId = share.fileId;
      if (!mongoose.connection.db) {
        return res.status(500).json({ error: 'Conexão ao banco de dados não disponível.' });
      }

      const bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'uploads' });
      const objectId = new mongoose.Types.ObjectId(fileId);
      const downloadStream = bucket.openDownloadStream(objectId);

      res.setHeader('Content-Disposition', `attachment; filename="${share.originalname}"`);
      downloadStream.pipe(res).on('error', (error) => {
        console.error('❌ [DOWNLOAD ERROR]:', error);
        res.status(500).end();
      });
    } catch (err: any) {
      console.error('❌ [SHARE DOWNLOAD ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/upload-anexo', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('Arquivo não encontrado.');

      const safeResponder = sanitizePath(String(req.body.responder || 'desconhecido'));
      const safeForm = sanitizePath(String(req.body.formName || 'geral'));
      const safeQNumber = sanitizePath(String(req.body.questionNumber || '0'));

      const fileInfo = {
        id: (req.file as any).id,
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

  app.post('/api/upload-planilha', requireAuth, upload.single('file'), async (req, res) => {
    try {
      if (!req.file) return res.status(400).send('Arquivo não encontrado.');

      const fileInfo = {
        id: String((req.file as any).id),
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

  app.get('/api/forms', requireAuth, async (req, res) => {
    try {
      const email = req.user?.email;
      if (!email) {
        return res.status(401).json({ error: 'Usuário não autenticado.' });
      }

      const domain = email.split('@')[1] || '';
      const forms = await FormModel.find({
        $or: [
          { ownerEmail: email },
          { allowedEmails: email },
          { allowedDomains: domain },
        ],
      }).lean();

      const mapped = forms.map((form) => ({
        _id: form._id,
        name: form.name,
        title: form.title,
        description: form.description,
        ownerEmail: form.ownerEmail,
        allowedEmails: form.allowedEmails,
        allowedDomains: form.allowedDomains,
        questions: form.questions,
        isOwner: form.ownerEmail === email,
        hasAccess:
          form.ownerEmail === email ||
          form.allowedEmails.includes(email) ||
          form.allowedDomains.includes(domain),
      }));

      res.status(200).json(mapped);
    } catch (err: any) {
      console.error('❌ [FORMS ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/forms', requireAuth, async (req, res) => {
    try {
      const {
        _id,
        name,
        title,
        description,
        questions,
        allowedEmails,
        allowedDomains,
      } = req.body;
      const ownerEmail = req.user?.email || '';

      if (!name || !ownerEmail) {
        return res.status(400).json({ error: 'Nome e e-mail do proprietário são obrigatórios.' });
      }

      if (_id) {
        const existing = await FormModel.findById(_id);
        if (!existing) return res.status(404).json({ error: 'Formulário não encontrado.' });
        if (existing.ownerEmail !== ownerEmail) return res.status(403).json({ error: 'Apenas o dono pode editar o formulário.' });

        existing.name = String(name).trim();
        existing.title = String(title || '');
        existing.description = String(description || '');
        existing.questions = Array.isArray(questions) ? questions : [];
        existing.allowedEmails = Array.isArray(allowedEmails) ? allowedEmails.map((email: string) => String(email).trim().toLowerCase()) : [];
        existing.allowedDomains = Array.isArray(allowedDomains) ? allowedDomains.map((domain: string) => String(domain).trim().toLowerCase()) : [];
        await existing.save();

        return res.status(200).json({ message: 'Formulário atualizado.', form: existing });
      }

      const form = await FormModel.create({
        name: String(name).trim(),
        title: String(title || ''),
        description: String(description || ''),
        ownerEmail: ownerEmail.toLowerCase(),
        questions: Array.isArray(questions) ? questions : [],
        allowedEmails: Array.isArray(allowedEmails) ? allowedEmails.map((email: string) => String(email).trim().toLowerCase()) : [],
        allowedDomains: Array.isArray(allowedDomains) ? allowedDomains.map((domain: string) => String(domain).trim().toLowerCase()) : [],
      });

      res.status(201).json({ message: 'Formulário criado.', form });
    } catch (err: any) {
      console.error('❌ [FORM SAVE ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/forms/:formId/request-access', requireAuth, async (req, res) => {
    try {
      const { formId } = req.params;
      const requesterEmail = req.user?.email;
      const { message } = req.body;
      if (!requesterEmail) return res.status(400).json({ error: 'E-mail do solicitante é obrigatório.' });

      const form = await FormModel.findById(formId);
      if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });
      const normalizedEmail = requesterEmail.toLowerCase();
      const domain = normalizedEmail.split('@')[1] || '';
      if (form.allowedEmails.includes(normalizedEmail) || form.allowedDomains.includes(domain)) {
        return res.status(200).json({ message: 'Você já tem acesso a este formulário.' });
      }

      const existing = await AccessRequestModel.findOne({ formId, requesterEmail: normalizedEmail, status: 'pending' });
      if (existing) return res.status(409).json({ error: 'Já existe um pedido de acesso pendente.' });

      const accessRequest = await AccessRequestModel.create({
        formId,
        requesterEmail: normalizedEmail,
        message: String(message || ''),
      });

      res.status(201).json({ message: 'Pedido de acesso criado.', request: accessRequest });
    } catch (err: any) {
      console.error('❌ [ACCESS REQUEST ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/api/access-requests', requireAuth, async (req, res) => {
    try {
      const ownerEmail = req.user?.email;
      if (!ownerEmail) return res.status(400).json({ error: 'E-mail do proprietário é obrigatório.' });

      const forms = await FormModel.find({ ownerEmail }).select('_id name').lean();
      const formIds = forms.map((form) => form._id);
      const requests = await AccessRequestModel.find({ formId: { $in: formIds }, status: 'pending' }).lean();

      const requestsWithForm = requests.map((request) => {
        const form = forms.find((f) => f._id.equals(request.formId));
        return {
          _id: request._id,
          formId: request.formId,
          requesterEmail: request.requesterEmail,
          status: request.status,
          message: request.message,
          formName: form?.name || '',
          createdAt: request.createdAt,
        };
      });

      res.status(200).json(requestsWithForm);
    } catch (err: any) {
      console.error('❌ [ACCESS REQUEST LIST ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/api/forms/:formId/requests/:requestId/:action', requireAuth, async (req, res) => {
    try {
      const { formId, requestId, action } = req.params;
      const normalizedAction = String(action);
      if (!['approve', 'deny'].includes(normalizedAction)) {
        return res.status(400).json({ error: 'Ação inválida.' });
      }

      const ownerEmail = req.user?.email;
      if (!ownerEmail) return res.status(400).json({ error: 'E-mail do proprietário é obrigatório.' });

      const form = await FormModel.findById(formId);
      if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });
      if (form.ownerEmail !== ownerEmail.toLowerCase()) return res.status(403).json({ error: 'Somente o dono pode aprovar ou negar.' });

      const request = await AccessRequestModel.findById(requestId);
      if (!request) return res.status(404).json({ error: 'Pedido de acesso não encontrado.' });
      if (request.status !== 'pending') {
        return res.status(400).json({ error: 'Pedido já foi processado.' });
      }

      request.status = action === 'approve' ? 'approved' : 'denied';
      await request.save();

      if (action === 'approve') {
        const email = request.requesterEmail.toLowerCase();
        if (!form.allowedEmails.includes(email)) {
          form.allowedEmails.push(email);
          await form.save();
        }
      }

      res.status(200).json({ message: `Pedido ${action === 'approve' ? 'aprovado' : 'negado'} com sucesso.` });
    } catch (err: any) {
      console.error('❌ [ACCESS REQUEST ACTION ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });

  const createShareHash = () => {
    return `${Math.random().toString(36).slice(2, 8)}${Date.now().toString(36)}`;
  };

  app.post('/api/share-spreadsheet', requireAuth, async (req, res) => {
    try {
      const { fileId, originalname, description } = req.body;
      if (!fileId || !originalname) {
        return res.status(400).json({ error: 'fileId e originalname são obrigatórios.' });
      }

      const ownerEmail = req.user?.email || 'anonymous';
      const hash = createShareHash();
      const share = await SharedSpreadsheetModel.create({
        fileId: String(fileId),
        ownerEmail: ownerEmail.toLowerCase(),
        originalname: String(originalname).trim(),
        description: String(description || ''),
        hash,
      });

      const origin = String(req.headers.origin || `http://localhost:${process.env.PORT || 8080}`);
      const shareUrl = `${origin}/share/${share.hash}`;
      res.status(201).json({ message: 'Link de compartilhamento criado.', hash: share.hash, shareUrl, info: { originalname: share.originalname, ownerEmail: share.ownerEmail, description: share.description, createdAt: share.createdAt } });
    } catch (err: any) {
      console.error('❌ [SHARE ERROR]:', err.message);
      res.status(500).json({ error: err.message });
    }
  });
}
