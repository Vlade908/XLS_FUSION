/** @format */

import AuditorUpload from "../components/AuditorUpload";
import { useEffect, useState } from "react";
import * as XLSX from "xlsx-js-style";
import { FileCard } from "../components/FileCard";
import { smartClean, normID } from "../utils/excelLogic";

export default function ResponderView() {
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [employeeMapping, setEmployeeMapping] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  const [responderQuestions, setResponderQuestions] = useState<any[]>([]);
  const [responderAnswers, setResponderAnswers] = useState<Record<string | number, any>>({});
  const [isResponderFinished, setIsResponderFinished] = useState(false);
  const [responderWorkbook, setResponderWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const storageKey = answerFile && selectedResponder ? `xls_fusion_answers_${answerFile.name}_${selectedResponder}` : null;

  const findSheet = (wb: XLSX.WorkBook, target: string) => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return wb.SheetNames.find((n) => normalize(n) === normalize(target));
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

    mapData.forEach((row: any, i: number) => {
      if (i > 0 && row[1] && !namesSeen.has(row[1])) {
        const name = String(row[1]).trim();
        namesSeen.add(name);
        const cellRef = XLSX.utils.encode_cell({ r: i, c: 1 });
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
    const myIds = mapData
      .filter((r: any) => String(r[1]).trim().toLowerCase() === name.toLowerCase())
      .map((r: any) => normID(r[0]));

    const formData: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
    const groupedData: Record<string, any> = {};
    let lastKnownId = "";
    let lastKnownType = "";

    formData.forEach((row: any, idx: number) => {
      if (idx === 0) return;
      if (row[1]) lastKnownId = String(row[1]).trim();
      const rawType = String(row[8] || "").trim().toLowerCase().normalize("NFD").replace(/[^a-z0-9]/g, "");
      if (rawType !== "") lastKnownType = rawType;

      if (lastKnownId && myIds.includes(normID(lastKnownId))) {
        if (!groupedData[lastKnownId]) {
          groupedData[lastKnownId] = { id: lastKnownId, questionParts: [], rows: [], type: lastKnownType };
        }
        const questionText = [row[2], row[3], row[4], row[5]].map((v) => String(v || "").trim()).filter((v) => v !== "").join(" ");
        if (questionText.length > 1) groupedData[lastKnownId].questionParts.push(questionText);
        groupedData[lastKnownId].rows.push({ rowIndex: idx, exResp: String(row[6] || "").trim() });
      }
    });

    setResponderQuestions(Object.values(groupedData).map((g: any) => ({ ...g, fullText: Array.from(new Set(g.questionParts)).join(" ").trim() })));
    setCurrentStep(0);
    setIsResponderFinished(false);
  };

  useEffect(() => {
    if (!storageKey) return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResponderAnswers(parsed.responderAnswers || {});
        if (typeof parsed.currentStep === 'number') {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar respostas salvas:', err);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!storageKey) return;
    window.localStorage.setItem(storageKey, JSON.stringify({ responderAnswers, currentStep }));
  }, [storageKey, responderAnswers, currentStep]);

  const downloadResponderFile = () => {
    const wb = responderWorkbook!;
    const ws = wb.Sheets[findSheet(wb, "formulario")!];
    responderQuestions.forEach((q, idx) => {
      const ans = responderAnswers[idx];
      if (q.type === "check") {
        q.rows.forEach((row: any) => {
          const isSelected = Array.isArray(ans) && ans.includes(row.rowIndex);
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? 1 : 0, t: "n" };
        });
      } else if (["alternativa", "simnaooutro"].includes(q.type)) {
        q.rows.forEach((row: any) => {
          const isSelected = ans === row.rowIndex;
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? row.exResp : "", t: "s" };
        });
      } else if (q.type === "simnao") {
        const cellRef = XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 });
        ws[cellRef] = { v: ans || "", t: "s" };
      } else if (q.type === "respostaescritaporlinha") {
        q.rows.forEach((row: any) => {
          ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: smartClean(ans?.[row.rowIndex] || ""), t: "s" };
        });
      } else {
        ws[XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 })] = { v: smartClean(ans || ""), t: "s" };
      }
    });
    XLSX.writeFile(wb, `${selectedResponder}_Respondido.xlsx`);
    if (storageKey) {
      window.localStorage.removeItem(storageKey);
    }
    setIsResponderFinished(true);
  };

  const q = responderQuestions[currentStep];
  const isComplete = q?.type === "respostaescritaporlinha"
    ? responderAnswers[currentStep] && Object.values(responderAnswers[currentStep]).some((v) => v !== "")
    : responderAnswers[currentStep] !== undefined && responderAnswers[currentStep] !== "";

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col items-center justify-center p-4 relative overflow-x-hidden font-sans text-slate-800">
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-0 left-1/4 w-[40vw] h-[40vw] bg-indigo-200/20 blur-[10vw] rounded-full" />
        <div className="absolute bottom-0 right-1/4 w-[40vw] h-[40vw] bg-purple-200/20 blur-[10vw] rounded-full" />
      </div>

      <div className="w-full max-w-6xl relative z-10 flex flex-col flex-1 justify-center py-2">
        {!answerFile && !selectedResponder && (
          <div className="w-full space-y-6 animate-in fade-in zoom-in duration-700 text-center flex flex-col items-center">
            <h1 className="text-[clamp(2rem,6vw,4rem)] font-black text-[#1e293b] leading-tight uppercase tracking-tighter">
              Modo <span className="italic bg-gradient-to-r from-[#4f46e5] to-[#a855f7] bg-clip-text text-transparent">Resposta</span>
            </h1>
            <div className="bg-white/40 backdrop-blur-[20px] p-1 rounded-[2.5rem] md:rounded-[4rem] border border-white shadow-2xl w-full max-w-2xl">
              <div className="bg-white rounded-[2rem] md:rounded-[3.5rem] p-6 md:p-12 flex flex-col items-center">
                <div className="w-16 h-16 md:w-20 md:h-20 bg-indigo-600 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-4 text-white">📩</div>
                <h2 className="text-xl md:text-2xl font-black text-[#1e293b] uppercase italic mb-6">IMPORTAR FORMULÁRIO</h2>
                <div className="w-full">
                  <FileCard title="Clique ou arraste o formulário aqui" subtitle="Selecione o arquivo da Preparação" color="bg-transparent" icon="" file={answerFile} onFileChange={handleAnswerFileUpload} />
                </div>
              </div>
            </div>
          </div>
        )}

        {answerFile && !selectedResponder && !isResponderFinished && (
          <div className="w-full max-w-5xl mx-auto space-y-4 animate-in fade-in slide-in-from-bottom-10 text-center">
            <h2 className="text-[clamp(1.5rem,3vw,2.2rem)] font-black text-[#1e293b] italic uppercase tracking-tighter">Selecione seu nome</h2>
            <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 max-h-[60vh] overflow-y-auto p-4 custom-scrollbar">
              {employeeMapping.map((emp: any) => (
                <button key={emp.name} onClick={() => startResponderSession(emp.name)} className="flex flex-col items-center gap-2 p-3 md:p-4 bg-white/80 backdrop-blur-md rounded-[1.2rem] md:rounded-[1.5rem] border border-white shadow-lg hover:shadow-indigo-100 hover:scale-[1.02] transition-all active:scale-95 group">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center font-black text-white shadow-md text-sm md:text-base" style={{ backgroundColor: emp.color }}>{emp.name[0]}</div>
                  <span className="text-[9px] md:text-[10px] font-black text-[#64748b] uppercase tracking-widest truncate w-full">{emp.name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {selectedResponder && !isResponderFinished && q && (
          <div className="w-full space-y-3 animate-in fade-in duration-500 max-w-4xl mx-auto">
            <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-3 md:p-4 rounded-[1.2rem] border border-white shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => setSelectedResponder("")} className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-lg flex items-center justify-center text-[#94a3b8] hover:text-red-500 transition-all border border-slate-100 shadow-sm text-lg">✕</button>
                <h3 className="text-sm md:text-base font-black text-[#1e293b] italic uppercase leading-none truncate max-w-[120px] md:max-w-xs">{selectedResponder}</h3>
              </div>
              <span className="text-[7px] md:text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">Etapa {currentStep + 1} / {responderQuestions.length}</span>
            </div>

            <div className="w-full bg-white/40 backdrop-blur-md p-1.5 rounded-full border border-white shadow-sm">
              <div className="flex gap-1 h-2 items-center w-full">
                {responderQuestions.map((_, idx) => (
                  <button key={idx} onClick={() => setCurrentStep(idx)} className={`h-full flex-grow rounded-full transition-all duration-300 ${idx === currentStep ? "bg-indigo-600 scale-y-125 z-10 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : responderAnswers[idx] !== undefined ? "bg-indigo-400" : "bg-white"}`} />
                ))}
              </div>
            </div>

            <div className="bg-white p-5 md:p-8 rounded-[1.8rem] md:rounded-[2.5rem] border border-white shadow-2xl relative overflow-hidden flex flex-col max-h-[65vh]">
              <div className="absolute top-0 right-0 p-2 text-[#f1f5f9] font-black text-[clamp(3rem,8vw,6rem)] pointer-events-none italic leading-none select-none opacity-50">{currentStep + 1}</div>
              <div className="relative z-10 overflow-y-auto pr-1 custom-scrollbar">
                <span className="inline-block text-[7px] md:text-[8px] font-black bg-[#1e293b] text-white px-2.5 py-1 rounded-full uppercase tracking-widest mb-3">Quesito {q.id}</span>
                <h2 className="text-[clamp(1rem,2.5vw,1.6rem)] font-bold text-[#1e293b] leading-tight italic mb-5">"{q.fullText}"</h2>
                <div className="space-y-3 pt-1">
                  {/* ... (Tipos SimNao, Alternativa, etc) */}
                  {q.type === "simnao" && (
                    <div className="grid grid-cols-2 gap-3">
                      {["Sim", "Não"].map((opt) => (
                        <button key={opt} onClick={() => setResponderAnswers((p) => ({ ...p, [currentStep]: opt }))} className={`py-5 md:py-6 rounded-[1.2rem] font-black uppercase text-xs md:text-sm transition-all ${responderAnswers[currentStep] === opt ? (opt === "Sim" ? "bg-emerald-500 text-white" : "bg-rose-500 text-white") : "bg-slate-50 text-slate-400 hover:bg-slate-100"}`}>{opt}</button>
                      ))}
                    </div>
                  )}

                  {(q.type === "alternativa" || q.type === "simnaooutro") && q.rows.filter((r: any) => r.exResp).map((r: any) => (
                    <button key={r.rowIndex} onClick={() => setResponderAnswers((p) => ({ ...p, [currentStep]: r.rowIndex }))} className={`flex items-center p-3 rounded-[1rem] border-2 transition-all text-left gap-3 w-full ${responderAnswers[currentStep] === r.rowIndex ? "border-indigo-500 bg-indigo-50 text-indigo-900" : "border-slate-50 bg-slate-50/50 hover:border-indigo-200"}`}>
                      <div className={`w-4 h-4 rounded-full border-4 flex-shrink-0 ${responderAnswers[currentStep] === r.rowIndex ? "border-indigo-500 bg-white" : "border-slate-200 bg-white"}`} />
                      <span className="text-xs font-black tracking-tight md:text-sm">{r.exResp}</span>
                    </button>
                  ))}

                  {q.type === "respostaescritaporlinha" && q.rows.map((row: any) => (
                    <div key={row.rowIndex} className="space-y-1">
                      <label className="text-[9px] font-black text-indigo-600 uppercase ml-2">{row.exResp}</label>
                      <input type="text" value={responderAnswers[currentStep]?.[row.rowIndex] || ""} onChange={(e) => setResponderAnswers((p) => ({ ...p, [currentStep]: { ...(p[currentStep] || {}), [row.rowIndex]: e.target.value } }))} className="w-full p-3 rounded-[0.8rem] bg-slate-50 border-transparent focus:bg-white focus:border-indigo-200 border-2 outline-none text-xs font-bold shadow-inner" placeholder="Resposta..." />
                    </div>
                  ))}

                  {q.type === "check" && (
                    <div className="grid grid-cols-1 gap-2">
                      {q.rows.filter((r: any) => r.exResp).map((row: any) => {
                        const answers = responderAnswers[currentStep] || [];
                        const active = answers.includes(row.rowIndex);
                        return (
                          <button key={row.rowIndex} onClick={() => {
                            const next = active ? answers.filter((i: any) => i !== row.rowIndex) : [...answers, row.rowIndex];
                            setResponderAnswers((p) => ({ ...p, [currentStep]: next.length > 0 ? next : undefined }));
                          }} className="group flex items-center p-3 rounded-[1rem] border-2 transition-all text-left bg-white/50 border-slate-100 hover:border-indigo-300">
                            <div className={`w-5 h-5 rounded-lg border-4 flex-shrink-0 mr-3 flex items-center justify-center transition-all ${active ? "border-indigo-400 bg-indigo-600" : "border-slate-200 bg-white"}`}>{active && <span className="text-xs font-black text-white">✓</span>}</div>
                            <span className={`font-black text-xs md:text-sm tracking-tight leading-snug ${active ? "text-indigo-900" : "text-slate-500"}`}>{row.exResp}</span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                  {/* BLOCO DE ANEXO ATUALIZADO: PREVIEW COMPLETO + FECHAMENTO APÓS CONFIRMAR */}
                  {q.type === 'anexararquivo' && (
                    <div className="p-5 bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center text-center space-y-4 animate-in fade-in zoom-in">
                      
                      {/* 1. ESTADO INICIAL: NENHUM ARQUIVO SELECIONADO */}
                      {!responderAnswers[`pending_${q.id}`] && !String(responderAnswers[currentStep] || "").includes("Enviado") && (
                        <>
                          <div className="text-4xl">📤</div>
                          <div className="space-y-1">
                            <p className="text-slate-900 text-xs font-black uppercase italic">Anexar Comprovante</p>
                            <p className="text-slate-500 text-[10px] font-bold">Clique para selecionar o arquivo solicitado.</p>
                          </div>
                          <div className="w-full max-w-xs">
                            <input type="file" id={`upload-${q.id}`} className="hidden" onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) setResponderAnswers(p => ({...p, [`pending_${q.id}`]: file}));
                              }} />
                            <label htmlFor={`upload-${q.id}`} className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[10px] transition-all cursor-pointer shadow-md active:scale-95 w-full hover:bg-indigo-700">Selecionar Arquivo</label>
                          </div>
                        </>
                      )}

                      {/* 2. ESTADO DE PREVIEW: ARQUIVO SELECIONADO MAS NÃO ENVIADO */}
                      {responderAnswers[`pending_${q.id}`] && !String(responderAnswers[currentStep] || "").includes("Enviado") && (
                        <div className="w-full animate-in zoom-in duration-300">
                          <div className="bg-white p-4 rounded-[1.5rem] shadow-xl border border-indigo-100">
                            <p className="text-[9px] font-black text-indigo-600 uppercase mb-3 tracking-widest">Confirme o conteúdo:</p>
                            
                            <div className="w-full bg-slate-50 rounded-xl overflow-hidden mb-4 border border-slate-200 min-h-[150px] flex items-center justify-center">
                              {responderAnswers[`pending_${q.id}`].type.startsWith('image/') ? (
                                <img 
                                  src={URL.createObjectURL(responderAnswers[`pending_${q.id}`])} 
                                  className="w-full h-auto max-h-64 object-contain"
                                  alt="Preview"
                                />
                              ) : (
                                <div className="flex flex-col items-center p-6">
                                  <span className="text-5xl mb-2">📄</span>
                                  <span className="text-[10px] font-black text-slate-700 uppercase break-all px-4">
                                    {responderAnswers[`pending_${q.id}`].name}
                                  </span>
                                  <span className="text-[8px] font-bold text-slate-400 mt-1">
                                    {(responderAnswers[`pending_${q.id}`].size / 1024 / 1024).toFixed(2)} MB
                                  </span>
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <button onClick={() => setResponderAnswers(p => { const n = {...p}; delete n[`pending_${q.id}`]; return n; })} className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[9px] hover:bg-slate-200 transition-all">Trocar</button>
                              <button onClick={async () => {
                                  const file = responderAnswers[`pending_${q.id}`];
                                  const fileName = file.name; // Guardamos o nome para exibir depois
                                  setResponderAnswers(p => ({...p, [currentStep]: "Enviando..."}));
                                  const formData = new FormData();
                                  formData.append('file', file);
                                  formData.append('responder', selectedResponder);
                                  formData.append('questionNumber', q.id);
                                  formData.append('formName', answerFile?.name || 'formulario');
                                  try {
                                    const res = await fetch('/api/upload-anexo', { method: 'POST', body: formData });
                                    if (res.ok) { 
                                      // Salvamos o nome do arquivo na resposta para mostrar no modo "fechado"
                                      setResponderAnswers(p => ({...p, [currentStep]: `Enviado: ${fileName} ✅`})); 
                                    } else { throw new Error(); }
                                  } catch (err) { alert("Erro ao enviar. Tente novamente."); setResponderAnswers(p => ({...p, [currentStep]: undefined})); }
                                }} className="flex-1 py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] hover:bg-indigo-700 shadow-lg transition-all">É este mesmo!</button>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* 3. ESTADO FINAL: ARQUIVO ENVIADO (MODO FECHADO) */}
                      {String(responderAnswers[currentStep] || "").includes("Enviado") && (
                        <div className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between animate-in slide-in-from-top-2">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">📎</span>
                            <div className="text-left">
                              <p className="text-emerald-900 text-[10px] font-black uppercase leading-none">Arquivo Confirmado</p>
                              <p className="text-emerald-600 text-[8px] font-bold mt-1 truncate max-w-[180px] md:max-w-xs">
                                {responderAnswers[currentStep].replace("Enviado: ", "").replace(" ✅", "")}
                              </p>
                            </div>
                          </div>
                          <span className="text-emerald-500 font-black text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* ... (Resto do código data/link/escrita) */}
                  {q.type === 'data' && (
                    <div className="relative">
                      <input type="date" value={responderAnswers[currentStep] || ""} onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} className="w-full p-4 rounded-[1.2rem] border-2 border-indigo-50 bg-[#f8fafc] text-sm font-black outline-none focus:bg-white focus:border-indigo-400 transition-all text-slate-700 shadow-inner" />
                    </div>
                  )}
                  {q.type === 'link' && (
                    <input type="text" placeholder="Cole aqui o link..." value={responderAnswers[currentStep] || ""} onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} className="w-full p-4 rounded-[1.2rem] border-2 border-indigo-50 bg-[#f8fafc] text-xs font-mono text-indigo-600 outline-none focus:bg-white focus:border-indigo-400 transition-all shadow-inner" />
                  )}
                  {q.type === "respostaescrita" && <textarea onChange={(e) => setResponderAnswers((p) => ({ ...p, [currentStep]: e.target.value }))} value={responderAnswers[currentStep] || ""} className="w-full p-3 rounded-[1rem] bg-slate-50 min-h-[80px] text-xs outline-none focus:bg-white border-2 border-transparent focus:border-indigo-100 shadow-inner" placeholder="Sua resposta..." />}
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button onClick={() => setCurrentStep((p) => p - 1)} disabled={currentStep === 0} className="px-5 py-3 bg-white rounded-full font-black uppercase text-[9px] text-[#94a3b8] disabled:opacity-0 shadow-sm border border-slate-100 hover:bg-slate-50">Anterior</button>
              <button onClick={currentStep === responderQuestions.length - 1 ? downloadResponderFile : () => setCurrentStep((p) => p + 1)} disabled={!isComplete} className="flex-grow py-3 rounded-full font-black uppercase text-[9px] tracking-widest bg-indigo-600 text-white shadow-lg active:scale-95 transition-all disabled:bg-slate-200">
                {currentStep === responderQuestions.length - 1 ? "Finalizar" : "Próxima"}
              </button>
            </div>
          </div>
        )}

        {isResponderFinished && (
          <div className="py-4 text-center space-y-4 animate-in zoom-in">
            <div className="text-5xl drop-shadow-lg">🏆</div>
            <h2 className="text-2xl font-black text-[#1e293b] uppercase">Concluído!</h2>
            <div className="max-w-xs p-4 mx-auto bg-white rounded-[1.5rem] shadow-xl">
              <AuditorUpload />
            </div>
            <button onClick={() => window.location.reload()} className="px-8 py-3 bg-[#1e293b] text-white rounded-full font-black uppercase text-[10px] shadow-lg hover:bg-indigo-600">Reiniciar</button>
          </div>
        )}
      </div>
    </div>
  );
}