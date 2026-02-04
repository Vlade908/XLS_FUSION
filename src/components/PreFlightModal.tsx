import React from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: any[];
}

export const PreFlightModal = ({ isOpen, onClose, onConfirm, previewData }: Props) => {
  if (!isOpen) return null;

  const grouped = previewData.reduce((acc: any, curr: any) => {
    if (!acc[curr.id]) acc[curr.id] = [];
    acc[curr.id].push(curr);
    return acc;
  }, {});

  const formatDisplayValue = (item: any) => {
    const val = item.value;
    const isCheckType = String(item.type).toLowerCase().includes("check");

    // LÓGICA: SÓ MOSTRA ÍCONE SE O TIPO FOR 'CHECK'
    if (isCheckType) {
      if (val === 1 || val === "1" || val === true || String(val).toLowerCase() === "true" || val === "☑") {
        return (
          <div className="flex items-center justify-center gap-2 text-emerald-600 animate-in zoom-in">
            <span className="text-2xl font-black">☑</span>
            <span className="text-[9px] font-black uppercase tracking-tighter">Marcado</span>
          </div>
        );
      }
      // Considera 0 ou Vazio em Checkbox como desmarcado
      return (
        <div className="flex items-center justify-center gap-2 text-slate-300">
          <span className="text-2xl font-black">☐</span>
          <span className="text-[9px] font-black uppercase tracking-tighter">Não</span>
        </div>
      );
    }

    // SE NÃO FOR CHECK, TRATA COMO TEXTO/NÚMERO NORMAL
    if (val === "" || val === undefined || val === null) {
      return <span className="text-rose-400 italic font-bold text-[10px] px-3 py-1 bg-rose-50 rounded-lg uppercase">[Pendente]</span>;
    }

    return <span className="text-slate-700 font-bold text-sm">{val}</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-white w-full max-w-7xl max-h-[90vh] rounded-[3rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 font-sans">
        
        <div className="p-8 border-b border-slate-100 flex justify-between items-center bg-indigo-600 text-white shadow-lg">
          <div>
            <h2 className="text-2xl font-black tracking-tighter uppercase italic leading-none text-white">Auditoria de Injeção</h2>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] opacity-80 mt-1">Diferenciando Checkboxes de Dados Numéricos</p>
          </div>
          <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/20 hover:bg-rose-500 transition-all font-bold text-xl text-white">✕</button>
        </div>

        <div className="p-8 flex-grow overflow-y-auto bg-slate-50 space-y-8 custom-scrollbar">
          {Object.entries(grouped).map(([qId, items]: [string, any]) => (
            <div key={qId} className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4">
              <div className="bg-slate-900 p-4 px-8 flex justify-between items-center">
                <span className="text-indigo-400 font-black uppercase tracking-tighter italic">Quesito {qId}</span>
                <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">Responsável: <span className="text-white">{items[0].worker}</span></span>
              </div>

              <div className="p-6 overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-[10px] font-black text-slate-400 uppercase border-b border-slate-100">
                      <th className="pb-4 px-4 w-24">Linha</th>
                      <th className="pb-4 px-4">Tipo de Campo</th>
                      <th className="pb-4 px-4 text-center">Resultado Injetado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item: any, i: number) => (
                      <tr key={i} className="text-xs border-b border-slate-50 hover:bg-slate-50 transition-all group">
                        <td className="py-5 px-4 font-black text-slate-300">#{item.row}</td>
                        <td className="py-5 px-4">
                          <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${item.type === 'check' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                            {item.type || 'geral'}
                          </span>
                        </td>
                        <td className="py-5 px-4 text-center bg-white border-l border-slate-50 shadow-inner">
                          {formatDisplayValue(item)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          ))}
        </div>

        <div className="p-8 border-t bg-white flex justify-end gap-4 shadow-inner">
          <button onClick={onConfirm} className="px-14 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-indigo-700 active:scale-95">Gerar XLSX Final 🚀</button>
        </div>
      </div>
    </div>
  );
};