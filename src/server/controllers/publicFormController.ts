import { Request, Response } from 'express';
import { FormModel, ResponseModel, AccessRequestModel, NotificationModel } from '../models/index';

const isValidEmail = (value: any) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const sanitizeResponderEmail = (value: any) => String(value || '').trim().toLowerCase();

const isValidUrl = (value: any) => {
  if (typeof value !== 'string' || !value.trim()) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
};

const validateQuestionAnswer = (answer: any, question: any) => {
  if (answer === undefined || answer === null || answer === '') return true;

  switch (question.type) {
    case 'simnao':
      return answer === 'Sim' || answer === 'Não';
    case 'alternativa':
      return typeof answer === 'string' && question.options?.includes(answer);
    case 'check':
      return Array.isArray(answer) && answer.every((item) => typeof item === 'string');
    case 'respostaescrita':
      return typeof answer === 'string';
    case 'arquivo':
      return typeof answer === 'string' || (typeof answer === 'object' && answer !== null);
    case 'data':
      return typeof answer === 'string' && !Number.isNaN(Date.parse(answer));
    case 'link':
      return typeof answer === 'string' && (answer === '' || isValidUrl(answer));
    default:
      return false;
  }
};

const validateResponseData = (data: any, questions: any[]) => {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) return false;
  const questionMap = new Map(questions.map((question) => [String(question.id), question]));

  return Object.entries(data).every(([key, value]) => {
    const question = questionMap.get(key);
    return question ? validateQuestionAnswer(value, question) : false;
  });
};



export const getPublicForm = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const form = await FormModel.findById(id).lean();
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    res.status(200).json({
      _id: form._id,
      name: form.name,
      title: form.title,
      description: form.description,
      questions: form.questions,
      allowedEmails: form.allowedEmails,
      allowedDomains: form.allowedDomains,
      ownerEmail: form.ownerEmail,
    });
  } catch (err: any) {
    console.error('❌ [PUBLIC FORM ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao carregar o formulário.' });
  }
};

export const submitPublicResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { responderEmail, data } = req.body;
    const normalizedEmail = sanitizeResponderEmail(responderEmail);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'E-mail do respondente inválido.' });
    }

    const form = await FormModel.findById(id).lean();
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    if (!validateResponseData(data, form.questions || [])) {
      return res.status(400).json({ error: 'Dados de resposta inválidos.' });
    }

    // Valida restrição por email/domínio se o formulário for privado
    if (form.allowedEmails && form.allowedEmails.length > 0) {
      const domain = normalizedEmail.split('@')[1] || '';
      const allowed =
        normalizedEmail === form.ownerEmail?.toLowerCase() ||
        form.allowedEmails.includes(normalizedEmail) ||
        (form.allowedDomains && form.allowedDomains.includes(domain.toLowerCase()));

      if (!allowed) {
        return res.status(403).json({ error: 'Você não tem permissão para responder este formulário.' });
      }
    }

    let dbResponse;
    let existing = await ResponseModel.findOne({ formId: id, responderEmail: normalizedEmail });
    if (!existing) {
      dbResponse = await ResponseModel.create({
        formId: id,
        responderEmail: normalizedEmail,
        data: data || {},
        submitted: true,
        history: []
      });
    } else {
      const currentDataStr = JSON.stringify(existing.data || {});
      const newDataStr = JSON.stringify(data || {});
      
      if (currentDataStr !== newDataStr) {
        existing.history.push({
          updatedAt: new Date(),
          changedBy: normalizedEmail,
          data: existing.data || {}
        });
        existing.data = data || {};
      }
      existing.submitted = true;
      dbResponse = await existing.save();
    }

    if (form.ownerEmail.toLowerCase() !== normalizedEmail) {
      try {
        await NotificationModel.create({
          recipientEmail: form.ownerEmail.toLowerCase(),
          type: 'form_response',
          title: 'Formulário Respondido',
          message: `${normalizedEmail} respondeu ao formulário "${form.name}".`,
          formId: form._id,
          formName: form.name,
          relatedId: dbResponse._id,
          read: false,
        });
      } catch (notifErr: any) {
        console.error('⚠️ [NOTIFICATION ERROR]: Failed to create notification for public response:', notifErr.message);
      }
    }

    res.status(201).json({ message: 'Resposta enviada com sucesso!' });
  } catch (err: any) {
    console.error('❌ [PUBLIC FORM SUBMIT ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao enviar resposta.' });
  }
};

export const getPublicResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { email } = req.query;
    const normalizedEmail = sanitizeResponderEmail(email);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'E-mail do respondente inválido.' });
    }

    const form = await FormModel.findById(id).lean();
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    // Validate email permission if the form restricts access
    if (form.allowedEmails && form.allowedEmails.length > 0) {
      const domain = normalizedEmail.split('@')[1] || '';
      const allowed =
        normalizedEmail === form.ownerEmail?.toLowerCase() ||
        form.allowedEmails.includes(normalizedEmail) ||
        (form.allowedDomains && form.allowedDomains.includes(domain.toLowerCase()));

      if (!allowed) {
        return res.status(403).json({ error: 'Você não tem permissão para acessar as respostas deste formulário.' });
      }
    }

    const existing = await ResponseModel.findOne({ formId: id, responderEmail: normalizedEmail }).lean();
    res.status(200).json(existing ? existing.data : {});
  } catch (err: any) {
    console.error('❌ [GET PUBLIC RESPONSE ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao buscar resposta anterior.' });
  }
};

export const requestAccessPublic = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { requesterEmail, message } = req.body;
    const normalizedEmail = sanitizeResponderEmail(requesterEmail);

    if (!normalizedEmail || !isValidEmail(normalizedEmail)) {
      return res.status(400).json({ error: 'E-mail do solicitante inválido.' });
    }

    const form = await FormModel.findById(id);
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    const domain = normalizedEmail.split('@')[1] || '';

    // If already has access
    if (form.allowedEmails.includes(normalizedEmail) || (form.allowedDomains && form.allowedDomains.includes(domain))) {
      return res.status(200).json({ message: 'Este e-mail já possui acesso ao formulário.' });
    }

    // Check if there is already a pending request
    const existing = await AccessRequestModel.findOne({
      formId: id,
      requesterEmail: normalizedEmail,
      status: 'pending',
    });
    if (existing) return res.status(409).json({ error: 'Já existe uma solicitação pendente para este e-mail.' });

    const accessRequest = await AccessRequestModel.create({
      formId: id,
      requesterEmail: normalizedEmail,
      message: String(message || 'Solicitação de acesso via link público.'),
    });

    try {
      await NotificationModel.create({
        recipientEmail: form.ownerEmail.toLowerCase(),
        type: 'access_request',
        title: 'Nova solicitação de acesso',
        message: `${normalizedEmail} solicitou acesso ao formulário "${form.name}".`,
        formId: form._id,
        formName: form.name,
        relatedId: accessRequest._id,
        read: false,
      });
    } catch (notifErr: any) {
      console.error('⚠️ [NOTIFICATION ERROR]: Failed to create notification for public access request:', notifErr.message);
    }

    res.status(201).json({ message: 'Solicitação de acesso criada.', request: accessRequest });
  } catch (err: any) {
    console.error('❌ [PUBLIC ACCESS REQUEST ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao criar solicitação de acesso.' });
  }
};

