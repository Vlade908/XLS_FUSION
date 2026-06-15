import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';

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
  const [statusMessage, setStatusMessage] = useState('');
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
    setStatusMessage('Processando...');
    try {
      const response = await authFetch(`/api/forms/${formId}/requests/${requestId}/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || 'Falha ao processar solicitação.');
      setStatusMessage(`Solicitação ${action === 'approve' ? 'aprovada' : 'negada'} com sucesso.`);
      
      // Reload lists
      fetchRequests();
      fetchNotifications();
    } catch (error: any) {
      setStatusMessage(String(error.message || error));
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen p-6">
        <div className="rounded-[2rem] border border-slate-200 bg-white p-8 text-center shadow-sm">
          <h2 className="text-2xl font-black text-slate-900">Notificações</h2>
          <p className="mt-3 text-sm text-slate-500">Faça login para ver pedidos de acesso ao seu formulário.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Central de Notificações</h2>
          <p className="mt-2 text-sm text-slate-500">Gerencie permissões e acompanhe novas respostas dos seus formulários.</p>
        </div>
        <button 
          onClick={loadData} 
          disabled={refreshing}
          className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          {refreshing ? 'Atualizando...' : 'Atualizar'}
        </button>
      </div>

      {/* Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Actionable Access Requests Column (2 cols width on lg) */}
        <div className="lg:col-span-2 space-y-6">
          <h3 className="text-lg font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>📥</span> Pedidos de Acesso Pendentes
            {requests.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-black animate-pulse">
                {requests.length}
              </span>
            )}
          </h3>

          {requests.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500 font-medium">Nenhum pedido de acesso pendente no momento.</p>
              <p className="text-xs text-slate-400 mt-1">Quando alguém pedir acesso aos seus formulários restritos, eles aparecerão aqui.</p>
            </div>
          ) : (
            <div className="space-y-4 animate-in fade-in duration-300">
              {requests.map((request) => (
                <div key={request._id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.25em] text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md inline-block mb-2">{request.formName}</p>
                      <h4 className="text-base font-black text-slate-900">{request.requesterEmail}</h4>
                      <p className="mt-2 text-sm text-slate-500 leading-relaxed bg-slate-50 border border-slate-100 p-3 rounded-xl italic">
                        "{request.message || 'Sem mensagem adicional.'}"
                      </p>
                    </div>
                    <div className="text-left md:text-right flex-shrink-0 space-y-1">
                      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Solicitado em</p>
                      <p className="text-xs font-bold text-slate-600">{new Date(request.createdAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="mt-6 flex flex-wrap gap-3">
                    <button 
                      onClick={() => handleDecision(request._id, request.formId, 'approve')} 
                      disabled={request.status !== 'pending'} 
                      className="rounded-xl bg-emerald-600 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-emerald-700 transition-colors disabled:opacity-40 shadow-sm"
                    >
                      Aprovar
                    </button>
                    <button 
                      onClick={() => handleDecision(request._id, request.formId, 'deny')} 
                      disabled={request.status !== 'pending'} 
                      className="rounded-xl bg-rose-500 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-rose-600 transition-colors disabled:opacity-40 shadow-sm"
                    >
                      Negar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed Column (1 col width on lg) */}
        <div className="space-y-6">
          <h3 className="text-lg font-black uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <span>🔔</span> Feed de Atividades
          </h3>

          {notifications.length === 0 ? (
            <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm border border-slate-200">
              <p className="text-sm text-slate-500 font-medium">Nenhuma atividade recente.</p>
              <p className="text-xs text-slate-400 mt-1">Notificações de respostas e solicitações antigas serão listadas aqui.</p>
            </div>
          ) : (
            <div className="space-y-3 animate-in fade-in duration-300">
              {notifications.map((n) => (
                <div 
                  key={n._id} 
                  className={`rounded-2xl border border-slate-150 p-4 transition-all duration-200 bg-white flex gap-3 items-start shadow-sm hover:shadow ${
                    !n.read ? 'border-l-4 border-l-indigo-600 pl-3 bg-indigo-50/20' : ''
                  }`}
                >
                  <span className="text-lg mt-0.5 flex-shrink-0">
                    {n.type === 'access_request' ? '🔑' : '📝'}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 mb-1 truncate">{n.formName}</p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">{n.message}</p>
                    <span className="text-[10px] text-slate-400 block mt-1.5 font-semibold">
                      {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} - {new Date(n.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  {!n.read && (
                    <span className="h-2.5 w-2.5 rounded-full bg-indigo-600 flex-shrink-0 mt-2 animate-pulse" title="Nova Notificação" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Status Message Toast */}
      {statusMessage && (
        <div className="fixed bottom-6 right-6 bg-slate-900 text-white font-bold text-xs uppercase tracking-wider px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom duration-300 z-50 flex items-center gap-3">
          <span>⚙️</span>
          {statusMessage}
          <button 
            onClick={() => setStatusMessage('')} 
            className="ml-2 text-slate-400 hover:text-white font-black"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
