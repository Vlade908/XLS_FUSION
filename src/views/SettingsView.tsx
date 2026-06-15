import { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Mail, Camera, Trash2, Save, Loader2, Check } from 'lucide-react';

export default function SettingsView() {
  const { user, authFetch, updateUser } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setFeedback({ type: 'error', message: 'Por favor, selecione apenas arquivos de imagem.' });
      return;
    }

    if (file.size > 2 * 1024 * 1024) { // Limit to 2MB
      setFeedback({ type: 'error', message: 'A imagem deve ter no máximo 2MB.' });
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        setFeedback(null);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveAvatar = () => {
    setAvatarUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setFeedback(null);

    try {
      const response = await authFetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), avatarUrl }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || 'Erro ao salvar alterações.');
      }

      updateUser({ name: name.trim(), avatarUrl });
      setFeedback({ type: 'success', message: 'Perfil atualizado com sucesso!' });
      
      // Clear success feedback after 3 seconds
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback({ type: 'error', message: err.message || 'Erro de conexão.' });
    } finally {
      setLoading(false);
    }
  };

  // User initials for fallback avatar
  const getInitials = () => {
    if (name) {
      return name.slice(0, 2).toUpperCase();
    }
    if (user?.email) {
      return user.email.slice(0, 2).toUpperCase();
    }
    return 'US';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      {/* Title section */}
      <div>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight font-outfit">
          Minha Conta
        </h1>
        <p className="text-xs text-slate-500 font-medium">
          Gerencie suas informações pessoais e foto de perfil.
        </p>
      </div>

      {/* Main Glass Form Container */}
      <motion.div 
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card rounded-[2rem] p-8 border border-white/20 shadow-xl relative overflow-hidden"
      >
        {/* Glow effect at the top right of the card */}
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-gradient-to-tr from-indigo-500/10 to-violet-500/10 blur-2xl pointer-events-none" />

        <form onSubmit={handleSave} className="space-y-6">
          
          {/* Avatar Section */}
          <div className="flex flex-col items-center sm:flex-row gap-6 pb-6 border-b border-slate-100/60">
            <div className="relative">
              {avatarUrl ? (
                <img 
                  src={avatarUrl} 
                  alt="Profile" 
                  className="w-24 h-24 rounded-3xl object-cover ring-4 ring-white shadow-lg border border-slate-100"
                />
              ) : (
                <div className="w-24 h-24 rounded-3xl bg-gradient-to-tr from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center text-white text-2xl font-black font-outfit ring-4 ring-white shadow-lg select-none">
                  {getInitials()}
                </div>
              )}
              
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 p-2 bg-slate-900 text-white rounded-2xl shadow-md hover:bg-slate-800 transition-all duration-200"
                aria-label="Upload photo"
              >
                <Camera className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 text-center sm:text-left space-y-2">
              <h3 className="text-sm font-bold text-slate-800">Foto de Perfil</h3>
              <p className="text-[11px] text-slate-450 leading-relaxed max-w-xs">
                Selecione uma foto PNG, JPG ou GIF. Máximo de 2MB. A imagem será recortada automaticamente.
              </p>
              <div className="flex justify-center sm:justify-start gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100/80 px-3.5 py-1.5 rounded-xl transition-all"
                >
                  Carregar Imagem
                </button>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={handleRemoveAvatar}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 bg-rose-50 hover:bg-rose-100/80 px-3.5 py-1.5 rounded-xl transition-all flex items-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" /> Remover
                  </button>
                )}
              </div>
              
              <input 
                type="file" 
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                className="hidden"
              />
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Endereço de E-mail
              </label>
              <div className="flex items-center gap-3 bg-slate-50/60 border border-slate-200/50 rounded-2xl px-4 py-3 text-slate-500 cursor-not-allowed select-none">
                <Mail className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-medium">{user?.email}</span>
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">O e-mail da conta não pode ser alterado.</span>
            </div>

            <div>
              <label htmlFor="name-input" className="block text-xs font-black uppercase tracking-wider text-slate-500 mb-2">
                Nome de Exibição
              </label>
              <div className="relative flex items-center">
                <User className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  id="name-input"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Seu nome..."
                  className="w-full rounded-2xl border border-slate-200 bg-white/70 backdrop-blur-sm pl-11 pr-4 py-3 text-xs font-semibold outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 transition-all text-slate-800"
                  required
                />
              </div>
            </div>
          </div>

          {/* Feedback Messages */}
          <AnimatePresence>
            {feedback && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -5 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -5 }}
                className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 overflow-hidden ${
                  feedback.type === 'success' 
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                    : 'bg-rose-50 text-rose-700 border-rose-100'
                }`}
              >
                {feedback.type === 'success' && <Check className="w-4 h-4 shrink-0 text-emerald-600" />}
                <span>{feedback.message}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Submit Action */}
          <div className="flex justify-end pt-2">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900 hover:bg-slate-800 text-white rounded-2xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-slate-100 disabled:opacity-50 transition-all"
            >
              {loading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Salvando...
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  Salvar Alterações
                </>
              )}
            </motion.button>
          </div>

        </form>
      </motion.div>
    </div>
  );
}
