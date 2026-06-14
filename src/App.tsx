import { useState, useEffect } from 'react';
import ResponderView from './views/ResponderView';
import FormBuilderView from './views/FormBuilderView';
import NotificationsView from './views/NotificationsView';
import ShareView from './views/ShareView';
import WebResponderView from './views/WebResponderView';
import AuthView from './components/AuthView';
import { useAuth } from './context/AuthContext.tsx';

const routeTabs = ['builder', 'share', 'responder', 'notifications'] as const;
type TabType = (typeof routeTabs)[number] | 'share-form' | 'reset-password';

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
    if (hash.startsWith('reset-password')) {
      const token = hash.split('token=')[1] || '';
      return { tab: 'reset-password' as const, shareHash: token };
    }
    return {
      tab: routeTabs.includes(hash as any) ? (hash as (typeof routeTabs)[number]) : 'builder' as const,
      shareHash: null,
    };
  };

  const initialRoute = getRoute();
  const [activeTab, setActiveTab] = useState<TabType>(initialRoute.tab);
  const [shareHash, setShareHash] = useState<string | null>(initialRoute.shareHash);
  const { user, logout, loading } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // 2. Efeito para atualizar a URL sempre que a aba mudar
  useEffect(() => {
    if (activeTab === 'share' || activeTab === 'share-form') {
      if (!shareHash) {
        window.history.replaceState({}, '', `/${activeTab}`);
      }
    } else if (activeTab === 'reset-password') {
      // Mantém o hash intacto para não perder o token de redefinição
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
        setActiveTab('share-form');
        setShareHash(hash);
        return;
      }

      const hash = window.location.hash.replace('#', '');
      if (hash.startsWith('reset-password')) {
        const token = hash.split('token=')[1] || '';
        setActiveTab('reset-password');
        setShareHash(token);
        return;
      }

      if (routeTabs.includes(hash as any)) {
        setActiveTab(hash as (typeof routeTabs)[number]);
        setShareHash(null);
      } else if (!hash && activeTab !== 'builder') {
        setActiveTab('builder');
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

  const isImmersive = false;

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
    return <AuthView resetToken={activeTab === 'reset-password' ? (shareHash || '') : ''} />;
  }

  return (
    <div className="flex flex-col md:flex-row h-screen bg-[#F0F2F5] overflow-hidden font-sans">
      {/* Mobile Top Header */}
      <header className="md:hidden flex items-center justify-between bg-white px-6 py-4 border-b border-slate-200 shadow-sm z-30">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white font-black shadow-md text-sm">F</div>
          <h1 className="text-lg font-black text-slate-800 tracking-tighter">XLS <span className="text-indigo-600">FUSION</span></h1>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          aria-label="Menu"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
      </header>

      {/* Backdrop for Mobile Sidebar */}
      {isMobileMenuOpen && (
        <div 
          onClick={() => setIsMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/40 z-40 md:hidden transition-opacity duration-300"
        />
      )}

      <aside className={`fixed md:relative inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-slate-200 shadow-2xl transition-transform duration-300 md:translate-x-0 ${
        isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
      } ${isImmersive ? 'md:w-20' : 'md:w-72'}`}>
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
            { id: 'builder', icon: '🧩', label: 'Formulários' },
            { id: 'responder', icon: '📝', label: 'Responder' },
            { id: 'notifications', icon: '🔔', label: 'Notificações' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                window.location.hash = tab.id;
                setActiveTab(tab.id as any);
                setIsMobileMenuOpen(false); // Close menu on select
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
        <div className={isImmersive ? "" : "p-4 sm:p-6 md:p-10"}>
          {activeTab === 'builder' && <FormBuilderView />}
          {activeTab === 'responder' && <ResponderView />}
          {activeTab === 'notifications' && <NotificationsView />}
        </div>
      </main>
    </div>
  );
}