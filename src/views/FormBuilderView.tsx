import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Eye, 
  Save, 
  FileText, 
  Users, 
  Settings, 
  CheckCircle, 
  XCircle, 
  ArrowUp, 
  ArrowDown, 
  Copy, 
  Zap, 
  Link, 
  History, 
  ArrowLeft, 
  Calendar,
  ToggleLeft,
  Disc,
  AlignLeft,
  Link2,
  CheckSquare,
  FileUp
} from 'lucide-react';
import { motion } from 'framer-motion';

type QuestionType = 'simnao' | 'alternativa' | 'respostaescrita' | 'data' | 'link' | 'check' | 'arquivo';

type QuestionDraft = {
  label?: string;
  type: QuestionType;
  options: string[];
  parentId?: string | null;
  showWhenValue?: string;
};

interface ManualQuestion {
  id: string;
  label: string;
  type: QuestionType;
  options: string[];
  parentId?: string | null;
  showWhenValue?: string;
}

interface ManualForm {
  _id?: string;
  name: string;
  title: string;
  description: string;
  ownerEmail: string;
  questions: ManualQuestion[];
  allowedEmails: string[];
  allowedDomains: string[];
  hasAccess?: boolean;
  isOwner?: boolean;
  history?: {
    updatedAt: string;
    changedBy: string;
    changes: { field: string; from: any; to: any }[];
  }[];
}

const questionTypeLabels = {
  simnao: 'Sim/Não',
  alternativa: 'Alternativa',
  respostaescrita: 'Texto Livre',
  data: 'Data',
  link: 'Link',
  check: 'Múltipla Escolha',
  arquivo: 'Texto + Envio de Arquivo'
};

const questionTypeIcons = {
  simnao: <ToggleLeft className="w-4.5 h-4.5 text-emerald-500" />,
  alternativa: <Disc className="w-4.5 h-4.5 text-blue-500" />,
  respostaescrita: <AlignLeft className="w-4.5 h-4.5 text-amber-500" />,
  data: <Calendar className="w-4.5 h-4.5 text-indigo-500" />,
  link: <Link2 className="w-4.5 h-4.5 text-pink-500" />,
  check: <CheckSquare className="w-4.5 h-4.5 text-purple-500" />,
  arquivo: <FileUp className="w-4.5 h-4.5 text-cyan-500" />
};

const quickTemplates = [
  { type: 'simnao' as QuestionType, label: 'Você concorda com os termos?', options: [] },
  { type: 'respostaescrita' as QuestionType, label: 'Qual é o seu nome completo?', options: [] },
  { type: 'alternativa' as QuestionType, label: 'Qual é o seu cargo?', options: ['Gerente', 'Analista', 'Assistente', 'Outro'] },
  { type: 'data' as QuestionType, label: 'Qual é a data de nascimento?', options: [] },
  { type: 'link' as QuestionType, label: 'Qual é o seu LinkedIn?', options: [] },
  { type: 'check' as QuestionType, label: 'Quais habilidades você possui?', options: ['React', 'Node.js', 'Python', 'SQL', 'AWS'] },
  { type: 'arquivo' as QuestionType, label: 'Envie seu relatório/comprovante e comente sobre ele:', options: [] }
];

