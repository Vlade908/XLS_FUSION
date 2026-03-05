/** @format */
import { useState, useEffect, useRef, useCallback } from "react";
import * as XLSX from "xlsx-js-style";
import { db } from "../App"; 
import { doc, setDoc, getDoc, deleteDoc } from "firebase/firestore";
import { smartClean, normID, normName } from "../utils/excelLogic";


interface Props { 
  user: { name: string, email: string, photo?: string } | null; 
  onLogin?: () => void; 
}

export default function ResponderView({ user, onLogin }: Props) {
  const [codigoBusca, setCodigoBusca] = useState("");
  const [minhasRespostas, setMinhasRespostas] = useState<any[]>([]);
  const [activeProject, setActiveProject] = useState<any>(null);
  const [employeeMapping, setEmployeeMapping] = useState<any[]>([]);
  const [selectedResponder, setSelectedResponder] = useState<string>("");
  const [actualFiles, setActualFiles] = useState<Record<number, File>>({});
  
  const [showCPFModal, setShowCPFModal] = useState(false);
  const [showConfirmSendModal, setShowConfirmSendModal] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false); 
  const [tempResponder, setTempResponder] = useState<any>(null);
  const [cpfInput, setCpfInput] = useState("");

  const [responderQuestions, setResponderQuestions] = useState<any[]>([]);
  const [responderAnswers, setResponderAnswers] = useState<Record<string | number, any>>({});
  const [isResponderFinished, setIsResponderFinished] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);
  const [responderWorkbook, setResponderWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(false);
  
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const formatCPF = (val: string) => {
    const numeric = val.replace(/\D/g, "");
    if (numeric.length <= 11) {
      return numeric.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
    }
    return val;
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
      const file = e.dataTransfer.files[0];
      setResponderAnswers(p => ({ ...p, [currentStep]: file.name }));
      setActualFiles(p => ({ ...p, [currentStep]: file }));
    }
  };

  const carregarMinhasRespostas = useCallback(() => {
    if (user?.email) {
      fetch(`/api/minhas-respostas?email=${user.email}`)
        .then(res => res.json())
        .then(data => setMinhasRespostas(Array.isArray(data) ? data : []))
        .catch(err => console.error("❌ Erro Histórico:", err));
    }
  }, [user]);


  // TI: Função para salvar rascunho no Firebase Firestore
  const salvarRascunhoNuvem = async (respostas: any, step: number) => {
    if (!user?.email || !activeProject?.codigo || !selectedResponder) return;

    // Criamos um ID único: email_projeto_nomeDoAuditor
    const draftId = `${user.email}_${activeProject.codigo}_${normName(selectedResponder)}`;
    const draftRef = doc(db, "rascunhos", draftId);

    try {
      await setDoc(draftRef, {
        respostas,
        ultimaAlteracao: new Date().toISOString(),
        currentStep: step,
        projeto: activeProject.codigo,
        auditor: selectedResponder
      });
      console.log("📝 Rascunho atualizado na nuvem...");
    } catch (e) {
      console.error("Erro ao salvar rascunho:", e);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const p = params.get('p');
    if (p) { setCodigoBusca(p); buscarProjeto(p); }
    carregarMinhasRespostas();
  }, [carregarMinhasRespostas]);


  // TI: Sempre que as respostas ou o passo mudar, salva no Firebase (com delay de 2s para não pesar)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (Object.keys(responderAnswers).length > 0 && selectedResponder) {
        salvarRascunhoNuvem(responderAnswers, currentStep);
      }
    }, 2000); 

    return () => clearTimeout(timeoutId);
  }, [responderAnswers, currentStep, selectedResponder]);

  const buscarProjeto = async (codigo: string, editarNome?: string) => {
    if (!codigo) return;
    setIsLoadingSession(true);
    try {
      const res = await fetch(`/api/projeto/${codigo}`);
      if (!res.ok) throw new Error("Projeto não encontrado.");
      const data = await res.json();
      setActiveProject(data);

      const rulesRes = await fetch(`/api/download-arquivo?path=${data.links.rules}`);
      const rulesJson = await rulesRes.json();
      const wbRules = XLSX.read(rulesJson.base64, { type: 'base64' });
      const rulesData: any[][] = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });
      
      const employees: any[] = [];
      const namesSeen = new Set();
      rulesData.forEach((row: any, i: number) => {
        if (i > 0 && row[1]) {
          const name = String(row[1]).trim();
          if (!namesSeen.has(name)) {
            namesSeen.add(name);
            employees.push({ name, cpf: formatCPF(String(row[2] || "")), color: "#6366F1" });
          }
        }
      });
      setEmployeeMapping(employees);

      let wbFinal: XLSX.WorkBook;
      if (editarNome) {
        const safeName = normName(editarNome);
        const pathResp = `projetos/${codigo}/respostas/${safeName}_Final.xlsx`;
        try {
          const respFileRes = await fetch(`/api/download-arquivo?path=${pathResp}`);
          const respFileData = await respFileRes.json();
          wbFinal = XLSX.read(respFileData.base64, { type: 'base64', cellStyles: true });
        } catch (e) {
          const fileRes = await fetch(`/api/download-arquivo?path=${data.links.baseRespostas}`);
          const fileData = await fileRes.json();
          wbFinal = XLSX.read(fileData.base64, { type: 'base64', cellStyles: true });
        }
        await startResponderSession(editarNome, wbFinal, rulesData);
      } else {
        const fileRes = await fetch(`/api/download-arquivo?path=${data.links.baseRespostas}`);
        const fileData = await fileRes.json();
        wbFinal = XLSX.read(fileData.base64, { type: 'base64', cellStyles: true });
        setResponderWorkbook(wbFinal);
      }
    } catch (err: any) { alert("Erro: " + err.message); }
    finally { setIsLoadingSession(false); }
  };

  const startResponderSession = async (name: string, wb: XLSX.WorkBook, rules?: any[][]) => {
    try {
      setSelectedResponder(name);
      setResponderWorkbook(wb);
      const formSheet = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
      const targetNameNorm = normName(name);

      // TI: Se não vier rules (chamada direta), busca do projeto ativo
      let finalRules = rules;
      if (!finalRules && activeProject) {
        const rulesRes = await fetch(`/api/download-arquivo?path=${activeProject.links.rules}`);
        const rulesJson = await rulesRes.json();
        const wbRules = XLSX.read(rulesJson.base64, { type: 'base64' });
        finalRules = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });
      }

      const myIds = (finalRules || [])
        .filter((r: any) => normName(r[1]) === targetNameNorm)
        .map((r: any) => normID(r[0]));
      
      const formData: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
      const groupedData: Record<string, any> = {};
      const loadedAnswers: Record<string | number, any> = {};
      let lastId = "";
      let lastType = "";
      let questionIndex = 0;

     formData.forEach((row: any, idx: number) => {
        if (idx === 0) return;
        
        const currentId = row[1] ? String(row[1]).trim() : lastId;
        const currentRawType = String(row[8] || "").trim().toLowerCase();

        // Só atualiza o ID se ele existir na linha
        if (row[1]) lastId = currentId;
        
        if (lastId && myIds.includes(normID(lastId))) {
          if (!groupedData[lastId]) {
            // TI: Definimos o tipo CATEGÓRICO na criação do quesito
            // Se currentRawType estiver vazio, usamos o lastType anterior
            const definedType = currentRawType !== "" ? currentRawType : lastType;
            
            groupedData[lastId] = { 
              id: lastId, 
              questionParts: [], 
              rows: [], 
              type: definedType, 
              index: questionIndex 
            };
            questionIndex++;
          }
          
          // Mantém o lastType atualizado para o próximo quesito
          if (currentRawType !== "") lastType = currentRawType;

          const text = [row[2], row[3], row[4], row[5]].map(v => String(v || "").trim()).filter(v => v !== "").join(" ");
          if (text.length > 1) groupedData[lastId].questionParts.push(text);
          groupedData[lastId].rows.push({ rowIndex: idx, exResp: String(row[6] || "").trim() });

          const valorSalvo = row[7];
          const qIdx = groupedData[lastId].index;
          const qType = groupedData[lastId].type; // Usamos o tipo fixo do quesito

          if (valorSalvo !== "" && valorSalvo !== undefined) {
            if (qType === 'check') {
               if (valorSalvo === 1 || valorSalvo === "1") {
                 if (!loadedAnswers[qIdx]) loadedAnswers[qIdx] = [];
                 loadedAnswers[qIdx].push(idx);
               }
            } 
            // TI: Carregamento unificado para seleções de texto (Alternativa, Sim/Não, Outro)
            else if (['alternativa', 'sim/ nao', 'sim/ nao/ outro'].includes(qType)) {
               if (valorSalvo) loadedAnswers[qIdx] = String(valorSalvo).trim();
            } 
            else if (qType === "resposta escrita por linha") {
               if (!loadedAnswers[qIdx]) loadedAnswers[qIdx] = {};
               loadedAnswers[qIdx][idx] = valorSalvo;
            } 
            else { 
               loadedAnswers[qIdx] = valorSalvo; 
            }
          }
        }
      });

      const questions = Object.values(groupedData).map((g: any) => ({ 
        ...g, fullText: Array.from(new Set(g.questionParts)).join(" ").trim() 
      }));

      setResponderQuestions(questions);
      setResponderAnswers(loadedAnswers);
        // --- INÍCIO DA RECUPERAÇÃO DE RASCUNHO ---
        if (user?.email) {
          const draftId = `${user.email}_${activeProject.codigo}_${targetNameNorm}`;
          const draftRef = doc(db, "rascunhos", draftId);
          const draftSnap = await getDoc(draftRef);

          if (draftSnap.exists()) {
            const cloudData = draftSnap.data();
            // Mesclamos o que veio do Excel com o que está na nuvem (prioridade para a nuvem)
            setResponderAnswers(prev => ({ ...prev, ...cloudData.respostas }));
            setCurrentStep(cloudData.currentStep || 0);
            console.log("🚀 Rascunho recuperado com sucesso!");
          }
        }
        // --- FIM DA RECUPERAÇÃO ---
      setCurrentStep(0);
      setIsReviewing(false);
      setIsResponderFinished(false);
    } catch (e) { alert("Erro ao processar questionário."); }
  };

  const handleFinalStep = () => { setIsReviewing(true); };
  const editarQuestaoEspecifica = (index: number) => { setCurrentStep(index); setIsReviewing(false); };

  const gerarReciboLocal = () => {
    if (!responderWorkbook) return;
    const out = XLSX.write(responderWorkbook, { type: 'array', bookType: 'xlsx' });
    const blob = new Blob([out], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RECIBO_${normName(selectedResponder).toUpperCase()}.xlsx`;
    a.click();
  };

 const finalizarDefinitivo = async () => {
    if (!responderWorkbook || !activeProject) return;
    setIsLoadingSession(true); 

    try {
      // 1. FAZ O UPLOAD DOS ANEXOS PRIMEIRO
      const entries = Object.entries(actualFiles);
      const updatedAnswers = { ...responderAnswers };

      for (const [stepIdx, file] of entries) {
        const idx = Number(stepIdx);
        const question = responderQuestions[idx];
        
        // TI: Verifica se o tipo é o nome exato da planilha "anexar arquivo"
        if (question && question.type === 'anexar arquivo') {
          const fd = new FormData();
          fd.append('file', file);
          fd.append('codigoProjeto', activeProject.codigo);
          fd.append('responder', selectedResponder);
          fd.append('quesitoId', question.id);

          const resAnexo = await fetch('/api/upload-anexo', { method: 'POST', body: fd });
          if (!resAnexo.ok) throw new Error(`Falha ao subir anexo do quesito ${question.id}`);
          
          const dataAnexo = await resAnexo.json();
          // Guarda o caminho do Bucket para gravar no Excel
          updatedAnswers[idx] = dataAnexo.path;
        }
      }

      // 2. GERA E ENVIA O EXCEL FINAL
      const ws = responderWorkbook.Sheets["Formulario"] || responderWorkbook.Sheets[responderWorkbook.SheetNames[0]];

      responderQuestions.forEach((q, idx) => {
        const ans = updatedAnswers[idx];

        if (q.type === 'check') {
          q.rows.forEach((row: any) => {
            const isSelected = Array.isArray(ans) && ans.includes(row.rowIndex);
            ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { v: isSelected ? 1 : 0, t: 'n' };
          });
        } 
        // TI: TRATAMENTO CATEGÓRICO PARA ALTERNATIVA
        else if (q.type === 'alternativa') {
          q.rows.forEach((row: any) => {
            // SÓ GRAVA SE O TEXTO CLICADO FOR IGUAL AO TEXTO DA LINHA NA COLUNA G
            const isSelected = (String(ans).trim() === String(row.exResp).trim());
            ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { 
              v: isSelected ? row.exResp : "", 
              t: 's' 
            };
          });
        }
        
      // B. TIPOS DE SELEÇÃO ÚNICA (Alternativa, Sim/Não, Outro)
        else if (['alternativa', 'sim/ nao', 'sim/ nao/ outro'].includes(q.type)) {
          q.rows.forEach((row: any) => { 
            const valExcel = String(ans || "").trim().toUpperCase();
            const valPlanilha = String(row.exResp).trim().toUpperCase();

            // Match inteligente: Igualdade exata OU se a planilha começa com o valor (ex: SIM match com SIM - 20)
            const isSelected = (valExcel === valPlanilha) || 
                               (q.type === 'sim/ nao' && valPlanilha.startsWith(valExcel));

            ws[XLSX.utils.encode_cell({ r: row.rowIndex, c: 7 })] = { 
              v: isSelected ? row.exResp : "", 
              t: 's' 
            }; 
          });
        }
        
        // C. TIPO RESPOSTA POR LINHA (Múltiplos Inputs)
        else if (q.type === "resposta escrita por linha") {
          if (ans && typeof ans === 'object' && !Array.isArray(ans)) {
            Object.entries(ans).forEach(([rowIndex, val]) => {
              ws[XLSX.utils.encode_cell({ r: Number(rowIndex), c: 7 })] = { v: smartClean(String(val)), t: 's' };
            });
          }
        } 
        
        // D. RESPOSTA ESCRITA SIMPLES, DATA, LINK OU ANEXO (1 linha por ID)
        else {
          ws[XLSX.utils.encode_cell({ r: q.rows[0].rowIndex, c: 7 })] = { v: smartClean(ans || ""), t: 's' };
        }
      });

      // 3. TRANSFORMA EM ARQUIVO E MANDA PRA NUVEM
      const out = XLSX.write(responderWorkbook, { type: 'array', bookType: 'xlsx' });
      const fdFinal = new FormData();
      fdFinal.append('file', new Blob([out]), 'resposta.xlsx');
      fdFinal.append('codigoProjeto', activeProject.codigo);
      fdFinal.append('responder', normName(selectedResponder));
      fdFinal.append('emailRespondente', user?.email || '');

      const resFinal = await fetch('/api/finalizar-resposta-nuvem', { method: 'POST', body: fdFinal });
      
     if (resFinal.ok) {
      // Deleta o rascunho
      const draftId = `${user?.email}_${activeProject.codigo}_${normName(selectedResponder)}`;
      await deleteDoc(doc(db, "rascunhos", draftId));
      
      setShowConfirmSendModal(false);
      setIsResponderFinished(true); // Isso deveria mudar a tela
      }
    } catch (e) {
      alert("Erro: " + e.message);
    } finally {
      // O SEGREDO ESTÁ AQUI:
      setIsLoadingSession(false); // Desliga o spinner aconteça o que acontecer
    }
    };

  const q = responderQuestions[currentStep];
  const isComplete = q?.type === "check" 
    ? Array.isArray(responderAnswers[currentStep]) && responderAnswers[currentStep].length > 0 
    : responderAnswers[currentStep] !== undefined && responderAnswers[currentStep] !== "";

  if (isLoadingSession) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50">
        <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="mt-4 text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">
          {isReviewing ? "Sincronizando Auditoria Final..." : "Recuperando seu progresso..."}
        </p>
        <span className="mt-2 text-[8px] text-slate-300 uppercase">Isso pode levar alguns segundos dependendo da conexão</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F0F2F5] p-6 font-sans text-slate-800">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {showConfirmSendModal && (
          <div className="fixed inset-0 bg-slate-900/90 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 text-center space-y-8 animate-in zoom-in-95 border border-white/20 shadow-2xl">
              <div className="text-6xl animate-bounce">🚀</div>
              <h3 className="text-2xl font-black uppercase italic tracking-tighter">Finalizar Auditoria?</h3>
              {!user && onLogin && (
                <div className="bg-indigo-50 p-6 rounded-[2rem] border border-indigo-100">
                  <button onClick={onLogin} className="w-full py-4 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[10px]">🔑 Login e Salvar histórico</button>
                </div>
              )}
              <div className="flex flex-col gap-3">
                <button onClick={finalizarDefinitivo} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black uppercase text-xs shadow-xl active:scale-95 transition-all">Confirmar e Enviar</button>
                <button onClick={() => setShowConfirmSendModal(false)} className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-black uppercase text-[9px]">Voltar</button>
              </div>
            </div>
          </div>
        )}

        {showCPFModal && (
          <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <div className="bg-white w-full max-w-md rounded-[3rem] p-10 text-center space-y-6">
              <div className="text-3xl">🔐</div>
              <h3 className="text-xl font-black uppercase italic">Validar CPF</h3>
              <input type="text" maxLength={14} value={cpfInput} onChange={(e) => setCpfInput(formatCPF(e.target.value))} placeholder="000.000.000-00" className="w-full p-6 bg-slate-50 border-2 rounded-2xl text-center font-black text-2xl outline-none" />
              <button onClick={() => { 
                if(formatCPF(cpfInput) === tempResponder.cpf) { 
                  setShowCPFModal(false); 
                  // TI: Corrigido o envio de rules como undefined para disparar o fetch interno de segurança
                  startResponderSession(tempResponder.name, responderWorkbook!); 
                } else alert("CPF Inválido!"); 
              }} className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black uppercase shadow-lg">Entrar</button>
            </div>
          </div>
        )}

        {!activeProject && (
          <div className="space-y-12 animate-in fade-in zoom-in duration-700">
            <h1 className="text-5xl font-black text-slate-900 uppercase italic text-center leading-none">Portal do <span className="text-indigo-600">Auditor</span></h1>
            <div className="bg-white p-2 rounded-[2.5rem] shadow-2xl flex gap-2 border-4 border-white overflow-hidden">
              <input type="text" placeholder="CÓDIGO DA AUDITORIA" value={codigoBusca} onChange={(e) => setCodigoBusca(e.target.value.toUpperCase())} className="flex-grow p-6 rounded-[2rem] outline-none font-black text-xl bg-slate-50" />
              <button onClick={() => buscarProjeto(codigoBusca)} className="px-10 bg-indigo-600 text-white rounded-[2rem] font-black uppercase hover:bg-slate-900 transition-all">Acessar</button>
            </div>
            {user && minhasRespostas.length > 0 && (
              <div className="space-y-4">
                <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">Minhas Auditorias</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {minhasRespostas.map((r: any) => (
                    <div key={r.respondidoEm} className="bg-white p-6 rounded-3xl shadow-sm border border-slate-100 flex items-center justify-between hover:border-indigo-400 transition-all">
                      <div><h4 className="font-black text-slate-800 text-sm">{r.codigoProjeto}</h4><p className="text-[9px] text-slate-400 font-bold uppercase italic">{r.nome}</p></div>
                      <button onClick={() => { setCodigoBusca(r.codigoProjeto); buscarProjeto(r.codigoProjeto, r.nome); }} className="px-5 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Editar</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeProject && !selectedResponder && (
          <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6 text-center">
            <button onClick={() => setActiveProject(null)} className="text-[10px] font-black uppercase text-slate-400 tracking-widest">← Voltar</button>
            <h2 className="text-3xl font-black italic uppercase tracking-tighter">Selecione seu nome</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4">
              {employeeMapping.map(emp => {
                // TI: VERIFICAÇÃO VISUAL DE RESPOSTA JÁ ENVIADA
                const jaRespondido = activeProject.respostas?.some(
                  (r: any) => normName(r.nome) === normName(emp.name)
                );

                return (
                  <button 
                    key={emp.name} 
                    disabled={jaRespondido} // Trava o clique se já respondeu
                    onClick={() => { setTempResponder(emp); setShowCPFModal(true); }} 
                    className={`p-6 rounded-3xl border shadow-xl transition-all text-center space-y-3 group ${
                      jaRespondido 
                        ? 'bg-slate-100 border-slate-200 grayscale opacity-60 cursor-not-allowed' 
                        : 'bg-white border-slate-100 hover:scale-105 active:scale-95'
                    }`}
                  >
                    <div 
                      className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center font-black text-white text-xl shadow-lg transition-all" 
                      style={{ backgroundColor: jaRespondido ? '#94a3b8' : emp.color }}
                    >
                      {jaRespondido ? '✓' : emp.name[0]}
                    </div>
                    <p className={`text-[10px] font-black uppercase truncate w-full ${jaRespondido ? 'text-slate-400' : 'text-slate-800'}`}>
                      {emp.name}
                    </p>
                    {jaRespondido && (
                      <span className="text-[8px] font-black text-indigo-400 uppercase tracking-tighter block bg-indigo-50 py-1 rounded-full">Finalizado</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {selectedResponder && !isResponderFinished && !isReviewing && q && (
          <div id="responder" className="space-y-4 animate-in fade-in duration-500 scroll-mt-20">
             <div className="bg-slate-900 p-6 rounded-[2.5rem] text-white flex justify-between items-center shadow-2xl">
                <div>
                  <p className="text-indigo-400 font-black text-[10px] uppercase">{activeProject.mesAno}</p>
                  <h3 className="text-lg font-black italic uppercase leading-none">{selectedResponder}</h3>
                </div>
                <div className="text-right">
                  <p className="text-[9px] font-black text-slate-400 uppercase italic">Etapa {currentStep + 1} de {responderQuestions.length}</p>
                  <div className="w-24 h-1.5 bg-white/10 rounded-full mt-1.5 overflow-hidden ml-auto">
                    <div className="h-full bg-indigo-500 transition-all duration-500" style={{width: `${((currentStep + 1)/responderQuestions.length)*100}%`}}></div>
                  </div>
                </div>
             </div>

             <div className="w-full bg-white/40 backdrop-blur-md p-1.5 rounded-full border border-white shadow-sm overflow-x-auto custom-scrollbar">
                <div className="flex gap-1.5 h-2.5 items-center w-full min-w-max px-2">
                  {responderQuestions.map((_, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setCurrentStep(idx)} 
                      className={`h-full flex-grow min-w-[12px] rounded-full transition-all duration-300 ${idx === currentStep ? "bg-indigo-600 scale-y-125 z-10" : responderAnswers[idx] !== undefined ? "bg-indigo-300" : "bg-white"}`} 
                    />
                  ))}
                </div>
             </div>
             
             <div className="bg-white p-10 md:p-16 rounded-[3.5rem] shadow-xl border border-slate-100 min-h-[450px] flex flex-col justify-center relative overflow-hidden text-center">
                <div className="absolute top-0 right-0 p-4 text-slate-50 font-black text-[12rem] pointer-events-none italic leading-none select-none opacity-50">{q.id}</div>
                
                <div className="relative z-10 space-y-10">
                  <span className="inline-block text-[10px] font-black bg-slate-900 text-white px-5 py-2 rounded-full uppercase tracking-[0.2em]">Referência: {q.id}</span>
                  <h2 className="text-3xl font-black text-slate-800 leading-tight italic">"{q.fullText}"</h2>
                  
                  <div className="space-y-4 max-w-xl mx-auto w-full">

                    
                    
                    
                    {/* TIPO: SIM/ NÃO - AJUSTE DE COMPARAÇÃO ROBUSTA */}
                    {q.type === 'sim/ nao' && (
                      <div className="grid grid-cols-2 gap-4">
                        {['Sim', 'Não'].map(opt => {
                          // TI: Pegamos a resposta atual (se houver)
                          const respostaAtual = String(responderAnswers[currentStep] || "").trim().toUpperCase();
                          const opcaoBotao = opt.toUpperCase();
                          
                          // TI: Verificamos se a resposta salva no Excel começa com "SIM" ou "NÃO"
                          // Isso resolve o problema de carregar "NÃO" (do Excel) em "Não" (do botão)
                          const isActive = respostaAtual.startsWith(opcaoBotao);

                          return (
                            <button 
                              key={opt} 
                              onClick={() => setResponderAnswers(p => ({...p, [currentStep]: opt}))} 
                              className={`p-8 rounded-[2rem] font-black uppercase text-sm transition-all shadow-sm ${
                                isActive 
                                  ? (opt === 'Sim' ? 'bg-emerald-500 text-white shadow-lg' : 'bg-rose-500 text-white shadow-lg') 
                                  : 'bg-slate-50 text-slate-400 hover:bg-slate-100'
                              }`}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* TIPO: ALTERNATIVA - LISTAGEM OBRIGATÓRIA DA COLUNA EX DE RESPOSTA */}
                    {q.type === 'alternativa' && (
                      <div className="space-y-3 animate-in slide-in-from-right-4 duration-500">
                        <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-4 ml-2 italic">
                          Selecione uma opção da lista:
                        </p>
                        <div className="grid grid-cols-1 gap-3 text-left">
                          {q.rows.map((row: any) => {
                            // TI: Compara a resposta salva com o texto da Coluna G
                            const isActive = String(responderAnswers[currentStep] || "").trim() === String(row.exResp).trim();

                            return (
                              <button 
                                key={row.rowIndex} 
                                onClick={() => setResponderAnswers(p => ({ ...p, [currentStep]: row.exResp }))} 
                                className={`flex items-center p-6 rounded-[2rem] border-2 transition-all gap-5 group relative overflow-hidden ${
                                  isActive 
                                    ? "border-indigo-600 bg-indigo-50/50 shadow-md scale-[1.02]" 
                                    : "border-slate-100 bg-white hover:border-indigo-200"
                                }`}
                              >
                                {/* Círculo de Seleção */}
                                <div className={`w-6 h-6 rounded-full border-2 flex-shrink-0 flex items-center justify-center transition-all ${
                                  isActive ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"
                                }`}>
                                  {isActive && <div className="w-2 h-2 rounded-full bg-white animate-in zoom-in" />}
                                </div>
                                
                                {/* O TEXTO QUE VOCÊ QUERIA: COLUNA G (EX DE RESPOSTA) */}
                                <span className={`text-xs font-black uppercase italic leading-tight ${
                                  isActive ? 'text-indigo-900' : 'text-slate-500'
                                }`}>
                                  {row.exResp}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* TIPO: SIM/ NÃO/ OUTRO - AGORA IGUAL AO TIPO ALTERNATIVA */}
                    {q.type === 'sim/ nao/ outro' && (
                      <div className="grid grid-cols-1 gap-3 text-left animate-in fade-in duration-300">
                        {q.rows.filter((r: any) => r.exResp).map((row: any) => {
                          // TI: Comparamos o valor salvo com o texto exato desta linha (Coluna G)
                          const isActive = responderAnswers[currentStep] === row.exResp;

                          return (
                            <button 
                              key={row.rowIndex} 
                              onClick={() => setResponderAnswers(p => ({ ...p, [currentStep]: row.exResp }))} 
                              className={`flex items-center p-5 rounded-[1.5rem] border-2 transition-all gap-4 group ${
                                isActive ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-slate-50/50 hover:border-indigo-200"
                              }`}
                            >
                              {/* O círculo do Radio Button */}
                              <div className={`w-5 h-5 rounded-full border-4 flex-shrink-0 transition-all ${
                                isActive ? "border-indigo-600 bg-white" : "border-slate-200 bg-white"
                              }`} />
                              
                              {/* O texto da opção vindo da planilha */}
                              <span className={`text-[11px] font-black uppercase tracking-tighter ${
                                isActive ? 'text-indigo-900' : 'text-slate-500'
                              }`}>
                                {row.exResp}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {/* TIPO DATA - RESTAURADO */}
                      {q.type === 'data' && (
                        <div className="space-y-4 animate-in slide-in-from-bottom-2">
                          <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                              <span className="text-xl group-focus-within:text-indigo-600 transition-colors">📅</span>
                            </div>
                            <input 
                              type="date"
                              value={responderAnswers[currentStep] || ""}
                              onChange={(e) => setResponderAnswers(p => ({ ...p, [currentStep]: e.target.value }))}
                              className="w-full p-6 pl-16 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all appearance-none"
                            />
                          </div>
                          <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-4">
                            Selecione a data correspondente à evidência
                          </p>
                        </div>
                      )}


                     {/* TIPO: RESPOSTA ESCRITA SIMPLES (NOME EXATO DO EXCEL) */}
                      {q.type === "resposta escrita" && (
                        <div className="space-y-3 text-left">
                          {q.rows[0].exResp && (
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4">
                              {q.rows[0].exResp}
                            </label>
                          )}
                          <textarea 
                            onChange={(e) => setResponderAnswers(p => ({ ...p, [currentStep]: e.target.value }))} 
                            value={responderAnswers[currentStep] || ""} 
                            className="w-full p-6 rounded-[2rem] bg-slate-50 min-h-[120px] text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-100 focus:bg-white shadow-inner transition-all" 
                            placeholder="Sua resposta..." 
                          />
                        </div>
                      )}

                      {/* TIPO: RESPOSTA ESCRITA POR LINHA (NOME EXATO DO EXCEL) */}
                      {q.type === "resposta escrita por linha" && (
                        <div className="space-y-6 text-left">
                          {q.rows.map((row: any) => (
                            <div key={row.rowIndex} className="space-y-2 group">
                              {/* TI: Aqui entra o texto individual de cada linha (Coluna G) */}
                              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-4 group-focus-within:text-indigo-600 transition-colors">
                                {row.exResp || `Item ${row.rowIndex}`}
                              </label>
                              <textarea 
                                value={(responderAnswers[currentStep] && responderAnswers[currentStep][row.rowIndex]) || ""}
                                onChange={(e) => {
                                  const currentVal = responderAnswers[currentStep] || {};
                                  setResponderAnswers(p => ({ 
                                    ...p, 
                                    [currentStep]: { ...currentVal, [row.rowIndex]: e.target.value } 
                                  }));
                                }} 
                                className="w-full p-6 rounded-[2rem] bg-slate-50 min-h-[80px] text-sm font-bold outline-none border-2 border-transparent focus:border-indigo-100 focus:bg-white shadow-inner transition-all" 
                                placeholder="Digite aqui..." 
                              />
                            </div>
                          ))}
                        </div>
                      )}

                    {q.type === 'anexar arquivo' && (
                      <div 
                        onDragEnter={handleDrag} 
                        onDragLeave={handleDrag} 
                        onDragOver={handleDrag} 
                        onDrop={handleDrop} 
                        onClick={() => fileInputRef.current?.click()} 
                        className={`p-14 border-4 border-dashed rounded-[3rem] flex flex-col items-center text-center space-y-5 transition-all cursor-pointer group ${isDragging ? "border-indigo-600 bg-indigo-50" : responderAnswers[currentStep] ? "border-emerald-500 bg-emerald-50" : "border-slate-200 bg-slate-50 hover:border-indigo-300"}`}
                      >
                        <input 
                          type="file" 
                          ref={fileInputRef} 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              const file = e.target.files[0];
                              setResponderAnswers(p => ({ ...p, [currentStep]: file.name }));
                              setActualFiles(p => ({ ...p, [currentStep]: file }));
                            }
                          }} 
                        />
                        <div className="text-6xl">{responderAnswers[currentStep] ? "✅" : "☁️"}</div>
                        <p className="text-base font-black uppercase italic">{responderAnswers[currentStep] ? "Arquivo Pronto" : "Arraste ou Comprovante"}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase">{responderAnswers[currentStep] || "Clique para selecionar"}</p>
                      </div>
                    )}

                    {/* TIPO LINK - ADICIONAR ESTE BLOCO ABAIXO */}
                    {q.type === 'link' && (
                      <div className="space-y-4 animate-in slide-in-from-bottom-2">
                        <div className="relative group">
                          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none">
                            <span className="text-xl group-focus-within:text-indigo-600 transition-colors">🔗</span>
                          </div>
                          <input 
                            type="url"
                            value={responderAnswers[currentStep] || ""}
                            onChange={(e) => setResponderAnswers(p => ({ ...p, [currentStep]: e.target.value }))}
                            className="w-full p-6 pl-16 rounded-[2rem] bg-slate-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white outline-none font-bold text-slate-700 shadow-inner transition-all"
                            placeholder="Cole o link completo aqui (https://...)"
                          />
                        </div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest italic ml-4">
                          Certifique-se de que o link está acessível para a auditoria
                        </p>
                      </div>
                    )}

                    {q.type === "check" && (
                      <div className="grid grid-cols-1 gap-3 text-left">
                        {q.rows.filter((r: any) => r.exResp).map((row: any) => { 
                          const answers = responderAnswers[currentStep] || []; 
                          const active = Array.isArray(answers) && answers.includes(row.rowIndex); 
                          return ( 
                            <button 
                              key={row.rowIndex} 
                              onClick={() => { 
                                const next = active ? answers.filter((i: any) => i !== row.rowIndex) : [...(Array.isArray(answers)?answers:[]), row.rowIndex]; 
                                setResponderAnswers(p => ({ ...p, [currentStep]: next })); 
                              }} 
                              className={`flex items-center p-5 rounded-[1.5rem] border-2 transition-all gap-4 group ${active ? "border-indigo-500 bg-indigo-50" : "border-slate-100 bg-slate-50/50 hover:border-indigo-200"}`}
                            >
                              <div className={`w-6 h-6 rounded-lg border-2 flex-shrink-0 flex items-center justify-center transition-all ${active ? "bg-indigo-600 border-indigo-600" : "bg-white border-slate-200"}`}>
                                {active && <span className="text-white text-xs font-black">✓</span>}
                              </div>
                              <span className={`text-[11px] font-black uppercase ${active ? 'text-indigo-900' : 'text-slate-500'}`}>{row.exResp}</span>
                            </button> 
                          ); 
                        })}
                      </div>
                    )}

                    
                  </div>
                </div>
             </div>
             
             <div className="flex gap-3">
                <button onClick={() => setCurrentStep(p => p - 1)} disabled={currentStep === 0} className="px-10 py-5 bg-white rounded-full font-black uppercase text-[10px] text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-30">Anterior</button>
                <button 
                  onClick={currentStep === responderQuestions.length - 1 ? handleFinalStep : () => setCurrentStep(p => p + 1)} 
                  disabled={!isComplete} 
                  className="flex-grow py-5 bg-slate-900 text-white rounded-full font-black uppercase text-[10px] tracking-[0.2em] shadow-xl active:scale-95 transition-all disabled:bg-slate-200"
                >
                  {currentStep === responderQuestions.length - 1 ? "🚀 Conferir Respostas" : "Próxima"}
                </button>
             </div>
          </div>
        )}

        {isReviewing && !isResponderFinished && (
          <div className="space-y-6 animate-in fade-in duration-500">
            <div className="bg-slate-900 p-10 rounded-[3rem] text-white shadow-2xl">
              <h2 className="text-3xl font-black italic uppercase tracking-tighter">Conferência Final</h2>
            </div>
            <div className="bg-white rounded-[3rem] border border-slate-100 shadow-xl overflow-hidden">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                    <th className="p-6">ID / Questão</th>
                    <th className="p-6">Sua Resposta</th>
                    <th className="p-6 text-center w-32">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {responderQuestions.map((quest, idx) => (
                    <tr key={idx} className="border-b border-slate-50 hover:bg-indigo-50/20 transition-all group">
                      <td className="p-6">
                        <div className="flex items-center gap-3">
                          <span className="bg-slate-900 text-white px-2 py-1 rounded text-[9px] font-black">ID {quest.id}</span>
                          <span className="text-xs font-bold text-slate-600 line-clamp-1 italic">{quest.fullText}</span>
                        </div>
                      </td>
                      <td className="p-6">
                        <span className="text-xs font-black uppercase text-indigo-600">
                          {Array.isArray(responderAnswers[idx]) ? `${responderAnswers[idx].length} itens` : String(responderAnswers[idx] || "Pendente")}
                        </span>
                      </td>
                      <td className="p-6 text-center">
                        <button onClick={() => editarQuestaoEspecifica(idx)} className="px-4 py-2 bg-white border border-slate-200 text-slate-400 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Editar</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button onClick={() => setShowConfirmSendModal(true)} className="w-full py-8 bg-indigo-600 text-white rounded-[2.5rem] font-black uppercase text-xs tracking-[0.3em] shadow-2xl hover:bg-slate-900 transition-all active:scale-95">🚀 Confirmar e Enviar</button>
          </div>
        )}

        {isResponderFinished && (
          <div className="text-center py-24 animate-in zoom-in duration-700 space-y-8 bg-white rounded-[4rem] border border-slate-100 shadow-2xl relative overflow-hidden">
            <div className="text-9xl mb-4 animate-bounce">✅</div>
            <h2 className="text-5xl font-black text-slate-900 uppercase italic tracking-tighter">Enviado!</h2>
            <div className="bg-slate-50 p-8 rounded-[2.5rem] border border-slate-100 inline-block">
               <button onClick={gerarReciboLocal} className="px-10 py-5 bg-white border-2 border-indigo-600 text-indigo-600 rounded-2xl font-black uppercase text-[11px] shadow-lg hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-3 mx-auto italic">📥 Baixar Comprovante (.XLSX)</button>
            </div>
            <br/>
            <button onClick={() => window.location.reload()} className="mt-8 px-12 py-5 bg-slate-900 text-white rounded-full font-black uppercase text-[11px] shadow-lg hover:bg-indigo-600 transition-all">Voltar ao Início</button>
          </div>
        )}
      </div>
    </div>
  );
}