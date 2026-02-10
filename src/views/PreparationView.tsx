/** @format */
import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { generateRandomColor } from '../utils/excelLogic';

interface Props {
  user: { name: string, email: string } | null; 
  onLogin: () => void; // Adicionado à interface
  rulesFile: File | null; setRulesFile: (f: File | null) => void;
  senderFormFile: File | null; setSenderFormFile: (f: File | null) => void;
  workerColors: Record<string, string>;
  setWorkerColors: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onExport: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export default function PreparationView({ 
  user, onLogin, rulesFile, setRulesFile, 
  senderFormFile, setSenderFormFile, 
  workerColors, setWorkerColors,
  onExport, onImport
}: Props) {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [availableWorkers, setAvailableWorkers] = useState<string[]>([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [selectedColor, setSelectedColor] = useState('#6366F1');
  const [mesAno, setMesAno] = useState('');
  const [isPublishing, setIsPublishing] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);

  useEffect(() => {
    if (user?.email) {
      fetch(`/api/meus-formularios?email=${user.email}`)
        .then(res => res.json())
        .then(data => setHistorico(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erro histórico:", err));
    }
  }, [user]);

  useEffect(() => {
    if (rulesFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result);
        const data: any[][] = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1 });
        const workers = new Set<string>();
        data.forEach((row, i) => { if (i > 0 && row[1]) workers.add(String(row[1]).trim()); });
        setAvailableWorkers(Array.from(workers));
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

  const publicarAuditoria = async () => {
    if (!user) return alert("🔐 Faça login!");
    if (!rulesFile || !senderFormFile || !templateFile || !mesAno) return alert("Arquivos faltando!");
    setIsPublishing(true);
    const codigoProjeto = `AUDIT-${Date.now()}`;
    const formData = new FormData();
    formData.append('rulesFile', rulesFile);
    formData.append('baseFile', senderFormFile);
    formData.append('templateFile', templateFile);
    formData.append('criadorNome', user.name);
    formData.append('criadorEmail', user.email);
    formData.append('mesAno', mesAno);
    formData.append('codigoProjeto', codigoProjeto);
    formData.append('workerColors', JSON.stringify(workerColors));

    try {
      const res = await fetch('/api/criar-projeto', { method: 'POST', body: formData });
      if (res.ok) { alert("🚀 Sucesso!"); window.location.reload(); }
    } catch (err) { alert("Erro conexão."); }
    finally { setIsPublishing(false); }
  };

  // TELA DE BLOQUEIO (Corrigida com onClick)
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] shadow-xl text-center">
        <div className="text-6xl mb-4">🔐</div>
        <h2 className="text-2xl font-black uppercase italic text-slate-800">Área do Criador</h2>
        <p className="text-slate-400 text-sm mb-6">Acesse para gerenciar suas auditorias.</p>
        <button 
          onClick={onLogin} // VINCULADO!
          className="px-8 py-4 bg-indigo-600 text-white rounded-full font-black uppercase text-xs shadow-lg hover:bg-slate-900 transition-all active:scale-95"
        >
          Fazer Login para Começar
        </button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col space-y-8 pb-10">
      <div className="bg-slate-900 p-8 rounded-[3rem] text-white overflow-hidden relative shadow-2xl">
        <h3 className="text-xl font-black uppercase italic mb-6">🕒 Meus Formulários ({historico.length})</h3>
        <div className="flex gap-4 overflow-x-auto pb-4 custom-scrollbar">
          {historico.map(proj => (
            <div key={proj.codigo} className="flex-shrink-0 w-64 bg-white/10 p-5 rounded-3xl border border-white/10">
              <p className="text-[10px] font-black uppercase text-indigo-400 mb-1">{proj.mesAno}</p>
              <h4 className="text-sm font-bold truncate mb-4 text-slate-200">{proj.codigo}</h4>
              <button className="w-full py-2.5 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase">Gerenciar</button>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-black italic uppercase text-slate-800">🚀 Nova Auditoria</h2>
          <div className="flex gap-2">
            <button onClick={onExport} className="px-4 py-2 bg-slate-800 text-white rounded-full text-[9px] font-black uppercase">💾 Exportar Cores</button>
            <label className="px-4 py-2 bg-slate-100 text-slate-600 rounded-full text-[9px] font-black uppercase cursor-pointer">
              📂 Importar Cores <input type="file" accept=".json" className="hidden" onChange={onImport} />
            </label>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FileCard title="Regras" subtitle="IDs ↔ Responsáveis" color="bg-orange-500" icon="⚖️" file={rulesFile} onFileChange={setRulesFile} />
          <FileCard title="Formulário" subtitle="Arquivo p/ Pintura" color="bg-pink-500" icon="📄" file={senderFormFile} onFileChange={setSenderFormFile} />
          <FileCard title="Template" subtitle="Arquivo com {tags}" color="bg-indigo-600" icon="🎯" file={templateFile} onFileChange={setTemplateFile} />
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black text-slate-400 uppercase ml-4">Período de Referência</label>
          <input type="text" value={mesAno} onChange={(e) => setMesAno(e.target.value)} placeholder="Ex: Fevereiro 2026" className="w-full p-4 bg-slate-50 rounded-2xl outline-none font-bold" />
        </div>

        <div className="bg-slate-50 p-6 rounded-[2.5rem] border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-5">
            <label className="text-[10px] font-bold text-slate-400 uppercase ml-2 mb-1 block">Funcionário</label>
            <input list="workers-list" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} placeholder="Selecione..." className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold outline-none" />
            <datalist id="workers-list">{availableWorkers.map(w => <option key={w} value={w} />)}</datalist>
          </div>
          <div className="md:col-span-4 flex items-center bg-white border border-slate-200 p-1.5 rounded-xl h-[46px] relative">
            <div className="w-12 h-8 rounded-lg flex items-center justify-center font-black text-white" style={{ backgroundColor: selectedColor }}>Aa</div>
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-12 h-8 opacity-0 absolute left-1.5 cursor-pointer z-10" />
            <span className="ml-3 text-[10px] font-mono text-slate-400 font-bold">{selectedColor}</span>
          </div>
          <div className="md:col-span-3">
            <button onClick={addColorMapping} className="w-full h-[46px] bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase">Adicionar</button>
          </div>
        </div>

        <button onClick={publicarAuditoria} disabled={isPublishing} className={`w-full py-6 rounded-[2rem] font-black uppercase text-xs tracking-widest shadow-xl transition-all ${isPublishing ? 'bg-slate-300' : 'bg-slate-900 text-white hover:bg-indigo-600'}`}>
          {isPublishing ? "📤 Publicando..." : "🚀 Publicar e Gerar Link"}
        </button>
      </div>
    </div>
  );
}