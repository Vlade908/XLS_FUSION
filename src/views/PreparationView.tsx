/** @format */
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { normID, smartClean, hexToExcelColor, getContrastColor, generateRandomColor } from '../utils/excelLogic';

interface Props {
  rulesFile: File | null; setRulesFile: (f: File | null) => void;
  senderFormFile: File | null; setSenderFormFile: (f: File | null) => void;
  workerColors: Record<string, string>;
  setWorkerColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExport: () => void; onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PreparationView({ rulesFile, setRulesFile, senderFormFile, setSenderFormFile, workerColors, setWorkerColors, onExport, onImport }: Props) {
  const [availableWorkers, setAvailableWorkers] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  
  // NOVOS CAMPOS PARA NUVEM
  const [criador, setCriador] = useState('');
  const [mesAno, setMesAno] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);

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

  const publicarAuditoria = async () => {
    if (!rulesFile || !senderFormFile || !criador || !mesAno) {
      return alert("⚠️ Preencha todos os campos (Criador, Data e Arquivos) antes de publicar.");
    }

    setIsPublishing(true);
    const codigoProjeto = `AUDIT-${Date.now()}`; // Geramos um ID único baseado no tempo

    const formData = new FormData();
    formData.append('rulesFile', rulesFile);
    formData.append('baseFile', senderFormFile);
    formData.append('criador', criador);
    formData.append('mesAno', mesAno);
    formData.append('codigoProjeto', codigoProjeto);
    formData.append('workerColors', JSON.stringify(workerColors));

    try {
      const res = await fetch('/api/criar-projeto', { method: 'POST', body: formData });
      const data = await res.json();
      if (res.ok) {
        alert(`✅ PROJETO PUBLICADO!\nLink: ${window.location.origin}${data.link}`);
      } else {
        throw new Error(data.error);
      }
    } catch (err: any) {
      alert("Erro na publicação: " + err.message);
    } finally {
      setIsPublishing(false);
    }
  };

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col h-full space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-slate-800 italic uppercase">🚀 Publicar Nova Auditoria</h2>
      </div>

      {/* CAMPOS DE METADADOS */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Responsável pela Criação</label>
          <input type="text" value={criador} onChange={(e) => setCriador(e.target.value)} placeholder="Seu nome..." className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500" />
        </div>
        <div className="space-y-1">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-2">Mês/Ano Referência</label>
          <input type="text" value={mesAno} onChange={(e) => setMesAno(e.target.value)} placeholder="Ex: 02/2026" className="w-full bg-white border border-slate-200 p-3 rounded-2xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500" />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <FileCard title="Planilha de Regras" subtitle="IDs ↔ Responsáveis" color="bg-orange-500" icon="⚖️" file={rulesFile} onFileChange={setRulesFile} />
        <FileCard title="Formulário Base" subtitle="Arquivo p/ pintura" color="bg-pink-500" icon="📄" file={senderFormFile} onFileChange={setSenderFormFile} />
      </div>

      {/* ... (O bloco de seleção de cores permanece igual até o final) ... */}
      <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 shadow-inner grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
        <div className="md:col-span-5">
          <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Mapear Cores dos Membros</label>
          <input list="workers-list" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} placeholder="Selecione o membro" className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none focus:ring-2 ring-indigo-500" />
          <datalist id="workers-list">{availableWorkers.map(w => <option key={w} value={w} />)}</datalist>
        </div>
        <div className="md:col-span-4 flex items-center bg-white border border-slate-200 p-1.5 rounded-xl h-[46px] relative overflow-hidden">
          <div className="w-12 h-8 rounded-lg flex items-center justify-center font-black text-white" style={{ backgroundColor: selectedColor }}>Aa</div>
          <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-12 h-8 opacity-0 absolute left-1.5 cursor-pointer z-10" />
          <span className="ml-3 text-[10px] font-mono text-slate-400 font-bold uppercase">{selectedColor}</span>
          <button onClick={() => setSelectedColor(generateRandomColor())} className="ml-auto bg-slate-100 p-2 rounded-lg text-lg">🎲</button>
        </div>
        <div className="md:col-span-3">
          <button onClick={() => { if(selectedWorker) setWorkerColors(prev => ({...prev, [selectedWorker]: selectedColor})); setSelectedWorker(''); setSelectedColor(generateRandomColor()); }} className="w-full h-[46px] bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase shadow-lg">Mapear</button>
        </div>
      </div>

      <button onClick={publicarAuditoria} disabled={isPublishing} className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isPublishing ? 'bg-slate-400' : 'bg-indigo-600 text-white hover:bg-slate-900'}`}>
        {isPublishing ? "📤 Publicando na Nuvem..." : "🚀 Publicar e Gerar Link de Resposta"}
      </button>
    </div>
  );
}