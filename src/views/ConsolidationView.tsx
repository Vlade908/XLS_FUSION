import { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { PreFlightModal } from '../components/PreFlightModal';
import { normName, smartClean, evaluateCheckbox } from '../utils/excelLogic';

interface Props {
  baseFile: File | null; setBaseFile: (f: File | null) => void;
  employeeFiles: FileList | null; setEmployeeFiles: (f: FileList | null) => void;
  workerColors: Record<string, string>;
}

export default function ConsolidationView({ baseFile, setBaseFile, employeeFiles, setEmployeeFiles, workerColors }: Props) {
  void workerColors;
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [currentBaseWorkbook, setCurrentBaseWorkbook] = useState<XLSX.WorkBook | null>(null);
  
  // capturedData[Auditor][ID] = [Valores...]
  const [capturedData, setCapturedData] = useState<Record<string, Record<string, any[]>>>({});
  // rulesFromFiles[ID] = Auditor (Reconstruído a partir do mapeamento interno dos arquivos)
  const [rulesFromFiles, setRulesFromFiles] = useState<Record<string, string>>({});

  const forceStringID = (val: any): string => {
    if (val === null || val === undefined) return "";
    return String(val).trim().replace(/\s+/g, '').replace(/\.0$/, "");
  };

  useEffect(() => {
    const extractIntelligence = async () => {
      if (!employeeFiles) return;
      const db: Record<string, Record<string, any[]>> = {};
      const globalRules: Record<string, string> = {};

      for (const f of Array.from(employeeFiles)) {
        try {
          const wb = XLSX.read(await f.arrayBuffer(), { cellDates: false, raw: false });
          
          // 1. Extração da Regra do arquivo (Aba Mapeamento interna)
          const mapSheet = wb.Sheets["Mapeamento"];
          if (mapSheet) {
            const mapData: any[][] = XLSX.utils.sheet_to_json(mapSheet, { header: 1 });
            mapData.forEach((r, i) => {
              if (i > 0 && r[0] && r[1]) globalRules[forceStringID(r[0])] = String(r[1]).trim();
            });
          }

          // 2. Extração das Respostas (Aba Formulario)
          const formSheet = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
          const rows: any[][] = XLSX.utils.sheet_to_json(formSheet, { header: 1, defval: "" });
          
          // Localiza o dono do arquivo pelo nome no arquivo
          const owner = Object.values(globalRules).find(name => 
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
              if (cid !== "") { lastId = cid; lastType = rowType; }
              else if (rowType !== "") { lastType = rowType; }
              
              if (lastId) {
                if (!db[owner][lastId]) db[owner][lastId] = [];
                db[owner][lastId].push({ val: r[7], type: lastType });
              }
            });
          }
        } catch (err) { console.error("Falha ao ler arquivo:", f.name); }
      }
      setCapturedData(db);
      setRulesFromFiles(globalRules);
    };
    extractIntelligence();
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
        if (idCell && idCell.v) currentId = forceStringID(idCell.v);
        
        const cellRef = XLSX.utils.encode_cell({r:R, c:6}); 
        if (!ws[cellRef]) continue;

        let content = String(ws[cellRef].v || "");
        if (/{resposta}|{respostachek}/i.test(content)) {
          const owner = rulesFromFiles[currentId] || "";
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

              let result = isTypeCheck ? (evaluateCheckbox(raw) ? "☑" : "☐") : ((raw === 0 || raw === "0") ? "0" : smartClean(raw));
              trail.push({ id: currentId, worker: owner, row: R+1, tag: part, value: raw, type: answerObj.type });
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
          <p className="text-slate-400 text-xs font-bold uppercase mt-1">Auditores detectados via arquivos: {Object.keys(capturedData).length}</p>
        </div>
      </div>
      <FileCard title="Template Base" subtitle="Tags {tags} na Coluna G" color="bg-indigo-600" icon="🎯" file={baseFile} onFileChange={setBaseFile} />
      <div className="p-6 bg-slate-50 rounded-[3rem] border-2 border-dashed border-slate-200 shadow-inner">
        <FileCard title="Respondidos" subtitle="Suba os arquivos baixados pela equipe" color="bg-emerald-500" icon="👥" file={employeeFiles} onFileChange={setEmployeeFiles} multiple />
      </div>
      <button onClick={startConsolidation} disabled={isProcessing} className="w-full py-8 rounded-[3rem] font-black uppercase text-white bg-slate-900 shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 disabled:bg-slate-100">
        {isProcessing ? "🔨 Extraindo Inteligência..." : "🚀 Iniciar União e Auditoria"}
      </button>
    </div>
  );
}