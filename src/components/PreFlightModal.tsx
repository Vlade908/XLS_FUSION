/** @format */
import { useState, useMemo } from "react";
import { X, Search, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";

interface PreflightModalProps {
  isOpen: boolean;
  onClose: () => void;
  previewData: any[]; // { id, worker, value, type, row }
  onConfirm: () => void;
}

export function PreFlightModal({ isOpen, onClose, previewData, onConfirm }: PreflightModalProps) {
  const [filterResponder, setFilterResponder] = useState("");
  const [filterStatus, setFilterStatus] = useState("todos");

  // TI: Agrupamento por ID usando os campos corretos (worker e value)
  const groupedQuestions = useMemo(() => {
    const groups: Record<string, any[]> = {};
    previewData.forEach(item => {
      if (!groups[item.id]) groups[item.id] = [];
      groups[item.id].push(item);
    });
    return groups;
  }, [previewData]);

  const filteredIds = useMemo(() => {
    return Object.keys(groupedQuestions).filter(id => {
      const rows = groupedQuestions[id];
      const matchesResponder = filterResponder === "" || 
        rows.some(r => String(r.worker || "").toLowerCase().includes(filterResponder.toLowerCase()));
      
      const hasAnyAnswer = rows.some(r => r.value !== "" && r.value !== undefined && r.value !== null);
      
      const matchesStatus = filterStatus === "todos" 
        ? true 
        : filterStatus === "pendente" ? !hasAnyAnswer : hasAnyAnswer;

      return matchesResponder && matchesStatus;
    });
  }, [groupedQuestions, filterResponder, filterStatus]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-md z-[500] flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-300">
      <div className="bg-white w-full max-w-6xl h-[90vh] rounded-[3.5rem] shadow-2xl flex flex-col overflow-hidden border border-white/20">
        
        {/* HEADER ROBUSTO - FILTROS CORRIGIDOS */}
        <div className="bg-indigo-600 p-8 md:p-10 text-white relative">
          <button onClick={onClose} className="absolute top-8 right-8 p-3 hover:bg-white/10 rounded-full transition-all">
            <X size={28} />
          </button>
          
          <div className="space-y-6">
            <div>
              <h2 className="text-4xl font-black uppercase italic tracking-tighter leading-none">Cockpit de Auditoria</h2>
              <p className="text-indigo-100 text-xs font-bold mt-2 opacity-80 uppercase tracking-widest">Sincronização por Regras e CPF</p>
            </div>

            <div className="flex flex-wrap gap-4 items-end">
              <div className="flex-grow min-w-[250px] space-y-2">
                <label className="text-[10px] font-black uppercase ml-2 text-indigo-200">Filtrar Auditor</label>
                <div className="relative group">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-white transition-colors" size={18} />
                  <input 
                    type="text" 
                    value={filterResponder}
                    onChange={(e) => setFilterResponder(e.target.value)}
                    placeholder="Ex: Renata..."
                    className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-4 pl-12 outline-none focus:border-white focus:bg-white/20 font-bold transition-all placeholder:text-indigo-300"
                  />
                </div>
              </div>

              <div className="min-w-[200px] space-y-2">
                <label className="text-[10px] font-black uppercase ml-2 text-indigo-200">Status do Quesito</label>
                <select 
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full bg-white/10 border-2 border-white/10 rounded-2xl p-4 outline-none focus:border-white focus:bg-white/20 font-bold appearance-none cursor-pointer"
                >
                  <option value="todos" className="text-slate-900">Todos os Estados</option>
                  <option value="pendente" className="text-slate-900">🚨 Apenas Pendentes</option>
                  <option value="concluido" className="text-slate-900">✅ Apenas Respondidos</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* READER DE REVISÃO */}
        <div className="flex-grow overflow-y-auto p-6 md:p-10 bg-[#F8FAFC] custom-scrollbar">
          <div className="space-y-8">
            {filteredIds.map(id => {
              const rows = groupedQuestions[id];
              // TI: Verifica se o quesito inteiro tem pelo menos uma resposta
              const hasAnyAnswer = rows.some(r => r.value !== "" && r.value !== undefined && r.value !== null);
              const worker = rows[0].worker;

              return (
                <div key={id} className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm overflow-hidden hover:shadow-xl transition-all border-l-8 border-l-indigo-500 group">
                  <div className="bg-slate-900 p-5 px-8 flex justify-between items-center text-white">
                    <div className="flex items-center gap-4">
                      <span className="text-xl font-black italic tracking-tighter uppercase">Quesito {id}</span>
                      <div className="h-4 w-[1px] bg-white/20" />
                      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AUDITOR: {worker}</span>
                    </div>
                    {hasAnyAnswer ? (
                      <span className="flex items-center gap-2 text-emerald-400 text-[10px] font-black uppercase"><CheckCircle2 size={14}/> Resolvido</span>
                    ) : (
                      <span className="flex items-center gap-2 text-rose-400 text-[10px] font-black uppercase animate-pulse"><AlertCircle size={14}/> Pendente</span>
                    )}
                  </div>

                  <div className="p-0 overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-100 bg-slate-50/50">
                          <th className="p-4 px-8 text-[9px] font-black text-slate-400 uppercase">Linha</th>
                          <th className="p-4 text-[9px] font-black text-slate-400 uppercase">Tipo</th>
                          <th className="p-4 px-8 text-right text-[9px] font-black text-slate-400 uppercase">Valor em Memória</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-50">
                        {rows.map((row, rIdx) => {
                          const isSelectionType = ['sim/ nao', 'sim/ nao/ outro', 'alternativa'].includes(String(row.type).toLowerCase());
                          
                          return (
                            <tr key={rIdx} className="hover:bg-indigo-50/30 transition-colors">
                              <td className="p-4 px-8 font-black text-slate-400 text-xs">#{row.row}</td>
                              <td className="p-4">
                                <span className="bg-slate-100 text-slate-500 px-3 py-1 rounded-lg text-[9px] font-black uppercase">{row.type || 'geral'}</span>
                              </td>
                              <td className="p-4 px-8 text-right">
                                {row.value ? (
                                  <span className="text-slate-900 font-black text-sm bg-slate-50 px-4 py-2 rounded-xl inline-block border border-slate-200">
                                    {row.value}
                                  </span>
                                ) : (
                                  // TI: REGRA SOLICITADA - Se houver resposta no grupo E for tipo seleção, mostra como linha de opção (sem selo pendente)
                                  (hasAnyAnswer && isSelectionType) ? (
                                    <span className="text-slate-300 font-bold text-[9px] uppercase tracking-tighter">Opção não selecionada</span>
                                  ) : (
                                    <span className="text-rose-500 font-black text-[10px] uppercase italic bg-rose-50 px-3 py-1.5 rounded-lg border border-rose-100">
                                      [Pendente]
                                    </span>
                                  )
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FOOTER */}
        <div className="p-8 px-10 bg-white border-t border-slate-100 flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Resumo da Carga</span>
            <span className="text-sm font-black text-indigo-600 uppercase italic">Exibindo {filteredIds.length} quesitos filtrados</span>
          </div>
          <div className="flex gap-4">
            <button onClick={onClose} className="px-10 py-5 bg-slate-100 text-slate-500 rounded-full font-black uppercase text-[10px] hover:bg-slate-200 transition-all">Cancelar</button>
            <button 
              onClick={onConfirm}
              className="px-12 py-5 bg-indigo-600 text-white rounded-full font-black uppercase text-[10px] shadow-xl shadow-indigo-200 hover:bg-slate-900 transition-all active:scale-95 flex items-center gap-3"
            >
              Validar e Prosseguir <ChevronRight size={18} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}