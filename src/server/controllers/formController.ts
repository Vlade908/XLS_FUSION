import { Request, Response } from 'express';
import { FormModel, AccessRequestModel, ResponseModel, NotificationModel } from '../models/index';

const allowedQuestionTypes = ['simnao', 'alternativa', 'respostaescrita', 'data', 'link', 'check', 'arquivo'] as const;
type QuestionType = (typeof allowedQuestionTypes)[number];

const isValidEmail = (value: any) =>
  typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

const isValidDomain = (value: any) =>
  typeof value === 'string' && /^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(value.trim());

const cleanEmail = (value: any) => String(value || '').trim().toLowerCase();
const cleanDomain = (value: any) => String(value || '').trim().toLowerCase();

const normalizeEmails = (list: any) =>
  Array.isArray(list)
    ? Array.from(
        new Set(
          list.map((item) => cleanEmail(item)).filter((item) => item && isValidEmail(item))
        )
      )
    : [];

const normalizeDomains = (list: any) =>
  Array.isArray(list)
    ? Array.from(
        new Set(
          list.map((item) => cleanDomain(item)).filter((item) => item && isValidDomain(item))
        )
      )
    : [];

const normalizeQuestions = (questions: any) => {
  if (!Array.isArray(questions)) return [];

  return questions
    .map((question) => {
      const id = String(question?.id || '').trim();
      const label = String(question?.label || '').trim();
      const type = String(question?.type || '') as QuestionType;
      const options = Array.isArray(question?.options)
        ? question.options.map((option: any) => String(option || '').trim()).filter(Boolean)
        : [];
      const parentId = question?.parentId ? String(question.parentId).trim() : null;
      const showWhenValue = String(question?.showWhenValue || '').trim();

      if (!id || !label || !allowedQuestionTypes.includes(type)) {
        return null;
      }

      if ((type === 'alternativa' || type === 'check') && !options.length) {
        return null;
      }

      return { id, label, type, options, parentId, showWhenValue };
    })
    .filter(Boolean) as any[];
};

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

    const mapped = forms.map((form: any) => ({
      _id: form._id,
      name: form.name,
      title: form.title,
      description: form.description,
      ownerEmail: form.ownerEmail,
      allowedEmails: form.allowedEmails,
      allowedDomains: form.allowedDomains,
      questions: form.questions,
      history: form.history || [],
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
    const normalizedOwnerEmail = cleanEmail(ownerEmail);
    const nameValue = String(name || '').trim();
    const titleValue = String(title || '').trim();
    const descriptionValue = String(description || '').trim();
    const normalizedQuestions = normalizeQuestions(questions);
    const normalizedAllowedEmails = normalizeEmails(allowedEmails);
    const normalizedAllowedDomains = normalizeDomains(allowedDomains);

    if (!nameValue) {
      return res.status(400).json({ error: 'Nome do formulário é obrigatório.' });
    }

    if (!normalizedOwnerEmail || !isValidEmail(normalizedOwnerEmail)) {
      return res.status(400).json({ error: 'E-mail do proprietário inválido.' });
    }

    if (_id) {
      const existing = await FormModel.findById(_id);
      if (!existing) return res.status(404).json({ error: 'Formulário não encontrado.' });
      if (existing.ownerEmail !== normalizedOwnerEmail)
        return res.status(403).json({ error: 'Apenas o dono pode editar o formulário.' });

      // Generate structural changes logs
      const changes: any[] = [];
      if (existing.name !== nameValue) {
        changes.push({ field: 'Nome', from: existing.name, to: nameValue });
      }
      if (existing.title !== titleValue) {
        changes.push({ field: 'Título', from: existing.title, to: titleValue });
      }
      if (existing.description !== descriptionValue) {
        changes.push({ field: 'Descrição', from: existing.description, to: descriptionValue });
      }
      
      const oldEmails = existing.allowedEmails || [];
      if (JSON.stringify([...oldEmails].sort()) !== JSON.stringify([...normalizedAllowedEmails].sort())) {
        changes.push({ field: 'E-mails autorizados', from: oldEmails.join(', '), to: normalizedAllowedEmails.join(', ') });
      }
      
      const oldDomains = existing.allowedDomains || [];
      if (JSON.stringify([...oldDomains].sort()) !== JSON.stringify([...normalizedAllowedDomains].sort())) {
        changes.push({ field: 'Domínios autorizados', from: oldDomains.join(', '), to: normalizedAllowedDomains.join(', ') });
      }
      
      const oldQuestions = existing.questions || [];
      const oldQMap = new Map(oldQuestions.map((q: any) => [q.id, q]));
      const newQMap = new Map(normalizedQuestions.map((q: any) => [q.id, q]));
      
      for (const rawQ of normalizedQuestions) {
        const q = rawQ as any;
        const oldQ = oldQMap.get(q.id) as any;
        if (!oldQ) {
          changes.push({ field: `Pergunta Adicionada: "${q.label}"`, from: null, to: `Tipo: ${q.type}` });
        } else {
          const qChanges: string[] = [];
          if (oldQ.label !== q.label) qChanges.push(`Rótulo: de "${oldQ.label}" para "${q.label}"`);
          if (oldQ.type !== q.type) qChanges.push(`Tipo: de "${oldQ.type}" para "${q.type}"`);
          if (JSON.stringify(oldQ.options) !== JSON.stringify(q.options)) {
            qChanges.push(`Opções: de [${oldQ.options.join(', ')}] para [${q.options.join(', ')}]`);
          }
          if (oldQ.parentId !== q.parentId || oldQ.showWhenValue !== q.showWhenValue) {
            qChanges.push(`Condição: de (Se Q${oldQ.parentId} for ${oldQ.showWhenValue}) para (Se Q${q.parentId} for ${q.showWhenValue})`);
          }
          if (qChanges.length > 0) {
            changes.push({ field: `Pergunta Alterada: "${q.label}"`, from: null, to: qChanges.join(' | ') });
          }
        }
      }
      
      for (const rawOldQ of oldQuestions) {
        const oldQ = rawOldQ as any;
        if (!newQMap.has(oldQ.id)) {
          changes.push({ field: `Pergunta Removida`, from: `"${oldQ.label}" (Tipo: ${oldQ.type})`, to: null });
        }
      }

      if (changes.length > 0) {
        if (!existing.history) {
          existing.history = [];
        }
        existing.history.push({
          updatedAt: new Date(),
          changedBy: ownerEmail,
          changes: changes
        });
      }

      existing.name = nameValue;
      existing.title = titleValue;
      existing.description = descriptionValue;
      existing.questions = normalizedQuestions;
      existing.allowedEmails = normalizedAllowedEmails;
      existing.allowedDomains = normalizedAllowedDomains;
      await existing.save();

      return res.status(200).json({ message: 'Formulário atualizado.', form: existing });
    }

    const form = await FormModel.create({
      name: nameValue,
      title: titleValue,
      description: descriptionValue,
      ownerEmail: normalizedOwnerEmail,
      questions: normalizedQuestions,
      allowedEmails: normalizedAllowedEmails,
      allowedDomains: normalizedAllowedDomains,
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
      console.error('⚠️ [NOTIFICATION ERROR]: Failed to create notification for private access request:', notifErr.message);
    }

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
      const form = forms.find((f) => String(f._id) === String(request.formId));
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

export const getFormById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = (req as any).user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const form = await FormModel.findById(id).lean();
    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado.' });
    }

    const domain = email.split('@')[1] || '';
    const isOwner = form.ownerEmail === email;
    const isAllowedEmail = form.allowedEmails && form.allowedEmails.includes(email);
    const isAllowedDomain = form.allowedDomains && form.allowedDomains.includes(domain);
    const isPublic = (!form.allowedEmails || form.allowedEmails.length === 0) && (!form.allowedDomains || form.allowedDomains.length === 0);

    if (!isOwner && !isAllowedEmail && !isAllowedDomain && !isPublic) {
      return res.status(403).json({ error: 'Você não tem permissão para acessar este formulário.' });
    }

    res.status(200).json({
      ...form,
      isOwner
    });
  } catch (err: any) {
    console.error('❌ [GET FORM BY ID ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const listUserResponses = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Usuário não autenticado.' });
    }

    const responses = await ResponseModel.find({ responderEmail: email }).lean();
    const formIds = responses.map(r => r.formId);
    const forms = await FormModel.find({ _id: { $in: formIds } }).lean();

    const result = responses.map(response => {
      const form = forms.find(f => f._id.toString() === response.formId.toString());
      return {
        _id: response._id,
        formId: response.formId,
        submitted: response.submitted,
        updatedAt: (response as any).updatedAt,
        createdAt: (response as any).createdAt,
        data: response.data,
        form: form ? {
          name: form.name,
          title: form.title,
          description: form.description,
          questions: form.questions
        } : null
      };
    }).filter(r => r.form !== null);

    res.status(200).json(result);
  } catch (err: any) {
    console.error('❌ [MY RESPONSES LIST ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getUserResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = (req as any).user?.email;
    if (!email) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const response = await ResponseModel.findOne({ formId: id, responderEmail: email }).lean();
    res.status(200).json(response || { data: {} });
  } catch (err: any) {
    console.error('❌ [GET USER RESPONSE ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const saveUserResponse = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = (req as any).user?.email;
    const { data } = req.body;

    if (!email) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const form = await FormModel.findById(id);
    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado.' });
    }

    // Check permissions
    const domain = email.split('@')[1] || '';
    const isOwner = form.ownerEmail === email;
    const isAllowedEmail = form.allowedEmails && form.allowedEmails.includes(email);
    const isAllowedDomain = form.allowedDomains && form.allowedDomains.includes(domain);
    const isPublic = (!form.allowedEmails || form.allowedEmails.length === 0) && (!form.allowedDomains || form.allowedDomains.length === 0);

    if (!isOwner && !isAllowedEmail && !isAllowedDomain && !isPublic) {
      return res.status(403).json({ error: 'Você não tem permissão para responder este formulário.' });
    }

    let existing = await ResponseModel.findOne({ formId: id, responderEmail: email });
    if (!existing) {
      existing = await ResponseModel.create({
        formId: id,
        responderEmail: email,
        data: data || {},
        submitted: true,
        history: []
      });
    } else {
      // Compare data to see if there is any change
      const currentDataStr = JSON.stringify(existing.data || {});
      const newDataStr = JSON.stringify(data || {});
      
      if (currentDataStr !== newDataStr) {
        // Add snapshot of current answers to history
        existing.history.push({
          updatedAt: new Date(),
          changedBy: email,
          data: existing.data || {}
        });
        existing.data = data || {};
      }
      existing.submitted = true;
      await existing.save();
    }

    if (form.ownerEmail.toLowerCase() !== email.toLowerCase()) {
      try {
        await NotificationModel.create({
          recipientEmail: form.ownerEmail.toLowerCase(),
          type: 'form_response',
          title: 'Formulário Respondido',
          message: `${email} respondeu ao formulário "${form.name}".`,
          formId: form._id,
          formName: form.name,
          relatedId: existing._id,
          read: false,
        });
      } catch (notifErr: any) {
        console.error('⚠️ [NOTIFICATION ERROR]: Failed to create notification for private response:', notifErr.message);
      }
    }

    res.status(200).json({ message: 'Resposta salva com sucesso!', response: existing });
  } catch (err: any) {
    console.error('❌ [SAVE USER RESPONSE ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getFormResponsesDashboard = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const email = (req as any).user?.email;

    if (!email) {
      return res.status(401).json({ error: 'Não autenticado.' });
    }

    const form = await FormModel.findById(id);
    if (!form) {
      return res.status(404).json({ error: 'Formulário não encontrado.' });
    }

    if (form.ownerEmail !== email) {
      return res.status(403).json({ error: 'Apenas o criador do formulário pode ver as respostas.' });
    }

    const responses = await ResponseModel.find({ formId: id }).sort({ updatedAt: -1 }).lean();
    res.status(200).json(responses);
  } catch (err: any) {
    console.error('❌ [GET RESPONSES DASHBOARD ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};

export const getAnalyticsOverview = async (req: Request, res: Response) => {
  try {
    const email = (req as any).user?.email;
    if (!email) return res.status(401).json({ error: 'Não autenticado.' });

    // All forms owned by this user
    const myForms = await FormModel.find({ ownerEmail: email }).lean();
    const myFormIds = myForms.map((f: any) => f._id);

    // All responses for those forms
    const allResponses = await ResponseModel.find({ formId: { $in: myFormIds } }).lean();

    // ── KPI 1: totals ──────────────────────────────────────────────
    const totalForms = myForms.length;
    const totalResponses = allResponses.length;
    const uniqueRespondents = new Set(allResponses.map((r: any) => r.responderEmail)).size;
    const publicForms = myForms.filter((f: any) =>
      (!f.allowedEmails || f.allowedEmails.length === 0) &&
      (!f.allowedDomains || f.allowedDomains.length === 0)
    ).length;
    const privateForms = totalForms - publicForms;

    // ── KPI 2: responses per day (last 14 days) ────────────────────
    const now = new Date();
    const dayLabels: string[] = [];
    const responsesPerDay: number[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      dayLabels.push(label);
      const count = allResponses.filter((r: any) => {
        const rd = new Date((r as any).createdAt);
        return (
          rd.getDate() === d.getDate() &&
          rd.getMonth() === d.getMonth() &&
          rd.getFullYear() === d.getFullYear()
        );
      }).length;
      responsesPerDay.push(count);
    }
    const timeSeries = dayLabels.map((label, i) => ({ date: label, respostas: responsesPerDay[i] }));

    // ── KPI 3: responses per form ──────────────────────────────────
    const perForm = myForms.map((f: any) => {
      const count = allResponses.filter((r: any) => String(r.formId) === String(f._id)).length;
      return {
        name: (f.title || f.name || 'Sem título').slice(0, 24),
        fullName: f.title || f.name || 'Sem título',
        respostas: count,
        perguntas: (f.questions || []).length,
        isPublic:
          (!f.allowedEmails || f.allowedEmails.length === 0) &&
          (!f.allowedDomains || f.allowedDomains.length === 0),
      };
    }).sort((a, b) => b.respostas - a.respostas);

    // ── KPI 4: question type distribution ─────────────────────────
    const typeCounts: Record<string, number> = {};
    for (const form of myForms) {
      for (const q of (form.questions as any[]) || []) {
        typeCounts[q.type] = (typeCounts[q.type] || 0) + 1;
      }
    }
    const typeLabels: Record<string, string> = {
      simnao: 'Sim/Não',
      alternativa: 'Alternativa',
      respostaescrita: 'Texto Livre',
      data: 'Data',
      link: 'Link',
      check: 'Múltipla Escolha',
      arquivo: 'Arquivo',
    };
    const questionTypeDistribution = Object.entries(typeCounts).map(([type, value]) => ({
      name: typeLabels[type] || type,
      value,
    }));

    // ── KPI 5: avg response rate ───────────────────────────────────
    const avgResponsesPerForm = totalForms > 0 ? (totalResponses / totalForms).toFixed(1) : '0';

    res.status(200).json({
      totalForms,
      totalResponses,
      uniqueRespondents,
      publicForms,
      privateForms,
      avgResponsesPerForm: parseFloat(avgResponsesPerForm),
      timeSeries,
      perForm,
      questionTypeDistribution,
    });
  } catch (err: any) {
    console.error('❌ [ANALYTICS OVERVIEW ERROR]:', err.message);
    res.status(500).json({ error: err.message });
  }
};
