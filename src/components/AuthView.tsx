import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  resetToken?: string;
}

export default function AuthView({ resetToken }: AuthViewProps) {
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [statusType, setStatusType] = useState<'error' | 'success'>('error');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (resetToken) {
      setMode('reset');
      setStatus('');
    } else {
      setMode('login');
    }
  }, [resetToken]);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus('');
    setStatusType('error');
    setSubmitting(true);

    try {
      if (mode === 'login') {
        await login(email.trim().toLowerCase(), password);
      } else if (mode === 'signup') {
        await signup(email.trim().toLowerCase(), password);
      } else if (mode === 'forgot') {
        const res = await fetch('/api/forgot-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: email.trim().toLowerCase() }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Falha ao solicitar recuperação.');
        }

        if (data.devInfo?.resetUrl) {
          console.log(`🚀 [DEV] Link de redefinição gerado: ${data.devInfo.resetUrl}`);
        }

        setStatusType('success');
        setStatus('Se o e-mail estiver cadastrado, um link de redefinição foi enviado.');
        setEmail('');
      } else if (mode === 'reset') {
        if (password !== confirmPassword) {
          throw new Error('As senhas não coincidem.');
        }
        if (password.length < 6) {
          throw new Error('A nova senha deve ter pelo menos 6 caracteres.');
        }

        const res = await fetch('/api/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token: resetToken, password }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data?.error || 'Falha ao redefinir a senha.');
        }

        setStatusType('success');
        setStatus('Senha redefinida com sucesso! Redirecionando para login...');
        setPassword('');
        setConfirmPassword('');

        setTimeout(() => {
          setMode('login');
          window.location.hash = 'builder';
          setStatus('');
        }, 2500);
      }
    } catch (error: any) {
      setStatusType('error');
      setStatus(error?.message || 'Erro desconhecido.');
    } finally {
      setSubmitting(false);
    }
  };

  const getTitle = () => {
    if (mode === 'login') return 'XLS Fusion';
    if (mode === 'signup') return 'Criar Conta';
    if (mode === 'forgot') return 'Recuperar Senha';
    return 'Redefinir Senha';
  };

  const getSubtitle = () => {
    if (mode === 'login') return 'Faça login para continuar ou crie uma conta nova com e-mail/senha.';
    if (mode === 'signup') return 'Preencha o e-mail e senha para se cadastrar na plataforma.';
    if (mode === 'forgot') return 'Insira o seu e-mail cadastrado para receber as instruções de recuperação.';
    return 'Insira sua nova senha nos campos abaixo para atualizar sua conta.';
  };

  return (
    <div className="auth-container min-h-screen flex items-center justify-center bg-[#F0F2F5] p-6">
      <div className="auth-card w-full max-w-md rounded-[2rem] bg-white p-10 shadow-xl border border-slate-200">
        <h1 className="text-3xl font-black text-slate-900 mb-2">{getTitle()}</h1>
        <p className="text-sm text-slate-500 mb-8">{getSubtitle()}</p>

        {(mode === 'login' || mode === 'signup') && (
          <div className="mb-6 flex gap-3">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatus('');
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                mode === 'login' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setStatus('');
              }}
              className={`flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-all ${
                mode === 'signup' ? 'bg-slate-900 text-white shadow-md' : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              Criar conta
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <label className="block text-sm font-semibold text-slate-700">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                required
                placeholder="exemplo@empresa.com"
              />
            </label>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700">
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                  minLength={6}
                  placeholder="Sua senha..."
                />
              </label>

              {mode === 'login' && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setMode('forgot');
                      setStatus('');
                    }}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <>
              <label className="block text-sm font-semibold text-slate-700">
                Nova Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                  minLength={6}
                  placeholder="Escolha uma nova senha..."
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700">
                Confirmar Nova Senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all"
                  required
                  minLength={6}
                  placeholder="Confirme a nova senha..."
                />
              </label>
            </>
          )}

          <button
            type="submit"
            disabled={loading || submitting}
            className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white hover:bg-slate-800 disabled:opacity-60 transition-all active:scale-[0.98] shadow-lg shadow-slate-100"
          >
            {loading || submitting
              ? 'Aguarde...'
              : mode === 'login'
              ? 'Entrar'
              : mode === 'signup'
              ? 'Criar conta'
              : mode === 'forgot'
              ? 'Enviar e-mail'
              : 'Redefinir Senha'}
          </button>
        </form>

        {status && (
          <div
            className={`mt-6 p-4 rounded-2xl text-xs font-bold border ${
              statusType === 'success'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                : 'bg-rose-50 text-rose-700 border-rose-100'
            }`}
          >
            {status}
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <p className="mt-8 text-center text-sm text-slate-500">
            Lembra da sua senha?{' '}
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setStatus('');
                window.location.hash = 'builder';
              }}
              className="font-black text-slate-900 underline hover:text-slate-800"
            >
              Fazer Login
            </button>
          </p>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <p className="mt-8 text-center text-sm text-slate-500">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={() => {
                setMode(mode === 'login' ? 'signup' : 'login');
                setStatus('');
              }}
              className="font-black text-slate-900 underline hover:text-slate-800"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
