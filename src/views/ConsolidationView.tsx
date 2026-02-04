import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { PreFlightModal } from '../components/PreFlightModal';
import { normID, smartClean, evaluateCheckbox } from '../utils/excelLogic';

interface Props {
  baseFile: File | null; setBaseFile: (f: File | null) => void;
  employeeFiles: FileList | null; setEmployeeFiles: (f: FileList | null) => void;
  workerColors: Record<string, string>;
}

export default function ConsolidationView({ baseFile, setBaseFile, employeeFiles, setEmployeeFiles, workerColors }: Props) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [currentBaseWorkbook, setCurrentBaseWorkbook] = useState<XLSX.WorkBook | null>(null);
  const [capturedData, setCapturedData] = useState<Record<string, Record<string, any[]>>>({});
  const [globalAssignment, setGlobalAssignment] = useState<Record<string, string>>({});

  const findSheet = (wb: XLSX.WorkBook, target: string) => {
    const normalize = (s: string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, "");
    return wb.SheetNames.find(n => normalize(n).includes(normalize(target)));
  };

  useEffect(() => {
    const loadAll = async () => {
      if (!employeeFiles) return;
      const db: Record<string, any> = {};
      const assignments: Record<string, string> = {};

      for (const f of Array.from(employeeFiles)) {
        const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false, raw: false });
        const mapSheetName = findSheet(wb, "mapeamento");
        const formSheetName = findSheet(wb, "formulario");

        if (mapSheetName && formSheetName) {
          const mapData: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[mapSheetName], { header: 1 });
          const formData: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[formSheetName], { header: 1, defval: "" });
          
          // Extrai quem é o dono deste arquivo e o mapeamento interno
          let owner = "";
          mapData.forEach((r, i) => {
            if (i > 0 && r[0] && r[1]) {
              const qId = normID(r[0]);
              const person = String(r[1]).trim();
              assignments[qId] = person;
              owner = person;
            }
          });

          if (owner) {
            if (!db[owner]) db[owner] = {};
            let lastId = "";
            let lastType = "";
            formData.forEach((r, idx) => {
              if (idx === 0) return;
              const cid = normID(r[1]);
              const rowType = String(r[8] || "").trim().toLowerCase();
              if (cid !== "") { lastId = cid; lastType = rowType; }
              else if (rowType !== "") { lastType = rowType; }
              
              if (lastId) {
                if (!db[owner][lastId]) db[owner][lastId] = [];
                db[owner][lastId].push({ val: r[7], type: lastType });
              }
            });
          }
        }
      }
      setCapturedData(db);
      setGlobalAssignment(assignments);
    };
    loadAll();
  }, [employeeFiles]);

  const startConsolidation = async () => {
    if (!baseFile || !employeeFiles) return alert("Arquivos faltando!");
    setIsProcessing(true);
    
    try {
      const baseWb = XLSX.read(await baseFile.arrayBuffer(), { cellStyles: true });
      const ws = baseWb.Sheets[baseWb.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']!);
      
      const counters: Record<string, number> = {};
      let currentId = "";
      const trail: any[] = [];

      for (let R = range.s.r; R <= range.e.r; R++) {
        const idCell = ws[XLSX.utils.encode_cell({r:R, c:1})];
        if (idCell && idCell.v) currentId = normID(idCell.v);
        
        const cellRef = XLSX.utils.encode_cell({r:R, c:6}); 
        if (!ws[cellRef]) continue;

        let content = String(ws[cellRef].v || "");
        if (/{resposta}|{respostachek}/i.test(content)) {
          const owner = globalAssignment[currentId] || "";
          const answers = capturedData[owner]?.[currentId] || [];
          const parts = content.split(/({resposta}|{respostachek})/i);
          
          const processed = parts.map(part => {
            const tag = part.toLowerCase();
            if (tag === "{resposta}" || tag === "{respostachek}") {
              const idx = counters[currentId] || 0;
              const answerObj = answers[idx] || { val: "", type: "" };
              counters[currentId] = idx + 1;

              const isCheck = String(answerObj.type).includes("check");
              const res = isCheck ? (evaluateCheckbox(answerObj.val) ? "☑" : "☐") : smartClean(answerObj.val);
              
              trail.push({ id: currentId, worker: owner, row: R+1, tag: part, value: answerObj.val, type: answerObj.type });
              return res;
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
      <PreFlightModal isOpen={isPreFlightOpen} onClose={() => setIsPreFlightOpen(false)} onConfirm={() => { XLSX.writeFile(currentBaseWorkbook!, "CONSOLIDADO_FINAL.xlsx"); setIsPreFlightOpen(false); }} previewData={previewItems} />
      
      <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center">
        <h2 className="text-3xl font-black text-slate-800 italic uppercase">📊 Unir Resultados</h2>
        <div className="text-right">
           <span className="text-[10px] font-black text-emerald-500 uppercase block">Auditores Lidos via Arquivo</span>
           <span className="text-lg font-bold text-slate-700">{Object.keys(capturedData).length} Responsáveis</span>
        </div>
      </div>

      <FileCard title="Template Master" subtitle="Template com tags {resposta}" color="bg-indigo-600" icon="🎯" file={baseFile} onFileChange={setBaseFile} />
      
      <div className="p-6 bg-slate-50 rounded-[3rem] border border-slate-200 shadow-inner">
        <FileCard title="Respondidos pela Equipe" subtitle="Aba Mapeamento + Formulario" color="bg-emerald-500" icon="👥" file={employeeFiles} onFileChange={setEmployeeFiles} multiple />
      </div>

      <button onClick={startConsolidation} disabled={isProcessing || !baseFile || !employeeFiles} className="w-full py-8 rounded-[3rem] font-black uppercase text-white bg-slate-900 shadow-2xl hover:bg-indigo-600 transition-all">
        🚀 Iniciar Consolidação Autônoma
      </button>
    </div>
  );
}