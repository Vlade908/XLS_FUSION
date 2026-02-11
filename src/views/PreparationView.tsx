/** @format */
import React, { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';

interface Props {
  user: { name: string, email: string } | null; 
  onLogin: () => void;
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
  const [isPublishing, setIsPublishing] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
  const [viewingAuditorResponse, setViewingAuditorResponse] = useState<any>(null); 
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);

  const carregarHistorico = useCallback(() => {
    if (user?.email) {
      fetch(`/api/meus-formularios?email=${user.email}`)
        .then(res => res.json())
        .then(data => setHistorico(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erro histórico:", err));
    }
  }, [user]);

  useEffect(() => {
    carregarHistorico();
  }, [carregarHistorico]);

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

  const handleGerenciar = async (codigo: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/projeto/${codigo}/detalhes`);
      const data = await res.json();
      setSelectedProjectData(data);
    } catch (err) {
      alert("Erro ao carregar detalhes.");
    } finally {
      setIsLoadingDetails(false);
    }
  };

  const baixarArquivoAuditor = async (path: string, nome: string) => {
    try {
      const res = await fetch(`/api/download-arquivo?path=${path}`);
      const data = await res.json();
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.base64}`;
      link.download = `XLSFUSION_${nome.replace(/\s+/g, '_').toUpperCase()}.xlsx`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert("Erro ao baixar arquivo do servidor.");
    }
  };

  const publicarAuditoria = async () => {
    if (!user) return alert("🔐 Faça login!");
    if (!rulesFile || !senderFormFile || !templateFile) return alert("⚠️ Arquivos faltando! Regras, Formulário e Template são obrigatórios.");

    setIsPublishing(true);
    const codigoProjeto = `AUDIT-${Date.now()}`;
    const dataAtual = new Date();
    const mesExtenso = dataAtual.toLocaleString('pt-BR', { month: 'long' });
    const ano = dataAtual.getFullYear();
    const mesAnoAuto = `${mesExtenso.charAt(0).toUpperCase() + mesExtenso.slice(1)}/${ano}`;

    const formData = new FormData();
    formData.append('rulesFile', rulesFile);
    formData.append('baseFile', senderFormFile);
    formData.append('templateFile', templateFile);
    formData.append('criadorNome', user.name);
    formData.append('criadorEmail', user.email.toLowerCase());
    formData.append('mesAno', mesAnoAuto); 
    formData.append('codigoProjeto', codigoProjeto);
    formData.append('workerColors', JSON.stringify(workerColors));

    try {
      const res = await fetch('/api/criar-projeto', { method: 'POST', body: formData });
      if (res.ok) { 
        alert(`✅ PROJETO PUBLICADO!\nCódigo: ${codigoProjeto}`); 
        carregarHistorico();
        setRulesFile(null); setSenderFormFile(null); setTemplateFile(null);
      }
    } catch (err) { alert("Erro de conexão."); }
    finally { setIsPublishing(false); }
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] shadow-xl text-center border border-slate-100">
        <div className="text-7xl mb-6">🔐</div>
        <h2 className="text-3xl font-black uppercase italic text-slate-800 tracking-tighter">Portal do Administrador</h2>
        <p className="text-slate-400 text-xs font-bold uppercase mb-8">Faça login com sua conta Google para gerenciar auditorias</p>
        <button onClick={onLogin} className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black uppercase text-[11px] shadow-2xl hover:scale-105 transition-all">Autenticar com Google</button>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col space-y-8 pb-20">
      
      {/* MODAL DE GERENCIAMENTO (COMPLETO) */}
      {selectedProjectData && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[100] flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 border border-white/20">
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative overflow-hidden">
              <div className="relative z-10 flex items-center gap-6">
                {viewingAuditorResponse && (
                  <button onClick={() => setViewingAuditorResponse(null)} className="w-10 h-10 bg-white/10 rounded-full flex items-center justify-center hover:bg-indigo-600 transition-all font-black text-indigo-400">←</button>
                )}
                <div>
                  <p className="text-indigo-400 font-black text-[11px] uppercase tracking-widest">{selectedProjectData.mesAno}</p>
                  <h3 className="text-2xl font-black italic uppercase tracking-tighter">{selectedProjectData.codigo}</h3>
                </div>
              </div>
              <button onClick={() => { setSelectedProjectData(null); setViewingAuditorResponse(null); }} className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center hover:bg-rose-500 transition-all relative z-10 font-bold">✕</button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
            </div>
            
            <div className="p-10 space-y-8 max-h-[65vh] overflow-y-auto custom-scrollbar bg-slate-50/30">
              {!viewingAuditorResponse ? (
                <>
                  <section>
                    <div className="flex justify-between items-end mb-6">
                      <h4 className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em] italic">📋 Fluxo de Respostas ({selectedProjectData.respostas?.length || 0})</h4>
                    </div>
                    <div className="grid gap-4">
                      {selectedProjectData.respostas?.length > 0 ? (
                        selectedProjectData.respostas.map((resp: any) => (
                          <div key={resp.nome} className="flex items-center justify-between p-5 bg-white rounded-3xl border border-slate-100 group hover:border-indigo-300 hover:shadow-lg transition-all">
                            <div className="flex items-center gap-4">
                              <div className="w-10 h-10 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 text-sm font-black group-hover:bg-indigo-600 group-hover:text-white transition-colors">{resp.nome.charAt(0)}</div>
                              <div>
                                <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{resp.nome}</p>
                                <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(resp.respondidoEm).toLocaleDateString()} às {new Date(resp.respondidoEm).toLocaleTimeString()}</p>
                              </div>
                            </div>
                            <button onClick={() => setViewingAuditorResponse(resp)} className="px-5 py-2.5 bg-slate-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all shadow-sm">Ver Detalhes</button>
                          </div>
                        ))
                      ) : (
                        <div className="p-16 text-center bg-white rounded-[2.5rem] border-2 border-dashed border-slate-200">
                          <span className="text-4xl mb-4 block">⏳</span>
                          <p className="text-slate-400 text-xs font-black uppercase italic tracking-widest">Nenhuma resposta enviada</p>
                        </div>
                      )}
                    </div>
                  </section>
                  <section className="pt-8 border-t border-slate-100">
                    <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4 tracking-widest italic">🔗 Link Externo de Coleta</h4>
                    <div className="flex gap-2">
                       <input readOnly value={`${window.location.origin}/responder?p=${selectedProjectData.codigo}`} className="flex-grow p-4 bg-white border border-slate-200 rounded-2xl text-[11px] font-mono text-indigo-600 outline-none shadow-inner" />
                       <button onClick={() => { navigator.clipboard.writeText(`${window.location.origin}/responder?p=${selectedProjectData.codigo}`); alert("Link Copiado!"); }} className="px-6 py-4 bg-slate-900 text-white rounded-2xl text-[10px] font-black uppercase hover:bg-indigo-600 transition-all shadow-lg active:scale-95">Copiar</button>
                    </div>
                  </section>
                </>
              ) : (
                <div className="animate-in slide-in-from-right-10 duration-500">
                  <div className="flex items-center gap-6 mb-8 p-6 bg-indigo-50/50 rounded-[2.5rem] border border-indigo-100">
                    <div className="w-16 h-16 bg-indigo-600 rounded-[1.5rem] flex items-center justify-center text-white text-2xl font-black shadow-xl">{viewingAuditorResponse.nome.charAt(0)}</div>
                    <div>
                      <h4 className="text-xl font-black text-slate-800 uppercase italic tracking-tighter">{viewingAuditorResponse.nome}</h4>
                      <p className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em]">{viewingAuditorResponse.emailRespondente || 'Email não vinculado'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div className="p-6 bg-white rounded-3xl border border-slate-200 shadow-sm space-y-2">
                      <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Localização Cloud Storage:</p>
                      <p className="text-[11px] font-mono text-slate-600 break-all leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">{viewingAuditorResponse.arquivo}</p>
                    </div>
                    <button 
                      onClick={() => baixarArquivoAuditor(viewingAuditorResponse.arquivo, viewingAuditorResponse.nome)}
                      className="w-full py-6 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-xs tracking-[0.2em] shadow-2xl hover:bg-indigo-600 transition-all active:scale-95 flex items-center justify-center gap-3"
                    >
                      <span className="text-xl">📥</span> Baixar Planilha Individual
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: HISTÓRICO */}
      <div className="bg-slate-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <div className="relative z-10">
          <h3 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">🕒 Atividades Recentes ({historico.length})</h3>
          <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar">
            {historico.map(proj => (
              <div key={proj.codigo} className="flex-shrink-0 w-72 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 hover:border-indigo-500 transition-all group hover:bg-white/10">
                <p className="text-[10px] font-black uppercase text-indigo-400 mb-2 tracking-widest">{proj.mesAno}</p>
                <h4 className="text-base font-bold truncate mb-6 text-slate-100 tracking-tight">{proj.codigo}</h4>
                <button onClick={() => handleGerenciar(proj.codigo)} className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl group-hover:bg-indigo-500 transition-all active:scale-95">Gerenciar Auditoria</button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* SEÇÃO: CRIAÇÃO */}
      <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black italic uppercase text-slate-800 tracking-tighter">🚀 Nova Auditoria</h2>
          <button onClick={onExport} className="px-6 py-3 bg-slate-800 text-white rounded-full text-[10px] font-black uppercase tracking-widest hover:bg-indigo-600 transition-all shadow-lg">Exportar Cores</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FileCard title="Regras" subtitle="Mapeamento IDs" color="bg-orange-500" icon="⚖️" file={rulesFile} onFileChange={setRulesFile} />
          <FileCard title="Formulário" subtitle="Coleta de Respostas" color="bg-pink-500" icon="📄" file={senderFormFile} onFileChange={setSenderFormFile} />
          <FileCard title="Template" subtitle="Geração Automática" color="bg-indigo-600" icon="🎯" file={templateFile} onFileChange={setTemplateFile} />
        </div>
        <div className="bg-slate-50 p-8 rounded-[3rem] border border-slate-200 grid grid-cols-1 md:grid-cols-12 gap-6 items-end shadow-sm">
          <div className="md:col-span-5 space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase ml-4 tracking-widest italic">Responsável Auditor</label>
            <input list="workers-list" value={selectedWorker} onChange={(e) => setSelectedWorker(e.target.value)} placeholder="Selecione na lista..." className="w-full bg-white border border-slate-200 p-4 rounded-2xl text-xs font-black outline-none focus:border-indigo-400 transition-all" />
            <datalist id="workers-list">{availableWorkers.map(w => <option key={w} value={w} />)}</datalist>
          </div>
          <div className="md:col-span-4 flex items-center bg-white border border-slate-200 p-2 rounded-2xl h-[56px] relative shadow-sm">
            <div className="w-14 h-10 rounded-xl flex items-center justify-center font-black text-white shadow-md" style={{ backgroundColor: selectedColor }}> Aa </div>
            <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} className="w-14 h-10 opacity-0 absolute left-2 cursor-pointer z-10" />
            <span className="ml-4 text-[11px] font-mono text-slate-400 font-black tracking-widest">{selectedColor.toUpperCase()}</span>
          </div>
          <div className="md:col-span-3">
            <button onClick={() => { if(selectedWorker) setWorkerColors(prev => ({...prev, [selectedWorker]: selectedColor})); setSelectedWorker(''); }} className="w-full h-[56px] bg-indigo-600 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:bg-slate-900 transition-all active:scale-95">Mapear Cor</button>
          </div>
        </div>
        <button onClick={publicarAuditoria} disabled={isPublishing} className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] shadow-2xl transition-all ${isPublishing ? 'bg-slate-300' : 'bg-slate-900 text-white hover:bg-indigo-600 hover:scale-[1.01]'} active:scale-95`}>
          {isPublishing ? "📤 Sincronizando com Cloud..." : "🚀 Publicar Auditoria e Gerar Link"}
        </button>
      </div>
    </div>
  );
}