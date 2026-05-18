import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthView() {
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState('');

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');

    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password);
      } else {
        await signup(email.trim().toLowerCase(), password);
      }
    } catch (error: any) {
      setStatus(error?.message || 'Erro desconhecido.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F0F2F5] p-6">
      <div className="w-full max-w-md rounded-[2rem] bg-white p-10 shadow-xl border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 mb-2">XLS Fusion</h1>
        <p className="text-sm text-slate-500 mb-8">
          Faça login para continuar ou crie uma conta nova com e-mail/senha.
        </p>

        <div className="mb-6 flex gap-3">
          <button
            type="button"
            onClick={() => setMode('login')}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${mode === 'login' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Entrar
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold ${mode === 'signup' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
          >
            Criar conta
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block text-sm font-semibold text-slate-700">
            E-mail
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
            />
          </label>

          <label className="block text-sm font-semibold text-slate-700">
            Senha
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              required
              minLength={6}
            />
          </label>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800 disabled:opacity-60"
          >
            {loading ? 'Aguarde...' : mode === 'login' ? 'Entrar' : 'Criar conta'}
          </button>
        </form>

        {status && <p className="mt-6 text-sm text-rose-600">{status}</p>}

        <p className="mt-8 text-center text-sm text-slate-500">
          {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
          <button
            type="button"
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="font-black text-slate-900 underline"
          >
            {mode === 'login' ? 'Criar conta' : 'Entrar'}
          </button>
        </p>
      </div>
    </div>
  );
}
