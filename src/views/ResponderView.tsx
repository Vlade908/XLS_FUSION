/** @format */
import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx-js-style";
import { smartClean, normID } from "../utils/excelLogic";

interface Props { user: { name: string, email: string, photo?: string } | null; }

export default function ResponderView({ user }: Props) {
  const [codigoBusca, setCodigoBusca] = useState("");
  const [minhasRespostas, setMinhasRespostas] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [employeeMapping, setEmployeeMapping] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  
  // ESTADOS PARA VALIDAÇÃO DE CPF E MODAL
  const [showCPFModal, setShowCPFModal] = useState(false);
  const [tempResponder, setTempResponder] = useState<any>(null);
  const [cpfInput, setCpfInput] = useState("");

  const [responderQuestions, setResponderQuestions] = useState<any[]>([]);
  const [responderAnswers, setResponderAnswers] = useState<Record<string | number, any>>({});
  const [isResponderFinished, setIsResponderFinished] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responderWorkbook, setResponderWorkbook] = useState<XLSX.WorkBook | null>(null);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // MÁSCARA DE CPF EM TEMPO REAL
  const formatCPF = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (numeric.length <= 11) {
      return numeric
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d)/, "$1.$2")
        .replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return val;
  };

  const carregarMinhasRespostas = useCallback(() => {
    if (user?.email) {
      fetch(`/api/minhas-respostas?email=${user.email}`)
        .then(res => res.json())
        .then(data => setMinhasRespostas(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erro histórico auditor:", err));
    }
  }, [user]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) { setCodigoBusca(p); buscarProjeto(p); }
    carregarMinhasRespostas();
  }, [carregarMinhasRespostas]);

  // BUSCA PROJETO E ARQUIVOS EXTERNOS
  const buscarProjeto = async (codigo: string, editarNome?: string) => {
    if (!codigo) return;
    try {
      const res = await fetch(`/api/projeto/${codigo}/detalhes`);
      if (!res.ok) throw new Error("Código de Auditoria não encontrado.");
      const data = await res.json();
      setActiveProject(data);
      
      // 1. Baixar o arquivo de respostas (Para ter as questões)
      const resFileRes = await fetch(`/api/download-arquivo?path=${data.links.baseRespostas}`);
      const resFileData = await resFileRes.json();
      const wbRes = XLSX.read(resFileData.base64, { type: 'base64', cellStyles: true });
      setResponderWorkbook(wbRes);

      // 2. Baixar o arquivo de REGRAS (Relação Funcionario x Questão x CPF)
      const rulesFileRes = await fetch(`/api/download-arquivo?path=${data.links.rules}`);
      const rulesFileData = await rulesFileRes.json();
      const wbRules = XLSX.read(rulesFileData.base64, { type: 'base64' });
      
      const rulesSheet = wbRules.Sheets[wbRules.SheetNames[0]];
      const rulesData: any[][] = XLSX.utils.sheet_to_json(rulesSheet, { header: 1 });
      const employees: any[] = [];
      const namesSeen = new Set();

      rulesData.forEach((row: any, i: number) => {
        if (i > 0 && row[1]) { 
          const name = String(row[1]).trim();
          const cpf = String(row[2] || "").trim();
          if (!namesSeen.has(name)) {
            namesSeen.add(name);
            employees.push({ 
              name, 
              cpf: formatCPF(cpf),
              color: "#6366F1" 
            });
          }
        }
      });
      setEmployeeMapping(employees);

      if (editarNome) {
        startResponderSession(editarNome, wbRes, rulesData);
      }
    } catch (err: any) { alert(err.message); }
  };

  const handleSelectResponder = (emp: any) => {
    setTempResponder(emp);
    setShowCPFModal(true);
    setCpfInput("");
  };

  const validarCPFESeguir = () => {
    const cpfFormatadoInput = formatCPF(cpfInput);
    if (cpfFormatadoInput === tempResponder.cpf) {
      setShowCPFModal(false);
      startResponderSession(tempResponder.name);
    } else {
      alert("⚠️ CPF inválido para este colaborador. Verifique e tente novamente.");
    }
  };

  const startResponderSession = async (name: string, wbOverride?: XLSX.WorkBook, rulesOverride?: any[][]) => {
    const wb = wbOverride || responderWorkbook;
    if (!wb) return;

    let rules = rulesOverride;
    if (!rules) {
      const rulesFileRes = await fetch(`/api/download-arquivo?path=${activeProject.links.rules}`);
      const rulesFileData = await rulesFileRes.json();
      const wbRules = XLSX.read(rulesFileData.base64, { type: 'base64' });
      rules = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });
    }

    setSelectedResponder(name);
    const formSheet = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
    const myIds = rules
      .filter((r: any) => String(r[1]).trim().toLowerCase() === name.toLowerCase())
      .map((r: any) => normID(r[0]));

    const formData: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
    const groupedData: Record<string, any> = {};
    let lastId = "";
    let lastType = "";

    formData.forEach((row: any, idx: number) => {
      if (idx === 0) return;
      if (row[1]) lastId = String(row[1]).trim();
      const rawType = String(row[8] || "").trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
      if (rawType !== "") lastType = rawType;

      if (lastId && myIds.includes(normID(lastId))) {
        if (!groupedData[lastId]) groupedData[lastId] = { id: lastId, questionParts: [], rows: [], type: lastType };
        const text = [row[2], row[3], row[4], row[5]].map(v => String(v || "").trim()).filter(v => v !== "").join(" ");
        if (text.length > 1) groupedData[lastId].questionParts.push(text);
        groupedData[lastId].rows.push({ rowIndex: idx, exResp: String(row[6] || "").trim() });
      }
    });

    setResponderQuestions(Object.values(groupedData).map((g: any) => ({ 
      ...g, 
      fullText: Array.from(new Set(g.questionParts)).join(" ").trim() 
    })));
    setCurrentStep(0);
    setIsResponderFinished(false);
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setIsDragging(true);
    else if (e.type === "dragleave") setIsDragging(false);
  };
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault(); e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setResponderAnswers(p => ({ ...p, [currentStep]: e.dataTransfer.files[0].name }));
    }
  };

  const finalizarEReplicarNuvem = async () => {
    if (!responderWorkbook || !activeProject) return;
    const ws = responderWorkbook.Sheets["Formulario"] || responderWorkbook.Sheets[responderWorkbook.SheetNames[0]];
    
    responderQuestions.forEach((q, idx) => {
      const ans = responderAnswers[idx];
      if (q.type === 'check') {
        q.rows.forEach((row: any) => {
          const isSelected = Array.isArray(ans) && ans.includes(row.rowIndex);
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? 1 : 0, t: 'n' };
        });
      } else if (['alternativa', 'simnaooutro'].includes(q.type)) {
        q.rows.forEach((row: any) => {
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: ans === row.rowIndex ? row.exResp : "", t: 's' };
        });
      } else {
        const cell = XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 });
        ws[cell] = { v: smartClean(ans || ""), t: 's' };
      }
    });

    const out = XLSX.write(responderWorkbook, { type: 'array', bookType: 'xlsx' });
    const fd = new FormData();
    fd.append('file', new Blob([out]), 'resposta.xlsx');
    fd.append('codigoProjeto', activeProject.codigo);
    fd.append('responder', selectedResponder);
    fd.append('emailRespondente', user?.email || '');

    try {
      const res = await fetch('/api/finalizar-resposta-nuvem', { method: 'POST', body: fd });
      if (res.ok) { setIsResponderFinished(true); carregarMinhasRespostas(); }
    } catch (e) { alert("Erro ao salvar."); }
  };

  const historyByMonth = minhasRespostas.reduce((acc: any, curr: any) => {
    const date = new Date(curr.respondidoEm);
    const monthYear = date.toLocaleString('pt-BR', { month: 'long', year: 'numeric' });
    if (!acc[monthYear]) acc[monthYear] = [];
    acc[monthYear].push(curr);
    return acc;
  }, {});

  const q = responderQuestions[currentStep];
  const isComplete = q?.type === "check" 
    ? Array.isArray(responderAnswers[currentStep]) && responderAnswers[currentStep].length > 0
    : responderAnswers[currentStep] !== undefined && responderAnswers[currentStep] !== "";

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-6 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {showCPFModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] shadow-2xl p-10 animate-in zoom-in-95 duration-300 text-center space-y-6 border border-white/20">
              <div className="w-20 h-20 bg-indigo-50 rounded-3xl mx-auto flex items-center justify-center text-3xl shadow-inner">🔐</div>
              <div>
                <h3 className="text-xl font-black text-slate-800 uppercase italic tracking-tight">Confirmar Identidade</h3>
                <p className="text-slate-400 text-[10px] font-bold uppercase mt-2 tracking-widest">Olá, {tempResponder?.name}!<br/>Insira seu CPF para liberar o acesso.</p>
              </div>
              <input 
                type="text" 
                maxLength={14}
                value={cpfInput}
                onChange={(e) => setCpfInput(formatCPF(e.target.value))}
                placeholder="000.000.000-00"
                className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-2xl text-center font-black text-2xl outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
              <div className="flex gap-3">
                <button onClick={() => setShowCPFModal(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-black uppercase text-[10px] hover:bg-slate-200 transition-all">Cancelar</button>
                <button onClick={validarCPFESeguir} className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg hover:bg-indigo-700 transition-all">Validar e Entrar</button>
              </div>
            </div>
          </div>
        )}

        {!activeProject && (
          <div className="space-y-12 animate-in fade-in zoom-in duration-700">
            <div className="text-center space-y-4">
              <h1 className="text-5xl font-black text-slate-900 uppercase italic">Portal do <span className="text-indigo-600">Auditor</span></h1>
              <p className="text-slate-400 font-bold text-xs uppercase tracking-widest leading-relaxed">Acesse sua auditoria pelo código do formulário</p>
            </div>
            <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl flex gap-2 border-4 border-white overflow-hidden">
              <input type="text" placeholder="Ex: AUDIT-123" value={codigoBusca} onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())} className="flex-grow p-6 rounded-[2rem] bg-slate-50 outline-none font-black text-xl placeholder:text-slate-300" />
              <button onClick={() => buscarProjeto(codigoBusca)} className="px-10 bg-indigo-600 text-white rounded-[2rem] font-black uppercase hover:bg-slate-900 transition-all active:scale-95">Acessar</button>
            </div>
            {user && minhasRespostas.length > 0 && (
              <div className="space-y-8 animate-in slide-in-from-bottom-5">
                <h3 className="text-[10px] font-black text-slate-400 uppercase mb-4 ml-4 tracking-[0.3em] border-l-4 border-indigo-600 pl-4">Auditorias Realizadas</h3>
                {Object.entries(historyByMonth).map(([month, items]: any) => (
                  <div key={month} className="space-y-4">
                    <h4 className="text-[9px] font-black text-indigo-500 uppercase ml-4 italic bg-indigo-50 inline-block px-3 py-1 rounded-full">{month}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {items.map((r: any) => (
                        <div key={r.respondidoEm} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between group hover:border-indigo-300 hover:shadow-xl transition-all">
                          <div>
                            <h4 className="font-black text-slate-800 text-sm tracking-tight">{r.codigoProjeto}</h4>
                            <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase italic">Respondente: {r.nome}</p>
                          </div>
                          <button onClick={() => { setCodigoBusca(r.codigoProjeto); buscarProjeto(r.codigoProjeto, r.nome); }} className="px-5 py-2.5 bg-slate-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Editar Resposta</button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* SEÇÃO CORRIGIDA: SEM SCROLLBAR E SEM MAX-HEIGHT */}
        {activeProject && !selectedResponder && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 space-y-6 text-center">
            <button onClick={() => setActiveProject(null)} className="text-[10px] font-black uppercase text-slate-400 flex items-center gap-2 hover:text-indigo-600 transition-all mx-auto font-black tracking-widest">← Voltar para Busca</button>
            <h2 className="text-3xl font-black italic uppercase text-slate-900 tracking-tighter">Selecione seu nome</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {employeeMapping.map(emp => {
                const jaRespondido = activeProject.respostas?.some((r: any) => r.nome.toLowerCase() === emp.name.toLowerCase());
                return (
                  <button key={emp.name} disabled={jaRespondido} onClick={() => handleSelectResponder(emp)} className={`p-6 rounded-3xl border shadow-xl transition-all text-center space-y-3 group ${jaRespondido ? 'bg-slate-100 border-slate-200 grayscale opacity-50 cursor-not-allowed' : 'bg-white border-slate-100 hover:scale-105 active:scale-95 hover:border-indigo-300'}`}>
                    <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-xl shadow-lg" style={{backgroundColor: jaRespondido ? '#94a3b8' : emp.color}}>{jaRespondido ? '✓' : emp.name[0]}</div>
                    <p className="text-[10px] font-black text-slate-800 uppercase truncate w-full">{emp.name}</p>
                    {jaRespondido && <p className="text-[8px] font-black text-slate-400 uppercase">Concluído</p>}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedResponder && !isResponderFinished && q && (
          <div className="space-y-4 animate-in fade-in duration-500">
             <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedResponder("")} className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center hover:bg-rose-500 transition-all font-bold">✕</button>
                  <div><p className="text-indigo-400 font-black text-[10px] uppercase">{activeProject.mesAno}</p><h3 className="text-lg font-black italic uppercase leading-none">{selectedResponder}</h3></div>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic">Quesito {currentStep + 1} de {responderQuestions.length}</p>
                  <div className="w-24 h-1 bg-white/10 rounded-full mt-1 overflow-hidden ml-auto"><div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${((currentStep + 1)/responderQuestions.length)*100}%`}}></div></div>
                </div>
             </div>

             <div className="w-full bg-white/40 backdrop-blur-md p-1.5 rounded-full border border-white shadow-sm overflow-x-auto custom-scrollbar">
                <div className="flex gap-1.5 h-2.5 items-center w-full min-w-max px-2">
                  {responderQuestions.map((_, idx) => (
                    <button key={idx} onClick={() => setCurrentStep(idx)} className={`h-full flex-grow min-w-[12px] rounded-full transition-all duration-300 ${idx === currentStep ? "bg-indigo-600 scale-y-125 z-10 shadow-[0_0_10px_rgba(79,70,229,0.4)]" : responderAnswers[idx] !== undefined ? "bg-indigo-300" : "bg-white"}`} />
                  ))}
                </div>
             </div>

             <div className="bg-white p-10 md:p-16 rounded-[3.5rem] shadow-xl border border-slate-100 min-h-[450px] flex flex-col justify-center relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-4 text-slate-50 font-black text-[12rem] pointer-events-none italic leading-none select-none opacity-50">{q.id}</div>
                <div className="relative z-10 space-y-10">
                  <div className="flex flex-col items-center gap-3">
                    <span className="inline-block text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase tracking-[0.2em]">Referência: {q.id}</span>
                    <h2 className="text-3xl md:text-4xl font-black text-slate-800 leading-tight italic max-w-2xl">"{q.fullText}"</h2>
                  </div>
                  <div className="space-y-4 max-w-xl mx-auto w-full">
                    {q.type === 'simnao' && (
                      <div className="grid grid-cols-2 gap-4">
                        {['Sim', 'Não'].map(opt => (
                          <button key={opt} onClick={() => setResponderAnswers(p => ({...p, [currentStep]: opt}))} className={`p-8 rounded-[2rem] font-black uppercase text-sm transition-all shadow-sm ${responderAnswers[currentStep] === opt ? (opt === 'Sim' ? 'bg-emerald-500 text-white scale-105 shadow-emerald-200' : 'bg-rose-500 text-white scale-105 shadow-rose-200') : 'bg-slate-50 text-slate-400 hover:bg-slate-100'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                    {['alternativa', 'simnaooutro'].includes(q.type) && (
                      <div className="grid grid-cols-1 gap-3 text-left">
                        {q.rows.filter((r: any) => r.exResp).map((row: any) => (
                          <button key={row.rowIndex} onClick={() => setResponderAnswers(p => ({ ...p, [currentStep]: row.rowIndex }))} className={`flex items-center p-5 rounded-[1.5rem] border-2 transition-all gap-4 group ${responderAnswers[currentStep] === row.rowIndex ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-slate-100 bg-slate-50/50 hover:border-indigo-200"}`}>
                            <div className={`w-5 h-5 rounded-full border-4 flex-shrink-0 transition-all ${responderAnswers[currentStep] === row.rowIndex ? "border-indigo-600 bg-white" : "border-slate-200 bg-white"}`} />
                            <span className={`text-[11px] font-black uppercase tracking-tighter ${responderAnswers[currentStep] === row.rowIndex ? 'text-indigo-900' : 'text-slate-500'}`}>{row.exResp}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {q.type === 'anexararquivo' && (
                      <div onDragEnter={handleDrag} onDragLeave={handleDrag} onDragOver={handleDrag} onDrop={handleDrop} onClick={() => fileInputRef.current?.click()} className={`p-14 border-4 border-dashed rounded-[3rem] flex flex-col items-center text-center space-y-5 transition-all cursor-pointer group ${isDragging ? "border-indigo-600 bg-indigo-50 scale-[1.02]" : responderAnswers[currentStep] ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}>
                        <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.files?.[0]?.name || "Arquivo Selecionado"}))} />
                        <div className="text-6xl transition-transform group-hover:scale-110 duration-300">{responderAnswers[currentStep] ? "✅" : "☁️"}</div>
                        <div className="space-y-2"><p className={`text-base font-black uppercase italic ${responderAnswers[currentStep] ? 'text-emerald-700' : 'text-slate-900'}`}>{responderAnswers[currentStep] ? "Documento Carregado" : "Arraste o Comprovante"}</p><p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{responderAnswers[currentStep] || "Clique aqui ou solte o arquivo"}</p></div>
                      </div>
                    )}
                    {q.type === "check" && (
                      <div className="grid grid-cols-1 gap-3 text-left">
                        {q.rows.filter((r: any) => r.exResp).map((row: any) => {
                          const answers = responderAnswers[currentStep] || [];
                          const active = Array.isArray(answers) && answers.includes(row.rowIndex);
                          return (
                            <button key={row.rowIndex} onClick={() => {
                              const next = active ? answers.filter((i: any) => i !== row.rowIndex) : [...(Array.isArray(answers)?answers:[]), row.rowIndex];
                              setResponderAnswers(p => ({ ...p, [currentStep]: next }));
                            }} className={`flex items-center p-5 rounded-[1.5rem] border-2 transition-all gap-4 group ${active ? "border-indigo-500 bg-indigo-50 shadow-md" : "border-slate-100 bg-slate-50/50 hover:border-indigo-200"}`}><div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${active ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200 rotate-45 group-hover:rotate-0"}`}>{active && <span className="text-white text-xs font-black">✓</span>}</div><span className={`text-[11px] font-black uppercase transition-colors ${active ? 'text-indigo-900' : 'text-slate-500'}`}>{row.exResp}</span></button>
                          );
                        })}
                      </div>
                    )}
                    {q.type === "respostaescrita" && <textarea onChange={(e) => setResponderAnswers(p => ({ ...p, [currentStep]: e.target.value }))} value={responderAnswers[currentStep] || ""} className="w-full p-6 rounded-[2rem] bg-slate-50 min-h-[150px] text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-100 transition-all shadow-inner focus:bg-white focus:shadow-xl" placeholder="Escreva seu comentário..." />}
                  </div>
                </div>
             </div>

             <div className="flex gap-3">
                <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 0} className="px-10 py-5 bg-white rounded-full font-black uppercase text-[10px] text-slate-400 disabled:opacity-0 shadow-sm border border-slate-100 hover:bg-slate-50 transition-all active:scale-95">Anterior</button>
                <button onClick={currentStep === responderQuestions.length - 1 ? finalizarEReplicarNuvem : () => setCurrentStep(p => p + 1)} disabled={!isComplete} className={`flex-grow py-5 rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-xl transition-all active:scale-95 ${currentStep === responderQuestions.length - 1 ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200' : 'bg-slate-900 hover:bg-indigo-600 text-white'} disabled:bg-slate-200 disabled:text-slate-400`}>{currentStep === responderQuestions.length - 1 ? "🚀 Finalizar" : "Próxima"}</button>
             </div>
          </div>
        )}

        {isResponderFinished && (
          <div className="text-center py-24 animate-in zoom-in duration-700 space-y-6 bg-white rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
            <div className="text-9xl mb-4 drop-shadow-xl">✨</div>
            <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Concluída!</h2>
            <p className="text-slate-400 font-bold uppercase text-[10px] tracking-[0.3em]">Seus dados foram salvos no cofre digital</p>
            <button onClick={() => window.location.reload()} className="mt-8 px-12 py-5 bg-indigo-600 text-white rounded-full font-black uppercase text-[11px] shadow-lg hover:bg-slate-900 transition-all hover:scale-105 active:scale-95">Responder Outro</button>
          </div>
        )}
      </div>
    </div>
  );
}