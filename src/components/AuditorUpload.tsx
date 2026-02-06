import React, { useState, useEffect, useRef } from 'react';

export default function AuditorUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Inicia/Para o cronômetro baseado no estado de uploading
  useEffect(() => {
    if (uploading) {
      setSeconds(0);
      timerRef.current = setInterval(() => {
        setSeconds(prev => prev + 1);
      }, 1000);
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

  const sendToServer = () => {
    if (!file) return alert("Selecione um arquivo!");

    setUploading(true);
    setProgress(0);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('workerName', 'Alisson');

    // Usamos XMLHttpRequest para capturar o progresso real do upload
    const xhr = new XMLHttpRequest();

    xhr.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable) {
        const percentComplete = Math.round((event.loaded / event.total) * 100);
        setProgress(percentComplete);
      }
    });

    xhr.addEventListener("load", () => {
      setUploading(false);
      if (xhr.status === 200) {
        alert("Sucesso! Arquivo enviado.");
        setFile(null);
      } else {
        alert(`Erro: ${xhr.statusText || 'Falha na conexão com o banco'}`);
      }
    });

    xhr.addEventListener("error", () => {
      setUploading(false);
      alert("Erro de rede ou timeout no servidor.");
    });

    xhr.open("POST", "/api/upload-planilha");
    xhr.send(formData);
  };

  return (
    <div className="p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 text-center relative overflow-hidden">
      <div className="text-4xl mb-4">☁️</div>
      <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6">Backup de Auditoria (GridFS)</h2>
      
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        onChange={handleFileChange}
        className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
      />

      {/* Barra de Progresso Discreta */}
      {uploading && (
        <div className="mb-6">
          <div className="flex justify-between mb-2 px-2">
            <span className="text-[10px] font-black text-indigo-600 uppercase">Progresso: {progress}%</span>
            <span className="text-[10px] font-black text-slate-400 uppercase">Tempo: {seconds}s</span>
          </div>
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-indigo-500 to-emerald-400 transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      )}

      <button
        onClick={sendToServer}
        disabled={uploading || !file}
        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${
          uploading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
        }`}
      >
        {uploading ? (
           <span className="flex items-center justify-center gap-2">
             <span className="animate-spin text-lg">⏳</span> {seconds > 10 ? 'Conectando ao Atlas...' : 'Enviando...'}
           </span>
        ) : 'Enviar para Nuvem'}
      </button>

      {/* Feedback de arquivo selecionado */}
      {file && !uploading && (
        <p className="mt-4 text-[10px] text-slate-400 font-bold uppercase italic tracking-tighter">
          Pronto para enviar: {file.name}
        </p>
      )}
    </div>
  );
}