import React from 'react';

export default function FiltrosView() {
  return (
    <div className="space-y-6 animate-in fade-in duration-700">
      <h2 className="text-3xl font-black text-slate-800 italic uppercase tracking-tighter">
        ⚡ Filtros Inteligentes
      </h2>
      <div className="p-10 bg-white rounded-[3rem] border border-slate-100 shadow-sm">
        <p className="text-slate-500 font-medium">
          Módulo de filtros em desenvolvimento. Aqui você poderá segmentar quesitos por status ou prioridade.
        </p>
      </div>
    </div>
  );
}