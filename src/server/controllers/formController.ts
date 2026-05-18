import { Request, Response } from 'express';
import { FormModel, AccessRequestModel } from '../models/index';

export const listForms = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
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
    console.error('❌ [FORMS LIST ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const saveForm = async (req: Request, res: Response) => {
  try {
    const { _id, name, title, description, questions, allowedEmails, allowedDomains } = req.body;
    const ownerEmail = (req as any).user?.email || '';

    if (!name || !ownerEmail) {
      return res.status(400).json({ error: 'Nome e e-mail do proprietário são obrigatórios.' });
    }

    if (_id) {
      const existing = await FormModel.findById(_id);
      if (!existing) return res.status(404).json({ error: 'Formulário não encontrado.' });
      if (existing.ownerEmail !== ownerEmail)
        return res.status(403).json({ error: 'Apenas o dono pode editar o formulário.' });

      existing.name = String(name).trim();
      existing.title = String(title || '');
      existing.description = String(description || '');
      existing.questions = Array.isArray(questions) ? questions : [];
      existing.allowedEmails = Array.isArray(allowedEmails)
        ? allowedEmails.map((e: string) => String(e).trim().toLowerCase())
        : [];
      existing.allowedDomains = Array.isArray(allowedDomains)
        ? allowedDomains.map((d: string) => String(d).trim().toLowerCase())
        : [];
      await existing.save();

      return res.status(200).json({ message: 'Formulário atualizado.', form: existing });
    }

    const form = await FormModel.create({
      name: String(name).trim(),
      title: String(title || ''),
      description: String(description || ''),
      ownerEmail: ownerEmail.toLowerCase(),
      questions: Array.isArray(questions) ? questions : [],
      allowedEmails: Array.isArray(allowedEmails)
        ? allowedEmails.map((e: string) => String(e).trim().toLowerCase())
        : [],
      allowedDomains: Array.isArray(allowedDomains)
        ? allowedDomains.map((d: string) => String(d).trim().toLowerCase())
        : [],
    });

    res.status(201).json({ message: 'Formulário criado.', form });
  } catch (err: any) {
    console.error('❌ [FORM SAVE ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const requestAccess = async (req: Request, res: Response) => {
  try {
    const { formId } = req.params;
    const requesterEmail = (req as any).user?.email;
    const { message } = req.body;

    if (!requesterEmail) return res.status(400).json({ error: 'E-mail do solicitante é obrigatório.' });

    const form = await FormModel.findById(formId);
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    const normalizedEmail = requesterEmail.toLowerCase();
    const domain = normalizedEmail.split('@')[1] || '';

    if (form.allowedEmails.includes(normalizedEmail) || form.allowedDomains.includes(domain)) {
      return res.status(200).json({ message: 'Você já tem acesso a este formulário.' });
    }

    const existing = await AccessRequestModel.findOne({
      formId,
      requesterEmail: normalizedEmail,
      status: 'pending',
    });
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
};

export const listAccessRequests = async (req: Request, res: Response) => {
  try {
    const ownerEmail = (req as any).user?.email;
    if (!ownerEmail) return res.status(400).json({ error: 'E-mail do proprietário é obrigatório.' });

    const forms = await FormModel.find({ ownerEmail }).select('_id name').lean();
    const formIds = forms.map((form) => form._id);
    const requests = await AccessRequestModel.find({
      formId: { $in: formIds },
      status: 'pending',
    }).lean();

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
};

export const handleAccessRequest = async (req: Request, res: Response) => {
  try {
    const { formId, requestId, action } = req.params;
    const normalizedAction = String(action);

    if (!['approve', 'deny'].includes(normalizedAction)) {
      return res.status(400).json({ error: 'Ação inválida.' });
    }

    const ownerEmail = (req as any).user?.email;
    if (!ownerEmail) return res.status(400).json({ error: 'E-mail do proprietário é obrigatório.' });

    const form = await FormModel.findById(formId);
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });
    if (form.ownerEmail !== ownerEmail.toLowerCase())
      return res.status(403).json({ error: 'Somente o dono pode aprovar ou negar.' });

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
};
