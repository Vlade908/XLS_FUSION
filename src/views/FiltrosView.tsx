import React, { useState, useEffect, useRef } from 'react';

// --- COMPONENTE DE FILTROS + UPLOAD INTEGRADO ---
export default function FiltrosView() {
  // Estados do Filtro (Exemplos)
  const [busca, setBusca] = useState('');
  
  // Estados do Upload (O que era o AuditorUpload)
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Cronômetro para o upload
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
    setProgress(0);

   const formData = new FormData();
formData.append('file', file);
formData.append('workerName', 'Nome Do Auditor Real'); // Aqui você pega de um estado (state)

    // Adicione isso para "forçar" a barra a subir devagar e te dar feedback visual
  let fakeProgress = 0;
  const interval = setInterval(() => {
    fakeProgress += 5;
    if (fakeProgress <= 90) setProgress(fakeProgress); // Vai até 90% e espera o servidor
    else clearInterval(interval);
  }, 100);

    const xhr = new XMLHttpRequest();
    
    // Monitor de Progresso Real
    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        setProgress(Math.round((event.loaded / event.total) * 100));
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      if (xhr.status === 200) {
        alert("✅ SUCESSO: Planilha fatiada e salva no MongoDB Atlas!");
        setFile(null);
      } else {
        alert(`❌ ERRO: ${xhr.responseText || 'Falha na conexão'}`);
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      alert("Erro crítico de rede.");
    });

    xhr.open("POST", "/api/upload-planilha");
    // Timeout de segurança no front para não travar a aba
    xhr.timeout = 60000; 
    xhr.send(formData);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8">
      {/* SEÇÃO DE FILTROS EXISTENTE */}
      <section className="bg-slate-50 p-8 rounded-[2rem] border border-slate-200">
        <h2 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-4">Painel de Filtros</h2>
        <input 
          type="text" 
          placeholder="Buscar auditoria por nome ou ID..."
          className="w-full p-4 rounded-xl border-none shadow-inner bg-white text-slate-700 focus:ring-2 focus:ring-indigo-500"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
      </section>

      {/* SEÇÃO DE UPLOAD (INTEGRADA AQUI) */}
      <section className="grid md:grid-cols-2 gap-8 items-center bg-indigo-900 p-10 rounded-[3rem] shadow-2xl text-white">
        <div>
          <h2 className="text-3xl font-black uppercase italic leading-none mb-2">
            Backup em Nuvem
          </h2>
          <p className="text-indigo-200 text-sm font-medium">
            Envie a planilha respondida para o banco de dados da prefeitura (Firestore/Atlas).
          </p>
        </div>

        <div className="bg-white p-6 rounded-[2rem] text-slate-800 shadow-xl">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileChange}
            className="mb-4 block w-full text-xs text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-[10px] file:font-black file:bg-indigo-50 file:text-indigo-600"
          />

          {/* Barra de Progresso e Tempo */}
          {uploading && (
            <div className="mb-4">
              <div className="flex justify-between text-[9px] font-black uppercase mb-1">
                <span className="text-indigo-600">Enviando: {progress}%</span>
                <span className="text-slate-400">Tempo: {seconds}s</span>
              </div>
              <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-indigo-500 transition-all duration-300"
                  style={{ width: `${progress}%` }}
                ></div>
              </div>
            </div>
          )}

          <button
            onClick={sendToCloud}
            disabled={uploading || !file}
            className={`w-full py-4 rounded-xl font-black uppercase text-xs tracking-widest transition-all ${
              uploading 
                ? 'bg-slate-100 text-slate-400 animate-pulse' 
                : 'bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95'
            }`}
          >
            {uploading ? `Processando (${seconds}s)...` : '🚀 Enviar Agora'}
          </button>
        </div>
      </section>

      {/* AQUI CONTINUARIA O RESTO DA SUA FILTROSVIEW */}
    </div>
  );
}