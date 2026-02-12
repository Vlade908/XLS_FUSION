/** @format */
import { useState, useMemo } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  previewData: any[]; // { id, worker, value, type, row }
}

export const PreFlightModal = ({ isOpen, onClose, onConfirm, previewData }: Props) => {
  const [filtroTrabalhador, setFiltroTrabalhador] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | 'respondidos' | 'pendentes'>('todos');

  const workers = useMemo(() => {
    const set = new Set<string>();
    previewData.forEach(item => { if (item.worker) set.add(item.worker); });
    return Array.from(set).sort();
  }, [previewData]);

  const filteredItems = useMemo(() => {
    return previewData.filter(item => {
      const matchWorker = filtroTrabalhador === 'todos' || item.worker === filtroTrabalhador;
      const isRespondido = item.value !== "" && item.value !== undefined && item.value !== null;
      let matchStatus = true;
      if (filtroStatus === 'respondidos') matchStatus = isRespondido;
      if (filtroStatus === 'pendentes') matchStatus = !isRespondido;
      return matchWorker && matchStatus;
    });
  }, [previewData, filtroTrabalhador, filtroStatus]);

  const grouped = useMemo(() => {
    return filteredItems.reduce((acc: any, curr: any) => {
      if (!acc[curr.id]) acc[curr.id] = [];
      acc[curr.id].push(curr);
      return acc;
    }, {});
  }, [filteredItems]);

  if (!isOpen) return null;

  const formatDisplayValue = (item: any) => {
    const val = item.value;
    const isCheckType = String(item.type).toLowerCase().includes("check");
    if (isCheckType) {
      const isMarked = val === 1 || val === "1" || val === true || String(val).toLowerCase() === "true" || val === "☑";
      return (
        <div className={`flex items-center justify-center gap-2 ${isMarked ? 'text-emerald-600' : 'text-slate-300'}`}>
          <span className="text-2xl font-black">{isMarked ? "☑" : "☐"}</span>
          <span className="text-[9px] font-black uppercase">{isMarked ? "Marcado" : "Não"}</span>
        </div>
      );
    }
    if (val === "" || val === undefined || val === null) {
      return <span className="text-rose-400 italic font-bold text-[10px] px-3 py-1 bg-rose-50 rounded-lg uppercase border border-rose-100">[Pendente]</span>;
    }
    return <span className="text-slate-700 font-bold text-sm bg-slate-50 px-3 py-1 rounded-lg border border-slate-100">{val}</span>;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/95 backdrop-blur-md z-[110] flex items-center justify-center p-4 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-7xl max-h-[95vh] rounded-[3.5rem] shadow-2xl overflow-hidden flex flex-col border border-white/10 font-sans">
        <div className="p-8 border-b border-slate-100 bg-indigo-600 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h2 className="text-3xl font-black tracking-tighter uppercase italic leading-none">Cockpit de Auditoria</h2>
              <p className="text-[10px] font-bold uppercase tracking-[0.3em] opacity-80 mt-2">Sincronização por Regras e CPF</p>
            </div>
            <div className="flex flex-wrap gap-3">
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase opacity-60 ml-2">Filtrar Respondente</span>
                <select value={filtroTrabalhador} onChange={(e) => setFiltroTrabalhador(e.target.value)} className="bg-white/10 border border-white/20 p-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:text-indigo-600 transition-all">
                  <option value="todos" className="text-slate-800">Todos os Auditores</option>
                  {workers.map(w => <option key={w} value={w} className="text-slate-800">{w}</option>)}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-[8px] font-black uppercase opacity-60 ml-2">Filtrar Status</span>
                <select value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value as any)} className="bg-white/10 border border-white/20 p-2.5 rounded-xl text-[10px] font-black uppercase outline-none focus:bg-white focus:text-indigo-600 transition-all">
                  <option value="todos" className="text-slate-800">Todos os Estados</option>
                  <option value="respondidos" className="text-slate-800">Apenas Respondidos</option>
                  <option value="pendentes" className="text-slate-800">Apenas Pendentes</option>
                </select>
              </div>
              <button onClick={onClose} className="w-12 h-12 flex items-center justify-center rounded-2xl bg-white/10 hover:bg-rose-500 transition-all font-bold text-xl ml-4">✕</button>
            </div>
          </div>
        </div>
        <div className="p-8 flex-grow overflow-y-auto bg-slate-50/50 space-y-8 custom-scrollbar">
          {Object.entries(grouped).length > 0 ? (
            Object.entries(grouped).map(([qId, items]: [string, any]) => (
              <div key={qId} className="bg-white border border-slate-200 rounded-[2.5rem] shadow-sm overflow-hidden animate-in slide-in-from-bottom-4 group hover:shadow-md transition-all">
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
                        <th className="pb-4 px-4 text-center">Valor na Memória</th>
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((item: any, i: number) => (
                        <tr key={i} className="text-xs border-b border-slate-50 hover:bg-indigo-50/30 transition-all group">
                          <td className="py-5 px-4 font-black text-slate-300">#{item.row}</td>
                          <td className="py-5 px-4">
                            <span className={`px-2 py-1 rounded text-[9px] font-bold uppercase ${item.type === 'check' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'}`}>
                              {item.type || 'geral'}
                            </span>
                          </td>
                          <td className="py-5 px-4 text-center bg-white/50 border-l border-slate-50 shadow-inner">{formatDisplayValue(item)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ))
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-4 opacity-30">
              <span className="text-6xl">🔍</span>
              <p className="font-black uppercase text-xs tracking-widest">Nenhum dado encontrado</p>
            </div>
          )}
        </div>
        <div className="p-8 border-t bg-white flex justify-between items-center shadow-inner">
          <p className="text-[10px] font-black text-slate-400 uppercase italic">Exibindo {filteredItems.length} registros</p>
          <button onClick={onConfirm} className="px-14 py-5 bg-indigo-600 text-white rounded-3xl font-black uppercase text-[10px] tracking-[0.2em] shadow-xl hover:bg-slate-900 active:scale-95 transition-all">Validar e Prosseguir 🚀</button>
        </div>
      </div>
    </div>
  );
};