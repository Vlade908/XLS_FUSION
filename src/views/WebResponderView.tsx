import { useEffect, useState } from 'react';
import { 
  Send, 
  CheckCircle, 
  Mail, 
  AlertCircle, 
  ChevronLeft, 
  ChevronRight, 
  Grid, 
  ArrowLeft, 
  Loader2 
} from 'lucide-react';

interface Question {
  id: string;
  label: string;
  type: 'simnao' | 'alternativa' | 'respostaescrita' | 'data' | 'link' | 'check' | 'arquivo';
  options: string[];
  parentId?: string | null;
  showWhenValue?: string;
}

interface WebForm {
  _id: string;
  name: string;
  title: string;
  description: string;
  questions: Question[];
  allowedEmails: string[];
  allowedDomains: string[];
  ownerEmail: string;
}

const questionTypeIcons = {
  simnao: '✅',
  alternativa: '🔘',
  respostaescrita: '📝',
  data: '📅',
  link: '🔗',
  check: '☑️',
  arquivo: '📁'
};

export default function WebResponderView({ formId }: { formId: string }) {
  const [form, setForm] = useState<WebForm | null>(null);
  const [email, setEmail] = useState('');
  const [isEmailConfirmed, setIsEmailConfirmed] = useState(false);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  // States for public access request
  const [sendingRequest, setSendingRequest] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState(false);

  // Responsive UI states
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLandscape(window.innerHeight < 500 && window.innerWidth > window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    if (!formId) return;
    fetch(`/api/public-forms/${formId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Formulário não encontrado ou não disponível.');
        return res.json();
      })
      .then((data) => {
        setForm(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, [formId]);

  const handleEmailConfirm = () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Por favor, insira um e-mail válido.');
      return;
    }
    
    if (form?.allowedEmails && form.allowedEmails.length > 0) {
      const normalizedEmail = email.toLowerCase().trim();
      const domain = normalizedEmail.split('@')[1] || '';
      
      const isAllowed = 
        form.allowedEmails.includes(normalizedEmail) || 
        (form.allowedDomains && form.allowedDomains.includes(domain)) ||
        form.ownerEmail === normalizedEmail;

      if (!isAllowed) {
        setError('Este e-mail não tem permissão para acessar o formulário.');
        return;
      }
    }

    setError('');
    
    // Fetch pre-existing response if it exists
    fetch(`/api/public-forms/${formId}/responses?email=${encodeURIComponent(email.trim())}`)
      .then((res) => {
        if (res.ok) return res.json();
        return {};
      })
      .then((savedAnswers) => {
        setAnswers(savedAnswers || {});
        setIsEmailConfirmed(true);
      })
      .catch((err) => {
        console.error('Erro ao buscar respostas anteriores:', err);
        setIsEmailConfirmed(true); // Proceed anyway
      });
  };

  const handleRequestAccess = async () => {
    if (!email.trim() || !email.includes('@')) return;
    setSendingRequest(true);
    setError('');
    setRequestSuccess(false);
    try {
      const res = await fetch(`/api/public-forms/${formId}/request-access`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          requesterEmail: email,
          message: 'Solicitação de acesso para responder ao formulário via link público.',
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erro ao solicitar acesso.');
      setRequestSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSendingRequest(false);
    }
  };

  const isQuestionVisible = (q: Question) => {
    if (!q.parentId) return true;
    const parentVal = answers[q.parentId];
    if (!parentVal) return false;
    if (Array.isArray(parentVal)) {
      return parentVal.includes(q.showWhenValue);
    }
    return String(parentVal) === String(q.showWhenValue);
  };

  const visibleQuestions = form ? form.questions.filter(isQuestionVisible) : [];

  // Adjust current step bounds when conditionals affect visible questions array size
  useEffect(() => {
    if (visibleQuestions.length > 0 && currentStep >= visibleQuestions.length) {
      setCurrentStep(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentStep]);

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setError('');

    // Filter out answers for hidden questions
    const finalAnswers: Record<string, any> = {};
    form.questions.forEach((q) => {
      if (isQuestionVisible(q)) {
        finalAnswers[q.id] = answers[q.id];
      }
    });

    try {
      const res = await fetch(`/api/public-forms/${formId}/responses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          responderEmail: email,
          data: finalAnswers,
        }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || 'Erro ao enviar respostas.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const renderQuestionInput = (question: Question, index: number) => {
    return (
      <div className="space-y-4 pt-1">
        {question.type === 'simnao' && (
          <div className="web-responder-simnao-wrapper flex gap-4">
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex-1">
              <input 
                type="radio" 
                name={`q${index}`} 
                value="Sim" 
                checked={answers[question.id] === 'Sim'} 
                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
                className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
              />
              <span className="font-medium text-slate-700">Sim</span>
            </label>
            <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex-1">
              <input 
                type="radio" 
                name={`q${index}`} 
                value="Não" 
                checked={answers[question.id] === 'Não'} 
                onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
                className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
              />
              <span className="font-medium text-slate-700">Não</span>
            </label>
          </div>
        )}

        {question.type === 'alternativa' && (
          <div className="web-responder-options-wrapper space-y-3">
            {question.options.map((option, optIndex) => (
              <label key={optIndex} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-550 cursor-pointer w-full">
                <input 
                  type="radio" 
                  name={`q${index}`} 
                  value={option} 
                  checked={answers[question.id] === option} 
                  onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
                  className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" 
                />
                <span className="font-medium text-slate-700">{option}</span>
              </label>
            ))}
          </div>
        )}

        {question.type === 'check' && (
          <div className="web-responder-options-wrapper space-y-3">
            {question.options.map((option, optIndex) => {
              const isChecked = (answers[question.id] || []).includes(option);
              return (
                <label key={optIndex} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer w-full">
                  <input 
                    type="checkbox" 
                    value={option} 
                    checked={isChecked} 
                    onChange={(e) => {
                      const current = answers[question.id] || [];
                      const next = e.target.checked ? [...current, option] : current.filter((o: string) => o !== option);
                      setAnswers({ ...answers, [question.id]: next });
                    }} 
                    className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600" 
                  />
                  <span className="font-medium text-slate-700">{option}</span>
                </label>
              );
            })}
          </div>
        )}

        {question.type === 'respostaescrita' && (
          <textarea 
            value={answers[question.id] || ''} 
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
            className="w-full rounded-2xl border border-slate-200 p-5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 transition-all" 
            placeholder="Digite sua resposta detalhada..." 
            rows={4} 
          />
        )}

        {question.type === 'data' && (
          <input 
            type="date" 
            value={answers[question.id] || ''} 
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
            className="w-full sm:w-auto rounded-2xl border border-slate-200 p-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-550 transition-all" 
          />
        )}

        {question.type === 'link' && (
          <input 
            type="url" 
            value={answers[question.id] || ''} 
            onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} 
            className="w-full rounded-2xl border border-slate-200 p-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 transition-all" 
            placeholder="https://..." 
          />
        )}

        {question.type === 'arquivo' && (
          <div className="space-y-4">
            <textarea 
              value={answers[question.id]?.text || ''} 
              onChange={(e) => {
                const current = answers[question.id] || {};
                setAnswers({ ...answers, [question.id]: { ...current, text: e.target.value } });
              }} 
              className="w-full rounded-2xl border border-slate-200 p-5 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 transition-all" 
              placeholder="Escreva seus comentários ou descrição..." 
              rows={4} 
            />
            
            <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center text-center space-y-4">
              {!answers[question.id]?.fileId && !answers[question.id]?.uploading && (
                <>
                  <div className="text-4xl">📤</div>
                  <div className="space-y-1">
                    <p className="text-slate-900 text-xs font-black uppercase italic">Enviar Arquivo</p>
                    <p className="text-slate-500 text-[10px] font-bold">Selecione um arquivo para enviar com sua resposta.</p>
                  </div>
                  <div className="w-full max-w-xs">
                    <input 
                      type="file" 
                      id={`upload-web-${question.id}`} 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const current = answers[question.id] || {};
                        setAnswers({ ...answers, [question.id]: { ...current, uploading: true } });
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('responder', email);
                        formData.append('questionNumber', question.id);
                        formData.append('formName', form?.name || 'formulario');
                        
                        try {
                          const res = await fetch('/api/public-upload-anexo', { 
                            method: 'POST', 
                            body: formData 
                          });
                          if (res.ok) {
                            const result = await res.json();
                            setAnswers({ 
                              ...answers, 
                              [question.id]: { 
                                ...current, 
                                text: current.text || '', 
                                fileId: result.file.id, 
                                fileName: result.file.originalname, 
                                uploading: false 
                              } 
                            });
                          } else {
                            throw new Error();
                          }
                        } catch (err) {
                          alert("Erro ao enviar o arquivo. Tente novamente.");
                          setAnswers({ ...answers, [question.id]: { ...current, uploading: false } });
                        }
                      }} 
                    />
                    <label 
                      htmlFor={`upload-web-${question.id}`} 
                      className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-md w-full text-center"
                    >
                      Selecionar Arquivo
                    </label>
                  </div>
                </>
              )}

              {answers[question.id]?.uploading && (
                <p className="text-sm font-medium text-slate-500 animate-pulse">Enviando arquivo...</p>
              )}

              {answers[question.id]?.fileId && (
                <div className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-xl">📎</span>
                    <div className="text-left">
                      <p className="text-emerald-950 text-[10px] font-black uppercase leading-none">Arquivo Confirmado</p>
                      <p className="text-emerald-600 text-[10px] font-bold mt-1 truncate max-w-[180px] md:max-w-xs">
                        {answers[question.id].fileName}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      const current = answers[question.id] || {};
                      const next = { ...current };
                      delete next.fileId;
                      delete next.fileName;
                      setAnswers({ ...answers, [question.id]: next });
                    }} 
                    className="text-xs text-rose-500 font-bold hover:underline"
                  >
                    Remover
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-slate-500 font-medium animate-pulse">Carregando formulário...</p>
      </div>
    );
  }

  if (error && !form) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
        <div className="bg-white rounded-3xl border border-rose-200 p-8 text-center max-w-md w-full shadow-lg">
          <AlertCircle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-slate-900 mb-2">Ops!</h2>
          <p className="text-slate-600">{error}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-emerald-50 p-6">
        <div className="bg-white rounded-3xl border border-emerald-200 p-10 text-center max-w-md w-full shadow-xl">
          <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
          <h2 className="text-2xl font-black text-slate-900 mb-3">Tudo Certo!</h2>
          <p className="text-slate-600">Suas respostas foram enviadas e salvas com sucesso. Você já pode fechar esta janela.</p>
        </div>
      </div>
    );
  }

  if (!isEmailConfirmed && form) {
    return (
      <div className="min-h-screen w-full bg-slate-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
        <div className="bg-white rounded-3xl border border-slate-200 p-8 max-w-md w-full shadow-xl">
          <div className="mb-8 text-center">
            <h1 className="text-2xl font-black text-slate-900 mb-2">{form.title || form.name}</h1>
            <p className="text-sm text-slate-500">{form.description}</p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-bold text-slate-700 mb-2">Qual o seu e-mail?</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                <input 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-12 pr-4 py-4 rounded-2xl border border-slate-200 bg-slate-50 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
                />
              </div>
            </div>
            
            {error && (
              <div className="space-y-3">
                <p className="text-sm text-rose-500 font-medium text-center">{error}</p>
                {error.includes('permissão') && (
                  <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl text-center space-y-3 animate-in zoom-in">
                    <p className="text-xs text-indigo-900 font-semibold leading-relaxed">
                      Deseja solicitar permissão de acesso ao proprietário do formulário para este e-mail?
                    </p>
                    <button
                      onClick={handleRequestAccess}
                      disabled={sendingRequest}
                      className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider transition-all disabled:opacity-50 flex items-center justify-center gap-1.5"
                    >
                      {sendingRequest ? (
                        <>
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Solicitando...
                        </>
                      ) : (
                        'Solicitar Permissão'
                      )}
                    </button>
                    {requestSuccess && (
                      <p className="text-[10px] text-emerald-600 font-bold bg-emerald-50 border border-emerald-100 p-2 rounded-lg">
                        ✓ Solicitação de acesso enviada com sucesso! O proprietário será notificado.
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
            
            <button 
              onClick={handleEmailConfirm}
              className="w-full rounded-2xl bg-indigo-600 px-6 py-4 text-sm font-black uppercase text-white shadow-lg hover:bg-indigo-700 transition-all hover:scale-[1.02]"
            >
              Iniciar Formulário
            </button>
          </div>
        </div>
      </div>
    );
  }

  const progressPercentage = visibleQuestions.length > 0 
    ? Math.round(((currentStep + 1) / visibleQuestions.length) * 100) 
    : 0;

  return (
    <div className="web-responder-layout min-h-screen bg-slate-50 flex items-center justify-center p-4 sm:p-6 md:py-12">
      {isMobile && form ? (
        /* MOBILE VIEWPORT LAYOUT */
        <div className={`w-full max-w-3xl flex flex-col ${isLandscape ? 'landscape-split-layout' : 'portrait-wizard-layout'}`}>
          {isLandscape ? (
            /* LANDSCAPE SPLIT SCREEN */
            <div className="flex flex-row h-[calc(100vh-60px)] w-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xl">
              {/* Left Column: Progress Sidebar */}
              <div className="w-[30%] bg-slate-900 text-white p-4 flex flex-col justify-between border-r border-slate-800">
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded">
                      Público
                    </span>
                    <span className="text-[9px] font-black text-slate-400 italic">
                      {progressPercentage}%
                    </span>
                  </div>
                  
                  <div>
                    <h3 className="text-xs font-black uppercase tracking-wider italic text-slate-100 line-clamp-2 leading-tight">
                      {form.title || form.name}
                    </h3>
                    <p className="text-[9px] text-slate-400 mt-1 font-semibold truncate">
                      {email}
                    </p>
                  </div>

                  {/* Sticky Steps Grid */}
                  <div className="grid grid-cols-4 gap-1.5 pt-2 max-h-[38vh] overflow-y-auto custom-scrollbar">
                    {visibleQuestions.map((q, idx) => {
                      const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
                      const isActive = idx === currentStep;
                      return (
                        <button
                          key={q.id}
                          onClick={() => setCurrentStep(idx)}
                          className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                            isActive
                              ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                              : isAnswered
                              ? "bg-indigo-900/60 text-indigo-200 border border-indigo-700"
                              : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-750"
                          }`}
                        >
                          {idx + 1}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (window.confirm("Deseja sair do formulário? Suas respostas serão perdidas.")) {
                      setIsEmailConfirmed(false);
                      setAnswers({});
                      setError("");
                    }
                  }}
                  className="w-full py-2 bg-slate-800 hover:bg-rose-900/60 hover:text-rose-200 text-slate-400 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all text-center"
                >
                  Sair
                </button>
              </div>

              {/* Right Column: Question Content */}
              <div className="w-[70%] flex flex-col justify-between h-full bg-slate-50">
                <div className="p-5 overflow-y-auto flex-grow space-y-4">
                  {visibleQuestions.length > 0 && (
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                          Questão {currentStep + 1}
                        </span>
                      </div>
                      
                      <h2 className="text-sm font-bold text-slate-800 leading-snug">
                        {visibleQuestions[currentStep].label}
                      </h2>

                      {/* Inputs Rendered */}
                      <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-inner">
                        {renderQuestionInput(visibleQuestions[currentStep], currentStep)}
                      </div>
                    </div>
                  )}

                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-605 rounded-xl text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </div>
                  )}
                </div>

                {/* Navigation Footer */}
                <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                  <button
                    onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
                    disabled={currentStep === 0}
                    className="px-4 py-2.5 bg-slate-100 disabled:opacity-50 text-slate-650 border border-slate-200 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Anterior
                  </button>

                  {currentStep === visibleQuestions.length - 1 ? (
                    <button
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                    >
                      {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                      Enviar
                    </button>
                  ) : (
                    <button
                      onClick={() => setCurrentStep(p => Math.min(visibleQuestions.length - 1, p + 1))}
                      className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md flex items-center justify-center gap-1"
                    >
                      Próxima
                      <ChevronRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ) : (
            /* PORTRAIT WIZARD LAYOUT */
            <div className="w-full flex flex-col space-y-4">
              {/* Sticky Progress Header */}
              <div className="bg-white p-4 rounded-3xl border border-slate-200 shadow-md">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <button
                    onClick={() => {
                      if (window.confirm("Deseja sair do formulário? Suas respostas serão perdidas.")) {
                        setIsEmailConfirmed(false);
                        setAnswers({});
                        setError("");
                      }
                    }}
                    className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-inner flex items-center justify-center"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                      Etapa {currentStep + 1} / {visibleQuestions.length}
                    </span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                  <div 
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                    style={{ width: `${progressPercentage}%` }}
                  />
                </div>
              </div>

              {/* Active Question Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xl relative overflow-hidden min-h-[380px] flex flex-col justify-between">
                <div className="absolute top-0 right-0 p-2 text-slate-100/60 font-black text-8xl pointer-events-none italic leading-none select-none">
                  {currentStep + 1}
                </div>

                <div className="relative z-10 space-y-4">
                  <span className="inline-block text-[8px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-full uppercase tracking-widest">
                    Questão {visibleQuestions[currentStep]?.id}
                  </span>
                  
                  <h2 className="text-base font-extrabold text-slate-850 leading-tight italic">
                    "{visibleQuestions[currentStep]?.label}"
                  </h2>

                  {/* Render question specific input */}
                  {visibleQuestions.length > 0 && renderQuestionInput(visibleQuestions[currentStep], currentStep)}
                </div>

                <div className="pt-4 space-y-3">
                  {error && (
                    <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setCurrentStep(p => Math.max(0, p - 1))}
                  disabled={currentStep === 0}
                  className="px-5 py-3.5 bg-white disabled:opacity-0 rounded-2xl font-black uppercase text-[10px] text-slate-400 shadow-md border border-slate-200 transition-all animate-in fade-in"
                >
                  Anterior
                </button>
                
                {currentStep === visibleQuestions.length - 1 ? (
                  <button
                    onClick={handleSubmit}
                    disabled={submitting}
                    className="flex-grow py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-4 h-4" />}
                    Enviar Respostas
                  </button>
                ) : (
                  <button
                    onClick={() => setCurrentStep(p => Math.min(visibleQuestions.length - 1, p + 1))}
                    className="flex-grow py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg active:scale-95 transition-all"
                  >
                    Próxima
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      ) : (
        /* DESKTOP LAYOUT (ORIGINAL) */
        <div className="web-responder-container max-w-3xl mx-auto space-y-6 w-full">
          
          <div className="web-responder-header bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
            <h1 className="text-3xl font-black text-slate-900 mb-3">{form?.title || form?.name}</h1>
            <p className="text-slate-600 text-lg">{form?.description}</p>
            <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase bg-indigo-50 inline-flex px-3 py-1.5 rounded-lg">
              <Mail className="w-4 h-4" />
              Respondendo como: {email}
            </div>
          </div>

          <div className="space-y-6">
            {form?.questions.map((question, index) => {
              if (!isQuestionVisible(question)) return null;

              return (
                <div key={question.id} className="web-responder-question-card bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-all">
                  <div className="flex items-start gap-4">
                    <span className="text-2xl mt-1">{questionTypeIcons[question.type]}</span>
                    <div className="flex-1">
                      <p className="text-lg font-bold text-slate-900 mb-4">
                        {index + 1}. {question.label}
                      </p>

                      {renderQuestionInput(question, index)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {error && <div className="p-4 bg-rose-50 text-rose-605 rounded-2xl border border-rose-200 font-medium text-center">{error}</div>}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full flex items-center justify-center gap-3 rounded-2xl bg-indigo-600 p-6 text-lg font-black uppercase text-white shadow-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all hover:scale-[1.02]"
          >
            {submitting ? 'Enviando...' : (
              <>
                <Send className="w-6 h-6" />
                Enviar Respostas
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}
