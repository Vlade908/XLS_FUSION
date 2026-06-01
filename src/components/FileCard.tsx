import React, { useState } from 'react';

interface FileCardProps {
  title: string;
  subtitle: string;
  icon: string;
  file: File | FileList | null;
  onFileChange: (file: any) => void;
  multiple?: boolean;
  color: string;
}

export const FileCard: React.FC<FileCardProps> = ({ title, subtitle, icon, file, onFileChange, multiple, color }) => {
  const [isOver, setIsOver] = useState(false);
  const handleAction = (files: FileList | null) => {
    console.log('📂 FileCard: handleAction called with files:', files ? Array.from(files).map(f => f.name) : null);
    if (!files || files.length === 0) return;
    onFileChange(multiple ? files : files[0]);
  };

  return (
    <div 
      data-testid="drop-zone"
      onDragOver={(e) => { e.preventDefault(); setIsOver(true); }}
      onDragLeave={() => setIsOver(false)}
      onDrop={(e) => { e.preventDefault(); setIsOver(false); handleAction(e.dataTransfer.files); }}
      className={`relative flex flex-col p-6 rounded-[2.5rem] border-2 transition-all duration-300 ${
        file ? 'border-emerald-500 bg-emerald-50/30 shadow-md' : 
        isOver ? 'border-indigo-500 bg-indigo-50 scale-[1.02]' : 'border-slate-200 bg-white hover:border-slate-300 shadow-sm'
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className={`w-12 h-12 rounded-2xl ${color} flex items-center justify-center text-2xl text-white shadow-lg`}>{icon}</div>
        <div className="flex items-center gap-2">
          {file && <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full uppercase tracking-tighter italic">Ativo</span>}
          {file && (
            <button
              type="button"
              aria-label="Remover arquivo"
              onClick={(e) => { e.stopPropagation(); onFileChange(null); }}
              className="text-slate-400 hover:text-rose-600 transition-colors p-1"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>
          )}
        </div>
      </div>
      <h3 className="font-bold text-slate-800 text-sm tracking-tight">{title}</h3>
      <p className="text-[10px] text-slate-400 font-medium leading-tight mb-4">{subtitle}</p>
      
      {file && !multiple && (
        <p className="text-[11px] text-slate-600 font-bold bg-slate-50 border border-slate-100 px-3 py-2 rounded-xl mb-4 truncate max-w-full">
          📄 {(file as File).name}
        </p>
      )}

      <div className="relative mt-auto">
        <input type="file" multiple={multiple} accept=".xlsx,.xls" onChange={(e) => handleAction(e.target.files)} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" />
        <button className={`w-full py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${file ? 'bg-emerald-500 text-white shadow-lg' : 'bg-slate-100 text-slate-500 hover:bg-slate-800 hover:text-white'}`}>
          {file ? (multiple ? `${(file as FileList).length} Itens` : 'Trocar') : 'Selecionar'}
        </button>
      </div>
    </div>
  );
};