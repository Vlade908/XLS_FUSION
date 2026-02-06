import React, { useState, useEffect, useRef } from 'react';

export default function FiltrosView() {
  const [busca, setBusca] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (uploading) {
      setSeconds(0);
      timerRef.current = setInterval(() => setSeconds(prev => prev + 1), 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [uploading]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFile(e.target.files[0]);
      setProgress(0);
    }
  };

  const sendToCloud = () => {
    if (!file) return alert("Selecione um arquivo!");
    setUploading(true);
    
    // Simulação visual de progresso para feedback imediato
    let p = 0;
    const interval = setInterval(() => {
      p += 5;
      if (p <= 90) setProgress(p);
      else clearInterval(interval);
    }, 100);

    const formData = new FormData();
    formData.append('file', file);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload-planilha");
    xhr.onload = () => {
      clearInterval(interval);
      setProgress(100);
      setUploading(false);
      alert("Operação concluída!");
      setFile(null);
    };
    xhr.onerror = () => {
      clearInterval(interval);
      setUploading(false);
      alert("Erro na comunicação com o servidor.");
    };
    xhr.send(formData);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Cabeçalho Adaptável */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <div>
            <h1 className="text-2xl font-black text-slate-800 italic uppercase">Dashboard Auditoria</h1>
            <p className="text-slate-500 text-sm font-medium">Controle de fluxos e backups</p>
          </div>
          <div className="flex items-center gap-2 bg-indigo-50 px-4 py-2 rounded-2xl border border-indigo-100">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-black text-indigo-700 uppercase tracking-tighter">Servidor Ativo</span>
          </div>
        </header>

        {/* Grid Principal: 1 col em mobile/notbook pequeno, 2 col em telas largas */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Coluna de Filtros (Ocupa 2/3 em telas grandes) */}
          <section className="lg:col-span-2 space-y-6">
            <div className="bg-white p-6 rounded-[2.5rem] shadow-xl border border-slate-100 h-full">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Busca Avançada</h2>
              <div className="relative">
                <input 
                  type="text" 
                  placeholder="Pesquisar registros..."
                  className="w-full p-4 pl-12 rounded-2xl bg-slate-50 border-none shadow-inner focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <span className="absolute left-4 top-1/2 -translate-y-1/2 opacity-30 text-xl">🔍</span>
              </div>
              <div className="mt-8 overflow-x-auto">
                 {/* Placeholder para a tabela - o overflow-x-auto é o que salva o 1366x768 */}
                 <div className="min-w-[600px] p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-200 text-center text-slate-400 text-sm font-bold uppercase italic">
                   A listagem de auditorias aparecerá aqui
                 </div>
              </div>
            </div>
          </section>

          {/* Coluna de Backup (Ocupa 1/3) */}
          <section className="space-y-6">
            <div className="bg-indigo-600 p-8 rounded-[2.5rem] shadow-2xl shadow-indigo-200 text-white relative overflow-hidden">
              {/* Círculos decorativos para dar um ar moderno */}
              <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-3xl"></div>
              
              <h2 className="text-xl font-black uppercase italic leading-tight mb-4 flex items-center gap-2">
                <span className="text-2xl">☁️</span> Backup Cloud
              </h2>
              
              <div className="bg-white/10 p-4 rounded-2xl mb-6 backdrop-blur-sm border border-white/10">
                <input 
                  type="file" 
                  accept=".xlsx, .xls" 
                  onChange={handleFileChange}
                  className="w-full text-xs text-indigo-100 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-white file:text-indigo-600 hover:file:bg-indigo-50 cursor-pointer"
                />
              </div>

              {uploading && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                    <span>Progresso: {progress}%</span>
                    <span>{seconds}s</span>
                  </div>
                  <div className="w-full bg-indigo-900/50 h-2 rounded-full overflow-hidden border border-white/5">
                    <div 
                      className="h-full bg-emerald-400 transition-all duration-300 shadow-[0_0_10px_#34d399]"
                      style={{ width: `${progress}%` }}
                    ></div>
                  </div>
                </div>
              )}

              <button
                onClick={sendToCloud}
                disabled={uploading || !file}
                className={`w-full py-4 rounded-2xl font-black uppercase text-xs tracking-[0.15em] transition-all shadow-lg ${
                  uploading 
                    ? 'bg-indigo-400/50 text-indigo-200 cursor-not-allowed animate-pulse' 
                    : 'bg-white text-indigo-700 hover:bg-slate-50 hover:scale-[1.02] active:scale-95'
                }`}
              >
                {uploading ? 'Processando...' : '🚀 Enviar Agora'}
              </button>
            </div>

            {/* Card informativo secundário */}
            <div className="bg-white p-6 rounded-[2rem] border border-slate-200 shadow-sm">
              <h3 className="text-[10px] font-black text-slate-400 uppercase mb-2">Status do Backup</h3>
              <p className="text-xs text-slate-600 leading-relaxed italic">
                Aguardando envio para o <span className="text-indigo-600 font-bold">Cloud Storage</span> da prefeitura.
              </p>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}