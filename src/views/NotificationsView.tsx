import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Inbox, 
  Bell, 
  Key, 
  FileText, 
  Check, 
  X, 
  RefreshCw, 
  AlertCircle, 
  Calendar, 
  Clock, 
  CheckCircle,
  XCircle,
  FileSignature
} from 'lucide-react';

interface AccessRequest {
  _id: string;
  formId: string;
  requesterEmail: string;
  status: string;
  message: string;
  formName: string;
  createdAt: string;
}

interface SystemNotification {
  _id: string;
  recipientEmail: string;
  type: 'access_request' | 'form_response';
  title: string;
  message: string;
  formId: string;
  formName: string;
  relatedId: string;
  read: boolean;
  createdAt: string;
}

interface NotificationsViewProps {
  onClearUnread?: () => void;
}

export default function NotificationsView({ onClearUnread }: NotificationsViewProps) {
  const { user, authFetch } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  const loadData = async () => {
    setRefreshing(true);
    await Promise.all([fetchRequests(), fetchNotifications()]);
    setRefreshing(false);
  };

  const fetchRequests = async () => {
    try {
      const response = await authFetch('/api/access-requests');
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erro ao buscar solicitações de acesso:', err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await authFetch('/api/notifications');
      if (response.ok) {
        const data = await response.json();
        setNotifications(Array.isArray(data) ? data : []);
        
        // Mark all as read in the backend immediately after loading
        await authFetch('/api/notifications/mark-read', { method: 'POST' });
        if (onClearUnread) {
          onClearUnread();
        }
      }
    } catch (err) {
      console.error('Erro ao buscar feed de notificações:', err);
    }
  };

  const handleDecision = async (requestId: string, formId: string, action: 'approve' | 'deny') => {
    if (!user) return;
    setStatusMessage({ text: 'Processando solicitação...', type: 'info' });
    try {
      const response = await authFetch(`/api/forms/${formId}/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao processar solicitação.');
      
      setStatusMessage({ 
        text: `Solicitação ${action === 'approve' ? 'aprovada' : 'negada'} com sucesso!`, 
        type: 'success' 
      });
      
      // Reload lists
      fetchRequests();
      fetchNotifications();
      
      setTimeout(() => setStatusMessage(null), 3000);
    } catch (error: any) {
      setStatusMessage({ text: String(error.message || error), type: 'error' });
      setTimeout(() => setStatusMessage(null), 4000);
    }
  };

  if (!user) {
    return (
      <div className="max-w-4xl mx-auto p-4">
        <div className="glass-card rounded-[2rem] border border-slate-200/50 dark:border-slate-800/50 p-12 text-center shadow-xl">
          <AlertCircle className="w-12 h-12 text-slate-400 mx-auto mb-4" />
          <h2 className="text-xl font-black text-slate-850 dark:text-slate-100">Não Conectado</h2>
          <p className="mt-2 text-sm text-slate-500">Por favor, faça login para gerenciar suas notificações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      
      {/* Header section */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between pb-2 border-b border-slate-100 dark:border-slate-900">
        <div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight font-outfit">
            Central de Notificações
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Gerencie permissões de acesso e acompanhe as respostas de seus formulários.
          </p>
        </div>
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={loadData} 
          disabled={refreshing}
          className="flex items-center justify-center gap-2 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-slate-100 dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-3 text-xs font-black uppercase tracking-wider transition-all disabled:opacity-50 shadow-md"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
          {refreshing ? 'Carregando...' : 'Atualizar'}
        </motion.button>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Access Requests Column (Left, 2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Inbox className="w-4 h-4 text-indigo-500" /> 
            <span>Solicitações de Acesso Pendentes</span>
            {requests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-rose-500 text-white text-[10px] font-black animate-pulse">
                {requests.length}
              </span>
            )}
          </h3>

          <AnimatePresence mode="popLayout">
            {requests.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[2rem] glass-card p-10 text-center border border-slate-200/50 dark:border-slate-800/40 relative overflow-hidden"
              >
                <div className="absolute top-0 right-0 w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-500/5 to-violet-500/5 blur-xl pointer-events-none" />
                <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-sm text-slate-800 dark:text-slate-200 font-bold">Nenhum pedido pendente</p>
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 max-w-xs mx-auto">
                  Quando alguém solicitar autorização para responder a um formulário restrito criado por você, o pedido aparecerá aqui.
                </p>
              </motion.div>
            ) : (
              <div className="space-y-4">
                {requests.map((request, idx) => (
                  <motion.div 
                    key={request._id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.25, delay: idx * 0.05 }}
                    className="rounded-[2rem] border border-slate-200/50 dark:border-slate-850 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md p-6 hover:shadow-xl hover:border-indigo-500/30 dark:hover:border-indigo-500/30 transition-all duration-300 relative overflow-hidden group"
                  >
                    {/* Glowing effect line on hover */}
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-550 to-violet-550 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                    
                    <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="text-[9px] font-black uppercase tracking-wider bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900 text-indigo-650 dark:text-indigo-400 px-2.5 py-1 rounded-lg">
                            {request.formName}
                          </span>
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 font-mono select-all">
                            ID: {request.formId}
                          </span>
                        </div>
                        
                        <div>
                          <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 truncate">{request.requesterEmail}</h4>
                          <div className="mt-2.5 text-xs text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-950/60 border-l-4 border-l-indigo-500 dark:border-l-indigo-600 border border-slate-150/40 dark:border-slate-900 p-3.5 rounded-r-xl italic">
                            "{request.message || 'Solicitou acesso ao formulário.'}"
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-left md:text-right shrink-0 space-y-1">
                        <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 flex items-center md:justify-end gap-1">
                          <Clock className="w-3 h-3" /> Solicitado em
                        </span>
                        <p className="text-xs font-bold text-slate-600 dark:text-slate-400">
                          {new Date(request.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mt-6 flex flex-wrap gap-2.5 pt-4 border-t border-slate-100/60 dark:border-slate-900/60">
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDecision(request._id, request.formId, 'approve')} 
                        disabled={request.status !== 'pending'} 
                        className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
                      >
                        <Check className="w-3.5 h-3.5" /> Aprovar Acesso
                      </motion.button>
                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleDecision(request._id, request.formId, 'deny')} 
                        disabled={request.status !== 'pending'} 
                        className="rounded-xl bg-rose-500 hover:bg-rose-600 text-white px-5 py-2.5 text-xs font-black uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md shadow-rose-500/10"
                      >
                        <X className="w-3.5 h-3.5" /> Negar
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

        {/* Activity Feed Column (Right, 1/3 width) */}
        <div className="space-y-6">
          <h3 className="text-sm font-black uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-2">
            <Bell className="w-4 h-4 text-purple-500" /> 
            <span>Feed de Atividades</span>
          </h3>

          <AnimatePresence mode="popLayout">
            {notifications.length === 0 ? (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="rounded-[2rem] glass-card p-10 text-center border border-slate-200/50 dark:border-slate-800/40"
              >
                <Bell className="w-8 h-8 text-slate-300 dark:text-slate-700 mx-auto mb-3" />
                <p className="text-xs text-slate-500 dark:text-slate-400">Nenhuma atividade registrada.</p>
              </motion.div>
            ) : (
              <div className="space-y-3">
                {notifications.map((n, idx) => (
                  <motion.div 
                    key={n._id}
                    initial={{ opacity: 0, x: 15 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.2, delay: idx * 0.03 }}
                    className={`rounded-2xl border transition-all duration-200 glass-card p-4 flex gap-3.5 items-start hover:bg-white/70 dark:hover:bg-slate-900/80 ${
                      !n.read 
                        ? 'border-l-4 border-l-indigo-600 dark:border-l-indigo-500 pl-3 bg-indigo-50/20 dark:bg-indigo-950/20 border-slate-200/60 dark:border-slate-850' 
                        : 'border-slate-150/60 dark:border-slate-900'
                    }`}
                  >
                    <span className="p-2 bg-slate-100 dark:bg-slate-950 rounded-xl text-slate-650 dark:text-slate-400 shrink-0 flex items-center justify-center mt-0.5">
                      {n.type === 'access_request' ? (
                        <Key className="w-3.5 h-3.5 text-indigo-500" />
                      ) : (
                        <FileSignature className="w-3.5 h-3.5 text-amber-500" />
                      )}
                    </span>
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 truncate" title={n.formName}>
                        {n.formName}
                      </p>
                      <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-semibold">
                        {n.message}
                      </p>
                      <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold block">
                        {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                    {!n.read && (
                      <span className="h-2 w-2 rounded-full bg-indigo-600 dark:bg-indigo-500 shrink-0 mt-2 animate-pulse" />
                    )}
                  </motion.div>
                ))}
              </div>
            )}
          </AnimatePresence>
        </div>

      </div>

      {/* Floating Status Message Toast */}
      <AnimatePresence>
        {statusMessage && (
          <motion.div 
            initial={{ opacity: 0, y: 30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 bg-slate-900/90 dark:bg-slate-950/95 text-white dark:text-slate-100 font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl shadow-2xl border border-slate-700/30 dark:border-slate-800/60 backdrop-blur-md z-50 flex items-center gap-3"
          >
            {statusMessage.type === 'info' && <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />}
            {statusMessage.type === 'success' && <CheckCircle className="w-4 h-4 text-emerald-400" />}
            {statusMessage.type === 'error' && <XCircle className="w-4 h-4 text-rose-400" />}
            
            <span>{statusMessage.text}</span>
            
            <button 
              onClick={() => setStatusMessage(null)} 
              className="ml-2 p-1 text-slate-400 hover:text-white dark:hover:text-slate-200 rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
