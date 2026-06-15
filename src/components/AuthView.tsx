import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

interface AuthViewProps {
  resetToken?: string;
}

export default function AuthView({ resetToken }: AuthViewProps) {
  const { login, signup, loading } = useAuth();
  const [mode, setMode] = useState<'login' | 'signup' | 'forgot' | 'reset'>('login');
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
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
        await signup(email.trim().toLowerCase(), password, name.trim());
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
    <div className="auth-container min-h-screen flex items-center justify-center bg-[#F0F2F5] dark:bg-[#030712] p-6 transition-colors duration-300 relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute top-[-15%] left-[-15%] w-[50vw] h-[50vw] bg-indigo-500/5 dark:bg-indigo-500/8 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-15%] right-[-15%] w-[40vw] h-[40vw] bg-purple-500/5 dark:bg-purple-500/8 blur-[120px] rounded-full pointer-events-none" />

      <div className="auth-card w-full max-w-md rounded-[2rem] bg-white dark:bg-[#0f172a] p-10 shadow-2xl dark:shadow-black/60 border border-slate-200 dark:border-slate-800 relative z-10 transition-colors duration-300">

        {/* Logo / Icon accent */}
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 shadow-lg shadow-indigo-500/30 flex items-center justify-center mb-6">
          <span className="text-white font-black text-lg leading-none">F</span>
        </div>

        <h1 className="text-3xl font-black text-slate-900 dark:text-white mb-2">{getTitle()}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mb-8">{getSubtitle()}</p>

        {(mode === 'login' || mode === 'signup') && (
          <div className="mb-6 flex gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={() => { setMode('login'); setStatus(''); setName(''); }}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mode === 'login'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Entrar
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setStatus(''); setName(''); }}
              className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                mode === 'signup'
                  ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-sm border border-slate-200/50 dark:border-slate-700'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
              }`}
            >
              Criar conta
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          {mode === 'signup' && (
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              Nome
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all font-medium"
                required
                placeholder="Seu nome completo"
              />
            </label>
          )}

          {(mode === 'login' || mode === 'signup' || mode === 'forgot') && (
            <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
              E-mail
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                required
                placeholder="exemplo@empresa.com"
              />
            </label>
          )}

          {(mode === 'login' || mode === 'signup') && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                  required
                  minLength={6}
                  placeholder="Sua senha..."
                />
              </label>

              {mode === 'login' && (
                <div className="flex justify-end mt-2">
                  <button
                    type="button"
                    onClick={() => { setMode('forgot'); setStatus(''); }}
                    className="text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300 hover:underline"
                  >
                    Esqueceu a senha?
                  </button>
                </div>
              )}
            </div>
          )}

          {mode === 'reset' && (
            <>
              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Nova Senha
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
                  required
                  minLength={6}
                  placeholder="Escolha uma nova senha..."
                />
              </label>

              <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                Confirmar Nova Senha
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="mt-2 w-full rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-[#030712] text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 px-4 py-3 text-sm outline-none focus:border-indigo-500 dark:focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100 dark:focus:ring-indigo-900/30 transition-all"
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
            className="w-full rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 px-5 py-4 text-sm font-black uppercase tracking-[0.18em] text-white disabled:opacity-60 transition-all active:scale-[0.98] shadow-lg shadow-indigo-500/30 mt-2"
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
                ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-100 dark:border-emerald-900/50'
                : 'bg-rose-50 dark:bg-rose-950/30 text-rose-700 dark:text-rose-400 border-rose-100 dark:border-rose-900/50'
            }`}
          >
            {status}
          </div>
        )}

        {(mode === 'forgot' || mode === 'reset') && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            Lembra da sua senha?{' '}
            <button
              type="button"
              onClick={() => { setMode('login'); setStatus(''); window.location.hash = 'builder'; }}
              className="font-black text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              Fazer Login
            </button>
          </p>
        )}

        {(mode === 'login' || mode === 'signup') && (
          <p className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
            {mode === 'login' ? 'Ainda não tem conta?' : 'Já tem conta?'}{' '}
            <button
              type="button"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setStatus(''); }}
              className="font-black text-indigo-600 dark:text-indigo-400 underline hover:text-indigo-800 dark:hover:text-indigo-300"
            >
              {mode === 'login' ? 'Criar conta' : 'Entrar'}
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
