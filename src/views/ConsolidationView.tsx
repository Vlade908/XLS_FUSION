/** @format */
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import { PreFlightModal } from '../components/PreFlightModal';
import { evaluateCheckbox, smartClean } from '../utils/excelLogic';

interface Props { user: { name: string, email: string } | null; }

export default function ConsolidationView({ user }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [currentBaseWorkbook, setCurrentBaseWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [historico, setHistorico] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');

  // ESTADO DE MEMÓRIA (CACHE LOCAL PARA BAIXO CUSTO)
  const [cachedData, setCachedData] = useState<{
    projeto: any,
    respostas: any[],
    rules: Record<string, string>,
    db: Record<string, Record<string, any[]>>
  } | null>(null);

  const forceStringID = (val: any): string => String(val || "").trim().replace(/\s+/g, '').replace(/\.0$/, "");

  const carregarHistorico = useCallback(async () => {
    if (user?.email) {
      const emailNorm = user.email.toLowerCase().trim();
      try {
        const res = await fetch(`/api/meus-formularios?email=${emailNorm}`);
        const data = await res.json();
        setHistorico(Array.isArray(data) ? data : []);
      } catch (err) { console.error("Erro ao carregar histórico:", err); }
    }
  }, [user]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  // FUNÇÃO ÚNICA DE FETCH (A ÚNICA QUE CONSOME SERVIDOR)
  const carregarDadosParaMemoria = async (codigo: string) => {
    setIsProcessing(true);
    setCachedData(null);
    try {
      // 1. Detalhes e Respostas em paralelo
      const [projRes, respRes] = await Promise.all([
        fetch(`/api/projeto/${codigo}/detalhes`),
        fetch(`/api/projeto/${codigo}/respostas`)
      ]);

      const projeto = await projRes.json();
      const cloudFiles = await respRes.json();

      const db: Record<string, Record<string, any[]>> = {};
      const rules: Record<string, string> = {};

      // 2. Processar binários na memória do cliente
      for (const file of cloudFiles) {
        const wb = XLSX.read(file.base64, { type: 'base64' });
        const mapSheet = wb.Sheets["Mapeamento"];
        if (mapSheet) {
          const mapData: any[][] = XLSX.utils.sheet_to_json(mapSheet, { header: 1 });
          mapData.forEach((r, i) => { if (i > 0 && r[0] && r[1]) rules[forceStringID(r[0])] = String(r[1]).trim(); });
        }
        const formSheet = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
        const rows: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
        const owner = file.name.replace('_Final.xlsx', '').replace(/_/g, ' ');
        if (!db[owner]) db[owner] = {};
        let lastId = "";
        rows.forEach((r, idx) => {
          if (idx === 0) return;
          if (r[1]) lastId = forceStringID(r[1]);
          if (lastId) {
            if (!db[owner][lastId]) db[owner][lastId] = [];
            db[owner][lastId].push({ val: r[7], type: String(r[8] || "").toLowerCase() });
          }
        });
      }

      setCachedData({ projeto, respostas: cloudFiles, rules, db });
    } catch (e: any) { alert("Erro ao sincronizar dados: " + e.message); }
    finally { setIsProcessing(false); }
  };

  // VER RESPOSTAS DE UMA PESSOA (USA APENAS A MEMÓRIA)
  const verPreviaPessoa = (nomeAuditor: string) => {
    if (!cachedData) return;
    const trail: any[] = [];
    const auditorAnswers = cachedData.db[nomeAuditor] || {};

    Object.entries(auditorAnswers).forEach(([id, answers]) => {
      answers.forEach(ans => {
        trail.push({ id, worker: nomeAuditor, value: ans.val });
      });
    });

    setPreviewItems(trail);
    setIsPreFlightOpen(true);
  };

  // UNIÃO FINAL (USA APENAS A MEMÓRIA)
  const iniciarUniaoFinal = async () => {
    if (!cachedData) return;
    setIsProcessing(true);
    const trail: any[] = [];
    const counters: Record<string, number> = {};

    try {
      const tempRes = await fetch(`/api/download-arquivo?path=${cachedData.projeto.links.templateTags}`);
      const tempData = await tempRes.json();
      const wbBase = XLSX.read(tempData.base64, { type: 'base64', cellStyles: true });
      const ws = wbBase.Sheets[wbBase.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']!);

      let currentId = "";
      for (let R = range.s.r; R <= range.e.r; R++) {
        const idCell = ws[XLSX.utils.encode_cell({r:R, c:1})];
        if (idCell && idCell.v) currentId = forceStringID(idCell.v);
        const cellRef = XLSX.utils.encode_cell({r:R, c:6}); 
        if (!ws[cellRef]) continue;

        let content = String(ws[cellRef].v || "");
        if (/{resposta}|{respostachek}/i.test(content)) {
          const owner = cachedData.rules[currentId] || "";
          const answers = cachedData.db[owner]?.[currentId] || [];
          const parts = content.split(/({resposta}|{respostachek})/i);
          
          ws[cellRef].v = parts.map(part => {
            if (/{resposta}|{respostachek}/i.test(part)) {
              const idx = counters[currentId] || 0;
              const ans = answers[idx] || { val: "", type: "" };
              counters[currentId] = idx + 1;
              trail.push({ id: currentId, worker: owner, value: ans.val });
              return String(ans.type).includes("check") ? (evaluateCheckbox(ans.val) ? "☑" : "☐") : smartClean(ans.val);
            }
            return part;
          }).join("");
        }
      }

      setPreviewItems(trail);
      setCurrentBaseWorkbook(wbBase);
      setIsPreFlightOpen(true);
    } catch (e: any) { alert("Erro na união: " + e.message); }
    finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-700">
      <PreFlightModal isOpen={isPreFlightOpen} onClose={() => setIsPreFlightOpen(false)} onConfirm={() => { if(currentBaseWorkbook) XLSX.writeFile(currentBaseWorkbook, "CONSOLIDADO_FINAL.xlsx"); setIsPreFlightOpen(false); }} previewData={previewItems} />
      
      <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden">
        <h2 className="text-3xl font-black italic uppercase mb-2">📊 Inteligência de Consolidação</h2>
        <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest mb-8">Selecione uma auditoria para analisar as respostas em tempo real</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); if(e.target.value) carregarDadosParaMemoria(e.target.value); }} className="bg-white/10 border border-white/20 p-5 rounded-2xl text-white font-bold outline-none focus:ring-2 ring-indigo-500 transition-all">
            <option value="" className="text-slate-800">Escolha um projeto para sincronizar...</option>
            {historico.map(p => <option key={p.codigo} value={p.codigo} className="text-slate-800">{p.mesAno} - {p.codigo}</option>)}
          </select>
          <button onClick={iniciarUniaoFinal} disabled={isProcessing || !cachedData} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 p-5 rounded-2xl font-black uppercase text-xs tracking-[0.2em] shadow-lg active:scale-95 transition-all">
            {isProcessing ? "🔨 Processando..." : "🚀 Gerar Arquivo Consolidado"}
          </button>
        </div>
      </div>

      {cachedData && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <div className="flex justify-between items-end px-4">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Respostas Sincronizadas ({cachedData.respostas.length})</h3>
            <span className="text-[9px] font-black text-emerald-500 bg-emerald-50 px-3 py-1 rounded-full uppercase">Memória Ativa (Low Cost)</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Object.keys(cachedData.db).map(nome => (
              <div key={nome} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-300 transition-all">
                <div>
                  <h4 className="font-black text-slate-800 text-sm uppercase mb-1">{nome}</h4>
                  <p className="text-[10px] text-slate-400 font-bold uppercase italic">{Object.keys(cachedData.db[nome]).length} quesitos respondidos</p>
                </div>
                <button onClick={() => verPreviaPessoa(nome)} className="mt-6 py-3 bg-slate-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Ver Detalhes</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {historico.length === 0 && !isProcessing && (
        <div className="p-10 bg-white border border-slate-100 rounded-[3rem] text-center shadow-sm">
           <p className="text-slate-400 text-xs font-black uppercase italic tracking-widest">Nenhuma auditoria encontrada no histórico.</p>
        </div>
      )}
    </div>
  );
}