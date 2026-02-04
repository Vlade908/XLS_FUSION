import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { normID, smartClean, hexToExcelColor, getContrastColor, generateRandomColor } from '../utils/excelLogic';

interface Props {
  rulesFile: File | null;
  setRulesFile: (f: File | null) => void;
  senderFormFile: File | null;
  setSenderFormFile: (f: File | null) => void;
  workerColors: Record<string, string>;
  setWorkerColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PreparationView({ 
  rulesFile, setRulesFile, 
  senderFormFile, setSenderFormFile, 
  workerColors, setWorkerColors, 
  onExport, onImport 
}: Props) {
  const [availableWorkers, setAvailableWorkers] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');

  useEffect(() => {
    if (rulesFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const wb = XLSX.read(e.target?.result);
          const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
          const workers = new Set<string>();
          data.forEach((row, i) => { if (i > 0 && row[1]) workers.add(String(row[1]).trim()); });
          setAvailableWorkers(Array.from(workers));
        } catch (err) { console.error(err); }
      };
      reader.readAsArrayBuffer(rulesFile);
    }
  }, [rulesFile]);

  const addColorMapping = () => { 
    if (!selectedWorker) return; 
    setWorkerColors(prev => ({ ...prev, [selectedWorker]: selectedColor })); 
    setSelectedWorker(''); 
    setSelectedColor(generateRandomColor());
  };

  const removeColorMapping = (name: string) => { 
    const newColors = { ...workerColors }; 
    delete newColors[name]; 
    setWorkerColors(newColors); 
  };

  const downloadColorList = async () => {
    if (!rulesFile || !senderFormFile) return alert("⚠️ Carregue os arquivos primeiro.");

    try {
      const wbRules = XLSX.read(await rulesFile.arrayBuffer());
      const dataRules: any[][] = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });
      
      const amap: Record<string, string> = {};
      dataRules.forEach((r: any) => { 
        if(r[0] && r[1]) amap[normID(r[0])] = String(r[1]).trim(); 
      });
      
      const wbSender = XLSX.read(await senderFormFile.arrayBuffer(), { cellStyles: true });
      const ws = wbSender.Sheets[wbSender.SheetNames[0]];
      if (!ws['!ref']) return;

      const range = XLSX.utils.decode_range(ws['!ref']!);
      let lastColor = "";

      // 1. PINTANDO A ABA FORMULÁRIO (A até P)
      for (let R = range.s.r; R <= range.e.r; R++) {
        const qIdCell = ws[XLSX.utils.encode_cell({r:R, c:1})];
        if (qIdCell && qIdCell.v && String(qIdCell.v).trim() !== "") {
          const worker = amap[normID(qIdCell.v)];
          lastColor = worker ? (workerColors[worker] || "") : "";
        }
        
        for (let C = 0; C <= 15; C++) {
          const ref = XLSX.utils.encode_cell({r:R, c:C});
          
          // CRÍTICO: Limpa o conteúdo da célula antes de processar
          const currentVal = ws[ref] ? ws[ref].v : "";
          const cleanedVal = smartClean(currentVal);

          if (!ws[ref]) {
            ws[ref] = { v: cleanedVal, t: 's' };
          } else {
            ws[ref].v = cleanedVal;
          }
          
          const isHeader = R === 0;
          const bgColor = isHeader ? "#334155" : lastColor;
          
          if (bgColor) {
            const contrast = getContrastColor(bgColor);
            ws[ref].s = {
              fill: { 
                patternType: "solid", 
                fgColor: { rgb: hexToExcelColor(bgColor) } 
              },
              font: { 
                color: { rgb: hexToExcelColor(contrast) }, 
                sz: 10, 
                bold: isHeader,
                name: "Segoe UI"
              },
              border: { 
                top: {style:"thin", color: {rgb: "E2E8F0"}}, 
                bottom: {style:"thin", color: {rgb: "E2E8F0"}}, 
                left: {style:"thin", color: {rgb: "E2E8F0"}}, 
                right: {style:"thin", color: {rgb: "E2E8F0"}} 
              },
              alignment: { 
                vertical: "center", 
                horizontal: "left",
                wrapText: true // CRÍTICO: Resolve visualmente o _x000D_
              }
            };
          } else {
            delete ws[ref].s;
          }
        }
      }

      // 2. GERANDO ABA MAPEAMENTO
      const mappingRows = [["N° QUESITO", "RESPONSÁVEL"]];
      const sortedEntries = Object.entries(amap).sort((a, b) => a[1].localeCompare(b[1]));
      
      sortedEntries.forEach(([id, name]) => {
        mappingRows.push([id, name]);
      });

      const wsMap = XLSX.utils.aoa_to_sheet(mappingRows);
      
      mappingRows.forEach((row, R) => {
        const workerName = row[1];
        const isHeader = R === 0;
        const bgColor = isHeader ? "#334155" : (workerColors[workerName] || "");
        
        if (bgColor) {
          const contrast = getContrastColor(bgColor);
          for (let C = 0; C < 2; C++) {
            const ref = XLSX.utils.encode_cell({r:R, c:C});
            if (!wsMap[ref]) wsMap[ref] = {v: "", t: "s"};
            
            // Limpa nomes no mapeamento também
            wsMap[ref].v = smartClean(wsMap[ref].v);

            wsMap[ref].s = {
              fill: { fgColor: { rgb: hexToExcelColor(bgColor) } },
              font: { color: { rgb: hexToExcelColor(contrast) }, bold: isHeader, sz: 10 },
              alignment: { vertical: "center", horizontal: "left", wrapText: true },
              border: { 
                top: {style:"thin", color: {rgb: "E2E8F0"}}, 
                bottom: {style:"thin", color: {rgb: "E2E8F0"}}, 
                left: {style:"thin", color: {rgb: "E2E8F0"}}, 
                right: {style:"thin", color: {rgb: "E2E8F0"}} 
              }
            };
          }
        }
      });

      const newWb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(newWb, wsMap, "Mapeamento");
      XLSX.utils.book_append_sheet(newWb, ws, "Formulario");
      
      XLSX.writeFile(newWb, "PACOTE_AUDITORIA_FINAL.xlsx");
    } catch (err) {
      console.error(err);
      alert("Erro ao processar. Verifique os arquivos.");
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full">
      <div className="flex justify-between items-center mb-8">
        <h2 className="text-2xl font-black text-slate-800 italic uppercase">🎨 Mapeamento de Cores</h2>
        <div className="flex gap-2">
          <button onClick={onExport} className="px-4 py-2 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase shadow-sm hover:bg-slate-700 transition-colors">💾 Exportar JSON</button>
          <label className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-[10px] font-black uppercase cursor-pointer shadow-sm hover:bg-slate-200 transition-colors">
            📂 Importar JSON <input type="file" accept=".json" className="hidden" onChange={onImport} />
          </label>
        </div>
      </div>

      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 mb-8 shadow-inner">
        <FileCard title="Formulário p/ Envio" subtitle="Arraste o arquivo que contém a Coluna P" color="bg-pink-500" icon="📄" file={senderFormFile} onFileChange={setSenderFormFile} />
      </div>

      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 mb-8 shadow-inner grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Funcionário</label>
          <input list="workers-list" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} placeholder="Selecione o membro" className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500" />
          <datalist id="workers-list">{availableWorkers.map(w => <option key={w} value={w} />)}</datalist>
        </div>
        <div className="md:col-span-4 flex items-center bg-white border border-slate-200 p-1.5 rounded-xl h-[46px] relative overflow-hidden">
          <div className="w-12 h-8 rounded-lg flex items-center justify-center font-black text-white shadow-sm" style={{ backgroundColor: selectedColor }}>Aa</div>
          <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-12 h-8 opacity-0 absolute left-1.5 cursor-pointer z-10" />
          <span className="ml-3 text-[10px] font-mono text-slate-400 font-bold uppercase">{selectedColor}</span>
          <button onClick={() => setSelectedColor(generateRandomColor())} className="ml-auto bg-slate-100 hover:bg-slate-200 p-2 rounded-lg text-lg active:scale-90 transition-transform">🎲</button>
        </div>
        <div className="md:col-span-3">
          <button onClick={addColorMapping} className="w-full h-[46px] bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg hover:bg-indigo-700 active:scale-95 transition-all">Adicionar</button>
        </div>
      </div>

      <div className="flex-grow overflow-y-auto pr-2 space-y-3 max-h-[350px] mb-6 scrollbar-hide">
        {Object.entries(workerColors).map(([name, color]) => (
          <div key={name} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl shadow-sm group hover:border-indigo-100 transition-colors">
            <div className="flex items-center">
              <div className="w-10 h-10 rounded-xl mr-4 border-2 border-white flex items-center justify-center font-black text-xs shadow-sm" style={{ backgroundColor: color, color: getContrastColor(color) }}>{name[0]}</div>
              <span className="text-sm font-bold text-slate-700">{name}</span>
            </div>
            <button onClick={() => removeColorMapping(name)} className="text-slate-300 hover:text-rose-500 text-[10px] font-black uppercase px-4 opacity-0 group-hover:opacity-100 transition-all">Remover</button>
          </div>
        ))}
      </div>

      <button 
        onClick={downloadColorList} 
        className="w-full py-6 bg-slate-800 text-white rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-[0.98]"
      >
        Baixar Lista Colorida 🎨
      </button>
    </div>
  );
}