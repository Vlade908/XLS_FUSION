import { Request, Response } from 'express';
import { FormModel, ResponseModel } from '../models/index';

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

    await ResponseModel.create({
      formId: id,
      responderEmail: normalizedEmail,
      data,
      submitted: true,
    });

    res.status(201).json({ message: 'Resposta enviada com sucesso!' });
  } catch (err: any) {
    console.error('❌ [PUBLIC FORM SUBMIT ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao enviar resposta.' });
  }
};
