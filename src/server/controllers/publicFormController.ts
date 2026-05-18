import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { FormModel } from '../models/index';

// Inline model definition aqui para evitar re-registro em cada request
const ResponseSchema = new mongoose.Schema(
  {
    formId: { type: mongoose.Schema.Types.ObjectId, ref: 'Form', required: true },
    responderEmail: { type: String, required: true },
    data: { type: mongoose.Schema.Types.Mixed, default: {} },
    submitted: { type: Boolean, default: false },
  },
  { timestamps: true }
);

const ResponseModel =
  mongoose.models.Response || mongoose.model('Response', ResponseSchema);

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

    if (!responderEmail) {
      return res.status(400).json({ error: 'E-mail do respondente é obrigatório.' });
    }

    const form = await FormModel.findById(id).lean();
    if (!form) return res.status(404).json({ error: 'Formulário não encontrado.' });

    // Valida restrição por email/domínio se o formulário for privado
    if (form.allowedEmails && form.allowedEmails.length > 0) {
      const domain = responderEmail.split('@')[1] || '';
      const emailLower = responderEmail.toLowerCase();
      const allowed =
        form.allowedEmails.includes(emailLower) ||
        (form.allowedDomains && form.allowedDomains.includes(domain.toLowerCase()));

      if (!allowed) {
        return res.status(403).json({ error: 'Você não tem permissão para responder este formulário.' });
      }
    }

    await ResponseModel.create({
      formId: id,
      responderEmail: responderEmail.toLowerCase(),
      data,
      submitted: true,
    });

    res.status(201).json({ message: 'Resposta enviada com sucesso!' });
  } catch (err: any) {
    console.error('❌ [PUBLIC FORM SUBMIT ERROR]:', err.message);
    res.status(500).json({ error: 'Erro ao enviar resposta.' });
  }
};
