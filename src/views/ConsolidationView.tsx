/** @format */
import { useState, useEffect, useCallback } from 'react';
import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip'; // TI: Necessário rodar npm install jszip
import { saveAs } from 'file-saver'; // TI: Necessário rodar npm install file-saver
import { PreFlightModal } from '../components/PreFlightModal';
import { evaluateCheckbox, smartClean, normName, normID } from '../utils/excelLogic';

interface Props { user: { name: string, email: string } | null; }

export default function ConsolidationView({ user }: Props) {
  const [historico, setHistorico] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [cachedContent, setCachedContent] = useState<any>(null);
  const [isPreFlightOpen, setIsPreFlightOpen] = useState(false);
  const [previewItems, setPreviewItems] = useState<any[]>([]);
  const [workbookFinal, setWorkbookFinal] = useState<XLSX.WorkBook | null>(null);

  const safeFetchJSON = async (url: string) => {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Erro na rota: ${url}`);
    return res.json();
  };

  const carregarLista = useCallback(async () => {
    if (!user?.email) return;
    try {
      const data = await safeFetchJSON(`/api/meus-formularios?email=${user.email.toLowerCase().trim()}`);
      setHistorico(Array.isArray(data) ? data : []);
    } catch (err: any) { console.error("Erro histórico:", err.message); }
  }, [user]);

  useEffect(() => { carregarLista(); }, [carregarLista]);

  const sincronizarAuditoria = async (codigo: string) => {
    setIsProcessing(true);
    setCachedContent(null);
    try {
      const projeto = await safeFetchJSON(`/api/projeto/${codigo}`);
      const arquivosNuvem = await safeFetchJSON(`/api/projeto/${codigo}/respostas`);
      const rulesRes = await fetch(`/api/download-arquivo?path=${projeto.links.rules}`);
      const rulesFileData = await rulesRes.json();
      const wbRules = XLSX.read(rulesFileData.base64, { type: 'base64' });
      const rulesData: any[][] = XLSX.utils.sheet_to_json(wbRules.Sheets[wbRules.SheetNames[0]], { header: 1 });

      const mapeamentoRegras: Record<string, string> = {};
      rulesData.forEach((row, i) => { if (i > 0 && row[0] && row[1]) mapeamentoRegras[normID(row[0])] = normName(row[1]); });

      const dataBase: Record<string, Record<string, any[]>> = {};

      for (const file of arquivosNuvem) {
        if (!file.base64) continue;
        const wb = XLSX.read(file.base64, { type: 'base64' });
        const sheetForm = wb.Sheets["Formulario"] || wb.Sheets[wb.SheetNames[0]];
        const rowsForm: any[][] = XLSX.utils.sheet_to_json(sheetForm, { header: 1, defval: "" });
        const nomeBruto = file.name.replace('_Final.xlsx', '').replace(/_/g, ' ');
        const nomeNormalizado = normName(nomeBruto);
        if (!dataBase[nomeBruto]) dataBase[nomeBruto] = {};
        
        let idAtual = "";
        let tipoAtual = "geral";
        rowsForm.forEach((row, idx) => {
          if (idx === 0) return;
          if (row[1]) idAtual = normID(row[1]);
          if (row[8]) tipoAtual = String(row[8]).toLowerCase().trim();
          if (idAtual && mapeamentoRegras[idAtual] === nomeNormalizado) {
            if (!dataBase[nomeBruto][idAtual]) dataBase[nomeBruto][idAtual] = [];
            dataBase[nomeBruto][idAtual].push({ valor: row[7], tipo: tipoAtual, linha: idx });
          }
        });
      }
      setCachedContent({ projeto, respostas: arquivosNuvem, dataBase, mapeamentoRegras });
    } catch (err: any) { alert("Falha: " + err.message); }
    finally { setIsProcessing(false); }
  };

  const processarArquivoFinal = async () => {
    if (!cachedContent) return;
    setIsProcessing(true);
    try {
      const resTemp = await fetch(`/api/download-arquivo?path=${cachedContent.projeto.links.templateTags}`);
      const dataTemp = await resTemp.json();
      const wbBase = XLSX.read(dataTemp.base64, { type: 'base64', cellStyles: true });
      const ws = wbBase.Sheets[wbBase.SheetNames[0]];
      const range = XLSX.utils.decode_range(ws['!ref']!);
      const trail: any[] = [];
      const contadores: Record<string, number> = {};

      let idCorrente = "";
      for (let R = range.s.r; R <= range.e.r; R++) {
        const cellId = ws[XLSX.utils.encode_cell({r: R, c: 1})];
        if (cellId && cellId.v) idCorrente = normID(cellId.v);
        const cellTarget = XLSX.utils.encode_cell({r: R, c: 6}); 
        if (!ws[cellTarget]) continue;

        let txt = String(ws[cellTarget].v || "");
        if (/{resposta}|{respostachek}/i.test(txt)) {
          const auditorNorm = cachedContent.mapeamentoRegras[idCorrente] || "";
          const nomeReal = Object.keys(cachedContent.dataBase).find(n => normName(n) === auditorNorm);
          const picks = nomeReal ? cachedContent.dataBase[nomeReal]?.[idCorrente] || [] : [];
          const partes = txt.split(/({resposta}|{respostachek})/i);
          ws[cellTarget].v = partes.map(p => {
            if (/{resposta}|{respostachek}/i.test(p)) {
              const i = contadores[idCorrente] || 0;
              const ans = picks[i] || { valor: "", tipo: "geral" };
              contadores[idCorrente] = i + 1;
              trail.push({ id: idCorrente, worker: nomeReal || "N/A", value: ans.valor, type: ans.tipo, row: R + 1 });
              
              // Se for anexo, escreve apenas o nome do arquivo no Excel, não o caminho completo
              if (ans.tipo.includes("anexo") || ans.tipo.includes("arquivo")) {
                return String(ans.valor).split('/').pop() || "Anexo";
              }
              return ans.tipo.includes("check") ? (evaluateCheckbox(ans.valor) ? "☑" : "☐") : smartClean(ans.valor);
            }
            return p;
          }).join("");
        }
      }
      setPreviewItems(trail);
      setWorkbookFinal(wbBase);
      setIsPreFlightOpen(true);
    } catch (err: any) { alert("Erro união: " + err.message); }
    finally { setIsProcessing(false); }
  };

  // TI: FUNÇÃO MESTRE PARA GERAR O ZIP ESTRUTURADO
 const baixarPacoteCompleto = async () => {
    if (!workbookFinal || !cachedContent) return;
    setIsProcessing(true);
    
    console.log("📦 [TI] Iniciando montagem do pacote de auditoria...");
    const zip = new JSZip();
    const pastaRaiz = zip.folder("DadosParaEnvio");
    const pastaAnexos = pastaRaiz?.folder("anexos");

    try {
      // 1. Inserir o Relatório Mestre (Excel)
      const excelBuffer = XLSX.write(workbookFinal, { bookType: 'xlsx', type: 'array' });
      pastaRaiz?.file(`RELATORIO_CONSOLIDADO_${cachedContent.projeto.codigo}.xlsx`, excelBuffer);

      // 2. Identificar anexos legítimos (Filtro por caminho do Cloud Storage)
      const anexosLegitimos = previewItems.filter(item => 
        item.value && 
        typeof item.value === 'string' && 
        item.value.startsWith('projetos/')
      );

      console.log(`📎 [TI] Encontrados ${anexosLegitimos.length} anexos para processamento.`);

      // 3. Download paralelo dos arquivos binários
      const downloadPromises = anexosLegitimos.map(async (anexo) => {
        try {
          const res = await fetch(`/api/download-arquivo?path=${encodeURIComponent(anexo.value)}`);
          if (!res.ok) throw new Error(`Falha HTTP: ${res.status}`);
          
          const data = await res.json();
          
          // Extrai o nome do arquivo (ex: 6.1_foto.jpg)
          const fileName = String(anexo.value).split('/').pop() || `anexo_${anexo.id}_${Date.now()}`;
          
          // Conversão robusta de Base64 para ArrayBuffer
          const binaryString = window.atob(data.base64);
          const bytes = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          // Insere na subpasta anexos do ZIP
          pastaAnexos?.file(fileName, bytes.buffer);
          console.log(`✅ [TI] Incluído no pacote: ${fileName}`);
        } catch (e: any) {
          console.error(`❌ [TI] Falha crítica no anexo ${anexo.id}:`, e.message);
        }
      });

      // Aguarda todos os downloads terminarem
      await Promise.all(downloadPromises);

      // 4. Finalização e Download do Usuário
      const content = await zip.generateAsync({ 
        type: "blob",
        compression: "DEFLATE",
        compressionOptions: { level: 9 } // Compressão máxima
      });

      console.log("🚀 [TI] Pacote ZIP gerado com sucesso.");
      saveAs(content, `PACOTE_AUDITORIA_${cachedContent.projeto.codigo}.zip`);
      setIsPreFlightOpen(false);

    } catch (err: any) {
      console.error("❌ [TI] Erro fatal na geração do ZIP:", err);
      alert("Erro ao gerar o pacote ZIP. Verifique o console para detalhes.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-10">
      <PreFlightModal 
        isOpen={isPreFlightOpen} 
        onClose={() => setIsPreFlightOpen(false)} 
        onConfirm={baixarPacoteCompleto} // TI: Agora confirma para baixar o ZIP
        previewData={previewItems} 
      />
      
      <div className="bg-slate-900 p-10 rounded-[3.5rem] shadow-2xl text-white relative overflow-hidden">
        <h2 className="text-3xl font-black italic uppercase tracking-tighter">📊 Consolidação Inteligente</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
          <select value={selectedProject} onChange={(e) => { setSelectedProject(e.target.value); if(e.target.value) sincronizarAuditoria(e.target.value); }} className="bg-white/10 border border-white/20 p-5 rounded-2xl text-white font-bold outline-none">
            <option value="" className="text-slate-800">Escolha uma auditoria...</option>
            {historico.map(p => <option key={p.codigo} value={p.codigo} className="text-slate-800">{p.mesAno} - {p.codigo}</option>)}
          </select>
          <button onClick={processarArquivoFinal} disabled={isProcessing || !cachedContent} className="bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 p-5 rounded-2xl font-black uppercase text-xs tracking-widest shadow-lg">🚀 Processar e Revisar</button>
        </div>
      </div>

      {cachedContent && (
        <div className="animate-in slide-in-from-bottom-6 duration-700 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 px-6">
            {Object.keys(cachedContent.dataBase).map(nome => (
              <div key={nome} className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm flex flex-col justify-between group hover:border-indigo-400 hover:shadow-xl transition-all relative">
                <h4 className="font-black text-slate-800 text-base uppercase mb-1">{nome}</h4>
                <p className="text-[10px] text-slate-400 font-bold uppercase italic">{Object.keys(cachedContent.dataBase[nome]).length} respostas capturadas</p>
                <button onClick={() => { setPreviewItems([]); processarArquivoFinal(); }} className="mt-8 py-3.5 bg-slate-50 text-indigo-600 rounded-xl text-[9px] font-black uppercase hover:bg-indigo-600 hover:text-white transition-all">Analisar Dados</button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}