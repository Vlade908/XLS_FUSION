import AuditorUpload from '../components/AuditorUpload';
import React, { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { smartClean, normID } from '../utils/excelLogic';

export default function ResponderView() {
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [employeeMapping, setEmployeeMapping] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  const [responderQuestions, setResponderQuestions] = useState<any[]>([]);
  const [responderAnswers, setResponderAnswers] = useState<Record<number, any>>({});
  const [isResponderFinished, setIsResponderFinished] = useState(false);
  const [responderWorkbook, setResponderWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  // --- Lógica de Excel mantida integralmente ---
  const findSheet = (wb: XLSX.WorkBook, target: string) => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return wb.SheetNames.find(n => normalize(n) === normalize(target));
  };

  const handleAnswerFileUpload = async (file: File) => {
    const wb = XLSX.read(await file.arrayBuffer(), { cellStyles: true });
    setResponderWorkbook(wb);
    const mapSheetName = findSheet(wb, "mapeamento");
    if (!mapSheetName) return alert("Erro: Aba 'Mapeamento' não encontrada.");
    
    const mapSheet = wb.Sheets[mapSheetName];
    const mapData: any[][] = XLSX.utils.sheet_to_json(mapSheet, { header: 1 });
    const employees: any[] = [];
    const namesSeen = new Set();
    
    mapData.forEach((row, i) => {
      if (i > 0 && row[1] && !namesSeen.has(row[1])) {
        const name = String(row[1]).trim();
        namesSeen.add(name);
        const cellRef = XLSX.utils.encode_cell({r: i, c: 1});
        const color = mapSheet[cellRef]?.s?.fill?.fgColor?.rgb || "6366F1";
        employees.push({ name, color: `#${color}` });
      }
    });
    setEmployeeMapping(employees);
    setAnswerFile(file);
  };

  const startResponderSession = (name: string) => {
    if (!responderWorkbook) return;
    setSelectedResponder(name);
    const formSheetName = findSheet(responderWorkbook, "formulario");
    const mapSheetName = findSheet(responderWorkbook, "mapeamento");
    const formSheet = responderWorkbook.Sheets[formSheetName!];
    const mapSheet = responderWorkbook.Sheets[mapSheetName!];

    const mapData: any[][] = XLSX.utils.sheet_to_json(mapSheet, { header: 1 });
    const myIds = mapData.filter(r => String(r[1]).trim().toLowerCase() === name.toLowerCase()).map(r => normID(r[0]));
    
    const formData: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
    const groupedData: Record<string, any> = {};
    let lastKnownId = "";
    let lastKnownType = "";

    formData.forEach((row, idx) => {
      if (idx === 0) return;
      if (row[1]) lastKnownId = normID(row[1]);
      const rawType = String(row[8] || "").trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
      if (rawType !== "") lastKnownType = rawType;

      if (lastKnownId && myIds.includes(lastKnownId)) {
        if (!groupedData[lastKnownId]) {
          groupedData[lastKnownId] = { id: lastKnownId, questionParts: [], rows: [], type: lastKnownType };
        }
        const questionText = [row[2], row[3], row[4], row[5]].map(v => String(v || "").trim()).filter(v => v !== "").join(" ");
        if (questionText.length > 1) groupedData[lastKnownId].questionParts.push(questionText);
        groupedData[lastKnownId].rows.push({ rowIndex: idx, exResp: String(row[6] || "").trim() });
      }
    });

    setResponderQuestions(Object.values(groupedData).map((g: any) => ({ ...g, fullText: Array.from(new Set(g.questionParts)).join(" ").trim() })));
    setCurrentStep(0);
    setIsResponderFinished(false);
  };

  const downloadResponderFile = () => {
    const wb = responderWorkbook!;
    const ws = wb.Sheets[findSheet(wb, "formulario")!];
    
    responderQuestions.forEach((q, idx) => {
      const ans = responderAnswers[idx];
      if (q.type === 'check') {
        q.rows.forEach(row => {
          const isSelected = Array.isArray(ans) && ans.includes(row.rowIndex);
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? 1 : 0, t: 'n' };
        });
      } 
      else if (['alternativa', 'simnaooutro'].includes(q.type)) {
        q.rows.forEach(row => {
          const isSelected = ans === row.rowIndex;
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? row.exResp : "", t: 's' };
        });
      } 
      else if (q.type === 'simnao') {
        const cellRef = XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 });
        ws[cellRef] = { v: ans || "", t: 's' };
      } 
      else if (q.type === 'respostaescritaporlinha') {
        q.rows.forEach(row => {
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: smartClean(ans?.[row.rowIndex] || ""), t: 's' };
        });
      } 
      else {
        ws[XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 })] = { v: smartClean(ans || ""), t: 's' };
      }
    });
    
    XLSX.writeFile(wb, `${selectedResponder}_Respondido.xlsx`);
    setIsResponderFinished(true);
  };

  const q = responderQuestions[currentStep];
  const isComplete = q?.type === 'respostaescritaporlinha' 
    ? responderAnswers[currentStep] && Object.values(responderAnswers[currentStep]).some(v => v !== "")
    : responderAnswers[currentStep] !== undefined && responderAnswers[currentStep] !== "";

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center p-[2vw] relative overflow-x-hidden font-sans text-slate-800">
      
      {/* Background decorativo adaptável */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] bg-indigo-200/40 blur-[10vw] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-purple-200/30 blur-[10vw] rounded-full" />
      </div>

      <div className="w-full max-w-[95vw] lg:max-w-6xl relative z-10 flex flex-col items-center mt-[2vh]">
        
        {/* ESTADO 1: IMPORTAÇÃO */}
        {!answerFile && !selectedResponder && (
          <div className="w-full space-y-[4vh] animate-in fade-in zoom-in duration-700 text-center flex flex-col items-center">
            <h1 className="text-[clamp(2.5rem,8vw,5rem)] font-black text-[#1e293b] leading-tight uppercase tracking-tighter">
              Modo <span className="bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent italic">Resposta</span>
            </h1>
            
            <div className="bg-white/40 backdrop-blur-[30px] p-[1vw] rounded-[3rem] lg:rounded-[4.5rem] border border-white shadow-2xl w-full max-w-3xl">
              <div className="bg-white rounded-[2.5rem] lg:rounded-[4rem] p-[5vw] lg:p-16 flex flex-col items-center w-full">
                <div className="w-20 h-20 lg:w-24 lg:h-24 bg-indigo-600 rounded-3xl flex items-center justify-center text-4xl shadow-xl mb-8 text-white">📩</div>
                <h2 className="text-[clamp(1.2rem,3vw,1.8rem)] font-black text-[#1e293b] uppercase italic mb-8 tracking-tight">IMPORTAR FORMULÁRIO</h2>
                
                <div className="w-full">
                  <FileCard 
                    title="Clique ou arraste o formulário aqui" 
                    subtitle="Selecione o arquivo gerado na etapa de Preparação" 
                    color="bg-transparent" 
                    icon="" 
                    file={answerFile} 
                    onFileChange={handleAnswerFileUpload} 
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ESTADO 2: SELEÇÃO DE NOME */}
        {answerFile && !selectedResponder && !isResponderFinished && (
            <div className="w-full space-y-[4vh] animate-in fade-in slide-in-from-bottom-10 text-center">
                <h2 className="text-[clamp(2rem,5vw,3rem)] font-black text-[#1e293b] italic uppercase tracking-tighter">Selecione seu nome</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
                    {employeeMapping.map(emp => (
                        <button key={emp.name} onClick={() => startResponderSession(emp.name)} 
                            className="flex flex-col items-center gap-4 p-6 lg:p-8 bg-white/80 backdrop-blur-md rounded-[2rem] lg:rounded-[2.5rem] border border-white shadow-xl hover:shadow-indigo-200 transition-all group">
                            <div className="w-12 h-12 lg:w-14 lg:h-14 rounded-2xl flex items-center justify-center font-black text-white shadow-lg text-xl" style={{ backgroundColor: emp.color }}>{emp.name[0]}</div>
                            <span className="text-[10px] lg:text-[11px] font-black text-[#64748b] uppercase tracking-widest truncate w-full px-2">{emp.name}</span>
                        </button>
                    ))}
                </div>
            </div>
        )}

        {/* ESTADO 3: QUESTIONÁRIO ATIVO */}
        {selectedResponder && !isResponderFinished && q && (
          <div className="w-full space-y-[2vh] animate-in fade-in duration-700">
             
             {/* Header do questionário */}
             <div className="flex flex-wrap justify-between items-center bg-white/60 backdrop-blur-md p-4 lg:p-6 rounded-[2rem] border border-white shadow-sm gap-4">
                <div className="flex items-center gap-4">
                  <button onClick={() => setSelectedResponder("")} className="w-10 h-10 lg:w-12 lg:h-12 bg-white rounded-2xl flex items-center justify-center text-[#94a3b8] hover:text-red-500 transition-all border border-slate-100 shadow-sm text-xl lg:text-2xl">✕</button>
                  <h3 className="text-lg lg:text-xl font-black text-[#1e293b] italic uppercase leading-none truncate max-w-[40vw]">{selectedResponder}</h3>
                </div>
                <span className="text-[9px] lg:text-[10px] font-black text-indigo-500 uppercase tracking-widest italic">Etapa {currentStep + 1} de {responderQuestions.length}</span>
             </div>

             {/* Barra de Progresso */}
             <div className="w-full bg-white/40 backdrop-blur-md p-3 lg:p-4 rounded-[1.5rem] lg:rounded-[2rem] border border-white shadow-sm">
                <div ref={scrollRef} className="flex gap-1 h-2 lg:h-3 items-center w-full">
                    {responderQuestions.map((_, idx) => (
                        <button key={idx} onClick={() => setCurrentStep(idx)}
                            className={`h-full flex-grow rounded-full transition-all duration-500
                                ${idx === currentStep ? 'bg-indigo-600 shadow-[0_0_12px_rgba(79,70,229,0.8)] scale-y-125 z-10' : 
                                  responderAnswers[idx] !== undefined ? 'bg-indigo-400 opacity-90' : 'bg-white border border-slate-100'}
                            `}
                        />
                    ))}
                </div>
             </div>

             {/* Card da Questão */}
             <div className="bg-white p-8 lg:p-16 rounded-[2.5rem] lg:rounded-[4rem] border border-white shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 lg:p-8 text-[#f1f5f9] font-black text-[clamp(4rem,15vw,10rem)] pointer-events-none italic leading-none select-none">
                    {currentStep + 1}
                </div>
                <div className="relative z-10 space-y-6 lg:space-y-10">
                  <span className="inline-block text-[9px] lg:text-[10px] font-black bg-[#1e293b] text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg">Quesito {q.id}</span>
                  
                  <h2 className="text-[clamp(1.2rem,4vw,2rem)] font-bold text-[#1e293b] leading-[1.3] italic tracking-tight">
                    "{q.fullText}"
                  </h2>
                  
                  <div className="space-y-4 lg:space-y-8 pt-4">
                    
                    {q.type === 'respostaescritaporlinha' && (
                      <div className="space-y-6 lg:space-y-10">
                        {q.rows.map((row: any, index: number) => (
                          <div key={row.rowIndex} className="space-y-2 lg:space-y-4 animate-in fade-in slide-in-from-left-4 duration-500">
                            <div className="flex items-center gap-3 ml-2">
                              <div className="h-2 w-2 bg-indigo-500 rounded-full shadow-md flex-shrink-0" />
                              <label className="text-[11px] lg:text-[13px] font-black text-indigo-600 uppercase tracking-[0.1em] leading-tight">
                                {row.exResp}
                              </label>
                            </div>
                            <input 
                              type="text"
                              value={responderAnswers[currentStep]?.[row.rowIndex] || ""}
                              onChange={(e) => setResponderAnswers(p => ({
                                ...p, 
                                [currentStep]: { ...(p[currentStep] || {}), [row.rowIndex]: e.target.value }
                              }))}
                              className="w-full p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 border-transparent bg-slate-50/50 text-base lg:text-lg font-bold text-slate-700 outline-none focus:bg-white focus:border-indigo-200 shadow-inner"
                              placeholder="Digite sua resposta..."
                            />
                          </div>
                        ))}
                      </div>
                    )}

                    {q.type === 'check' && (
                      <div className="grid grid-cols-1 gap-3">
                        {q.rows.filter((r:any)=>r.exResp).map(row => {
                          const answers = responderAnswers[currentStep] || [];
                          const active = answers.includes(row.rowIndex);
                          return (
                            <button key={row.rowIndex} onClick={() => {
                                const next = active ? answers.filter((i:any) => i !== row.rowIndex) : [...answers, row.rowIndex];
                                setResponderAnswers(p => ({...p, [currentStep]: next.length > 0 ? next : undefined}));
                              }} className="group flex items-center p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 transition-all text-left bg-white/50 border-slate-100 hover:border-indigo-300">
                              <div className={`w-6 h-6 lg:w-7 lg:h-7 rounded-xl border-4 flex-shrink-0 mr-4 flex items-center justify-center transition-all ${active ? 'border-indigo-400 bg-indigo-600' : 'border-slate-200 bg-white'}`}>
                                {active && <span className="text-white text-base lg:text-lg font-black">✓</span>}
                              </div>
                              <span className={`font-black text-base lg:text-lg tracking-tight leading-snug ${active ? 'text-indigo-900' : 'text-slate-500'}`}>{row.exResp}</span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {q.type === 'data' && (
                      <div className="relative">
                        <input type="date" value={responderAnswers[currentStep] || ""} onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} className="w-full p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2.5rem] border-4 border-indigo-50 bg-[#f8fafc] text-xl lg:text-2xl font-black outline-none focus:bg-white focus:border-indigo-400 transition-all text-slate-700 shadow-inner" />
                        <div className="absolute right-6 lg:right-8 top-1/2 -translate-y-1/2 pointer-events-none text-xl lg:text-2xl">📅</div>
                      </div>
                    )}

                    {q.type === 'link' && (
                      <div className="relative group">
                        <div className="absolute left-4 lg:left-6 top-1/2 -translate-y-1/2 text-xl lg:text-2xl">🔗</div>
                        <input type="text" placeholder="Cole aqui o link..." value={responderAnswers[currentStep] || ""} onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} className="w-full p-6 lg:p-8 pl-12 lg:pl-16 rounded-[1.5rem] lg:rounded-[2.5rem] border-4 border-indigo-50 bg-[#f8fafc] text-sm lg:text-lg font-mono text-indigo-600 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" />
                      </div>
                    )}

                    {q.type === 'anexararquivo' && (
                      <div className="p-6 lg:p-8 bg-indigo-50 border-4 border-dashed border-indigo-200 rounded-[2.5rem] lg:rounded-[3.5rem] flex flex-col items-center text-center space-y-4 lg:space-y-6">
                        <div className="text-4xl lg:text-5xl text-indigo-600">📁</div>
                        <p className="text-indigo-600 text-[11px] lg:text-sm font-bold italic leading-relaxed max-w-lg">
                          Selecione o arquivo solicitado no sistema principal após finalizar esta auditoria.
                        </p>
                        <button onClick={() => setResponderAnswers(p => ({...p, [currentStep]: "Arquivo Providenciado"}))} className="px-8 py-3 lg:px-10 lg:py-4 rounded-full font-black uppercase text-[9px] lg:text-xs tracking-widest transition-all bg-indigo-600 text-white shadow-xl hover:scale-105 active:scale-95">
                          {responderAnswers[currentStep] ? '✅ Providenciado' : 'Marcar como Providenciado'}
                        </button>
                      </div>
                    )}

                    {(q.type === 'alternativa' || q.type === 'simnaooutro') && q.rows.filter((r:any)=>r.exResp).map(r => (
                      <button key={r.rowIndex} onClick={() => setResponderAnswers(p => ({...p, [currentStep]: r.rowIndex}))}
                        className={`group flex items-center p-4 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border-2 transition-all text-left gap-4 lg:gap-6 ${responderAnswers[currentStep] === r.rowIndex ? 'border-indigo-500 bg-indigo-600 text-white shadow-2xl scale-[1.01]' : 'border-slate-100 bg-white/50 hover:border-indigo-300'}`}>
                        <div className={`w-5 h-5 lg:w-6 lg:h-6 rounded-full border-4 flex-shrink-0 ${responderAnswers[currentStep] === r.rowIndex ? 'border-white/40 bg-white' : 'border-slate-200 bg-white'}`} />
                        <span className={`font-black text-base lg:text-lg tracking-tight leading-snug ${responderAnswers[currentStep] === r.rowIndex ? 'text-white' : 'text-slate-500 group-hover:text-slate-800'}`}>{r.exResp}</span>
                      </button>
                    ))}

                    {q.type === 'simnao' && (
                      <div className="grid grid-cols-2 gap-4 lg:gap-6">
                        {['Sim', 'Não'].map(opt => (
                          <button key={opt} onClick={() => setResponderAnswers(p => ({...p, [currentStep]: opt}))}
                            className={`py-6 lg:py-10 rounded-[1.5rem] lg:rounded-[2rem] font-black uppercase text-base lg:text-lg transition-all shadow-xl ${responderAnswers[currentStep] === opt ? (opt === 'Sim' ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-[#e11d48] text-white shadow-rose-200') : 'bg-[#f8fafc] text-[#94a3b8]'}`}>{opt}</button>
                        ))}
                      </div>
                    )}
                    
                    {q.type === 'respostaescrita' && <textarea onChange={e => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} value={responderAnswers[currentStep]||""} className="w-full p-6 lg:p-8 rounded-[1.5rem] lg:rounded-[2rem] border-0 bg-[#f8fafc] min-h-[150px] lg:min-h-[200px] text-base lg:text-lg font-medium outline-none focus:bg-white shadow-inner" placeholder="Digite sua resposta aqui..." />}
                  </div>
                </div>
             </div>

             {/* Controles de Navegação */}
             <div className="flex gap-4 lg:gap-6 pt-4">
                <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 0} className="px-6 lg:px-10 py-4 lg:py-5 bg-white border border-[#e2e8f0] rounded-full font-black uppercase text-[9px] lg:text-[10px] tracking-widest text-[#94a3b8] disabled:opacity-0 hover:bg-gray-50 active:scale-95 shadow-sm transition-all">Anterior</button>
                <button onClick={currentStep === responderQuestions.length - 1 ? downloadResponderFile : () => setCurrentStep(p => p + 1)} disabled={!isComplete} 
                  className={`flex-grow py-4 lg:py-5 rounded-full font-black uppercase text-[10px] lg:text-xs tracking-[0.2em] lg:tracking-[0.3em] shadow-2xl transition-all active:scale-[0.98] disabled:bg-slate-200 ${currentStep === responderQuestions.length - 1 ? 'bg-[#1e293b] text-white' : 'bg-indigo-600 text-white shadow-indigo-200'}`}>
                  {currentStep === responderQuestions.length - 1 ? 'Finalizar Auditoria' : 'Próxima Questão'}
                </button>
             </div>
          </div>
        )}

        {/* ESTADO FINAL: CONCLUÍDO */}
        {isResponderFinished && (
           <div className="text-center space-y-6 lg:space-y-10 py-10 lg:py-20 animate-in zoom-in w-full max-w-2xl px-4">
              <div className="text-[clamp(4rem,10vw,7rem)] drop-shadow-2xl">🏆</div>
              <h2 className="text-[clamp(2.5rem,6vw,4rem)] font-black text-[#1e293b] italic uppercase leading-none">Concluído!</h2>
              
              <div className="w-full bg-white p-6 lg:p-10 rounded-[2.5rem] lg:rounded-[3.5rem] shadow-2xl border border-white">
                <AuditorUpload />
              </div>
        
              <button onClick={() => window.location.reload()} className="w-full sm:w-auto px-10 lg:px-14 py-4 lg:py-5 bg-[#1e293b] text-white rounded-full font-black uppercase tracking-widest shadow-2xl hover:bg-indigo-600 transition-all active:scale-95">
                Reiniciar Sessão
              </button>
           </div>
      )}
      </div>
    </div>
  );
};