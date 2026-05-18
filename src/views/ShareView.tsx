import { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { FileCard } from '../components/FileCard';

interface ShareInfo {
  hash: string;
  originalname: string;
  ownerEmail: string;
  description: string;
  createdAt: string;
  downloadUrl: string;
}

interface Props {
  shareHash?: string | null;
}

const normalizeHashInput = (value: string) => {
  const cleaned = value.trim();
  const parts = cleaned.split('/share/');
  return parts[parts.length - 1].replace(/[^a-zA-Z0-9_-]/g, '');
};

export default function ShareView({ shareHash }: Props) {
  const { user, authFetch } = useAuth();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [shareUrl, setShareUrl] = useState('');
  const [shareCode, setShareCode] = useState(shareHash || '');
  const [status, setStatus] = useState('');
  const [shareInfo, setShareInfo] = useState<ShareInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [accessLoading, setAccessLoading] = useState(false);

  useEffect(() => {
    if (shareHash) {
      setShareCode(shareHash);
      fetchShareInfo(shareHash);
    }
  }, [shareHash]);

  const handleCreateShare = async () => {
    if (!selectedFile) {
      setStatus('Selecione uma planilha para compartilhar.');
      return;
    }

    if (!user) {
      setStatus('Faça login para criar links de compartilhamento.');
      return;
    }

    setLoading(true);
    setStatus('Carregando arquivo...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const uploadRes = await authFetch('/api/upload-planilha', {
        method: 'POST',
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error('Falha no upload do arquivo.');
      }

      const uploadData = await uploadRes.json();
      const fileId = uploadData.file?.id;

      if (!fileId) {
        throw new Error('ID do arquivo não retornado pelo servidor.');
      }

      setStatus('Criando link público...');
      const shareRes = await authFetch('/api/share-spreadsheet', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileId,
          originalname: selectedFile.name,
          description: `Planilha compartilhada: ${selectedFile.name}`,
        }),
      });

      if (!shareRes.ok) {
        const error = await shareRes.json();
        throw new Error(error?.error || 'Erro ao criar link de compartilhamento.');
      }

      const shareData = await shareRes.json();
      setShareUrl(shareData.shareUrl);
      setShareCode(shareData.hash);
      setShareInfo(shareData.info ?? null);
      setStatus('Link criado com sucesso!');
    } catch (error: any) {
      setStatus(String(error?.message || error));
    } finally {
      setLoading(false);
    }
  };

  const fetchShareInfo = async (hash: string) => {
    if (!hash) return;
    setAccessLoading(true);
    setStatus('Recuperando informações do link...');

    try {
      const res = await fetch(`/api/share/${encodeURIComponent(hash)}`);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error?.error || 'Link inválido.');
      }
      const data = await res.json();
      setShareInfo(data);
      setShareUrl(`${window.location.origin}/share/${data.hash}`);
      setStatus('Link encontrado.');
    } catch (error: any) {
      setShareInfo(null);
      setStatus(String(error?.message || error));
    } finally {
      setAccessLoading(false);
    }
  };

  const handleAccessLink = () => {
    const extracted = normalizeHashInput(shareCode);
    if (!extracted) {
      setStatus('Insira um código de compartilhamento válido.');
      return;
    }
    fetchShareInfo(extracted);
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setStatus('Link copiado para a área de transferência!');
  };

  const downloadUrl = shareInfo ? shareInfo.downloadUrl : '';

  return (
    <div className="min-h-screen bg-slate-50 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm">
          <h1 className="text-3xl font-black text-slate-900 mb-3">Compartilhamento por Hash</h1>
          <p className="text-sm text-slate-500 leading-relaxed">
            Crie um link seguro para qualquer planilha Excel e abra-o diretamente pela chave de compartilhamento.
            O link funciona para qualquer pessoa que o receber.
          </p>
        </header>

        <section className="grid gap-6 lg:grid-cols-2">
          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">1. Compartilhar nova planilha</h2>
            <p className="text-sm text-slate-500 mb-4">Selecione a planilha local e gere um link público baseado em hash.</p>
            <FileCard
              title="Selecione a planilha"
              subtitle="Arraste ou clique para escolher o arquivo .xlsx/.xls"
              color="bg-fuchsia-500"
              icon="📄"
              file={selectedFile}
              onFileChange={(file) => setSelectedFile(file)}
            />
            <button
              onClick={handleCreateShare}
              disabled={loading || !user}
              className="mt-5 w-full rounded-3xl bg-indigo-700 px-5 py-4 text-sm font-black uppercase text-white shadow-lg transition hover:bg-indigo-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Gerando link...' : user ? 'Gerar link de compartilhamento' : 'Faça login para compartilhar'}
            </button>
            {!user && (
              <p className="mt-3 text-sm text-rose-600">Faça login para criar links de compartilhamento.</p>
            )}
            {shareUrl && (
              <div className="mt-5 rounded-3xl bg-slate-50 border border-slate-200 p-4">
                <p className="text-xs text-slate-500 uppercase tracking-[0.25em] mb-2">Link criado</p>
                <div className="break-all text-sm text-slate-700">{shareUrl}</div>
                <button onClick={handleCopy} className="mt-4 rounded-3xl bg-emerald-600 px-4 py-3 text-xs font-bold uppercase text-white hover:bg-emerald-700">
                  Copiar link
                </button>
              </div>
            )}
          </div>

          <div className="bg-white rounded-[2rem] border border-slate-200 p-6 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900 mb-4">2. Acessar por chave</h2>
            <p className="text-sm text-slate-500 mb-4">Cole o código ou o link compartilhado para abrir a planilha.</p>
            <div className="space-y-4">
              <input
                type="text"
                value={shareCode}
                onChange={(e) => setShareCode(e.target.value)}
                placeholder="Cole o código ou a URL de compartilhamento"
                className="w-full rounded-3xl border border-slate-200 bg-slate-50 px-5 py-4 text-sm font-medium outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
              />
              <button
                onClick={handleAccessLink}
                disabled={accessLoading}
                className="w-full rounded-3xl bg-slate-900 px-5 py-4 text-sm font-black uppercase text-white shadow-lg hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {accessLoading ? 'Buscando...' : 'Abrir planilha compartilhada'}
              </button>
            </div>

            {shareInfo && (
              <div className="mt-6 rounded-[2rem] bg-indigo-50 border border-indigo-100 p-5">
                <p className="text-xs uppercase tracking-[0.2em] text-indigo-600 mb-3">Planilha disponível</p>
                <div className="space-y-2 text-sm text-slate-700">
                  <div><strong>Arquivo:</strong> {shareInfo.originalname}</div>
                  <div><strong>Compartilhado por:</strong> {shareInfo.ownerEmail || 'anônimo'}</div>
                  <div><strong>Criado em:</strong> {new Date(shareInfo.createdAt).toLocaleString()}</div>
                </div>
                <a
                  href={downloadUrl}
                  className="mt-5 inline-flex items-center justify-center w-full rounded-3xl bg-emerald-600 px-5 py-4 text-sm font-black uppercase text-white shadow-lg hover:bg-emerald-700"
                >
                  Baixar planilha agora
                </a>
              </div>
            )}
          </div>
        </section>

        {status && (
          <div className="rounded-3xl bg-slate-900 px-5 py-4 text-sm font-bold text-white">{status}</div>
        )}
      </div>
    </div>
  );
}
