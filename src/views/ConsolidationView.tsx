import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { PreFlightModal } from '../components/PreFlightModal';
import { normID, normName, smartClean, evaluateCheckbox } from '../utils/excelLogic';

interface Props {
  baseFile: File | null; setBaseFile: (f: File | null) => void;
  rulesFile: File | null; setRulesFile: (f: File | null) => void;
  employeeFiles: FileList | null; setEmployeeFiles: (f: FileList | null) => void;
  workerColors: Record<string, string>;
}

export default function ConsolidationView({ baseFile, setBaseFile, rulesFile, setRulesFile, employeeFiles, setEmployeeFiles }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [currentBaseWorkbook, setCurrentBaseWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [capturedData, setCapturedData] = useState<Record<string, Record<string, any[]>>>({});

  const forceStringID = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val).trim().replace(/\s+/g, '').replace(/\.0$/, "");
  };

  const getFormSheetName = (sheetNames: string[]) => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    return sheetNames.find(n => normalize(n) === "formulario") || sheetNames[0];
  };

  useEffect(() => {
    const loadAnswers = async () => {
      if (!employeeFiles || !rulesFile) return;
      
      try {
        const rulesWb = XLSX.read(await rulesFile.arrayBuffer());
        const rulesData: any[][] = XLSX.utils.sheet_to_json(rulesWb.Sheets[rulesWb.SheetNames[0]], { header: 1 });
        
        const idToOwner: Record<string, string> = {};
        rulesData.forEach(r => { 
          if(r[0] && r[1]) idToOwner[forceStringID(r[0])] = String(r[1]).trim(); 
        });

        const db: Record<string, any> = {};
        const possibleOwners = Array.from(new Set(Object.values(idToOwner)));

        for (const f of Array.from(employeeFiles)) {
          const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false, raw: false });
          const targetSheet = getFormSheetName(wb.SheetNames);
          const rows: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[targetSheet], { header: 1, defval: "" });
          
          const owner = possibleOwners.find(name => 
            normName(f.name).includes(normName(name)) || normName(name).includes(normName(f.name))
          );
          
          if (owner) {
            if (!db[owner]) db[owner] = {};
            let lastId = "";
            let lastType = "";
            
            rows.forEach((r, idx) => {
              if (idx === 0) return;
              const cid = forceStringID(r[1]); 
              const rowType = String(r[8] || "").trim().toLowerCase();

              if (cid !== "") {
                lastId = cid;
                lastType = rowType; // Define o tipo ao iniciar um novo Quesito
              } else if (rowType !== "") {
                lastType = rowType; // Atualização de segurança se o tipo estiver em linhas seguintes
              }
              
              if (lastId) { 
                if (!db[owner][lastId]) db[owner][lastId] = []; 
                // Salvamos o valor bruto E o tipo da questão
                db[owner][lastId].push({ val: r[7], type: lastType }); 
              }
            });
          }
        }
        setCapturedData(db);
      } catch (err) { console.error("Falha na extração:", err); }
    };
    loadAnswers();
  }, [employeeFiles, rulesFile]);

  const startConsolidation = async () => {
    if (!baseFile || !rulesFile || !employeeFiles) return alert("Arquivos faltando!");
    setIsProcessing(true);
    
    try {
      const baseWb = XLSX.read(await baseFile.arrayBuffer(), { cellStyles: true });
      const ws = baseWb.Sheets[baseWb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']!);
      
      const rulesWb = XLSX.read(await rulesFile.arrayBuffer());
      const rulesData: any[][] = XLSX.utils.sheet_to_json(rulesWb.Sheets[rulesWb.SheetNames[0]], { header: 1 });
      const amap: Record<string, string> = {};
      rulesData.forEach(r => { if(r[0] && r[1]) amap[forceStringID(r[0])] = String(r[1]).trim(); });

      const counters: Record<string, number> = {};
      let currentId = "";
      const trail: any[] = [];

      for (let R = range.s.r; R <= range.e.r; R++) {
        const idCell = ws[XLSX.utils.encode_cell({r:R, c:1})];
        if (idCell && idCell.v) currentId = forceStringID(idCell.v);
        
        const cellRef = XLSX.utils.encode_cell({r:R, c:6}); 
        if (!ws[cellRef]) continue;

        let content = String(ws[cellRef].v || "");
        if (/{resposta}|{respostachek}/i.test(content)) {
          const owner = amap[currentId] || "";
          const answers = capturedData[owner]?.[currentId] || [];
          const parts = content.split(/({resposta}|{respostachek})/i);
          
          const processed = parts.map(part => {
            const tag = part.toLowerCase();
            if (tag === "{resposta}" || tag === "{respostachek}") {
              const idx = counters[currentId] || 0;
              const answerObj = (answers && answers[idx]) ? answers[idx] : { val: "", type: "" };
              counters[currentId] = idx + 1;

              const raw = answerObj.val;
              const isTypeCheck = String(answerObj.type).includes("check");

              let result = "";
              // REGRAS DE INJEÇÃO
              if (isTypeCheck) {
                // SÓ converte para ícone se for tipo check
                result = evaluateCheckbox(raw) ? "☑" : "☐";
              } else {
                // Se não for check, mantém o valor como texto (preserva 0 e 1 literais)
                result = (raw === 0 || raw === "0") ? "0" : smartClean(raw);
              }
              
              trail.push({ 
                id: currentId, 
                worker: owner, 
                row: R+1, 
                tag: part, 
                value: raw, // Mandamos o bruto para o modal
                type: answerObj.type // Mandamos o tipo para o modal
              });
              return result;
            }
            return part;
          }).join("");
          
          ws[cellRef].v = processed;
          ws[cellRef].t = 's';
        }
      }

      setPreviewItems(trail);
      setCurrentBaseWorkbook(baseWb);
      setIsPreFlightOpen(true);
    } catch (e) { alert("Erro na união."); } finally { setIsProcessing(false); }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
      <PreFlightModal 
        isOpen={isPreFlightOpen} 
        onClose={() => setIsPreFlightOpen(false)} 
        onConfirm={() => { XLSX.writeFile(currentBaseWorkbook!, "CONSOLIDADO_FINAL.xlsx"); setIsPreFlightOpen(false); }} 
        previewData={previewItems} 
      />
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-slate-800 italic uppercase">📊 Unir Resultados</h2>
          <p className="text-slate-400 text-xs font-bold uppercase mt-1">
            Status: {Object.keys(capturedData).length} auditores carregados
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <FileCard title="Template Base" subtitle="Tags {tags} na Coluna G" color="bg-indigo-600" file={baseFile} onFileChange={setBaseFile} />
        <FileCard title="Planilha Regras" subtitle="ID vs Responsável" color="bg-orange-500" file={rulesFile} onFileChange={setRulesFile} />
      </div>
      
      <div className="p-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
        <FileCard title="Arquivos Respondidos" subtitle="Múltiplos .xlsx (Aba Formulario)" color="bg-emerald-500" file={employeeFiles} onFileChange={setEmployeeFiles} multiple />
      </div>

      <button onClick={startConsolidation} disabled={isProcessing} className="w-full py-8 rounded-[3rem] font-black uppercase text-white bg-slate-900 shadow-2xl hover:bg-indigo-600 transition-all">
        {isProcessing ? "🔨 Unindo Dados..." : "🚀 Iniciar União e Auditoria"}
      </button>
    </div>
  );
}