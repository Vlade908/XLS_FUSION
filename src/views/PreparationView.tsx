/** @format */
import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import { FileCard } from '../components/FileCard';
import { PreFlightModal } from '../components/PreFlightModal';
import { normName, normID } from '../utils/excelLogic';

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
  workerColors, 
}: Props) {
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  const [historico, setHistorico] = useState<any[]>([]);
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);

  const carregarHistorico = useCallback(() => {
    if (user?.email) {
      fetch(`/api/meus-formularios?email=${user.email.toLowerCase().trim()}`)
        .then(res => res.json())
        .then(data => setHistorico(Array.isArray(data) ? data : []))
        .catch(err => console.error("Erro histórico:", err));
    }
  }, [user]);

  useEffect(() => { carregarHistorico(); }, [carregarHistorico]);

  const handleGerenciar = async (codigo: string) => {
    setIsLoadingDetails(true);
    try {
      const res = await fetch(`/api/projeto/${codigo}`);
      const data = await res.json();
      setSelectedProjectData(data);
    } catch (err) { alert("Erro ao carregar."); }
    finally { setIsLoadingDetails(false); }
  };

  const analisarRespostasAuditor = async (resp: any) => {
    setIsLoadingDetails(true);
    try {
      const rulesFileRes = await fetch(`/api/download-arquivo?path=${selectedProjectData.links.rules}`);
      const rulesFileData = await rulesFileRes.json();
      const wbRules = XLSX.read(rulesFileData.base64, { type: 'base64' });
      const rulesRows: any[][] = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });
      
      const nomeBuscaNorm = normName(resp.nome);
      const quesitosDesteAuditor = rulesRows
        .filter(r => normName(r[1]) === nomeBuscaNorm)
        .map(r => normID(r[0]));

      const res = await fetch(`/api/download-arquivo?path=${resp.arquivo}`);
      const data = await res.json();
      const wb = XLSX.read(data.base64, { type: 'base64' });
      const ws = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

      const trail: any[] = [];
      let lastId = "";
      let lastType = "geral";

      rows.forEach((row, idx) => {
        if (idx === 0) return;
        if (row[1]) lastId = normID(row[1]);
        if (row[8]) lastType = String(row[8]).toLowerCase().trim();

        if (lastId && quesitosDesteAuditor.includes(lastId)) {
          trail.push({ id: lastId, worker: resp.nome, value: row[7], type: lastType, row: idx + 1 });
        }
      });
      setPreviewItems(trail);
      setIsPreFlightOpen(true);
    } catch (err) { alert("Erro na análise."); }
    finally { setIsLoadingDetails(false); }
  };

  const baixarArquivoAuditor = async (path: string, nome: string) => {
    try {
      const res = await fetch(`/api/download-arquivo?path=${path}`);
      const data = await res.json();
      const link = document.createElement('a');
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${data.base64}`;
      link.download = `XLSFUSION_${nome.toUpperCase()}.xlsx`;
      link.click();
    } catch (err) { alert("Erro download."); }
  };

  const publicarAuditoria = async () => {
    if (!user || !rulesFile || !senderFormFile || !templateFile) return alert("⚠️ Dados incompletos!");
    setIsPublishing(true);
    const formData = new FormData();
    formData.append('rulesFile', rulesFile);
    formData.append('baseFile', senderFormFile);
    formData.append('templateFile', templateFile);
    formData.append('criadorNome', user.name);
    formData.append('criadorEmail', user.email.toLowerCase());
    formData.append('mesAno', "Fevereiro/2026"); 
    formData.append('codigoProjeto', `AUDIT-${Date.now()}`);
    formData.append('workerColors', JSON.stringify(workerColors));
    try {
      const res = await fetch('/api/criar-projeto', { method: 'POST', body: formData });
      if (res.ok) { alert(`✅ PUBLICADO!`); carregarHistorico(); }
    } catch (err) { alert("Erro conexão."); }
    finally { setIsPublishing(false); }
  };

  if (!user) return (
    <div className="flex flex-col items-center justify-center p-20 bg-white rounded-[3rem] shadow-xl text-center border border-slate-100">
      <div className="text-7xl mb-6">🔐</div>
      <h2 className="text-3xl font-black uppercase italic text-slate-800">Portal Admin</h2>
      <button onClick={onLogin} className="px-10 py-5 bg-indigo-600 text-white rounded-full font-black uppercase text-[11px] mt-8">Google Login</button>
    </div>
  );

 return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex flex-col space-y-8 pb-20">
      {/* Modal de Pré-visualização de Dados (PreFlight) */}
      <PreFlightModal 
        isOpen={isPreFlightOpen} 
        onClose={() => setIsPreFlightOpen(false)} 
        onConfirm={() => setIsPreFlightOpen(false)} 
        previewData={previewItems} 
      />
      
      {/* MODAL DE GERENCIAMENTO (ESTRUTURA PREMIUM) */}
      {selectedProjectData && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white w-full max-w-3xl rounded-[3.5rem] shadow-2xl overflow-hidden border border-white/20 flex flex-col max-h-[90vh]">
            
            {/* Header do Modal */}
            <div className="bg-slate-900 p-10 text-white flex justify-between items-center relative shrink-0">
              <div className="relative z-10">
                <p className="text-indigo-400 font-black text-[11px] uppercase tracking-widest">{selectedProjectData.mesAno}</p>
                <h3 className="text-2xl font-black uppercase tracking-tighter italic">{selectedProjectData.codigo}</h3>
              </div>
              <button 
                onClick={() => setSelectedProjectData(null)} 
                className="w-12 h-12 bg-white/10 rounded-full hover:bg-rose-500 font-bold transition-all relative z-10 flex items-center justify-center text-xl"
              >
                ✕
              </button>
              <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[80px] rounded-full -mr-20 -mt-20"></div>
            </div>
            
            {/* Área de Conteúdo com Scroll */}
            <div className="p-10 space-y-8 overflow-y-auto custom-scrollbar bg-slate-50/50 flex-grow">
              
              {/* CARD: LINK DE COMPARTILHAMENTO RÁPIDO */}
              <section className="bg-indigo-600 p-8 rounded-[2.5rem] text-white shadow-lg shadow-indigo-200 relative overflow-hidden group">
                <div className="relative z-10">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 opacity-80">Link de Acesso Direto</h4>
                    <div className="flex flex-col md:flex-row items-center gap-4 bg-white/10 p-4 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <code className="text-xs font-bold truncate flex-grow text-indigo-100 w-full md:w-auto">
                      {`${window.location.origin}/responder?p=${selectedProjectData.codigo}#responder`}
                    </code>

                    <button 
                      onClick={() => {
                        // TI: O link copiado agora leva o auditor direto para o ID que criamos no Passo 1
                        navigator.clipboard.writeText(`${window.location.origin}/responder?p=${selectedProjectData.codigo}#responder`);
                        alert("Link com redirecionamento direto copiado!");
                      }}
                      className="w-full md:w-auto px-6 py-2.5 bg-white text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-50 transition-all shadow-md active:scale-95"
                    >
                      Copiar Link
                    </button>
                  </div>
                </div>
                <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-white/5 rounded-full blur-3xl group-hover:bg-white/10 transition-all"></div>
              </section>

              {/* LISTA: FLUXO DE RESPOSTAS */}
              <section>
                <h4 className="text-[11px] font-black text-slate-400 uppercase italic mb-6 tracking-widest">📋 Fluxo de Respostas Recebidas</h4>
                <div className="grid gap-4">
                  {selectedProjectData.respostas?.length > 0 ? (
                    selectedProjectData.respostas.map((resp: any) => (
                      <div key={resp.nome} className="flex items-center justify-between p-6 bg-white rounded-[2rem] border border-slate-100 group hover:border-indigo-300 shadow-sm hover:shadow-md transition-all">
                        <div className="flex items-center gap-5">
                          <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 font-black text-lg shadow-inner">
                            {resp.nome.charAt(0)}
                          </div>
                          <div>
                            <p className="text-sm font-black text-slate-800 uppercase tracking-tight">{resp.nome}</p>
                            <p className="text-[10px] text-slate-400 font-bold">{new Date(resp.respondidoEm).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => analisarRespostasAuditor(resp)} 
                            className="px-6 py-3 bg-slate-50 text-indigo-600 border border-indigo-100 rounded-xl text-[10px] font-black uppercase hover:bg-indigo-600 hover:text-white shadow-sm transition-all"
                          >
                            Auditar
                          </button>
                          <button 
                            onClick={() => baixarArquivoAuditor(resp.arquivo, resp.nome)} 
                            className="p-3 bg-slate-100 text-slate-400 rounded-xl hover:bg-slate-900 hover:text-white transition-all shadow-sm"
                          >
                            📥
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                       <p className="text-slate-400 text-xs font-black uppercase italic tracking-widest">Nenhuma resposta enviada ainda.</p>
                    </div>
                  )}
                </div>
              </section>
            </div>
          </div>
        </div>
      )}

      {/* SEÇÃO: HISTÓRICO (ATIVIDADES RECENTES) */}
      <div className="bg-slate-900 p-10 rounded-[4rem] text-white shadow-2xl relative overflow-hidden">
        <h3 className="text-2xl font-black uppercase italic mb-8 tracking-tighter">🕒 Atividades Recentes</h3>
        <div className="flex gap-5 overflow-x-auto pb-6 custom-scrollbar">
          {historico.map(proj => (
            <div key={proj.codigo} className="flex-shrink-0 w-72 bg-white/5 p-6 rounded-[2.5rem] border border-white/10 hover:border-indigo-500 transition-all">
              <p className="text-[10px] font-black uppercase text-indigo-400 mb-2">{proj.mesAno}</p>
              <h4 className="text-base font-bold truncate mb-6 text-slate-100">{proj.codigo}</h4>
              <button 
                onClick={() => handleGerenciar(proj.codigo)} 
                className="w-full py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase shadow-xl hover:bg-indigo-500 transition-all"
              >
                Gerenciar
              </button>
            </div>
          ))}
        </div>
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-600/10 blur-[100px] rounded-full -mr-40 -mt-40"></div>
      </div>

      {/* SEÇÃO: CRIAÇÃO DE NOVA AUDITORIA */}
      <div className="bg-white p-10 rounded-[4rem] border border-slate-100 shadow-sm space-y-10">
        <div className="flex justify-between items-center">
          <h2 className="text-3xl font-black italic uppercase text-slate-800 tracking-tighter">🚀 Nova Auditoria</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <FileCard title="Regras" subtitle="Relação Funcionario Questão e CPF" color="bg-orange-500" icon="⚖️" file={rulesFile} onFileChange={setRulesFile} />
          <FileCard title="Formulário" subtitle="Formulario com coluna de Respostas" color="bg-pink-500" icon="📄" file={senderFormFile} onFileChange={setSenderFormFile} />
          <FileCard title="Template" subtitle="Arquivos com TAG {resposta}" color="bg-indigo-600" icon="🎯" file={templateFile} onFileChange={setTemplateFile} />
        </div>
        <button 
          onClick={publicarAuditoria} 
          disabled={isPublishing} 
          className={`w-full py-8 rounded-[2.5rem] font-black uppercase text-sm shadow-2xl transition-all ${
            isPublishing 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-slate-900 text-white hover:bg-indigo-600 active:scale-95 hover:shadow-indigo-200'
          }`}
        >
          {isPublishing ? "📤 Sincronizando Bases..." : "🚀 Publicar Auditoria e Gerar Link"}
        </button>
      </div>
    </div>
  );
}