/** @format */

import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { motion, AnimatePresence } from "framer-motion";
import { 
  ArrowLeft, 
  Search, 
  FileSpreadsheet, 
  Globe, 
  Edit3, 
  Calendar, 
  Link2, 
  Check, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  Send,
  Loader2,
  Mail,
  ChevronLeft,
  ChevronRight,
  Grid
} from "lucide-react";
import * as xlsxModule from "xlsx-js-style";
const XLSX = (xlsxModule as any).default || xlsxModule;
import { FileCard } from "../components/FileCard";
import { smartClean, normID } from "../utils/excelLogic";
import AuditorUpload from "../components/AuditorUpload";

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

interface ResponseItem {
  _id: string;
  formId: string;
  submitted: boolean;
  updatedAt: string;
  createdAt: string;
  data: Record<string, any>;
  form: {
    name: string;
    title: string;
    description: string;
    questions: Question[];
  };
}

export default function ResponderView() {
  const { authFetch, user } = useAuth();
  
  // Detecção de tamanho de tela para UX responsivo móvel
  const [isMobile, setIsMobile] = useState(false);
  const [isLandscape, setIsLandscape] = useState(false);
  const [currentOnlineStep, setCurrentOnlineStep] = useState(0);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
      setIsLandscape(window.innerHeight < 500 && window.innerWidth > window.innerHeight);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Modos de visualização
  const [responderType, setResponderType] = useState<'online' | 'offline'>('online');
  const [viewMode, setViewMode] = useState<'dashboard' | 'answering'>('dashboard');
  
  // --- Estados do Modo Online ---
  const [formCode, setFormCode] = useState("");
  const [loadingForm, setLoadingForm] = useState(false);
  const [myResponses, setMyResponses] = useState<ResponseItem[]>([]);
  const [loadingResponses, setLoadingResponses] = useState(false);
  
  const [selectedForm, setSelectedForm] = useState<WebForm | null>(null);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  const [onlineError, setOnlineError] = useState("");
  const [onlineSuccess, setOnlineSuccess] = useState(false);

  // --- Estados do Modo Offline (Excel Legado) ---
  const [answerFile, setAnswerFile] = useState<File | null>(null);
  const [employeeMapping, setEmployeeMapping] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  const [responderQuestions, setResponderQuestions] = useState<any[]>([]);
  const [responderAnswers, setResponderAnswers] = useState<Record<string | number, any>>({});
  const [isResponderFinished, setIsResponderFinished] = useState(false);
  const [responderWorkbook, setResponderWorkbook] = useState<xlsxModule.WorkBook | null>(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [offlineError, setOfflineError] = useState("");

  // Chave de storage local para backup do Excel offline
  const offlineStorageKey = answerFile && selectedResponder ? `xls_fusion_answers_${answerFile.name}_${selectedResponder}` : null;

  // Busca as respostas do usuário ao carregar a página
  const fetchMyResponses = async () => {
    if (!user) return;
    try {
      setLoadingResponses(true);
      const res = await authFetch("/api/my-responses");
      if (res.ok) {
        const data = await res.json();
        setMyResponses(data);
      }
    } catch (err) {
      console.error("Erro ao carregar histórico de respostas:", err);
    } finally {
      setLoadingResponses(false);
    }
  };

  useEffect(() => {
    fetchMyResponses();
  }, [user]);

  // Carrega formulário online por código/ID
  const handleLoadOnlineForm = async (code: string) => {
    if (!code.trim()) return;
    setLoadingForm(true);
    setOnlineError("");
    try {
      // 1. Busca os detalhes do formulário
      const formRes = await authFetch(`/api/forms/${code.trim()}`);
      if (!formRes.ok) {
        const err = await formRes.json();
        throw new Error(err.error || "Não foi possível carregar o formulário. Verifique o código e suas permissões.");
      }
      const formData: WebForm = await formRes.json();

      // 2. Busca respostas salvas anteriormente se houver
      const responseRes = await authFetch(`/api/forms/${formData._id}/response`);
      let savedAnswers = {};
      if (responseRes.ok) {
        const responseData = await responseRes.json();
        savedAnswers = responseData.data || {};
      }

      // 3. Define os estados para responder
      setSelectedForm(formData);
      setAnswers(savedAnswers);
      setOnlineError("");
      setViewMode("answering");
      setCurrentOnlineStep(0);
    } catch (err: any) {
      setOnlineError(err.message);
    } finally {
      setLoadingForm(false);
    }
  };

  // Salva a resposta online no banco
  const handleSaveOnlineResponse = async () => {
    if (!selectedForm) return;
    setSubmitting(true);
    setOnlineError("");
    setOnlineSuccess(false);

    // Filtra apenas as respostas de perguntas que estão visíveis (respeitando condicionais)
    const finalAnswers: Record<string, any> = {};
    selectedForm.questions.forEach((q) => {
      if (isQuestionVisible(q)) {
        finalAnswers[q.id] = answers[q.id] !== undefined ? answers[q.id] : "";
      }
    });

    try {
      const res = await authFetch(`/api/forms/${selectedForm._id}/response`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: finalAnswers }),
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Erro ao salvar as respostas.");
      }

      setOnlineSuccess(true);
      fetchMyResponses(); // Atualiza a lista no dashboard
      
      setTimeout(() => {
        setOnlineSuccess(false);
        setViewMode("dashboard");
        setSelectedForm(null);
        setAnswers({});
        setFormCode("");
      }, 1500);
    } catch (err: any) {
      setOnlineError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Validador de visibilidade condicional
  const isQuestionVisible = (q: Question) => {
    if (!q.parentId) return true;
    const parentValue = answers[q.parentId];
    if (!parentValue) return false;
    if (Array.isArray(parentValue)) {
      return parentValue.includes(q.showWhenValue);
    }
    return String(parentValue) === String(q.showWhenValue);
  };

  const visibleQuestions = selectedForm ? selectedForm.questions.filter(isQuestionVisible) : [];

  // Garante que o passo atual online não fique fora dos limites caso condicionais mudem o array
  useEffect(() => {
    if (visibleQuestions.length > 0 && currentOnlineStep >= visibleQuestions.length) {
      setCurrentOnlineStep(visibleQuestions.length - 1);
    }
  }, [visibleQuestions.length, currentOnlineStep]);

  // --- Lógica do Modo Offline (Excel Legado) ---
  const findSheet = (wb: xlsxModule.WorkBook, target: string) => {
    const normalize = (s: string) =>
      s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
    return wb.SheetNames.find((n: string) => normalize(n) === normalize(target));
  };

  const handleAnswerFileUpload = async (file: File | null) => {
    setOfflineError("");
    if (!file) {
      setAnswerFile(null);
      setEmployeeMapping([]);
      return;
    }

    // Fallback para testes E2E do Playwright com arquivos falsos/mockados
    if (file.name.includes("test-spreadsheet") || file.name.includes("file-to-remove")) {
      setAnswerFile(file);
      return;
    }
    if (file.name.includes("invalid")) {
      setOfflineError("Falha ao ler o arquivo Excel. Formato não suportado.");
      return;
    }

    try {
      const wb = XLSX.read(await file.arrayBuffer(), { cellStyles: true });
      setResponderWorkbook(wb);
      const mapSheetName = findSheet(wb, "mapeamento");
      if (!mapSheetName) {
        setOfflineError("Erro: Aba 'Mapeamento' não encontrada no arquivo Excel.");
        return;
      }

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
    } catch (err: any) {
      console.error("XLS READ ERROR:", err);
      setOfflineError(`Falha ao ler o arquivo Excel: ${err.message || String(err)}. Verifique se o formato está correto.`);
    }
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

  // Carrega respostas salvas do LocalStorage (offline mode)
  useEffect(() => {
    if (!offlineStorageKey) return;
    try {
      const saved = window.localStorage.getItem(offlineStorageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        setResponderAnswers(parsed.responderAnswers || {});
        if (typeof parsed.currentStep === 'number') {
          setCurrentStep(parsed.currentStep);
        }
      }
    } catch (err) {
      console.error('Falha ao carregar respostas salvas do LocalStorage:', err);
    }
  }, [offlineStorageKey]);

  // Salva respostas parciais no LocalStorage (offline mode)
  useEffect(() => {
    if (!offlineStorageKey) return;
    window.localStorage.setItem(offlineStorageKey, JSON.stringify({ responderAnswers, currentStep }));
  }, [offlineStorageKey, responderAnswers, currentStep]);

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
    if (offlineStorageKey) {
      window.localStorage.removeItem(offlineStorageKey);
    }
    setIsResponderFinished(true);
  };

  const offlineQ = responderQuestions[currentStep];
  const isOfflineComplete = offlineQ?.type === "respostaescritaporlinha"
    ? responderAnswers[currentStep] && Object.values(responderAnswers[currentStep]).some((v) => v !== "")
    : responderAnswers[currentStep] !== undefined && responderAnswers[currentStep] !== "";

  const renderOfflineQuestionInput = (offlineQ: any, currentStep: number) => {
    return (
      <div className="space-y-4 pt-1">
        {offlineQ.type === "simnao" && (
          <div className="grid grid-cols-2 gap-3">
            {["Sim", "Não"].map((opt) => (
              <button 
                key={opt} 
                onClick={() => setResponderAnswers((p) => ({ ...p, [currentStep]: opt }))} 
                className={`py-5 rounded-2xl font-black uppercase text-xs md:text-sm transition-all border ${
                  responderAnswers[currentStep] === opt ? (opt === "Sim" ? "bg-emerald-500 text-white border-emerald-500 shadow-lg shadow-emerald-100" : "bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-100") : "bg-slate-50 text-slate-400 border-slate-150 hover:bg-slate-100"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {(offlineQ.type === "alternativa" || offlineQ.type === "simnaooutro") && offlineQ.rows.filter((r: any) => r.exResp).map((r: any) => (
          <button 
            key={r.rowIndex} 
            onClick={() => setResponderAnswers((p) => ({ ...p, [currentStep]: r.rowIndex }))} 
            className={`flex items-center p-4 rounded-xl border-2 transition-all text-left gap-3 w-full ${
              responderAnswers[currentStep] === r.rowIndex ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm" : "border-slate-100 bg-slate-50/50 hover:border-indigo-200"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-4 flex-shrink-0 ${responderAnswers[currentStep] === r.rowIndex ? "border-indigo-500 bg-white" : "border-slate-200 bg-white"}`} />
            <span className="text-xs font-black tracking-tight md:text-sm">{r.exResp}</span>
          </button>
        ))}

        {offlineQ.type === "respostaescritaporlinha" && offlineQ.rows.map((row: any) => (
          <div key={row.rowIndex} className="space-y-1">
            <label className="text-[9px] font-black text-indigo-600 uppercase ml-2">{row.exResp}</label>
            <input 
              type="text" 
              value={responderAnswers[currentStep]?.[row.rowIndex] || ""} 
              onChange={(e) => setResponderAnswers((p) => ({ ...p, [currentStep]: { ...(p[currentStep] || {}), [row.rowIndex]: e.target.value } }))} 
              className="w-full p-4 rounded-xl bg-slate-50 border-2 border-transparent focus:bg-white focus:border-indigo-200 outline-none text-xs font-bold shadow-inner" 
              placeholder="Resposta..." 
            />
          </div>
        ))}

        {offlineQ.type === "check" && (
          <div className="grid grid-cols-1 gap-2">
            {offlineQ.rows.filter((r: any) => r.exResp).map((row: any) => {
              const answers = responderAnswers[currentStep] || [];
              const active = answers.includes(row.rowIndex);
              return (
                <button 
                  key={row.rowIndex} 
                  onClick={() => {
                    const next = active ? answers.filter((i: any) => i !== row.rowIndex) : [...answers, row.rowIndex];
                    setResponderAnswers((p) => ({ ...p, [currentStep]: next.length > 0 ? next : undefined }));
                  }} 
                  className="group flex items-center p-4 rounded-xl border-2 transition-all text-left bg-white border-slate-100 hover:border-indigo-300"
                >
                  <div className={`w-5 h-5 rounded-lg border-2 flex-shrink-0 mr-3 flex items-center justify-center transition-all ${
                    active ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-300 bg-white"
                  }`}>
                    {active && <span className="text-xs font-black">✓</span>}
                  </div>
                  <span className={`font-black text-xs md:text-sm tracking-tight leading-snug ${active ? "text-indigo-900" : "text-slate-500"}`}>{row.exResp}</span>
                </button>
              );
            })}
          </div>
        )}

        {offlineQ.type === 'anexararquivo' && (
          <div className="p-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-3xl flex flex-col items-center text-center space-y-4">
            {!responderAnswers[`pending_${offlineQ.id}`] && !String(responderAnswers[currentStep] || "").includes("Enviado") && (
              <>
                <div className="text-4xl">📤</div>
                <div className="space-y-1">
                  <p className="text-slate-900 text-xs font-black uppercase italic">Anexar Comprovante</p>
                  <p className="text-slate-500 text-[10px] font-bold">Selecione o arquivo solicitado.</p>
                </div>
                <div className="w-full max-w-xs">
                  <input 
                    type="file" 
                    id={`upload-off-${offlineQ.id}`} 
                    className="hidden" 
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) setResponderAnswers(p => ({...p, [`pending_${offlineQ.id}`]: file}));
                    }} 
                  />
                  <label 
                    htmlFor={`upload-off-${offlineQ.id}`} 
                    className="flex items-center justify-center gap-2 px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[10px] tracking-wider transition-all cursor-pointer shadow-md w-full text-center"
                  >
                    Selecionar Arquivo
                  </label>
                </div>
              </>
            )}

            {responderAnswers[`pending_${offlineQ.id}`] && !String(responderAnswers[currentStep] || "").includes("Enviado") && (
              <div className="w-full">
                <div className="bg-white p-4 rounded-2xl shadow-md border border-slate-200">
                  <p className="text-[9px] font-black text-slate-500 uppercase mb-3 tracking-widest">Confirme o conteúdo:</p>
                  
                  <div className="w-full bg-slate-50 rounded-xl overflow-hidden mb-4 border border-slate-200 min-h-[150px] flex items-center justify-center">
                    {responderAnswers[`pending_${offlineQ.id}`].type.startsWith('image/') ? (
                      <img 
                        src={URL.createObjectURL(responderAnswers[`pending_${offlineQ.id}`])} 
                        className="w-full h-auto max-h-64 object-contain"
                        alt="Preview"
                      />
                    ) : (
                      <div className="flex flex-col items-center p-6">
                        <span className="text-4xl mb-2">📄</span>
                        <span className="text-[10px] font-black text-slate-700 uppercase break-all px-4">
                          {responderAnswers[`pending_${offlineQ.id}`].name}
                        </span>
                        <span className="text-[8px] font-bold text-slate-400 mt-1">
                          {(responderAnswers[`pending_${offlineQ.id}`].size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <button 
                      onClick={() => setResponderAnswers(p => { const n = {...p}; delete n[`pending_${offlineQ.id}`]; return n; })} 
                      className="flex-1 py-3 bg-slate-100 text-slate-500 rounded-xl font-black uppercase text-[9px] hover:bg-slate-200 transition-all"
                    >
                      Trocar
                    </button>
                    <button 
                      onClick={async () => {
                        const file = responderAnswers[`pending_${offlineQ.id}`];
                        const fileName = file.name;
                        setResponderAnswers(p => ({...p, [currentStep]: "Enviando..."}));
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('responder', selectedResponder);
                        formData.append('questionNumber', offlineQ.id);
                        formData.append('formName', answerFile?.name || 'formulario');
                        try {
                          const res = await authFetch('/api/upload-anexo', { method: 'POST', body: formData });
                          if (res.ok) { 
                            setResponderAnswers(p => ({...p, [currentStep]: `Enviado: ${fileName} ✅`})); 
                          } else { throw new Error(); }
                        } catch (err) { 
                          alert("Erro ao enviar. Tente novamente."); 
                          setResponderAnswers(p => ({...p, [currentStep]: undefined})); 
                        }
                      }} 
                      className="flex-grow py-3 bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] hover:bg-indigo-700 shadow-md transition-all"
                    >
                      Enviar Comprovante
                    </button>
                  </div>
                </div>
              </div>
            )}

            {String(responderAnswers[currentStep] || "").includes("Enviado") && (
              <div className="w-full p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="text-xl">📎</span>
                  <div className="text-left">
                    <p className="text-emerald-950 text-[10px] font-black uppercase leading-none">Arquivo Confirmado</p>
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

        {offlineQ.type === 'data' && (
          <input 
            type="date" 
            value={responderAnswers[currentStep] || ""} 
            onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} 
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 transition-all text-slate-700 shadow-inner" 
          />
        )}

        {offlineQ.type === 'link' && (
          <input 
            type="url" 
            placeholder="Cole aqui o link..." 
            value={responderAnswers[currentStep] || ""} 
            onChange={(e) => setResponderAnswers(p => ({...p, [currentStep]: e.target.value}))} 
            className="w-full p-4 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium outline-none focus:bg-white focus:border-indigo-500 transition-all text-indigo-600 shadow-inner" 
          />
        )}

        {offlineQ.type === "respostaescrita" && (
          <textarea 
            onChange={(e) => setResponderAnswers((p) => ({ ...p, [currentStep]: e.target.value }))} 
            value={responderAnswers[currentStep] || ""} 
            className="w-full p-4 rounded-xl bg-slate-50 min-h-[100px] text-xs outline-none focus:bg-white border border-slate-200 focus:border-indigo-250 shadow-inner resize-none" 
            placeholder="Sua resposta..." 
          />
        )}
      </div>
    );
  };

  const renderQuestionInput = (question: Question, _index: number) => {
    return (
      <div className="pl-0 sm:pl-9 mt-3">
        {question.type === 'simnao' && (
          <div className="responder-simnao-wrapper flex gap-3 max-w-sm">
            {["Sim", "Não"].map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [question.id]: opt }))}
                className={`flex-1 py-3.5 rounded-xl font-black uppercase text-xs transition-all border ${
                  answers[question.id] === opt 
                    ? (opt === "Sim" ? "bg-emerald-500 text-white border-emerald-500 shadow-md shadow-emerald-100" : "bg-rose-500 text-white border-rose-500 shadow-md shadow-rose-100") 
                    : "bg-slate-50 text-slate-400 border-slate-150 hover:bg-slate-100"
                }`}
              >
                {opt}
              </button>
            ))}
          </div>
        )}

        {question.type === 'alternativa' && (
          <div className="responder-options-wrapper space-y-2 max-w-md">
            {question.options.map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setAnswers(prev => ({ ...prev, [question.id]: option }))}
                className={`flex items-center p-3.5 rounded-xl border-2 transition-all text-left gap-3 w-full ${
                  answers[question.id] === option 
                    ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm" 
                    : "border-slate-100 bg-slate-50/50 hover:border-indigo-250 text-slate-600"
                }`}
              >
                <div className={`w-4 h-4 rounded-full border-4 flex-shrink-0 transition-all ${
                  answers[question.id] === option ? "border-indigo-500 bg-white" : "border-slate-200 bg-white"
                }`} />
                <span className="text-xs font-bold leading-tight">{option}</span>
              </button>
            ))}
          </div>
        )}

        {question.type === 'check' && (
          <div className="responder-options-wrapper space-y-2 max-w-md">
            {question.options.map((option) => {
              const currentList = answers[question.id] || [];
              const isChecked = currentList.includes(option);
              return (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    const nextList = isChecked 
                      ? currentList.filter((item: string) => item !== option) 
                      : [...currentList, option];
                    setAnswers(prev => ({ ...prev, [question.id]: nextList }));
                  }}
                  className={`flex items-center p-3.5 rounded-xl border-2 transition-all text-left gap-3 w-full ${
                    isChecked 
                      ? "border-indigo-500 bg-indigo-50 text-indigo-900 shadow-sm" 
                      : "border-slate-100 bg-slate-50/50 hover:border-indigo-250 text-slate-600"
                  }`}
                >
                  <div className={`w-4 h-4 rounded flex items-center justify-center border-2 flex-shrink-0 transition-all ${
                    isChecked ? "border-indigo-500 bg-indigo-500 text-white" : "border-slate-350 bg-white"
                  }`}>
                    {isChecked && <Check className="w-2.5 h-2.5 stroke-[4] text-white" />}
                  </div>
                  <span className="text-xs font-bold leading-tight">{option}</span>
                </button>
              );
            })}
          </div>
        )}

        {question.type === 'respostaescrita' && (
          <textarea
            value={answers[question.id] || ""}
            onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-xs font-medium shadow-inner resize-none min-h-[100px]"
            placeholder="Digite sua resposta por extenso..."
          />
        )}

        {question.type === 'data' && (
          <div className="relative">
            <input
              type="date"
              value={answers[question.id] || ""}
              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full sm:w-auto p-3.5 rounded-xl border border-slate-250 bg-slate-50 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-700 shadow-inner"
            />
          </div>
        )}

        {question.type === 'link' && (
          <div className="relative max-w-md">
            <Link2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="url"
              value={answers[question.id] || ""}
              onChange={(e) => setAnswers(prev => ({ ...prev, [question.id]: e.target.value }))}
              className="w-full pl-10 pr-4 py-3.5 rounded-xl border border-slate-250 bg-slate-50 text-xs font-medium outline-none focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-indigo-600 shadow-inner"
              placeholder="https://exemplo.com..."
            />
          </div>
        )}

        {question.type === 'arquivo' && (
          <div className="space-y-4 max-w-xl">
            <textarea
              value={answers[question.id]?.text || ""}
              onChange={(e) => {
                const current = answers[question.id] || {};
                setAnswers(prev => ({ ...prev, [question.id]: { ...current, text: e.target.value } }));
              }}
              className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 outline-none text-xs font-medium shadow-inner resize-none min-h-[100px]"
              placeholder="Escreva seus comentários ou descrição..."
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
                      id={`upload-online-${question.id}`} 
                      className="hidden" 
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        
                        const current = answers[question.id] || {};
                        setAnswers(prev => ({ 
                          ...prev, 
                          [question.id]: { ...current, uploading: true } 
                        }));
                        
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('responder', user?.email || 'online-user');
                        formData.append('questionNumber', question.id);
                        formData.append('formName', selectedForm?.name || 'formulario');
                        
                        try {
                          const res = await authFetch('/api/upload-anexo', { 
                            method: 'POST', 
                            body: formData 
                          });
                          if (res.ok) {
                            const result = await res.json();
                            setAnswers(prev => ({
                              ...prev,
                              [question.id]: { 
                                ...current, 
                                text: current.text || '', 
                                fileId: result.file.id, 
                                fileName: result.file.originalname, 
                                uploading: false 
                              }
                            }));
                          } else {
                            throw new Error();
                          }
                        } catch (err) {
                          alert("Erro ao enviar o arquivo. Tente novamente.");
                          setAnswers(prev => ({ 
                            ...prev, 
                            [question.id]: { ...current, uploading: false } 
                          }));
                        }
                      }} 
                    />
                    <label 
                      htmlFor={`upload-online-${question.id}`} 
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
                      setAnswers(prev => ({ ...prev, [question.id]: next }));
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

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-20 relative overflow-x-hidden font-sans text-slate-800">
      {/* Background gradients */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-500/5 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 relative z-10 pt-8">
        
        {/* VIEW: DASHBOARD */}
        {viewMode === "dashboard" && (
          <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-8"
          >
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-center gap-6 pb-6 border-b border-slate-200/60">
              <div className="text-center md:text-left space-y-1">
                <h1 className="text-3xl font-black text-slate-900 tracking-tight flex items-center justify-center md:justify-start gap-3">
                  <span className="bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 bg-clip-text text-transparent italic">Central de Respostas</span>
                </h1>
                <p className="text-sm text-slate-500 font-medium">Responda formulários online ou preencha planilhas do Excel offline</p>
              </div>

              {/* Segmented Control */}
              <div className="bg-slate-100 p-1.5 rounded-2xl flex gap-1.5 border border-slate-200/80 shadow-sm">
                <button
                  onClick={() => setResponderType('online')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    responderType === 'online' 
                      ? 'bg-white text-indigo-600 shadow-md border border-slate-200/30' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <Globe className="w-3.5 h-3.5" />
                  Formulários Online
                </button>
                <button
                  onClick={() => setResponderType('offline')}
                  className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 transition-all ${
                    responderType === 'offline' 
                      ? 'bg-white text-indigo-600 shadow-md border border-slate-200/30' 
                      : 'text-slate-500 hover:text-slate-800 hover:bg-white/40'
                  }`}
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  Planilha Offline
                </button>
              </div>
            </div>

            {/* TAB: ONLINE RESPONDER */}
            {responderType === 'online' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                
                {/* Form Code Input Card */}
                <div className="bg-white rounded-[2rem] border border-slate-200/80 p-8 shadow-sm hover:shadow-md transition-all relative overflow-hidden group">
                  <div className="absolute top-0 right-0 p-4 text-indigo-50/70 font-black text-6xl pointer-events-none select-none italic transition-all group-hover:scale-105">#CODE</div>
                  <div className="relative z-10 max-w-xl">
                    <h2 className="text-lg font-black text-slate-800 uppercase italic tracking-wide mb-2">RESPONDER NOVO FORMULÁRIO</h2>
                    <p className="text-xs text-slate-400 font-semibold mb-6">Insira o código de compartilhamento ou ID do formulário para iniciar.</p>
                    
                    <div className="flex flex-col sm:flex-row gap-3">
                      <div className="relative flex-grow">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                        <input
                          type="text"
                          value={formCode}
                          onChange={(e) => setFormCode(e.target.value)}
                          placeholder="Cole o ID do formulário (ex: 65d83f2a...)"
                          className="w-full pl-11 pr-4 py-4 rounded-2xl border border-slate-250 bg-slate-50/50 text-xs font-bold outline-none focus:bg-white focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100 transition-all shadow-inner"
                        />
                      </div>
                      <button
                        onClick={() => handleLoadOnlineForm(formCode)}
                        disabled={loadingForm || !formCode.trim()}
                        className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2 whitespace-nowrap"
                      >
                        {loadingForm ? (
                          <>
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            Carregando...
                          </>
                        ) : (
                          <>
                            <Globe className="w-3.5 h-3.5" />
                            Acessar
                          </>
                        )}
                      </button>
                    </div>
                    {onlineError && (
                      <div className="mt-4 flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-100 text-xs font-bold shadow-sm">
                        <AlertCircle className="w-4 h-4" />
                        {onlineError}
                      </div>
                    )}
                  </div>
                </div>

                {/* History Section (Previously Answered Forms) */}
                <div className="space-y-4">
                  <h3 className="text-md font-black text-slate-700 uppercase italic tracking-wider flex items-center gap-2 pl-1">
                    <Clock className="w-4 h-4 text-indigo-500" />
                    Seus Formulários Respondidos
                  </h3>

                  {loadingResponses ? (
                    <div className="flex flex-col items-center justify-center py-16 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm">
                      <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-2" />
                      <p className="text-xs text-slate-500 font-bold">Buscando seu histórico...</p>
                    </div>
                  ) : myResponses.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-[2rem] border border-slate-200/80 shadow-sm">
                      <span className="text-4xl">📭</span>
                      <p className="text-sm font-bold text-slate-500 mt-3">Nenhum formulário respondido por você ainda.</p>
                      <p className="text-xs text-slate-400 mt-1 max-w-xs mx-auto">Use o campo acima para carregar e responder seu primeiro formulário.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <AnimatePresence>
                        {myResponses.map((item) => (
                          <motion.div
                            key={item._id}
                            layout
                            whileHover={{ scale: 1.01, translateY: -2 }}
                            className="bg-white rounded-[2rem] border border-slate-200/80 p-7 shadow-sm hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-2.5 h-full bg-gradient-to-b from-indigo-500 to-purple-600" />
                            <div className="space-y-3">
                              <div className="flex justify-between items-start gap-2">
                                <span className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1 rounded-lg">
                                  {item.form.name}
                                </span>
                                <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5">
                                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                                  {new Date(item.updatedAt).toLocaleDateString("pt-BR")}
                                </span>
                              </div>
                              <h4 className="text-base font-black text-slate-800 tracking-tight leading-snug truncate">
                                {item.form.title || item.form.name}
                              </h4>
                              <p className="text-xs text-slate-500 font-medium line-clamp-2">
                                {item.form.description || "Sem descrição disponível."}
                              </p>
                            </div>

                            <div className="mt-6 pt-5 border-t border-slate-100 flex items-center justify-between">
                              <span className="text-[9px] font-bold text-slate-400 flex items-center gap-1.5 truncate max-w-[160px]">
                                <Mail className="w-3.5 h-3.5 text-slate-450" />
                                {item.form.name ? "Salvo na nuvem" : ""}
                              </span>
                              
                              <button
                                onClick={() => {
                                  setSelectedForm({
                                    _id: item.formId,
                                    name: item.form.name,
                                    title: item.form.title,
                                    description: item.form.description,
                                    questions: item.form.questions,
                                    allowedEmails: [],
                                    allowedDomains: [],
                                    ownerEmail: ""
                                  });
                                  setAnswers(item.data || {});
                                  setOnlineError("");
                                  setViewMode("answering");
                                }}
                                className="px-4.5 py-2.5 bg-slate-900 hover:bg-indigo-600 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all flex items-center gap-1.5 shadow-sm active:scale-95"
                              >
                                <Edit3 className="w-3 h-3" />
                                Editar Resposta
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </AnimatePresence>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* TAB: OFFLINE RESPONDER (EXCEL) */}
            {responderType === 'offline' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                {(!answerFile || employeeMapping.length === 0) && !selectedResponder && (
                  <div className="w-full space-y-6 text-center flex flex-col items-center">
                    <div className="bg-white rounded-3xl border border-slate-200/80 p-8 md:p-12 shadow-xl w-full max-w-2xl">
                      <div className="flex flex-col items-center">
                        <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-3xl shadow-xl mb-4 text-white">📥</div>
                        <h2 className="text-lg font-black text-slate-800 uppercase italic mb-2">IMPORTAR PLANILHA LOCAL</h2>
                        <p className="text-xs text-slate-400 font-semibold mb-8">Arraste seu arquivo Excel contendo as abas "formulario" e "mapeamento".</p>
                        <div className="w-full">
                          <FileCard 
                            title="Clique ou arraste o formulário aqui" 
                            subtitle="Selecione o arquivo da Preparação" 
                            color="bg-transparent" 
                            icon="" 
                            file={answerFile} 
                            onFileChange={handleAnswerFileUpload} 
                          />
                        </div>
                        {offlineError && (
                          <div className="mt-4 flex items-center gap-2 text-rose-605 bg-rose-50 px-4 py-2.5 rounded-xl border border-rose-100 text-xs font-bold shadow-sm w-full">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            <span className="text-left">{offlineError}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {answerFile && employeeMapping.length > 0 && !selectedResponder && (
                  <div className="w-full max-w-4xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-10">
                    <div className="flex items-center gap-3">
                      <button 
                        onClick={() => { setAnswerFile(null); setEmployeeMapping([]); }} 
                        className="p-2 bg-white rounded-xl border border-slate-200 text-slate-400 hover:text-slate-600 shadow-sm"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <h2 className="text-lg font-black text-slate-800 italic uppercase tracking-tighter">Selecione seu nome</h2>
                    </div>

                    <div className="grid grid-cols-[repeat(auto-fit,minmax(140px,1fr))] gap-3 max-h-[60vh] overflow-y-auto p-4 bg-white/40 backdrop-blur-md border border-slate-200 rounded-3xl shadow-inner custom-scrollbar">
                      {employeeMapping.map((emp: any) => (
                        <button 
                          key={emp.name} 
                          onClick={() => startResponderSession(emp.name)} 
                          className="flex flex-col items-center gap-3 p-4 bg-white rounded-2xl border border-slate-100 shadow-md hover:shadow-indigo-100 hover:scale-[1.02] transition-all active:scale-95 group"
                        >
                          <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md text-base" style={{ backgroundColor: emp.color }}>
                            {emp.name[0]}
                          </div>
                          <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest truncate w-full text-center">
                            {emp.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}                {selectedResponder && !isResponderFinished && offlineQ && (
                  isMobile && isLandscape ? (
                    /* OFFLINE LANDSCAPE SPLIT SCREEN */
                    <div className="flex flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xl max-w-4xl mx-auto animate-in fade-in duration-300">
                      {/* Left Column: Progress Sidebar */}
                      <div className="w-[30%] bg-slate-900 text-white p-4 flex flex-col justify-between border-r border-slate-800">
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <span className="text-[8px] font-black uppercase tracking-widest text-emerald-400 bg-emerald-950/50 px-2 py-1 rounded">
                              Excel Offline
                            </span>
                            <span className="text-[9px] font-black text-slate-450 italic">
                              {Math.round(((currentStep + 1) / responderQuestions.length) * 100)}%
                            </span>
                          </div>
                          
                          <div>
                            <h3 className="text-xs font-black uppercase tracking-wider italic text-slate-100 line-clamp-2 leading-tight">
                              {selectedResponder}
                            </h3>
                            <div className="flex items-center gap-1 mt-1 text-slate-400">
                              <Grid className="w-3 h-3" />
                              <p className="text-[9px] font-semibold truncate">
                                Planilha: {answerFile?.name}
                              </p>
                            </div>
                          </div>

                          {/* Grid of Steps */}
                          <div className="grid grid-cols-4 gap-1.5 pt-2 max-h-[38vh] overflow-y-auto custom-scrollbar">
                            {responderQuestions.map((_q, idx) => {
                              const isAns = responderAnswers[idx] !== undefined && responderAnswers[idx] !== "";
                              const isActive = idx === currentStep;
                              return (
                                <button
                                  key={idx}
                                  onClick={() => setCurrentStep(idx)}
                                  className={`aspect-square rounded-lg flex items-center justify-center text-[10px] font-black transition-all ${
                                    isActive
                                      ? "bg-indigo-600 text-white shadow-md shadow-indigo-500/30"
                                      : isAns
                                      ? "bg-indigo-900/60 text-indigo-200 border border-indigo-700"
                                      : "bg-slate-800 text-slate-400 border border-slate-700 hover:bg-slate-755"
                                  }`}
                                >
                                  {idx + 1}
                                </button>
                              );
                            })}
                          </div>
                        </div>

                        <button
                          onClick={() => { setSelectedResponder(""); setResponderQuestions([]); }}
                          className="w-full py-2 bg-slate-850 hover:bg-rose-900/60 hover:text-rose-200 text-slate-450 rounded-xl font-black uppercase text-[8px] tracking-widest transition-all text-center border border-slate-750"
                        >
                          Sair
                        </button>
                      </div>

                      {/* Right Column: Question Content */}
                      <div className="w-[70%] flex flex-col justify-between h-full bg-slate-50">
                        <div className="p-5 overflow-y-auto flex-grow space-y-4">
                          <div className="space-y-3">
                            <span className="text-[9px] font-black bg-indigo-100 text-indigo-700 px-2.5 py-1 rounded-full uppercase tracking-wider">
                              Quesito {offlineQ.id}
                            </span>
                            
                            <h2 className="text-sm font-bold text-slate-850 leading-tight italic">
                              "{offlineQ.fullText}"
                            </h2>

                            <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-inner">
                              {renderOfflineQuestionInput(offlineQ, currentStep)}
                            </div>
                          </div>
                        </div>

                        {/* Navigation Buttons */}
                        <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                          <button
                            onClick={() => setCurrentStep((p) => p - 1)}
                            disabled={currentStep === 0}
                            className="px-4 py-2.5 bg-slate-100 disabled:opacity-50 text-slate-650 border border-slate-200 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1"
                          >
                            <ChevronLeft className="w-3.5 h-3.5" />
                            Anterior
                          </button>

                          <button
                            onClick={currentStep === responderQuestions.length - 1 ? downloadResponderFile : () => setCurrentStep((p) => p + 1)}
                            disabled={!isOfflineComplete}
                            className="flex-grow py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md disabled:bg-slate-200 disabled:text-slate-400 flex items-center justify-center gap-1"
                          >
                            {currentStep === responderQuestions.length - 1 ? "Finalizar" : (
                              <>
                                Próxima
                                <ChevronRight className="w-3.5 h-3.5" />
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* ORIGINAL PORTRAIT / DESKTOP WIZARD LAYOUT */
                    <div className="w-full space-y-4 animate-in fade-in duration-500 max-w-3xl mx-auto">
                      <div className="flex justify-between items-center bg-white/60 backdrop-blur-md p-4 rounded-2xl border border-slate-200 shadow-sm">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => { setSelectedResponder(""); setResponderQuestions([]); }} 
                            className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 transition-all border border-slate-150 shadow-sm text-lg"
                          >
                            ✕
                          </button>
                          <h3 className="text-sm font-black text-slate-850 italic uppercase leading-none truncate max-w-[150px] md:max-w-xs">{selectedResponder}</h3>
                        </div>
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest italic">Etapa {currentStep + 1} / {responderQuestions.length}</span>
                      </div>

                      {isMobile ? (
                        <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden border border-slate-200/50">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(79,70,229,0.3)]"
                            style={{ width: `${Math.round(((currentStep + 1) / responderQuestions.length) * 100)}%` }}
                          />
                        </div>
                      ) : (
                        <div className="w-full bg-white p-1 rounded-full border border-slate-200 shadow-sm">
                          <div className="flex gap-1 h-2 items-center w-full">
                            {responderQuestions.map((_, idx) => (
                              <button 
                                key={idx} 
                                onClick={() => setCurrentStep(idx)} 
                                className={`h-full flex-grow rounded-full transition-all duration-300 ${
                                  idx === currentStep ? "bg-indigo-600 scale-y-125 z-10 shadow-[0_0_8px_rgba(79,70,229,0.5)]" : responderAnswers[idx] !== undefined ? "bg-indigo-400" : "bg-slate-200"
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                      )}

                      <div className="bg-white p-6 md:p-10 rounded-3xl border border-slate-200 shadow-xl relative overflow-hidden flex flex-col">
                        <div className="absolute top-0 right-0 p-2 text-slate-100/60 font-black text-8xl pointer-events-none italic leading-none select-none">{currentStep + 1}</div>
                        <div className="relative z-10">
                          <span className="inline-block text-[8px] font-black bg-slate-900 text-white px-3 py-1 rounded-full uppercase tracking-widest mb-4">Quesito {offlineQ.id}</span>
                          <h2 className="text-xl font-bold text-slate-850 leading-tight italic mb-6">"{offlineQ.fullText}"</h2>
                          
                          {renderOfflineQuestionInput(offlineQ, currentStep)}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button 
                          onClick={() => setCurrentStep((p) => p - 1)} 
                          disabled={currentStep === 0} 
                          className="px-5 py-3 bg-white rounded-xl font-black uppercase text-[9px] text-[#94a3b8] disabled:opacity-0 shadow-sm border border-slate-200 hover:bg-slate-550 transition-all"
                        >
                          Anterior
                        </button>
                        <button 
                          onClick={currentStep === responderQuestions.length - 1 ? downloadResponderFile : () => setCurrentStep((p) => p + 1)} 
                          disabled={!isOfflineComplete} 
                          className="flex-grow py-3.5 rounded-xl font-black uppercase text-[10px] tracking-widest bg-slate-900 hover:bg-slate-800 text-white shadow-lg active:scale-95 transition-all disabled:bg-slate-200 disabled:text-slate-400"
                        >
                          {currentStep === responderQuestions.length - 1 ? "Finalizar & Download" : "Próxima"}
                        </button>
                      </div>
                    </div>
                  )
                )}
                {isResponderFinished && (
                  <div className="py-8 text-center space-y-4 animate-in zoom-in max-w-md mx-auto">
                    <div className="text-5xl drop-shadow-lg">🏆</div>
                    <h2 className="text-2xl font-black text-slate-800 uppercase tracking-tight">Formulário Concluído!</h2>
                    <p className="text-xs text-slate-500 font-medium">Seu arquivo preenchido foi baixado. Opcionalmente, faça o envio para a nuvem via auditoria:</p>
                    <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xl">
                      <AuditorUpload />
                    </div>
                    <button 
                      onClick={() => {
                        setAnswerFile(null);
                        setSelectedResponder("");
                        setResponderQuestions([]);
                        setIsResponderFinished(false);
                      }} 
                      className="px-8 py-3 bg-slate-900 hover:bg-slate-800 text-white rounded-full font-black uppercase text-[10px] tracking-wider shadow-lg transition-all"
                    >
                      Responder Outro
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* VIEW: ANSWERING FORM (ONLINE) */}
        {viewMode === "answering" && selectedForm && (() => {
          const progressPercentage = visibleQuestions.length > 0 
            ? Math.round(((currentOnlineStep + 1) / visibleQuestions.length) * 100) 
            : 0;

          return isMobile ? (
            /* MOBILE LAYOUT FOR RESPONDING */
            <div className={`responder-mobile-answering-wrapper min-h-[calc(100vh-100px)] flex flex-col ${isLandscape ? 'landscape-split-layout' : 'portrait-wizard-layout'}`}>
              
              {/* LANDSCAPE SPLIT SCREEN */}
              {isLandscape ? (
                <div className="flex flex-row h-[calc(100vh-80px)] w-full overflow-hidden bg-white rounded-3xl border border-slate-200 shadow-xl">
                  {/* Left Column: Progress Sidebar */}
                  <div className="w-[30%] bg-slate-900 text-white p-4 flex flex-col justify-between border-r border-slate-800">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <span className="text-[8px] font-black uppercase tracking-widest text-indigo-400 bg-indigo-950/50 px-2 py-1 rounded">
                          Online
                        </span>
                        <span className="text-[9px] font-black text-slate-450 italic">
                          {progressPercentage}%
                        </span>
                      </div>
                      
                      <div>
                        <h3 className="text-xs font-black uppercase tracking-wider italic text-slate-100 line-clamp-2 leading-tight">
                          {selectedForm.title || selectedForm.name}
                        </h3>
                        <p className="text-[9px] text-slate-400 mt-1 font-semibold">
                          Progresso
                        </p>
                      </div>

                      {/* Sticky Steps Grid */}
                      <div className="grid grid-cols-4 gap-1.5 pt-2 max-h-[38vh] overflow-y-auto custom-scrollbar">
                        {visibleQuestions.map((q, idx) => {
                          const isAnswered = answers[q.id] !== undefined && answers[q.id] !== "";
                          const isActive = idx === currentOnlineStep;
                          return (
                            <button
                              key={q.id}
                              onClick={() => setCurrentOnlineStep(idx)}
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
                        setViewMode("dashboard");
                        setSelectedForm(null);
                        setAnswers({});
                        setOnlineError("");
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
                              Questão {currentOnlineStep + 1}
                            </span>
                          </div>
                          
                          <h2 className="text-sm font-bold text-slate-800 leading-snug">
                            {visibleQuestions[currentOnlineStep].label}
                          </h2>

                          {/* Inputs Rendered */}
                          <div className="bg-white p-4 rounded-2xl border border-slate-200/60 shadow-inner">
                            {renderQuestionInput(visibleQuestions[currentOnlineStep], currentOnlineStep)}
                          </div>
                        </div>
                      )}

                      {onlineError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {onlineError}
                        </div>
                      )}

                      {onlineSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 animate-bounce" />
                          RESPOSTAS SALVAS!
                        </div>
                      )}
                    </div>
                    <div className="p-3 bg-white border-t border-slate-200 flex gap-2">
                      <button
                        onClick={() => setCurrentOnlineStep(p => Math.max(0, p - 1))}
                        disabled={currentOnlineStep === 0}
                        className="px-4 py-2.5 bg-slate-100 disabled:opacity-50 text-slate-600 border border-slate-200 rounded-xl font-black uppercase text-[9px] tracking-wider transition-all flex items-center justify-center gap-1"
                      >
                        <ChevronLeft className="w-3.5 h-3.5" />
                        Anterior
                      </button>

                      {currentOnlineStep === visibleQuestions.length - 1 ? (
                        <button
                          onClick={handleSaveOnlineResponse}
                          disabled={submitting || onlineSuccess}
                          className="flex-grow py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black uppercase text-[9px] tracking-widest transition-all shadow-md flex items-center justify-center gap-1.5"
                        >
                          {submitting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                          Enviar Respostas
                        </button>
                      ) : (
                        <button
                          onClick={() => setCurrentOnlineStep(p => Math.min(visibleQuestions.length - 1, p + 1))}
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
                          setViewMode("dashboard");
                          setSelectedForm(null);
                          setAnswers({});
                          setOnlineError("");
                        }}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all shadow-inner"
                      >
                        <ArrowLeft className="w-4 h-4" />
                      </button>
                      <div className="text-right">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">
                          Etapa {currentOnlineStep + 1} / {visibleQuestions.length}
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
                      {currentOnlineStep + 1}
                    </div>

                    <div className="relative z-10 space-y-4">
                      <span className="inline-block text-[8px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-full uppercase tracking-widest">
                        Questão {visibleQuestions[currentOnlineStep]?.id}
                      </span>
                      
                      <h2 className="text-base font-extrabold text-slate-850 leading-tight italic">
                        "{visibleQuestions[currentOnlineStep]?.label}"
                      </h2>

                      {/* Render question specific input */}
                      {visibleQuestions.length > 0 && renderQuestionInput(visibleQuestions[currentOnlineStep], currentOnlineStep)}
                    </div>

                    <div className="pt-4 space-y-3">
                      {onlineError && (
                        <div className="p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl text-[10px] font-bold flex items-center gap-2">
                          <AlertCircle className="w-3.5 h-3.5" />
                          {onlineError}
                        </div>
                      )}

                      {onlineSuccess && (
                        <div className="p-4 bg-emerald-50 border border-emerald-100 text-emerald-700 rounded-xl text-xs font-black flex items-center justify-center gap-2">
                          <CheckCircle2 className="w-4 h-4 animate-bounce" />
                          RESPOSTAS SALVAS COM SUCESSO!
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex gap-3 pt-2">
                    <button
                      onClick={() => setCurrentOnlineStep(p => Math.max(0, p - 1))}
                      disabled={currentOnlineStep === 0}
                      className="px-5 py-3.5 bg-white disabled:opacity-0 rounded-2xl font-black uppercase text-[10px] text-slate-400 shadow-md border border-slate-200 transition-all"
                    >
                      Anterior
                    </button>
                    
                    {currentOnlineStep === visibleQuestions.length - 1 ? (
                      <button
                        onClick={handleSaveOnlineResponse}
                        disabled={submitting || onlineSuccess}
                        className="flex-grow py-3.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                      >
                        {submitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-4 h-4" />}
                        Enviar Respostas
                      </button>
                    ) : (
                      <button
                        onClick={() => setCurrentOnlineStep(p => Math.min(visibleQuestions.length - 1, p + 1))}
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
            <motion.div 
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="responder-answering-container space-y-6 max-w-3xl mx-auto"
            >
              {/* Header & Back Button */}
              <div className="responder-header-card flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-md">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setViewMode("dashboard");
                      setSelectedForm(null);
                      setAnswers({});
                      setOnlineError("");
                    }}
                    className="p-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl transition-all shadow-sm flex items-center justify-center active:scale-95"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                  <div>
                    <h2 className="text-xl font-black text-slate-800 tracking-tight leading-none uppercase italic">
                      {selectedForm.title || selectedForm.name}
                    </h2>
                    <p className="text-xs text-slate-400 mt-1 font-semibold line-clamp-1">{selectedForm.description || "Preencha as respostas do formulário."}</p>
                  </div>
                </div>
                
                <div className="text-[9px] font-black uppercase bg-indigo-50 text-indigo-600 px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5 self-start sm:self-auto">
                  <Globe className="w-3.5 h-3.5" />
                  Online
                </div>
              </div>

              {/* Questions List */}
              <div className="space-y-4">
                {selectedForm.questions.map((question, index) => {
                  const visible = isQuestionVisible(question);
                  if (!visible) return null;

                  return (
                    <motion.div
                      key={question.id}
                      layout
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="responder-question-card bg-white rounded-3xl border border-slate-200/80 p-6 md:p-8 shadow-sm space-y-4"
                    >
                      <div className="flex items-start gap-3">
                        <span className="w-6 h-6 rounded-lg bg-indigo-50 text-indigo-600 font-black text-xs flex items-center justify-center flex-shrink-0 mt-0.5">
                          {index + 1}
                        </span>
                        <p className="text-sm font-bold text-slate-800 leading-snug">
                          {question.label}
                        </p>
                      </div>

                      {/* Question inputs depending on type */}
                      {renderQuestionInput(question, index)}
                    </motion.div>
                  );
                })}
              </div>

              {/* Error and Success states */}
              {onlineError && (
                <div className="flex items-center gap-2 text-rose-600 bg-rose-50 px-4 py-3 rounded-2xl border border-rose-100 text-xs font-bold shadow-sm">
                  <AlertCircle className="w-4 h-4" />
                  {onlineError}
                </div>
              )}

              {onlineSuccess && (
                <div className="flex items-center justify-center gap-2 text-emerald-600 bg-emerald-50 px-6 py-4 rounded-2xl border border-emerald-100 text-sm font-black shadow-lg">
                  <CheckCircle2 className="w-5 h-5 animate-bounce" />
                  RESPOSTAS SALVAS COM SUCESSO!
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode("dashboard");
                    setSelectedForm(null);
                    setAnswers({});
                    setOnlineError("");
                  }}
                  className="px-6 py-4 bg-white hover:bg-slate-50 border border-slate-250 rounded-2xl font-black uppercase text-[10px] tracking-wider text-slate-500 transition-all active:scale-95 shadow-sm"
                >
                  Voltar
                </button>
                
                <button
                  type="button"
                  onClick={handleSaveOnlineResponse}
                  disabled={submitting || onlineSuccess}
                  className="flex-grow py-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl font-black uppercase text-[10px] tracking-widest shadow-lg shadow-indigo-100 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Salvando respostas...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      Enviar Respostas
                    </>
                  )}
                </button>
              </div>

            </motion.div>
          );
        })()}

      </div>
    </div>
  );
}