export default function FormBuilderView() {
  const { user, authFetch } = useAuth();
  const email = user?.email || '';
  const [forms, setForms] = useState<ManualForm[]>([]);
  const [editingForm, setEditingForm] = useState<ManualForm | null>(null);
  const [newQuestion, setNewQuestion] = useState<QuestionDraft>({ type: 'simnao', options: [] });
  const [emailInput, setEmailInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'forms' | 'create'>('forms');
  const [showPreview, setShowPreview] = useState(false);
  const [previewAnswers, setPreviewAnswers] = useState<Record<string, any>>({});

  // States for the details modal
  const [selectedDetailsForm, setSelectedDetailsForm] = useState<ManualForm | null>(null);
  const [detailsTab, setDetailsTab] = useState<'geral' | 'historico' | 'respostas'>('geral');
  const [formResponses, setFormResponses] = useState<any[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  const [selectedRespondent, setSelectedRespondent] = useState<any | null>(null);
  const [selectedSnapshotIndex, setSelectedSnapshotIndex] = useState<number | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [copiedShareId, setCopiedShareId] = useState<string | null>(null);

  const handleCopyId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const handleCopyShareLink = (id: string) => {
    const url = `${window.location.origin}/share-form/${id}`;
    navigator.clipboard.writeText(url);
    setCopiedShareId(id);
    setTimeout(() => setCopiedShareId(null), 1500);
  };

  const loadFormResponses = async (formId: string) => {
    setLoadingResponses(true);
    try {
      const response = await authFetch(`/api/forms/${formId}/responses-dashboard`);
      if (response.ok) {
        const data = await response.json();
        setFormResponses(Array.isArray(data) ? data : []);
      } else {
        setFormResponses([]);
      }
    } catch (error) {
      console.error('Erro ao carregar respostas do formulário:', error);
      setFormResponses([]);
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    if (!user) return;
    loadForms();
  }, [user]);

  const loadForms = async () => {
    if (!user) return;
    try {
      const response = await authFetch('/api/forms');
      const data = await response.json();
      setForms(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error(error);
    }
  };

  const resetDraft = () => {
    setEditingForm({
      name: '',
      title: '',
      description: '',
      ownerEmail: email,
      questions: [],
      allowedEmails: [],
      allowedDomains: [],
      hasAccess: true,
      isOwner: true,
    });
    setNewQuestion({ type: 'simnao', options: [] });
    setActiveTab('create');
  };

  const selectForm = (form: ManualForm) => {
    setEditingForm({ ...form, allowedEmails: form.allowedEmails || [], allowedDomains: form.allowedDomains || [] });
    setActiveTab('create');
  };

  const updateDraft = (changes: Partial<ManualForm>) => {
    if (!editingForm) return;
    setEditingForm({ ...editingForm, ...changes });
  };

  const loadTemplate = (template: typeof quickTemplates[0]) => {
    setNewQuestion({
      label: template.label,
      type: template.type,
      options: template.options ? [...template.options] : [],
      parentId: '',
      showWhenValue: ''
    });
  };

  const addQuestion = () => {
    if (!editingForm) return;
    if (!newQuestion.label?.trim()) return;

    const nextQuestion: ManualQuestion = {
      id: `Q${Date.now()}`,
      label: newQuestion.label.trim(),
      type: newQuestion.type as QuestionType,
      options: newQuestion.options ? newQuestion.options.filter(Boolean) : [],
      parentId: newQuestion.parentId || null,
      showWhenValue: newQuestion.showWhenValue || '',
    };

    setEditingForm({ ...editingForm, questions: [...editingForm.questions, nextQuestion] });
    setNewQuestion({ type: 'simnao', options: [], parentId: '', showWhenValue: '' });
  };

  const removeQuestion = (id: string) => {
    if (!editingForm) return;
    updateDraft({ questions: editingForm.questions.filter((question) => question.id !== id) });
  };

  const moveQuestion = (fromIndex: number, toIndex: number) => {
    if (!editingForm) return;
    const questions = [...editingForm.questions];
    const [moved] = questions.splice(fromIndex, 1);
    questions.splice(toIndex, 0, moved);
    updateDraft({ questions });
  };

  const duplicateQuestion = (question: ManualQuestion) => {
    if (!editingForm) return;
    const duplicated: ManualQuestion = {
      ...question,
      id: `Q${Date.now()}`,
      label: `${question.label} (Cópia)`,
    };
    setEditingForm({ ...editingForm, questions: [...editingForm.questions, duplicated] });
  };

  const saveForm = async () => {
    if (!editingForm || !user) return;
    if (!editingForm.name.trim()) {
      setStatusMessage('Preencha o nome do formulário.');
      return;
    }

    const body = {
      ...editingForm,
      name: editingForm.name.trim(),
      title: editingForm.title.trim(),
      description: editingForm.description.trim(),
      allowedEmails: Array.from(new Set(editingForm.allowedEmails.map((email) => email.trim().toLowerCase()).filter(Boolean))),
      allowedDomains: Array.from(new Set(editingForm.allowedDomains.map((domain) => domain.trim().toLowerCase()).filter(Boolean))),
      ownerEmail: email,
    };

    try {
      const response = await authFetch('/api/forms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Não foi possível salvar o formulário.');
      }
      setStatusMessage('Formulário salvo com sucesso.');
      setEditingForm(data.form);
      loadForms();
    } catch (error: any) {
      setStatusMessage(String(error.message || error));
    }
  };

  const requestAccess = async (formId: string) => {
    if (!user) return;
    try {
      const response = await authFetch(`/api/forms/${formId}/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: 'Preciso de acesso ao formulário.' }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao solicitar acesso.');
      setStatusMessage('Pedido de acesso enviado. Aguarde aprovação do dono.');
    } catch (error: any) {
      setStatusMessage(String(error.message || error));
    }
  };

  const renderFormPreview = () => {
    if (!editingForm) return null;

    return (
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3 mb-6">
          <Eye className="w-5 h-5 text-slate-600" />
          <h3 className="font-bold text-slate-900">Pré-visualização</h3>
        </div>

        <div className="space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-slate-900 mb-2">{editingForm.title || 'Título do Formulário'}</h1>
            <p className="text-slate-600">{editingForm.description || 'Descrição do formulário'}</p>
          </div>

          {editingForm.questions.map((question, index) => {
            if (question.parentId) {
              const parentVal = previewAnswers[question.parentId];
              if (
                !parentVal ||
                (Array.isArray(parentVal) && !parentVal.includes(question.showWhenValue)) ||
                (!Array.isArray(parentVal) && String(parentVal) !== String(question.showWhenValue))
              ) {
                return null;
              }
            }
            return (
            <div key={question.id} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">{questionTypeIcons[question.type]}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 mb-2">{question.label}</p>

                  {question.type === 'simnao' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="radio" name={`q${index}`} value="Sim" onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="text-indigo-600" />
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name={`q${index}`} value="Não" onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="text-indigo-600" />
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                  )}

                  {question.type === 'alternativa' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center gap-2">
                          <input type="radio" name={`q${index}`} value={option} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="text-indigo-600" />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'check' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center gap-2">
                          <input type="checkbox" value={option} onChange={(e) => {
                            const current = previewAnswers[question.id] || [];
                            const next = e.target.checked ? [...current, option] : current.filter((o: string) => o !== option);
                            setPreviewAnswers({ ...previewAnswers, [question.id]: next });
                          }} className="text-indigo-600" />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'respostaescrita' && (
                    <textarea value={previewAnswers[question.id] || ''} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Digite sua resposta..." rows={3} />
                  )}

                  {question.type === 'data' && (
                    <input type="date" value={previewAnswers[question.id] || ''} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="rounded-lg border border-slate-200 p-3 text-sm" />
                  )}

                  {question.type === 'link' && (
                    <input type="url" value={previewAnswers[question.id] || ''} onChange={(e) => setPreviewAnswers({ ...previewAnswers, [question.id]: e.target.value })} className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="https://..." />
                  )}

                  {question.type === 'arquivo' && (
                    <div className="space-y-3">
                      <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Escreva observações ou comentários..." rows={3} disabled />
                      <div className="p-4 bg-slate-50 border-2 border-dashed border-slate-200 rounded-xl text-center">
                        <span className="text-xs text-slate-500 font-bold">📎 Enviar arquivo...</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderDetailsModal = () => {
    if (!selectedDetailsForm) return null;

    const isOwner = selectedDetailsForm.ownerEmail === email;
    const historyLogs = selectedDetailsForm.history || [];

    const renderAnswerVal = (question: any, val: any) => {
      if (val === undefined || val === null || val === '') {
        return <span className="text-slate-400 italic">Sem resposta</span>;
      }
      if (question.type === 'check') {
        return (
          <div className="flex flex-wrap gap-1">
            {Array.isArray(val) ? val.map((v, i) => (
              <span key={i} className="px-2.5 py-1 bg-indigo-50 text-indigo-700 text-xs font-bold rounded-lg border border-indigo-100">
                {v}
              </span>
            )) : String(val)}
          </div>
        );
      }
      if (question.type === 'arquivo') {
        const text = val.text || '';
        const fileName = val.fileName || '';
        const fileId = val.fileId || '';
        return (
          <div className="space-y-2">
            {text && <p className="text-slate-700 text-sm whitespace-pre-wrap">{text}</p>}
            {fileId && (
              <div className="flex items-center gap-2 p-3 bg-emerald-50 text-emerald-800 text-xs font-bold rounded-xl border border-emerald-100 inline-flex">
                <span>📎 {fileName || 'Arquivo'}</span>
                <span className="text-[10px] text-slate-400 font-normal">({fileId})</span>
              </div>
            )}
          </div>
        );
      }
      return <span className="text-slate-700 text-sm font-semibold whitespace-pre-wrap">{String(val)}</span>;
    };

    return (
      <div className="form-details-modal-overlay fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className="form-details-modal-container bg-white rounded-[2rem] border border-slate-200 shadow-2xl max-w-4xl w-full max-h-[85vh] flex flex-col overflow-hidden"
        >
          {/* Modal Header */}
          <div className="flex items-start justify-between p-6 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white">
            <div>
              <span className="text-[10px] font-black uppercase bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full mb-2 inline-block">
                Detalhes do Formulário
              </span>
              <h2 className="text-2xl font-black text-slate-900 leading-tight">
                {selectedDetailsForm.title || selectedDetailsForm.name}
              </h2>
              <p className="text-sm text-slate-500 mt-1 font-medium">
                {selectedDetailsForm.description || 'Sem descrição cadastrada.'}
              </p>
            </div>
            <button
              onClick={() => setSelectedDetailsForm(null)}
              className="text-slate-400 hover:text-slate-650 p-2 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <XCircle className="w-6 h-6" />
            </button>
          </div>

          {/* Modal Body Wrapper */}
          <div className="form-details-modal-body-wrapper flex flex-col flex-1 min-h-0">
            {/* Modal Navigation Tabs */}
            <div className="form-details-modal-tabs flex border-b border-slate-100 p-2 gap-1 bg-slate-50/50">
            <button
              onClick={() => {
                setDetailsTab('geral');
                setSelectedRespondent(null);
                setSelectedSnapshotIndex(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                detailsTab === 'geral'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Geral
            </button>
            <button
              onClick={() => {
                setDetailsTab('historico');
                setSelectedRespondent(null);
                setSelectedSnapshotIndex(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                detailsTab === 'historico'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Histórico do Formulário
            </button>
            <button
              onClick={() => {
                setDetailsTab('respostas');
                setSelectedRespondent(null);
                setSelectedSnapshotIndex(null);
              }}
              className={`flex-1 py-3 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-all ${
                detailsTab === 'respostas'
                  ? 'bg-white text-indigo-600 shadow-sm border border-slate-200/50'
                  : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              Respostas ({loadingResponses ? '...' : formResponses.length})
            </button>
          </div>

          {/* Modal Content Area */}
          <div className="form-details-modal-content flex-1 overflow-y-auto p-6 min-h-0 custom-scrollbar">
            {detailsTab === 'geral' && (
              <div className="space-y-6">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="p-5 bg-gradient-to-br from-indigo-50 to-indigo-100/50 border border-indigo-100 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black uppercase text-indigo-600 tracking-wider">Perguntas</span>
                    <span className="text-3xl font-black text-indigo-950 mt-2">{selectedDetailsForm.questions.length}</span>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-emerald-50 to-emerald-100/50 border border-emerald-100 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Total Respostas</span>
                    <span className="text-3xl font-black text-emerald-950 mt-2">
                      {loadingResponses ? '...' : formResponses.length}
                    </span>
                  </div>
                  <div className="p-5 bg-gradient-to-br from-slate-50 to-slate-100 border border-slate-200/60 rounded-2xl flex flex-col justify-between shadow-sm">
                    <span className="text-[10px] font-black uppercase text-slate-500 tracking-wider">Privacidade</span>
                    <span className="text-sm font-bold text-slate-800 mt-2 truncate">
                      {selectedDetailsForm.allowedEmails.length > 0 || selectedDetailsForm.allowedDomains.length > 0
                        ? 'Restrito (Privado)'
                        : 'Livre (Público)'}
                    </span>
                  </div>
                </div>

                {/* Metadata & Allowed list */}
                <div className="bg-slate-50 rounded-2xl border border-slate-150 p-6 space-y-4">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest">Informações Adicionais</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-medium">
                    <div>
                      <span className="text-slate-400">Proprietário:</span>
                      <p className="text-slate-800 font-bold">{selectedDetailsForm.ownerEmail}</p>
                    </div>
                    <div>
                      <span className="text-slate-400">Código do Formulário:</span>
                      <div className="flex items-center gap-2 mt-1">
                        <code className="bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-slate-700 font-mono font-bold text-xs select-all">
                          {selectedDetailsForm._id}
                        </code>
                        <button
                          onClick={() => handleCopyId(selectedDetailsForm._id || '')}
                          className="p-2 bg-white hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center shadow-sm"
                          title="Copiar Código"
                        >
                          {copiedId === selectedDetailsForm._id ? (
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-600 animate-in zoom-in-50 duration-150" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                    {selectedDetailsForm.allowedEmails.length > 0 && (
                      <div>
                        <span className="text-slate-400">E-mails autorizados:</span>
                        <p className="text-slate-850 truncate">{selectedDetailsForm.allowedEmails.join(', ')}</p>
                      </div>
                    )}
                    {selectedDetailsForm.allowedDomains.length > 0 && (
                      <div>
                        <span className="text-slate-400">Domínios autorizados:</span>
                        <p className="text-slate-850 truncate">{selectedDetailsForm.allowedDomains.map(d => `@${d}`).join(', ')}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Structure Preview */}
                <div className="space-y-3">
                  <h4 className="text-xs font-black text-slate-700 uppercase tracking-widest pl-1">Perguntas do Formulário</h4>
                  <div className="space-y-2.5">
                    {selectedDetailsForm.questions.map((q, idx) => (
                      <div key={q.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="w-5 h-5 bg-slate-100 text-slate-600 rounded text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <div>
                            <p className="text-xs font-bold text-slate-800 leading-tight">{q.label}</p>
                            <span className="text-[9px] font-black uppercase text-indigo-500 tracking-wider">
                              {questionTypeLabels[q.type]}
                            </span>
                          </div>
                        </div>
                        {q.parentId && (
                          <span className="text-[8px] font-black bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                            Condicional (Se Q{q.parentId})
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {detailsTab === 'historico' && (
              <div className="space-y-6">
                <h3 className="text-sm font-black text-slate-700 uppercase italic tracking-wider flex items-center gap-2">
                  <History className="w-4 h-4 text-indigo-500" />
                  Histórico de Alterações de Estrutura
                </h3>

                {historyLogs.length === 0 ? (
                  <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                    <span className="text-3xl">📝</span>
                    <p className="text-xs text-slate-500 font-bold mt-3">Nenhuma alteração estrutural registrada ainda.</p>
                    <p className="text-[10px] text-slate-400 mt-1">Todas as atualizações de rótulos, tipos ou perguntas serão registradas automaticamente.</p>
                  </div>
                ) : (
                  <div className="relative border-l border-slate-200 pl-6 space-y-8 ml-3 py-2">
                    {historyLogs.slice().reverse().map((log: any, idx: number) => (
                      <div key={idx} className="relative">
                        {/* Timeline Dot */}
                        <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full border-4 border-white bg-indigo-600 shadow-sm" />
                        
                        <div className="bg-slate-50 rounded-2xl border border-slate-200 p-5 space-y-3">
                          <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                            <span className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(log.updatedAt).toLocaleString('pt-BR')}
                            </span>
                            <span className="bg-slate-200 text-slate-700 px-2.5 py-0.5 rounded-full">
                              Por: {log.changedBy}
                            </span>
                          </div>

                          <div className="space-y-2">
                            {Array.isArray(log.changes) ? log.changes.map((change: any, cIdx: number) => (
                              <div key={cIdx} className="text-xs bg-white rounded-xl border border-slate-200/60 p-3 space-y-1">
                                <span className="font-bold text-slate-700">{change.field}</span>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-2 mt-1 pt-1.5 border-t border-slate-100">
                                  {change.from !== null && (
                                    <div className="text-rose-600">
                                      <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Antes</span>
                                      <p className="font-medium whitespace-pre-wrap">{String(change.from)}</p>
                                    </div>
                                  )}
                                  {change.to !== null && (
                                    <div className="text-emerald-700">
                                      <span className="text-[9px] font-black uppercase tracking-wider block opacity-75">Depois</span>
                                      <p className="font-bold whitespace-pre-wrap">{String(change.to)}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )) : <p className="text-xs text-slate-700">{JSON.stringify(log.changes)}</p>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {detailsTab === 'respostas' && (
              <div className="space-y-6">
                {!isOwner ? (
                  <div className="text-center py-10 bg-amber-50 rounded-2xl border border-amber-200">
                    <span className="text-4xl">🔒</span>
                    <p className="text-sm font-black text-amber-900 mt-3 uppercase tracking-wide">Acesso Restrito</p>
                    <p className="text-xs text-amber-700 mt-1 max-w-sm mx-auto">
                      Apenas o proprietário deste formulário pode visualizar os respondentes e suas respectivas respostas.
                    </p>
                  </div>
                ) : selectedRespondent ? (
                  /* RESPONDENT DETAIL SUBVIEW */
                  <div className="space-y-5">
                    {/* Back Button */}
                    <button
                      onClick={() => {
                        setSelectedRespondent(null);
                        setSelectedSnapshotIndex(null);
                      }}
                      className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-705 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-xl transition-all"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Voltar para a lista
                    </button>

                    {/* Respondent Title Card */}
                    <div className="bg-slate-900 text-white rounded-2xl p-6 relative overflow-hidden">
                      <div className="absolute top-0 right-0 p-4 text-white/5 font-black text-6xl pointer-events-none select-none italic">
                        RESPOSTAS
                      </div>
                      <div className="relative z-10">
                        <span className="text-[8px] font-black uppercase bg-indigo-500/30 text-indigo-200 px-3 py-1 rounded-full mb-2 inline-block tracking-widest">
                          Respondente
                        </span>
                        <h4 className="text-lg font-black tracking-tight truncate">
                          {selectedRespondent.responderEmail}
                        </h4>
                        <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          Primeiro envio em: {new Date(selectedRespondent.createdAt).toLocaleString('pt-BR')}
                        </p>
                      </div>
                    </div>

                    {/* Snapshots Version Selector (Post-submission modification history) */}
                    {selectedRespondent.history && selectedRespondent.history.length > 0 && (
                      <div className="bg-slate-50 rounded-2xl border border-slate-200 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <History className="w-4 h-4 text-indigo-500" />
                          <span className="text-xs font-black text-slate-700 uppercase tracking-wider">Histórico de Alterações Pós-Submissão</span>
                        </div>
                        
                        <div className="flex flex-wrap gap-2">
                          <button
                            onClick={() => setSelectedSnapshotIndex(null)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                              selectedSnapshotIndex === null
                                ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                                : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            Versão Atual ({new Date(selectedRespondent.updatedAt).toLocaleDateString('pt-BR')})
                          </button>
                          {selectedRespondent.history.map((snapshot: any, snapIdx: number) => (
                            <button
                              key={snapIdx}
                              onClick={() => setSelectedSnapshotIndex(snapIdx)}
                              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                                selectedSnapshotIndex === snapIdx
                                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                                  : 'bg-white text-slate-600 border-slate-200 hover:bg-indigo-55'
                              }`}
                            >
                              Versão {snapIdx + 1} ({new Date(snapshot.updatedAt).toLocaleDateString('pt-BR')})
                              </button>
                          ))}
                        </div>
                        <p className="text-[10px] text-slate-550 italic pl-1">
                          {selectedSnapshotIndex === null 
                            ? 'Você está visualizando a última versão da resposta enviada pelo usuário.' 
                            : `Você está visualizando a Versão ${selectedSnapshotIndex + 1} salva em ${new Date(selectedRespondent.history[selectedSnapshotIndex].updatedAt).toLocaleString('pt-BR')}.`}
                        </p>
                      </div>
                    )}

                    {/* Answers Render list */}
                    <div className="space-y-4 pt-1">
                      {(() => {
                        const currentAnswers = selectedSnapshotIndex === null
                          ? selectedRespondent.data || {}
                          : selectedRespondent.history[selectedSnapshotIndex]?.data || {};

                        return selectedDetailsForm.questions.map((q, idx) => {
                          const val = currentAnswers[q.id];
                          return (
                            <div key={q.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-2">
                              <p className="font-bold text-slate-800 text-sm leading-tight">
                                {idx + 1}. {q.label}
                              </p>
                              <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-150/50 mt-1">
                                {renderAnswerVal(q, val)}
                              </div>
                            </div>
                          );
                        });
                      })()}
                    </div>
                  </div>
                ) : (
                  /* RESPONDENTS GRID/LIST */
                  <div className="space-y-4">
                    {loadingResponses ? (
                      <div className="text-center py-12">
                        <p className="text-slate-500 font-medium animate-pulse">Carregando respostas...</p>
                      </div>
                    ) : formResponses.length === 0 ? (
                      <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <span className="text-3xl">📭</span>
                        <p className="text-xs text-slate-500 font-bold mt-3">Nenhuma resposta recebida para este formulário.</p>
                        <p className="text-[10px] text-slate-400 mt-1">Quando alguém responder, os dados aparecerão aqui.</p>
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {formResponses.map((resp: any) => {
                          const editCount = resp.history ? resp.history.length : 0;
                          return (
                            <div
                              key={resp._id}
                              onClick={() => setSelectedRespondent(resp)}
                              className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-md hover:border-slate-300 cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden"
                            >
                              <div className="absolute top-0 left-0 w-1.5 h-full bg-indigo-500" />
                              <div className="space-y-2 pl-1.5">
                                <div className="flex justify-between items-center">
                                  <span className="text-[8px] font-black uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded">
                                    ID: {resp._id.slice(-6)}
                                  </span>
                                  {editCount > 0 && (
                                    <span className="text-[8px] font-black uppercase bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full flex items-center gap-1">
                                      <History className="w-2.5 h-2.5" />
                                      Modificado ({editCount})
                                    </span>
                                  )}
                                </div>
                                <h4 className="text-sm font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                                  {resp.responderEmail}
                                </h4>
                              </div>

                              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-bold pl-1.5">
                                <span className="flex items-center gap-1">
                                  <Calendar className="w-3.5 h-3.5" />
                                  {new Date(resp.updatedAt).toLocaleDateString('pt-BR')}
                                </span>
                                <span className="text-indigo-600 font-black group-hover:underline">
                                  Ver Respostas →
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-outfit">
            Gerenciador de Formulários
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Crie formulários inteligentes com regras condicionais e controle de acesso granular.
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => window.location.hash = 'responder'}
            className="flex items-center gap-2 rounded-2xl bg-emerald-600 hover:bg-emerald-700 px-4.5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all duration-200 cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5" />
            Importar XLS
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={resetDraft}
            className="flex items-center gap-2 rounded-2xl bg-indigo-600 hover:bg-indigo-750 px-4.5 py-3 text-xs font-black uppercase tracking-wider text-white shadow-md transition-all duration-200 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Novo Formulário
          </motion.button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-1 bg-slate-100/80 dark:bg-slate-900/80 backdrop-blur rounded-2xl p-1 border border-slate-200/40 dark:border-slate-800/60 relative w-full sm:w-80">
          {['forms', 'create'].map((tabId) => {
            const isActive = activeTab === tabId;
            const label = tabId === 'forms' ? 'Meus Formulários' : 'Criar Formulário';
            
            return (
              <button
                key={tabId}
                onClick={() => {
                  if (tabId === 'create') {
                    resetDraft();
                  } else {
                    setActiveTab('forms');
                  }
                }}
                className={`flex-grow py-2.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider transition-colors relative z-10 ${
                  isActive 
                    ? 'text-slate-900 dark:text-white font-black' 
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeFormTabIndicator"
                    className="absolute inset-0 bg-white dark:bg-slate-950 rounded-xl shadow-sm border border-slate-200/50 dark:border-slate-800 -z-10"
                    transition={{ type: 'spring', stiffness: 380, damping: 30 }}
                  />
                )}
                {label}
              </button>
            );
          })}
        </div>

        {activeTab === 'forms' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.length === 0 ? (
              <div className="col-span-full glass-panel rounded-3xl border border-slate-200/50 dark:border-slate-800/40 p-12 text-center">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <h3 className="text-lg font-black text-slate-800 dark:text-slate-200 mb-2">Nenhum formulário encontrado</h3>
                <p className="text-xs text-slate-500 dark:text-slate-450 mb-6">Comece criando seu primeiro formulário personalizado.</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={resetDraft}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-indigo-700 transition-all duration-200 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Criar Formulário
                </motion.button>
              </div>
            ) : (
              forms.map((form) => (
                <motion.div
                  key={form._id}
                  whileHover={{ y: -4, scale: 1.01 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => {
                    setSelectedDetailsForm(form);
setSelectedDetailsForm(form);
                    setDetailsTab('geral');
                    setSelectedRespondent(null);
                    setSelectedSnapshotIndex(null);
                    loadFormResponses(form._id!);
                  }}
                  className="bg-white/70 dark:bg-slate-900/60 backdrop-blur-md rounded-2xl border border-slate-200/80 dark:border-slate-850 p-6 shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 dark:hover:shadow-indigo-500/10 hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-200 cursor-pointer relative overflow-hidden group"
                >
                  {/* Thin top hover gradient line */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 dark:text-slate-100 mb-1">{form.name}</h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{form.title || 'Sem título'}</p>
                      
                      <div 
                        onClick={(e) => e.stopPropagation()}
                        className="inline-flex items-center gap-1.5 mb-2 bg-slate-50 dark:bg-slate-950 border border-slate-200/60 dark:border-slate-800 px-2 py-0.5 rounded-md text-[9px] font-mono text-slate-550 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-default"
                      >
                        <span className="font-bold uppercase tracking-tight opacity-75">ID:</span>
                        <span className="font-semibold">{form._id}</span>
                        <button
                          onClick={() => handleCopyId(form._id || '')}
                          className="p-0.5 hover:bg-slate-200 dark:hover:bg-slate-800 text-slate-450 hover:text-slate-650 dark:hover:text-slate-300 rounded transition-colors flex items-center justify-center"
                          title="Copiar Código"
                        >
                          {copiedId === form._id ? (
                            <CheckCircle className="w-2.5 h-2.5 text-emerald-600 dark:text-emerald-500 animate-in zoom-in-50 duration-150" />
                          ) : (
                            <Copy className="w-2.5 h-2.5" />
                          )}
                        </button>
                      </div>
                      <div className="flex items-center gap-2">
                        {form.ownerEmail === email ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400 text-xs font-bold uppercase tracking-wider">
                            Proprietário
                          </span>
                        ) : form.hasAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-900/40 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider">
                            Acesso Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 text-xs font-bold uppercase tracking-wider">
                            Acesso Bloqueado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-550 dark:text-slate-400 mb-4 line-clamp-2">{form.description || 'Sem descrição'}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400 dark:text-slate-500">{form.questions.length} perguntas</span>
                    <div className="flex gap-2">
                      {form.isOwner && (
                        <>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopyShareLink(form._id || '');
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all duration-200 ${
                              copiedShareId === form._id 
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400'
                                : 'bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-950/40 dark:hover:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-900 text-indigo-700 dark:text-indigo-400 shadow-sm'
                            }`}
                          >
                            {copiedShareId === form._id ? (
                              <>
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-450 animate-in zoom-in-50" />
                                Copiado!
                              </>
                            ) : (
                              <>
                                <Link className="w-3 h-3" />
                                Compartilhar
                              </>
                            )}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              selectForm(form);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-indigo-650 text-white text-xs font-bold hover:bg-indigo-700 shadow-sm transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            Editar
                          </button>
                        </>
                      )}
                      {!form.isOwner && form.hasAccess && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            selectForm(form);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-xl bg-emerald-650 text-white text-xs font-bold hover:bg-emerald-700 shadow-sm transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Visualizar
                        </button>
                      )}
                      {!form.isOwner && !form.hasAccess && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestAccess(form._id!);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
                        >
                          <Users className="w-3 h-3" />
                          Solicitar
                        </button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'create' && editingForm && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Form Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Settings */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Configurações Básicas</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Nome do Formulário *</label>
                    <input
                      value={editingForm.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="Ex: Formulário de Admissão"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 dark:focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 transition-all font-medium"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Título de Exibição</label>
                    <input
                      value={editingForm.title}
                      onChange={(e) => updateDraft({ title: e.target.value })}
                      placeholder="Ex: Formulário de Admissão - Empresa XYZ"
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 dark:focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 transition-all font-medium"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">Descrição</label>
                    <textarea
                      value={editingForm.description}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      placeholder="Descreva o propósito deste formulário..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 dark:focus:ring-indigo-500/20 text-slate-800 dark:text-slate-200 transition-all resize-none font-medium"
                    />
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                    <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Perguntas</h2>
                    <span className="px-2 py-0.5 bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 text-xs font-black rounded-lg">
                      {editingForm.questions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-250 text-xs font-black uppercase tracking-wider hover:bg-slate-205 dark:hover:bg-slate-750 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Ocultar' : 'Pré-visualizar'}
                  </button>
                </div>

                {/* Quick Templates */}
                <div className="mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3 flex items-center gap-2">
                    <Zap className="w-3.5 h-3.5" />
                    Templates Rápidos
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {quickTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => loadTemplate(template)}
                        className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-900 text-left transition-all duration-200 hover:scale-102 flex flex-col justify-between"
                      >
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex items-center justify-center shrink-0">{questionTypeIcons[template.type]}</span>
                          <span className="text-[9px] font-black uppercase tracking-wider text-slate-450 dark:text-slate-500">
                            {questionTypeLabels[template.type]}
                          </span>
                        </div>
                        <p className="text-xs text-slate-750 dark:text-slate-300 font-bold leading-tight">{template.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Custom Question */}
                <div className="bg-slate-50/60 dark:bg-slate-950/40 border border-slate-150/80 dark:border-slate-850 rounded-2xl p-5 mb-6">
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3">Adicionar Pergunta Personalizada</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={newQuestion.label || ''}
                      onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                      placeholder="Digite a pergunta..."
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 text-slate-800 dark:text-slate-200"
                    />
                    <select
                      value={newQuestion.type}
                      onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as QuestionType })}
                      className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 text-slate-800 dark:text-slate-200"
                    >
                      {Object.entries(questionTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {(newQuestion.type === 'alternativa' || newQuestion.type === 'check') && (
                      <div className="md:col-span-2 space-y-2">
                        <label className="block text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">Opções de Resposta:</label>
                        {(newQuestion.options?.length ? newQuestion.options : ['']).map((opt, idx, arr) => (
                          <div key={idx} className="flex items-center gap-2">
                            <input
                              value={opt}
                              onChange={(e) => {
                                const nextOpts = [...(newQuestion.options?.length ? newQuestion.options : [''])];
                                nextOpts[idx] = e.target.value;
                                setNewQuestion({ ...newQuestion, options: nextOpts });
                              }}
                              placeholder={`Opção ${idx + 1}...`}
                              className="flex-1 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 py-2.5 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100/30 text-slate-800 dark:text-slate-200"
                            />
                            {arr.length > 1 && (
                              <button
                                onClick={() => {
                                  const nextOpts = [...(newQuestion.options?.length ? newQuestion.options : [''])];
                                  nextOpts.splice(idx, 1);
                                  setNewQuestion({ ...newQuestion, options: nextOpts });
                                }}
                                className="p-2 text-rose-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition-colors shrink-0"
                                title="Remover Opção"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                            {idx === arr.length - 1 && (
                              <button
                                onClick={() => {
                                  const nextOpts = [...(newQuestion.options?.length ? newQuestion.options : [''])];
                                  nextOpts.push('');
                                  setNewQuestion({ ...newQuestion, options: nextOpts });
                                }}
                                className="p-2 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/20 rounded-xl transition-colors shrink-0"
                                title="Nova Opção"
                              >
                                <Plus className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Conditional Logic UI */}
                    {editingForm.questions.length > 0 && (
                      <>
                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Depende da Pergunta:</label>
                          <select
                            value={newQuestion.parentId || ''}
                            onChange={(e) => setNewQuestion({ ...newQuestion, parentId: e.target.value, showWhenValue: '' })}
                            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                          >
                            <option value="">Nenhuma dependência (Sempre visível)</option>
                            {editingForm.questions.map((q) => (
                              <option key={q.id} value={q.id}>{q.label}</option>
                            ))}
                          </select>
                        </div>
                        {newQuestion.parentId && (
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Mostrar quando a resposta for:</label>
                            {(() => {
                              const parentQ = editingForm.questions.find((q) => q.id === newQuestion.parentId);
                              if (parentQ && (parentQ.type === 'simnao' || parentQ.type === 'alternativa')) {
                                const opts = parentQ.type === 'simnao' ? ['Sim', 'Não'] : parentQ.options;
                                return (
                                  <select
                                    value={newQuestion.showWhenValue || ''}
                                    onChange={(e) => setNewQuestion({ ...newQuestion, showWhenValue: e.target.value })}
                                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                  >
                                    <option value="">Selecione o valor...</option>
                                    {opts.map((o) => <option key={o} value={o}>{o}</option>)}
                                  </select>
                                );
                              }
                              return (
                                <input
                                  value={newQuestion.showWhenValue || ''}
                                  onChange={(e) => setNewQuestion({ ...newQuestion, showWhenValue: e.target.value })}
                                  placeholder="Digite a resposta esperada..."
                                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                                />
                              );
                            })()}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                  <button
                    onClick={() => addQuestion()}
                    disabled={!newQuestion.label?.trim()}
                    className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Pergunta
                  </button>
                </div>

                {/* Questions List */}
                <div className="space-y-3">
                  {editingForm.questions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileText className="w-12 h-12 text-slate-350 dark:text-slate-700 mx-auto mb-3" />
                      <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold">Nenhuma pergunta adicionada ainda.</p>
                      <p className="text-[11px] text-slate-450 dark:text-slate-500 mt-1">Use os templates ou adicione uma pergunta personalizada.</p>
                    </div>
                  ) : (
                    editingForm.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/60 hover:shadow-sm transition-all duration-200"
                      >
                        <div className="flex items-center gap-4">
                          {/* Left: Icon + Number Badge — centered vertically */}
                          <div className="flex flex-col items-center justify-center gap-1.5 shrink-0 w-10">
                            <span className="text-xl flex items-center justify-center">{questionTypeIcons[question.type]}</span>
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 w-5 h-5 flex items-center justify-center rounded-md leading-none">
                              {index + 1}
                            </span>
                          </div>

                          {/* Middle: Question text + type */}
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-slate-900 dark:text-slate-100 text-sm leading-snug">{question.label}</p>
                            <p className="text-[11px] font-bold text-indigo-500 dark:text-indigo-400 uppercase tracking-wider mt-0.5">{questionTypeLabels[question.type]}</p>

                            {question.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mt-2">
                                {question.options.map((option, optIndex) => (
                                  <span key={optIndex} className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-[10px] font-semibold rounded-md border border-slate-200 dark:border-slate-700">
                                    {option}
                                  </span>
                                ))}
                              </div>
                            )}

                            {question.parentId && (
                              <p className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border border-amber-100 dark:border-amber-900/40 px-2 py-0.5 rounded-md inline-block mt-1.5 font-semibold">
                                ⚡ Condicional — quando "{question.showWhenValue}"
                              </p>
                            )}
                          </div>

                          {/* Right: Actions */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              onClick={() => moveQuestion(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, Math.min(editingForm.questions.length - 1, index + 1))}
                              disabled={index === editingForm.questions.length - 1}
                              className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => duplicateQuestion(question)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 rounded-lg transition-colors"
                              title="Duplicar"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                              title="Remover"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-slate-600 dark:text-slate-400" />
                  <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">Controle de Acesso</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">E-mails Autorizados</label>
                    <div className="flex gap-2">
                      <input
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="email@empresa.com"
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30"
                      />
                      <button
                        onClick={() => {
                          if (!emailInput.trim()) return;
                          const next = Array.from(new Set([...(editingForm?.allowedEmails || []), emailInput.trim().toLowerCase()]));
                          updateDraft({ allowedEmails: next });
                          setEmailInput('');
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">Domínios Autorizados</label>
                    <div className="flex gap-2">
                      <input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="empresa.com"
                        className="flex-1 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30"
                      />
                      <button
                        onClick={() => {
                          if (!domainInput.trim()) return;
                          const next = Array.from(new Set([...(editingForm?.allowedDomains || []), domainInput.trim().toLowerCase()]));
                          updateDraft({ allowedDomains: next });
                          setDomainInput('');
                        }}
                        className="px-3 py-2 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {editingForm.allowedEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-900/60 text-xs font-semibold rounded-full">
                      {email}
                      <button
                        onClick={() => updateDraft({ allowedEmails: editingForm.allowedEmails.filter(e => e !== email) })}
                        className="hover:text-indigo-900 dark:hover:text-white ml-0.5"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {editingForm.allowedDomains.map((domain) => (
                    <span key={domain} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-900/60 text-xs font-semibold rounded-full">
                      @{domain}
                      <button
                        onClick={() => updateDraft({ allowedDomains: editingForm.allowedDomains.filter(d => d !== domain) })}
                        className="hover:text-emerald-900 dark:hover:text-white ml-0.5"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
                <div>
                  {statusMessage && (
                    <p className={`text-sm font-semibold ${statusMessage.includes('sucesso') ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                      {statusMessage}
                    </p>
                  )}
                </div>
                <button
                  onClick={saveForm}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all duration-200 hover:scale-105 shadow-lg shadow-indigo-500/20"
                >
                  <Save className="w-4 h-4" />
                  Salvar Formulário
                </button>
              </div>
            </div>

            {/* Preview Panel */}
            <div className="lg:col-span-1">
              {showPreview && renderFormPreview()}
            </div>
          </div>
        )}

        {renderDetailsModal()}
      </div>
  );
}
