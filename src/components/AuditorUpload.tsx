import React, { useState } from 'react';

export default function AuditorUpload() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) setFile(e.target.files[0]);
  };

  const sendToServer = async () => {
    if (!file) return alert("Selecione um arquivo!");

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('workerName', 'Alisson'); // Poderia vir de um estado de login

    try {
      const response = await fetch('/api/upload-planilha', {
        // Verifique a barra /
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        alert("Planilha armazenada com sucesso no Firestore!");
        setFile(null);
      }
    } catch (error) {
      console.error("Erro no upload:", error);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 text-center">
      <div className="text-4xl mb-4">☁️</div>
      <h2 className="text-xl font-black text-slate-800 uppercase italic mb-6">Backup de Auditoria (GridFS)</h2>
      
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        onChange={handleFileChange}
        className="mb-6 block w-full text-sm text-slate-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-black file:bg-indigo-50 file:text-indigo-600 hover:file:bg-indigo-100"
      />

      <button
        onClick={sendToServer}
        disabled={uploading || !file}
        className={`w-full py-5 rounded-2xl font-black uppercase tracking-widest transition-all ${
          uploading ? 'bg-slate-200 text-slate-400' : 'bg-indigo-600 text-white hover:bg-indigo-700 shadow-lg shadow-indigo-200'
        }`}
      >
        {uploading ? 'Processando Fatias...' : 'Enviar para o Google Cloud'}
      </button>
    </div>
  );
}