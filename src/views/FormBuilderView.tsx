import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Plus, Edit3, Trash2, Eye, Save, FileText, Users, Settings, CheckCircle, XCircle, ArrowUp, ArrowDown, Copy, Zap } from 'lucide-react';

type QuestionType = 'simnao' | 'alternativa' | 'respostaescrita' | 'data' | 'link' | 'check';

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
}

const questionTypeLabels = {
  simnao: 'Sim/Não',
  alternativa: 'Alternativa',
  respostaescrita: 'Texto Livre',
  data: 'Data',
  link: 'Link',
  check: 'Múltipla Escolha'
};

const questionTypeIcons = {
  simnao: '✅',
  alternativa: '🔘',
  respostaescrita: '📝',
  data: '📅',
  link: '🔗',
  check: '☑️'
};

const quickTemplates = [
  { type: 'simnao' as QuestionType, label: 'Você concorda com os termos?', options: [] },
  { type: 'respostaescrita' as QuestionType, label: 'Qual é o seu nome completo?', options: [] },
  { type: 'alternativa' as QuestionType, label: 'Qual é o seu cargo?', options: ['Gerente', 'Analista', 'Assistente', 'Outro'] },
  { type: 'data' as QuestionType, label: 'Qual é a data de nascimento?', options: [] },
  { type: 'link' as QuestionType, label: 'Qual é o seu LinkedIn?', options: [] },
  { type: 'check' as QuestionType, label: 'Quais habilidades você possui?', options: ['React', 'Node.js', 'Python', 'SQL', 'AWS'] }
];

