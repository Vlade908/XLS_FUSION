import { useEffect, useState } from 'react';
import { Send, CheckCircle, Mail, AlertCircle } from 'lucide-react';

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
    setIsEmailConfirmed(true);
  };

  const handleSubmit = async () => {
    if (!form) return;
    setSubmitting(true);
    setError('');

    // Filter out answers for hidden questions
    const finalAnswers: Record<string, any> = {};
    form.questions.forEach((q) => {
      let isVisible = true;
      if (q.parentId) {
        const parentVal = answers[q.parentId];
        if (
          !parentVal ||
          (Array.isArray(parentVal) && !parentVal.includes(q.showWhenValue)) ||
          (!Array.isArray(parentVal) && String(parentVal) !== String(q.showWhenValue))
        ) {
          isVisible = false;
        }
      }
      if (isVisible) {
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6">
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
            
            {error && <p className="text-sm text-rose-500 font-medium text-center">{error}</p>}
            
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

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        
        <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900 mb-3">{form?.title || form?.name}</h1>
          <p className="text-slate-600 text-lg">{form?.description}</p>
          <div className="mt-6 flex items-center gap-2 text-xs font-bold text-indigo-600 uppercase bg-indigo-50 inline-flex px-3 py-1.5 rounded-lg">
            <Mail className="w-4 h-4" />
            Respondendo como: {email}
          </div>
        </div>

        <div className="space-y-6">
          {form?.questions.map((question, index) => {
            if (question.parentId) {
              const parentVal = answers[question.parentId];
              if (
                !parentVal ||
                (Array.isArray(parentVal) && !parentVal.includes(question.showWhenValue)) ||
                (!Array.isArray(parentVal) && String(parentVal) !== String(question.showWhenValue))
              ) {
                return null;
              }
            }
            return (
              <div key={question.id} className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm transition-all">
                <div className="flex items-start gap-4">
                  <span className="text-2xl mt-1">{questionTypeIcons[question.type]}</span>
                  <div className="flex-1">
                    <p className="text-lg font-bold text-slate-900 mb-4">
                      {index + 1}. {question.label}
                    </p>

                    {question.type === 'simnao' && (
                      <div className="flex gap-4">
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex-1">
                          <input type="radio" name={`q${index}`} value="Sim" checked={answers[question.id] === 'Sim'} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                          <span className="font-medium text-slate-700">Sim</span>
                        </label>
                        <label className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer flex-1">
                          <input type="radio" name={`q${index}`} value="Não" checked={answers[question.id] === 'Não'} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                          <span className="font-medium text-slate-700">Não</span>
                        </label>
                      </div>
                    )}

                    {question.type === 'alternativa' && (
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => (
                          <label key={optIndex} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer w-full">
                            <input type="radio" name={`q${index}`} value={option} checked={answers[question.id] === option} onChange={(e) => setAnswers({ ...answers, [question.id]: e.target.value })} className="w-5 h-5 text-indigo-600 border-slate-300 focus:ring-indigo-600" />
                            <span className="font-medium text-slate-700">{option}</span>
                          </label>
                        ))}
                      </div>
                    )}

                    {question.type === 'check' && (
                      <div className="space-y-3">
                        {question.options.map((option, optIndex) => {
                          const isChecked = (answers[question.id] || []).includes(option);
                          return (
                            <label key={optIndex} className="flex items-center gap-3 p-4 rounded-2xl border border-slate-200 hover:bg-slate-50 cursor-pointer w-full">
                              <input type="checkbox" value={option} checked={isChecked} onChange={(e) => {
                                const current = answers[question.id] || [];
                                const next = e.target.checked ? [...current, option] : current.filter((o: string) => o !== option);
                                setAnswers({ ...answers, [question.id]: next });
                              }} className="w-5 h-5 rounded text-indigo-600 border-slate-300 focus:ring-indigo-600" />
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
                        className="w-full sm:w-auto rounded-2xl border border-slate-200 p-4 text-base outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 bg-slate-50 transition-all" 
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
                </div>
              </div>
            );
          })}
        </div>

        {error && <div className="p-4 bg-rose-50 text-rose-600 rounded-2xl border border-rose-200 font-medium text-center">{error}</div>}

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
    </div>
  );
}
