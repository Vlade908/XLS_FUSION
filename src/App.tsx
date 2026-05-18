import React, { useState, useEffect } from 'react';
import PreparationView from './views/PreparationView';
import FiltrosView from './views/FiltrosView';
import ResponderView from './views/ResponderView';
import ConsolidationView from './views/ConsolidationView';
import FormBuilderView from './views/FormBuilderView';
import NotificationsView from './views/NotificationsView';
import ShareView from './views/ShareView';
import WebResponderView from './views/WebResponderView';
import AuthView from './components/AuthView';
import { useAuth } from './context/AuthContext.tsx';

const routeTabs = ['preparacao', 'builder', 'share', 'filtros', 'responder', 'notifications', 'consolidar'];

export default function App() {
  const getRoute = () => {
    const pathname = window.location.pathname;
    if (pathname.startsWith('/share/')) {
      const hash = pathname.split('/share/')[1] || '';
      return { tab: 'share' as const, shareHash: hash };
    }
    if (pathname.startsWith('/share-form/')) {
      const hash = pathname.split('/share-form/')[1] || '';
      return { tab: 'share-form' as const, shareHash: hash };
    }
    const hash = window.location.hash.replace('#', '');
    return {
      tab: routeTabs.includes(hash) ? (hash as typeof routeTabs[number]) : 'preparacao' as const,
      shareHash: null,
    };
  };

  const initialRoute = getRoute();
  const [activeTab, setActiveTab] = useState<typeof routeTabs[number]>(initialRoute.tab);
  const [shareHash, setShareHash] = useState<string | null>(initialRoute.shareHash);
  const [rulesFile, setRulesFile] = useState<File | null>(null);
  const [senderFormFile, setSenderFormFile] = useState<File | null>(null);
  const [baseFile, setBaseFile] = useState<File | null>(null);
  const [employeeFiles, setEmployeeFiles] = useState<FileList | null>(null);
  const [workerColors, setWorkerColors] = useState<Record<string, string>>({});
  const { user, logout, loading } = useAuth();

  // 2. Efeito para atualizar a URL sempre que a aba mudar
  useEffect(() => {
    if (activeTab === 'share' || activeTab === 'share-form') {
      if (!shareHash) {
        window.history.replaceState({}, '', `/${activeTab}`);
      }
    } else {
      window.location.hash = activeTab;
    }
  }, [activeTab, shareHash]);

  // 3. Efeito para detectar alterações de rota do navegador
  useEffect(() => {
    const handleLocationChange = () => {
      const pathname = window.location.pathname;
      if (pathname.startsWith('/share/')) {
        const hash = pathname.split('/share/')[1] || '';
        setActiveTab('share');
        setShareHash(hash);
        return;
      }
      if (pathname.startsWith('/share-form/')) {
        const hash = pathname.split('/share-form/')[1] || '';
        setActiveTab('share-form' as any);
        setShareHash(hash);
        return;
      }

      const hash = window.location.hash.replace('#', '');
      if (routeTabs.includes(hash)) {
        setActiveTab(hash as typeof routeTabs[number]);
        setShareHash(null);
      } else if (!hash && activeTab !== 'preparacao') {
        setActiveTab('preparacao');
        setShareHash(null);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);
    return () => {
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, [activeTab]);

  const isImmersive = activeTab === 'responder';

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
      } catch (err) { alert("Erro ao importar JSON."); }
    };
    reader.readAsText(file);
  };

  if (activeTab === 'share') {
    return <ShareView shareHash={shareHash} />;
  }

  if (activeTab === 'share-form' && shareHash) {
    return <WebResponderView formId={shareHash} />;
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] text-slate-500">
        Carregando sessão...
      </div>
    );
  }

  if (!user) {
    return <AuthView />;
  }

  return (
    <div className="flex h-screen bg-[#F0F2F5] overflow-hidden font-sans">
        <aside className={`transition-all duration-700 ease-in-out border-r border-slate-200 bg-white flex flex-col z-50 shadow-2xl ${isImmersive ? 'w-20' : 'w-72'}`}>
          <div className="p-6 flex items-center gap-3 justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex-shrink-0 flex items-center justify-center text-white font-black shadow-lg">F</div>
              {!isImmersive && <h1 className="text-xl font-black text-slate-800 tracking-tighter">XLS <span className="text-indigo-600">FUSION</span></h1>}
            </div>
            {!isImmersive && (
              <button onClick={logout} className="rounded-2xl bg-slate-900 px-4 py-2 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800">
                Sair
              </button>
            )}
          </div>

          <nav className="flex-grow p-4 space-y-3">
            {[
              { id: 'preparacao', icon: '🎨', label: 'Preparação' },
              { id: 'builder', icon: '🧩', label: 'Formulários' },
              { id: 'filtros', icon: '⚡', label: 'Filtros' },
              { id: 'responder', icon: '📝', label: 'Responder' },
              { id: 'notifications', icon: '🔔', label: 'Notificações' },
              { id: 'consolidar', icon: '📊', label: 'Consolidar' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => {
                  window.location.hash = tab.id;
                  setActiveTab(tab.id as any);
                }}
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
            {activeTab === 'share' && <ShareView shareHash={shareHash} />}
            {activeTab === 'builder' && <FormBuilderView />}
            {activeTab === 'filtros' && <FiltrosView />}
            {activeTab === 'responder' && <ResponderView />}
            {activeTab === 'notifications' && <NotificationsView />}
            {activeTab === 'consolidar' && (
              <ConsolidationView 
                baseFile={baseFile} setBaseFile={setBaseFile}
                employeeFiles={employeeFiles} setEmployeeFiles={setEmployeeFiles}
                workerColors={workerColors}
              />
            )}
          </div>
        </main>
      </div>
  );
}