import { useState, useEffect } from 'react';
import { playNotificationSound } from './utils/sound';
import ResponderView from './views/ResponderView';
import FormBuilderView from './views/FormBuilderView';
import NotificationsView from './views/NotificationsView';
import ShareView from './views/ShareView';
import WebResponderView from './views/WebResponderView';
import AuthView from './components/AuthView';
import { useAuth } from './context/AuthContext.tsx';
import { Bell, Menu, FileSpreadsheet, PenTool, User, LogOut, Key, FileText, Sun, Moon } from 'lucide-react';
import * as Popover from '@radix-ui/react-popover';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { motion } from 'framer-motion';
import SettingsView from './views/SettingsView';

const routeTabs = ['builder', 'share', 'responder', 'notifications', 'settings'] as const;
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
  const { user, logout, loading, authFetch } = useAuth();
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [recentNotifications, setRecentNotifications] = useState<any[]>([]);

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const fetchRecentNotifications = async () => {
    try {
      const res = await authFetch('/api/notifications');
      if (res.ok) {
        const data = await res.json();
        setRecentNotifications((Array.isArray(data) ? data : []).slice(0, 5));
      }
    } catch (err) {
      console.error('Erro ao buscar notificações recentes:', err);
    }
  };

  const handleClearNotifications = async () => {
    try {
      await authFetch('/api/notifications/mark-read', { method: 'POST' });
      setUnreadCount(0);
      setRecentNotifications((prev) => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error('Erro ao limpar notificações:', err);
    }
  };

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

  // Poll unread notifications count
  useEffect(() => {
    if (!user) {
      setUnreadCount(0);
      return;
    }

    const fetchUnreadCount = async (shouldPlaySound = true) => {
      try {
        const res = await authFetch('/api/notifications/unread-count');
        if (res.ok) {
          const data = await res.json();
          const newCount = typeof data.count === 'number' ? data.count : 0;
          
          setUnreadCount((prev) => {
            if (shouldPlaySound && newCount > prev) {
              playNotificationSound();
            }
            return newCount;
          });
        }
      } catch (err) {
        console.error('Erro ao buscar contagem de notificações não lidas:', err);
      }
    };

    // Initial load (don't play sound to avoid noise on page load/refresh)
    fetchUnreadCount(false);
    fetchRecentNotifications();

    // Poll every 10 seconds
    const interval = setInterval(() => {
      fetchUnreadCount(true);
    }, 10000);

    return () => clearInterval(interval);
  }, [user, authFetch]);

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
    <div className="flex flex-col h-screen bg-[#F8FAFC] dark:bg-[#030712] overflow-hidden font-sans relative transition-colors duration-300">
      {/* Decorative blurred background shapes */}
      <div className="absolute top-[-10%] left-[-10%] w-[40vw] h-[40vw] rounded-full bg-gradient-to-tr from-indigo-300/10 to-violet-300/10 dark:from-indigo-500/5 dark:to-violet-500/5 blur-3xl pointer-events-none -z-20" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[35vw] h-[35vw] rounded-full bg-gradient-to-tr from-purple-300/10 to-pink-300/10 dark:from-purple-500/5 dark:to-pink-500/5 blur-3xl pointer-events-none -z-20" />

      {/* Global Top Header */}
      <header className="w-full h-16 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-900 px-6 flex items-center justify-between z-45 relative shadow-sm flex-shrink-0 transition-colors duration-300">
        {/* Left: Brand Logo & Hamburger */}
        <div className="flex items-center gap-3.5">
          <button 
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition-colors"
            aria-label="Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center text-white font-black shadow-md font-outfit text-base">F</div>
            <h1 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tighter font-outfit select-none">
              XLS <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">FUSION</span>
            </h1>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition-all duration-200 border border-slate-200/60 shadow-sm flex items-center justify-center relative w-9 h-9 overflow-hidden"
            aria-label="Toggle Theme"
          >
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 90 : 0, scale: theme === 'dark' ? 0 : 1 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute flex items-center justify-center"
            >
              <Sun className="w-4.5 h-4.5" />
            </motion.div>
            <motion.div
              initial={false}
              animate={{ rotate: theme === 'dark' ? 0 : -90, scale: theme === 'dark' ? 1 : 0 }}
              transition={{ duration: 0.2, ease: 'easeInOut' }}
              className="absolute flex items-center justify-center"
            >
              <Moon className="w-4.5 h-4.5" />
            </motion.div>
          </button>

          {/* Notifications Popover */}
          <Popover.Root onOpenChange={(open) => open && fetchRecentNotifications()}>
            <Popover.Trigger asChild>
              <button className="p-2.5 bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 dark:border-slate-800 text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 rounded-xl transition-all duration-200 relative border border-slate-200/60 shadow-sm flex items-center justify-center">
                <Bell className="w-4.5 h-4.5" />
                {unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-rose-500 px-1 text-[8px] font-black text-white ring-2 ring-white dark:ring-slate-950 animate-bounce">
                    {unreadCount}
                  </span>
                )}
              </button>
            </Popover.Trigger>
            <Popover.Portal>
              <Popover.Content 
                align="end" 
                sideOffset={8}
                className="z-50 w-80 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xl p-4 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-900 mb-3">
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-200">Notificações</h4>
                  {unreadCount > 0 && (
                    <button 
                      onClick={handleClearNotifications}
                      className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-305 transition-colors uppercase tracking-wider"
                    >
                      Limpar
                    </button>
                  )}
                </div>
                
                <div className="max-h-64 overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                  {recentNotifications.length === 0 ? (
                    <p className="text-center text-xs text-slate-400 dark:text-slate-500 py-6">Nenhuma notificação recente.</p>
                  ) : (
                    recentNotifications.map((n) => (
                      <div key={n._id} className="text-xs flex gap-2.5 items-start p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-800">
                        <span className="p-1.5 bg-slate-105/85 dark:bg-slate-900 rounded-lg text-slate-600 dark:text-slate-400 shrink-0 flex items-center justify-center">
                          {n.type === 'access_request' ? (
                            <Key className="w-3.5 h-3.5" />
                          ) : (
                            <FileText className="w-3.5 h-3.5" />
                          )}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-slate-800 dark:text-slate-200 leading-tight break-words">{n.message}</p>
                          <span className="text-[9px] text-slate-400 dark:text-slate-500 block mt-1">
                            {new Date(n.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                
                <div className="pt-3 border-t border-slate-100 dark:border-slate-900 mt-3 flex justify-center">
                  <button
                    onClick={() => {
                      setActiveTab('notifications');
                      window.location.hash = 'notifications';
                    }}
                    className="text-xs font-black text-center text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors uppercase tracking-widest block w-full py-2 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl"
                  >
                    Ver Central Completa
                  </button>
                </div>
                <Popover.Arrow className="fill-white dark:fill-slate-950" />
              </Popover.Content>
            </Popover.Portal>
          </Popover.Root>

          {/* User Avatar Dropdown */}
          <DropdownMenu.Root>
            <DropdownMenu.Trigger asChild>
              <button className="flex items-center justify-center h-9 w-9 rounded-xl hover:scale-105 active:scale-95 transition-all duration-300 ring-2 ring-white dark:ring-slate-900 shadow-md focus:outline-none relative overflow-hidden bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500">
                {user?.avatarUrl ? (
                  <img 
                    src={user.avatarUrl} 
                    alt="Avatar" 
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-white font-black text-xs font-outfit uppercase select-none">
                    {user?.name ? user.name.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : 'US')}
                  </span>
                )}
              </button>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
              <DropdownMenu.Content 
                align="end" 
                sideOffset={8}
                className="z-50 w-64 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-850 shadow-2xl p-2 focus:outline-none animate-in fade-in slide-in-from-top-2 duration-200"
              >
                <div className="px-3 py-2.5 border-b border-slate-100 dark:border-slate-900 mb-1.5 flex items-center gap-2.5">
                  <div className="h-8 w-8 rounded-xl shrink-0 overflow-hidden relative bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center ring-1 ring-slate-100 dark:ring-slate-900">
                    {user?.avatarUrl ? (
                      <img 
                        src={user.avatarUrl} 
                        alt="Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-white font-black text-[10px] font-outfit uppercase select-none">
                        {user?.name ? user.name.slice(0, 2) : (user?.email ? user.email.slice(0, 2) : 'US')}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[8px] font-black uppercase tracking-widest text-slate-450 dark:text-slate-500">Usuário Logado</p>
                    <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate mt-0.5">{user?.name || 'Sem nome'}</p>
                    <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
                  </div>
                </div>
                
                <DropdownMenu.Item 
                  onClick={() => {
                    setActiveTab('builder');
                    window.location.hash = 'builder';
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-650 dark:hover:text-indigo-400 font-bold hover:bg-slate-55 dark:hover:bg-slate-900 rounded-xl cursor-pointer transition-colors focus:outline-none"
                >
                  <FileSpreadsheet className="w-4 h-4 text-slate-450 dark:text-slate-500" /> Meus Formulários
                </DropdownMenu.Item>
                
                <DropdownMenu.Item 
                  onClick={() => {
                    setActiveTab('responder');
                    window.location.hash = 'responder';
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-655 dark:hover:text-indigo-400 font-bold hover:bg-slate-55 dark:hover:bg-slate-900 rounded-xl cursor-pointer transition-colors focus:outline-none"
                >
                  <PenTool className="w-4 h-4 text-slate-450 dark:text-slate-500" /> Responder Formulário
                </DropdownMenu.Item>

                <DropdownMenu.Item 
                  onClick={() => {
                    setActiveTab('notifications');
                    window.location.hash = 'notifications';
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-655 dark:hover:text-indigo-400 font-bold hover:bg-slate-55 dark:hover:bg-slate-900 rounded-xl cursor-pointer transition-colors focus:outline-none"
                >
                  <Bell className="w-4 h-4 text-slate-450 dark:text-slate-500" /> Central de Notificações
                </DropdownMenu.Item>

                <DropdownMenu.Item 
                  onClick={() => {
                    setActiveTab('settings');
                    window.location.hash = 'settings';
                  }}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-700 dark:text-slate-300 hover:text-indigo-655 dark:hover:text-indigo-400 font-bold hover:bg-slate-55 dark:hover:bg-slate-900 rounded-xl cursor-pointer transition-colors focus:outline-none"
                >
                  <User className="w-4 h-4 text-slate-455 dark:text-slate-500" /> Minha Conta
                </DropdownMenu.Item>
                
                <DropdownMenu.Separator className="h-[1px] bg-slate-100 dark:bg-slate-900 my-1.5" />
                
                <DropdownMenu.Item 
                  onClick={logout}
                  className="flex items-center gap-2.5 px-3 py-2 text-xs text-rose-600 hover:text-rose-750 dark:hover:text-rose-450 font-black hover:bg-rose-50/50 dark:hover:bg-rose-950/20 rounded-xl cursor-pointer transition-colors focus:outline-none"
                >
                  <LogOut className="w-4 h-4 text-rose-500" /> Sair da Conta
                </DropdownMenu.Item>
              </DropdownMenu.Content>
            </DropdownMenu.Portal>
          </DropdownMenu.Root>
        </div>
      </header>

      {/* Main Layout Container */}
      <div className="flex flex-row flex-grow h-[calc(100vh-4rem)] overflow-hidden relative">
        {/* Backdrop for Mobile Sidebar */}
        {isMobileMenuOpen && (
          <div 
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-black/40 dark:bg-black/60 z-40 md:hidden transition-opacity duration-300"
          />
        )}

        {/* Sidebar Nav */}
        <aside className={`fixed md:relative inset-y-0 left-0 z-40 flex flex-col bg-white dark:bg-slate-950 border-r border-slate-200/60 dark:border-slate-900 shadow-2xl md:shadow-none transition-transform duration-300 md:translate-x-0 ${
          isMobileMenuOpen ? 'translate-x-0 w-72' : '-translate-x-full md:translate-x-0'
        } md:w-64 flex-shrink-0 transition-colors duration-300`}>
          <nav className="flex-grow p-4 space-y-2">
            {[
              { id: 'builder', icon: <FileSpreadsheet className="w-4.5 h-4.5" />, label: 'Formulários' },
              { id: 'responder', icon: <PenTool className="w-4.5 h-4.5" />, label: 'Responder' },
              { id: 'notifications', icon: <Bell className="w-4.5 h-4.5" />, label: 'Central de Notifs' },
              { id: 'settings', icon: <User className="w-4.5 h-4.5" />, label: 'Minha Conta' }
            ].map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => {
                    window.location.hash = tab.id;
                    setActiveTab(tab.id as any);
                    setIsMobileMenuOpen(false); // Close menu on select
                  }}
                  className={`w-full flex items-center transition-all duration-300 rounded-xl relative p-3.5 gap-4 font-bold text-xs uppercase tracking-wider ${
                    isActive ? 'text-slate-900 dark:text-white font-black' : 'text-slate-450 dark:text-slate-500 hover:bg-slate-50/70 dark:hover:bg-slate-900/60 hover:text-slate-600 dark:hover:text-slate-350'
                  }`}
                >
                  {isActive && (
                    <motion.div
                      layoutId="activeTabIndicator"
                      className="absolute inset-0 bg-slate-100/80 dark:bg-slate-900/75 rounded-xl -z-10 shadow-sm border border-slate-250/20 dark:border-slate-800/40"
                      transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                    />
                  )}
                  <span className="text-xl flex items-center justify-center shrink-0">{tab.icon}</span>
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-grow overflow-y-auto relative z-10 grid-bg bg-[#F0F2F5] dark:bg-[#030712] transition-colors duration-300">
          <div className="p-4 sm:p-6 md:p-8">
            {activeTab === 'builder' && <FormBuilderView />}
            {activeTab === 'responder' && <ResponderView />}
            {activeTab === 'notifications' && (
              <NotificationsView onClearUnread={() => setUnreadCount(0)} />
            )}
            {activeTab === 'settings' && <SettingsView />}
          </div>
        </main>
      </div>
    </div>
  );
}