export default function FormBuilderView() {
  const { user, authFetch } = useAuth();
  const email = user?.email || '';
  const [forms, setForms] = useState<ManualForm[]>([]);
  const [editingForm, setEditingForm] = useState<ManualForm | null>(null);
  const [newQuestion, setNewQuestion] = useState<Partial<ManualQuestion>>({ type: 'simnao', options: [] });
  const [emailInput, setEmailInput] = useState('');
  const [domainInput, setDomainInput] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'forms' | 'create'>('forms');
  const [showPreview, setShowPreview] = useState(false);

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

  const addQuestion = (template?: typeof quickTemplates[0]) => {
    if (!editingForm) return;

    const questionData = template || newQuestion;
    if (!questionData.label && !template) return;

    const nextQuestion: ManualQuestion = {
      id: `Q${Date.now()}`,
      label: questionData.label?.trim() || '',
      type: questionData.type as QuestionType,
      options: questionData.options ? questionData.options.filter(Boolean) : [],
      parentId: null,
      showWhenValue: '',
    };

    setEditingForm({ ...editingForm, questions: [...editingForm.questions, nextQuestion] });
    setNewQuestion({ type: 'simnao', options: [] });
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

          {editingForm.questions.map((question, index) => (
            <div key={question.id} className="bg-slate-50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <span className="text-lg">{questionTypeIcons[question.type]}</span>
                <div className="flex-1">
                  <p className="font-medium text-slate-900 mb-2">{question.label}</p>

                  {question.type === 'simnao' && (
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2">
                        <input type="radio" name={`q${index}`} className="text-indigo-600" />
                        <span className="text-sm">Sim</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input type="radio" name={`q${index}`} className="text-indigo-600" />
                        <span className="text-sm">Não</span>
                      </label>
                    </div>
                  )}

                  {question.type === 'alternativa' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center gap-2">
                          <input type="radio" name={`q${index}`} className="text-indigo-600" />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'check' && (
                    <div className="space-y-2">
                      {question.options.map((option, optIndex) => (
                        <label key={optIndex} className="flex items-center gap-2">
                          <input type="checkbox" className="text-indigo-600" />
                          <span className="text-sm">{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {question.type === 'respostaescrita' && (
                    <textarea className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="Digite sua resposta..." rows={3} />
                  )}

                  {question.type === 'data' && (
                    <input type="date" className="rounded-lg border border-slate-200 p-3 text-sm" />
                  )}

                  {question.type === 'link' && (
                    <input type="url" className="w-full rounded-lg border border-slate-200 p-3 text-sm" placeholder="https://..." />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-900 mb-2">Construtor de Formulários</h1>
            <p className="text-slate-600 max-w-2xl">
              Crie formulários inteligentes com perguntas condicionais e controle de acesso granular.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => window.location.hash = 'preparacao'}
              className="flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-emerald-700 transition-all duration-200 hover:scale-105"
            >
              <FileText className="w-4 h-4" />
              Importar XLS
            </button>
            <button
              onClick={resetDraft}
              className="flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg hover:bg-indigo-700 transition-all duration-200 hover:scale-105"
            >
              <Plus className="w-4 h-4" />
              Novo Formulário
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex gap-1 bg-white rounded-2xl p-1 shadow-sm border border-slate-200">
          <button
            onClick={() => setActiveTab('forms')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'forms'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Meus Formulários
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-6 rounded-xl font-bold text-sm transition-all duration-200 ${
              activeTab === 'create'
                ? 'bg-indigo-600 text-white shadow-lg'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            Criar Formulário
          </button>
        </div>

        {activeTab === 'forms' && (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {forms.length === 0 ? (
              <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-12 text-center">
                <FileText className="w-16 h-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-slate-900 mb-2">Nenhum formulário encontrado</h3>
                <p className="text-slate-600 mb-6">Comece criando seu primeiro formulário personalizado.</p>
                <button
                  onClick={resetDraft}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white hover:bg-indigo-700 transition-all duration-200"
                >
                  <Plus className="w-4 h-4" />
                  Criar Formulário
                </button>
              </div>
            ) : (
              forms.map((form) => (
                <div key={form._id} className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-lg transition-all duration-200 hover:scale-[1.02]">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-slate-900 mb-1">{form.name}</h3>
                      <p className="text-sm text-slate-600 mb-2">{form.title || 'Sem título'}</p>
                      <div className="flex items-center gap-2">
                        {form.ownerEmail === email ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Proprietário
                          </span>
                        ) : form.hasAccess ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-medium">
                            <CheckCircle className="w-3 h-3" />
                            Acesso Liberado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-100 text-amber-700 text-xs font-medium">
                            <XCircle className="w-3 h-3" />
                            Acesso Bloqueado
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-slate-500 mb-4 line-clamp-2">{form.description || 'Sem descrição'}</p>

                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">{form.questions.length} perguntas</span>
                    <div className="flex gap-2">
                      {form.isOwner && (
                        <button
                          onClick={() => selectForm(form)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-indigo-600 text-white text-xs font-medium hover:bg-indigo-700 transition-colors"
                        >
                          <Edit3 className="w-3 h-3" />
                          Editar
                        </button>
                      )}
                      {!form.isOwner && form.hasAccess && (
                        <button
                          onClick={() => selectForm(form)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-medium hover:bg-emerald-700 transition-colors"
                        >
                          <Eye className="w-3 h-3" />
                          Visualizar
                        </button>
                      )}
                      {!form.isOwner && !form.hasAccess && (
                        <button
                          onClick={() => requestAccess(form._id!)}
                          className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-amber-500 text-white text-xs font-medium hover:bg-amber-600 transition-colors"
                        >
                          <Users className="w-3 h-3" />
                          Solicitar
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'create' && editingForm && (
          <div className="grid gap-8 lg:grid-cols-3">
            {/* Form Builder */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Settings */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Settings className="w-5 h-5 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Configurações Básicas</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Nome do Formulário *</label>
                    <input
                      value={editingForm.name}
                      onChange={(e) => updateDraft({ name: e.target.value })}
                      placeholder="Ex: Formulário de Admissão"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Título de Exibição</label>
                    <input
                      value={editingForm.title}
                      onChange={(e) => updateDraft({ title: e.target.value })}
                      placeholder="Ex: Formulário de Admissão - Empresa XYZ"
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">Descrição</label>
                    <textarea
                      value={editingForm.description}
                      onChange={(e) => updateDraft({ description: e.target.value })}
                      placeholder="Descreva o propósito deste formulário..."
                      rows={3}
                      className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all resize-none"
                    />
                  </div>
                </div>
              </div>

              {/* Questions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <FileText className="w-5 h-5 text-slate-600" />
                    <h2 className="text-xl font-bold text-slate-900">Perguntas</h2>
                    <span className="px-2 py-1 bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full">
                      {editingForm.questions.length}
                    </span>
                  </div>
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    {showPreview ? 'Ocultar' : 'Pré-visualizar'}
                  </button>
                </div>

                {/* Quick Templates */}
                <div className="mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" />
                    Templates Rápidos
                  </h3>
                  <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                    {quickTemplates.map((template, index) => (
                      <button
                        key={index}
                        onClick={() => addQuestion(template)}
                        className="p-3 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-left transition-all duration-200 hover:scale-105"
                      >
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-lg">{questionTypeIcons[template.type]}</span>
                          <span className="text-xs font-medium text-slate-600 uppercase tracking-wide">
                            {questionTypeLabels[template.type]}
                          </span>
                        </div>
                        <p className="text-sm text-slate-700 font-medium">{template.label}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Add Custom Question */}
                <div className="bg-slate-50 rounded-xl p-4 mb-6">
                  <h3 className="text-sm font-medium text-slate-700 mb-3">Adicionar Pergunta Personalizada</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <input
                      value={newQuestion.label || ''}
                      onChange={(e) => setNewQuestion({ ...newQuestion, label: e.target.value })}
                      placeholder="Digite a pergunta..."
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    />
                    <select
                      value={newQuestion.type}
                      onChange={(e) => setNewQuestion({ ...newQuestion, type: e.target.value as QuestionType })}
                      className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                    >
                      {Object.entries(questionTypeLabels).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                    {(newQuestion.type === 'alternativa' || newQuestion.type === 'check') && (
                      <div className="md:col-span-2">
                        <input
                          value={newQuestion.options?.join(', ') || ''}
                          onChange={(e) => setNewQuestion({ ...newQuestion, options: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })}
                          placeholder="Opção 1, Opção 2, Opção 3..."
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                        />
                      </div>
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
                      <FileText className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-slate-500">Nenhuma pergunta adicionada ainda.</p>
                      <p className="text-sm text-slate-400 mt-1">Use os templates ou adicione uma pergunta personalizada.</p>
                    </div>
                  ) : (
                    editingForm.questions.map((question, index) => (
                      <div
                        key={question.id}
                        className="bg-slate-50 rounded-xl p-4 border border-slate-200 hover:border-slate-300 transition-all duration-200"
                      >
                        <div className="flex items-start gap-4">
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-lg">{questionTypeIcons[question.type]}</span>
                            <span className="text-xs font-medium text-slate-500 bg-slate-200 px-2 py-1 rounded">
                              {index + 1}
                            </span>
                          </div>

                          <div className="flex-1">
                            <p className="font-medium text-slate-900 mb-1">{question.label}</p>
                            <p className="text-xs text-slate-500 mb-2">{questionTypeLabels[question.type]}</p>

                            {question.options.length > 0 && (
                              <div className="flex flex-wrap gap-1 mb-2">
                                {question.options.map((option, optIndex) => (
                                  <span key={optIndex} className="px-2 py-1 bg-white text-slate-600 text-xs rounded-md border">
                                    {option}
                                  </span>
                                ))}
                              </div>
                            )}

                            {question.parentId && (
                              <p className="text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded inline-block">
                                Condicional: mostra quando "{question.showWhenValue}"
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => moveQuestion(index, Math.max(0, index - 1))}
                              disabled={index === 0}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => moveQuestion(index, Math.min(editingForm.questions.length - 1, index + 1))}
                              disabled={index === editingForm.questions.length - 1}
                              className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => duplicateQuestion(question)}
                              className="p-1 text-slate-400 hover:text-slate-600"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => removeQuestion(question.id)}
                              className="p-1 text-slate-400 hover:text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Permissions */}
              <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div className="flex items-center gap-3 mb-6">
                  <Users className="w-5 h-5 text-slate-600" />
                  <h2 className="text-xl font-bold text-slate-900">Controle de Acesso</h2>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">E-mails Autorizados</label>
                    <div className="flex gap-2">
                      <input
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        placeholder="email@empresa.com"
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        onClick={() => {
                          if (!emailInput.trim()) return;
                          const next = Array.from(new Set([...(editingForm?.allowedEmails || []), emailInput.trim().toLowerCase()]));
                          updateDraft({ allowedEmails: next });
                          setEmailInput('');
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">Domínios Autorizados</label>
                    <div className="flex gap-2">
                      <input
                        value={domainInput}
                        onChange={(e) => setDomainInput(e.target.value)}
                        placeholder="empresa.com"
                        className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                      />
                      <button
                        onClick={() => {
                          if (!domainInput.trim()) return;
                          const next = Array.from(new Set([...(editingForm?.allowedDomains || []), domainInput.trim().toLowerCase()]));
                          updateDraft({ allowedDomains: next });
                          setDomainInput('');
                        }}
                        className="px-3 py-2 rounded-lg bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 transition-colors"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {editingForm.allowedEmails.map((email) => (
                    <span key={email} className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-100 text-indigo-700 text-sm rounded-full">
                      {email}
                      <button
                        onClick={() => updateDraft({ allowedEmails: editingForm.allowedEmails.filter(e => e !== email) })}
                        className="hover:text-indigo-900"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                  {editingForm.allowedDomains.map((domain) => (
                    <span key={domain} className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-100 text-emerald-700 text-sm rounded-full">
                      @{domain}
                      <button
                        onClick={() => updateDraft({ allowedDomains: editingForm.allowedDomains.filter(d => d !== domain) })}
                        className="hover:text-emerald-900"
                      >
                        <XCircle className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Save Button */}
              <div className="flex items-center justify-between bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
                <div>
                  {statusMessage && (
                    <p className={`text-sm ${statusMessage.includes('sucesso') ? 'text-green-600' : 'text-red-600'}`}>
                      {statusMessage}
                    </p>
                  )}
                </div>
                <button
                  onClick={saveForm}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 transition-all duration-200 hover:scale-105 shadow-lg"
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
      </div>
    </div>
  );
}
