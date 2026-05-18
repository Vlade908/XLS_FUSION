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

export default function NotificationsView() {
  const { user, authFetch } = useAuth();
  const [requests, setRequests] = useState<AccessRequest[]>([]);
  const [statusMessage, setStatusMessage] = useState('');

  useEffect(() => {
    if (!user) return;
    fetchRequests();
  }, [user]);

  const fetchRequests = async () => {
    if (!user) return;
    try {
      const response = await authFetch('/api/access-requests');
      const data = await response.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
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
      fetchRequests();
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
    <div className="min-h-screen p-6">
      <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-3xl font-black text-slate-900">Notificações</h2>
          <p className="mt-2 text-sm text-slate-500">Aqui ficam os pedidos de acesso aos formulários que você criou.</p>
        </div>
        <button onClick={fetchRequests} className="rounded-2xl bg-slate-900 px-5 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800">
          Atualizar
        </button>
      </div>

      {requests.length === 0 ? (
        <div className="rounded-[2rem] bg-white p-8 text-center shadow-sm border border-slate-200">
          <p className="text-sm text-slate-500">Nenhum pedido pendente no momento.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {requests.map((request) => (
            <div key={request._id} className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.35em] text-slate-400">{request.formName}</p>
                  <h3 className="mt-2 text-lg font-black text-slate-900">{request.requesterEmail}</h3>
                  <p className="mt-2 text-sm text-slate-500">{request.message || 'Sem mensagem'}</p>
                </div>
                <div className="space-y-3 text-right">
                  <p className="text-xs uppercase tracking-[0.25em] text-slate-400">Pedido em {new Date(request.createdAt).toLocaleString()}</p>
                  <p className="text-sm font-bold text-slate-900">Status: {request.status}</p>
                </div>
              </div>
              <div className="mt-5 flex flex-wrap gap-3">
                <button onClick={() => handleDecision(request._id, request.formId, 'approve')} disabled={request.status !== 'pending'} className="rounded-2xl bg-emerald-600 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-emerald-700 disabled:opacity-40">
                  Aprovar
                </button>
                <button onClick={() => handleDecision(request._id, request.formId, 'deny')} disabled={request.status !== 'pending'} className="rounded-2xl bg-rose-500 px-4 py-3 text-xs font-black uppercase tracking-[0.18em] text-white hover:bg-rose-600 disabled:opacity-40">
                  Negar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
      {statusMessage && <div className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">{statusMessage}</div>}
    </div>
  );
}
