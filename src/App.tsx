import React, { useState } from 'react';
import PreparationView from './views/PreparationView';
import FiltrosView from './views/FiltrosView';
import ResponderView from './views/ResponderView';
import ConsolidationView from './views/ConsolidationView';

export default function App() {
  const [activeTab, setActiveTab] = useState('preparacao');
  
  // Estados Globais de Arquivos
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [senderFormFile, setSenderFormFile] = useState<File | null>(null);
  const [baseFile, setBaseFile] = useState<File | null>(null); // Adicionado
  const [employeeFiles, setEmployeeFiles] = useState<FileList | null>(null); // Adicionado
  const [workerColors, setWorkerColors] = useState<Record<string, string>>({});

  const isImmersive = activeTab === 'responder';

  // Lógica de Importar/Exportar JSON de Cores
  const handleExportColors = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(workerColors));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", "cores_funcionarios.json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
  };

  const handleImportColors = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setWorkerColors(json);
      } catch (err) {
        alert("Erro ao importar JSON.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden font-sans">
      <aside className={`transition-all duration-700 ease-in-out border-r border-slate-200 bg-white flex flex-col z-50 shadow-2xl ${isImmersive ? 'w-20' : 'w-72'}`}>
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black shadow-lg">F</div>
          {!isImmersive && <h1 className="text-xl font-black text-slate-800 tracking-tighter">XLS <span className="text-indigo-600">FUSION</span></h1>}
        </div>

        <nav className="flex-grow p-4 space-y-3">
          {[
            { id: 'preparacao', icon: '🎨', label: 'Preparação' },
            { id: 'filtros', icon: '⚡', label: 'Filtros' },
            { id: 'responder', icon: '📝', label: 'Responder' },
            { id: 'consolidar', icon: '📊', label: 'Consolidar' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full flex items-center transition-all duration-500 rounded-2xl ${
                activeTab === tab.id ? 'bg-slate-900 text-white shadow-xl' : 'text-slate-400 hover:bg-slate-50'
              } ${isImmersive ? 'p-4 justify-center' : 'p-4 gap-4'}`}
            >
              <span className="text-xl">{tab.icon}</span>
              {!isImmersive && <span className="font-bold text-[11px] uppercase tracking-widest">{tab.label}</span>}
            </button>
          ))}
        </nav>
      </aside>

      <main className="flex-grow overflow-y-auto relative">
        <div className={isImmersive ? "" : "p-10"}>
          {activeTab === 'preparacao' && (
            <PreparationView 
              rulesFile={rulesFile} setRulesFile={setRulesFile}
              senderFormFile={senderFormFile} setSenderFormFile={setSenderFormFile}
              workerColors={workerColors} setWorkerColors={setWorkerColors}
              onExport={handleExportColors} onImport={handleImportColors}
            />
          )}
          {activeTab === 'filtros' && <FiltrosView />}
          {activeTab === 'responder' && <ResponderView />}
          {activeTab === 'consolidar' && (
            <ConsolidationView 
              baseFile={baseFile} setBaseFile={setBaseFile}
              rulesFile={rulesFile} setRulesFile={setRulesFile}
              employeeFiles={employeeFiles} setEmployeeFiles={setEmployeeFiles}
              workerColors={workerColors}
            />
          )}
        </div>
      </main>
    </div>
  );
}