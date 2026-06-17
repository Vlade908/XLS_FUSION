import { useEffect, useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { motion, AnimatePresence } from 'framer-motion';
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import {
  BarChart2, Users, FileText, TrendingUp, Globe, Lock, Zap,
  RefreshCw, AlertCircle, Award, Lightbulb, ArrowUpRight,
  CheckCircle, Clock, Server, Upload, FlaskConical, ShieldCheck,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

interface AnalyticsData {
  totalForms: number;
  totalResponses: number;
  uniqueRespondents: number;
  publicForms: number;
  privateForms: number;
  avgResponsesPerForm: number;
  timeSeries: { date: string; respostas: number }[];
  perForm: { name: string; fullName: string; respostas: number; perguntas: number; isPublic: boolean }[];
  questionTypeDistribution: { name: string; value: number }[];
}

interface SystemMetrics {
  upload: {
    totalUploads: number;
    successfulUploads: number;
    failedUploads: number;
    successRatePct: number | null;
    avgParsingMs: number | null;
    heavyUploadCount: number;
  };
  coverage: {
    lines: number | null;
    statements: number | null;
    functions: number | null;
    branches: number | null;
    linesCovered: number | null;
    linesTotal: number | null;
  } | null;
}

// ─── Animated Counter ─────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1400, delay = 0) {
  const [value, setValue] = useState(0);
  const started = useRef(false);
  useEffect(() => {
    if (target === 0) { setValue(0); return; }
    const timeout = setTimeout(() => {
      started.current = true;
      const start = performance.now();
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 4);
        setValue(parseFloat((eased * target).toFixed(1)));
        if (progress < 1) requestAnimationFrame(step);
        else setValue(target);
      };
      requestAnimationFrame(step);
    }, delay);
    return () => clearTimeout(timeout);
  }, [target, duration, delay]);
  return value;
}

// ─── Sparkline data for KPI cards ─────────────────────────────────────────────

function MiniSparkline({ data, color }: { data: number[]; color: string }) {
  const max = Math.max(...data, 1);
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 32 - (v / max) * 28;
    return `${x},${y}`;
  }).join(' ');
  return (
    <svg viewBox="0 0 100 36" className="w-full h-9 mt-2" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

interface KpiCardProps {
  label: string;
  value: number;
  suffix?: string;
  prefix?: string;
  icon: React.ReactNode;
  colorClass: string;
  iconColorClass: string;
  sparkData?: number[];
  sparkColor?: string;
  trend?: string;
  trendUp?: boolean;
  delay?: number;
}

function KpiCard({ label, value, suffix = '', prefix = '', icon, colorClass, iconColorClass, sparkData, sparkColor, trend, trendUp, delay = 0 }: KpiCardProps) {
  const displayVal = value % 1 === 0 ? Math.round(value) : value;
  const animated = useCountUp(displayVal, 1200, delay * 1000);
  const showVal = value % 1 === 0 ? Math.round(animated) : parseFloat(animated.toFixed(1));

  return (
    <motion.div
      initial={{ opacity: 0, y: 28, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="glass-card rounded-2xl p-5 relative overflow-hidden group cursor-default border border-white/10 dark:border-white/5"
    >
      {/* Glow orb */}
      <div className={`absolute -top-8 -right-8 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-30 transition-opacity duration-500 ${colorClass}`} />

      <div className="flex items-start justify-between mb-1">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">{label}</p>
        <div className={`p-2 rounded-xl ${iconColorClass}`}>
          {icon}
        </div>
      </div>

      <p className="text-4xl font-black tracking-tight text-slate-900 dark:text-white font-outfit mt-2">
        {prefix}{typeof showVal === 'number' ? showVal.toLocaleString('pt-BR') : showVal}{suffix}
      </p>

      {sparkData && sparkColor && (
        <MiniSparkline data={sparkData} color={sparkColor} />
      )}

      {trend && (
        <div className={`flex items-center gap-1 mt-2 text-[10px] font-black ${trendUp ? 'text-emerald-500' : 'text-rose-500'}`}>
          <ArrowUpRight className={`w-3 h-3 ${!trendUp && 'rotate-90'}`} />
          {trend}
        </div>
      )}
    </motion.div>
  );
}

// ─── Custom Tooltip ───────────────────────────────────────────────────────────

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-slate-900/95 backdrop-blur-sm text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700/80 text-xs">
      <p className="font-black text-slate-300 mb-1.5 pb-1.5 border-b border-slate-700">{label}</p>
      {payload.map((p: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full" style={{ background: p.color }} />
          <span className="text-slate-400">{p.name}:</span>
          <span className="text-white font-bold">{p.value}</span>
        </div>
      ))}
    </div>
  );
};

// ─── Chart Card ───────────────────────────────────────────────────────────────

function ChartCard({ title, subtitle, children, delay = 0, badge }: {
  title: string; subtitle?: string; children: React.ReactNode; delay?: number; badge?: string;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      className="glass-card rounded-2xl border border-white/10 dark:border-white/5 p-6"
    >
      <div className="flex items-start justify-between mb-5">
        <div>
          <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 leading-tight">{title}</h3>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-medium">{subtitle}</p>}
        </div>
        {badge && (
          <span className="text-[9px] font-black uppercase tracking-wider px-2.5 py-1 bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 rounded-full border border-indigo-200 dark:border-indigo-900">
            {badge}
          </span>
        )}
      </div>
      {children}
    </motion.div>
  );
}

// ─── Insight Card ─────────────────────────────────────────────────────────────

function InsightCard({ icon, text, color, delay }: { icon: React.ReactNode; text: string; color: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay, duration: 0.4 }}
      className={`flex items-start gap-3 p-3.5 rounded-xl border ${color}`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 leading-relaxed">{text}</p>
    </motion.div>
  );
}

// ─── Pie colours ──────────────────────────────────────────────────────────────
const PIE_COLORS = ['#6366f1', '#8b5cf6', '#a855f7', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AnalyticsView() {
  const { authFetch } = useAuth();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [sysMetrics, setSysMetrics] = useState<SystemMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const hasFetched = useRef(false);

  const fetchAnalytics = async () => {
    setLoading(true);
    setError('');
    try {
      const [res, sysRes] = await Promise.all([
        authFetch('/api/analytics/overview'),
        authFetch('/api/analytics/system-metrics'),
      ]);
      if (!res.ok) throw new Error('Falha ao carregar dados de analytics.');
      const json = await res.json();
      setData(json);
      if (sysRes.ok) {
        const sysJson = await sysRes.json();
        setSysMetrics(sysJson);
      }
      setLastUpdated(new Date());
    } catch (err: any) {
      setError(err.message || 'Erro desconhecido.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!hasFetched.current) {
      hasFetched.current = true;
      fetchAnalytics();
    }
  }, []);

  // ─── Loading ──────────────────────────────────────────────────────────────

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5">
        <div className="relative">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 1.2, ease: 'linear' }}
            className="w-14 h-14 rounded-full border-4 border-indigo-100 dark:border-indigo-900 border-t-indigo-600"
          />
          <div className="absolute inset-0 flex items-center justify-center">
            <BarChart2 className="w-5 h-5 text-indigo-500" />
          </div>
        </div>
        <div className="text-center">
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">Calculando métricas...</p>
          <p className="text-xs text-slate-400 dark:text-slate-500 mt-1">Agregando dados de todos os formulários</p>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] gap-5 text-center">
        <div className="p-5 bg-rose-50 dark:bg-rose-950/20 rounded-2xl border border-rose-200 dark:border-rose-900/50">
          <AlertCircle className="w-10 h-10 text-rose-500 mx-auto mb-3" />
          <p className="text-sm font-black text-rose-700 dark:text-rose-400 mb-1">Erro ao carregar</p>
          <p className="text-xs text-rose-500 dark:text-rose-500">{error}</p>
        </div>
        <button onClick={fetchAnalytics} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl transition-all shadow-lg shadow-indigo-500/20">
          <RefreshCw className="w-4 h-4" /> Tentar novamente
        </button>
      </div>
    );
  }

  if (!data) return null;

  // ─── Computed ─────────────────────────────────────────────────────────────

  const top5Forms = data.perForm.slice(0, 5);

  // Time series with cumulative line
  const timeSeriesWithCumulative = data.timeSeries.reduce((acc: any[], item, idx) => {
    const prev = acc[idx - 1];
    return [...acc, { ...item, acumulado: (prev?.acumulado || 0) + item.respostas }];
  }, []);

  // Last 7-day total vs prev 7
  const last7 = data.timeSeries.slice(-7).reduce((s, d) => s + d.respostas, 0);
  const prev7 = data.timeSeries.slice(-14, -7).reduce((s, d) => s + d.respostas, 0);
  const trend7pct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : 0;
  const trendUp = trend7pct >= 0;

  // Spark data (last 7 days)
  const sparkData = data.timeSeries.slice(-7).map(d => d.respostas);

  // Most active day
  const peakDay = [...data.timeSeries].sort((a, b) => b.respostas - a.respostas)[0];

  // Insights
  const insights: { icon: React.ReactNode; text: string; color: string }[] = [];

  if (data.totalForms > 0 && data.totalResponses === 0) {
    insights.push({
      icon: <Clock className="w-4 h-4 text-amber-500" />,
      text: 'Seus formulários ainda não receberam respostas. Compartilhe os links para começar a coletar dados.',
      color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
    });
  }
  if (data.totalResponses > 0 && peakDay?.respostas > 1) {
    insights.push({
      icon: <TrendingUp className="w-4 h-4 text-emerald-500" />,
      text: `Dia de pico: ${peakDay.date} com ${peakDay.respostas} ${peakDay.respostas === 1 ? 'resposta' : 'respostas'}. Identifique o que gerou esse engajamento.`,
      color: 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/50',
    });
  }
  if (data.privateForms > 0 && data.publicForms === 0) {
    insights.push({
      icon: <Globe className="w-4 h-4 text-indigo-500" />,
      text: 'Todos os seus formulários são privados. Considere tornar alguns públicos para aumentar o alcance.',
      color: 'bg-indigo-50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50',
    });
  }
  if (data.avgResponsesPerForm >= 5) {
    insights.push({
      icon: <CheckCircle className="w-4 h-4 text-violet-500" />,
      text: `Ótima taxa de engajamento! Média de ${data.avgResponsesPerForm} respostas por formulário está acima da média.`,
      color: 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-900/50',
    });
  }
  if (data.totalForms === 0) {
    insights.push({
      icon: <Lightbulb className="w-4 h-4 text-amber-500" />,
      text: 'Comece criando seu primeiro formulário na aba "Formulários" para ver dados aqui.',
      color: 'bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50',
    });
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">

      {/* ─── Page Header ─────────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="glass-card rounded-2xl border border-white/10 dark:border-white/5 p-6"
      >
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-tr from-indigo-500 to-violet-600 rounded-2xl shadow-lg shadow-indigo-500/25">
              <BarChart2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight font-outfit">
                Analytics
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                Visão consolidada · {data.totalForms} formulário{data.totalForms !== 1 ? 's' : ''} · {data.totalResponses} resposta{data.totalResponses !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            {lastUpdated && (
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-900/60 px-3 py-1.5 rounded-full">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Atualizado às {lastUpdated.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            )}
            <button
              onClick={fetchAnalytics}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 font-bold text-xs rounded-xl transition-all shadow-sm"
            >
              <motion.div animate={loading ? { rotate: 360 } : { rotate: 0 }} transition={loading ? { repeat: Infinity, duration: 0.9, ease: 'linear' } : {}}>
                <RefreshCw className="w-3.5 h-3.5" />
              </motion.div>
              Atualizar
            </button>
          </div>
        </div>
      </motion.div>

      {/* ─── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard
          label="Formulários Criados"
          value={data.totalForms}
          icon={<FileText className="w-4 h-4 text-indigo-500" />}
          colorClass="bg-indigo-500"
          iconColorClass="bg-indigo-100 dark:bg-indigo-900/60"
          sparkData={sparkData.map((_, i) => data.totalForms > i ? 1 : 0)}
          sparkColor="#6366f1"
          delay={0.05}
        />
        <KpiCard
          label="Total de Respostas"
          value={data.totalResponses}
          icon={<Zap className="w-4 h-4 text-violet-500" />}
          colorClass="bg-violet-500"
          iconColorClass="bg-violet-100 dark:bg-violet-900/60"
          sparkData={sparkData}
          sparkColor="#8b5cf6"
          trend={trend7pct !== 0 ? `${trendUp ? '+' : ''}${trend7pct}% vs semana anterior` : undefined}
          trendUp={trendUp}
          delay={0.1}
        />
        <KpiCard
          label="Respondentes Únicos"
          value={data.uniqueRespondents}
          icon={<Users className="w-4 h-4 text-emerald-500" />}
          colorClass="bg-emerald-500"
          iconColorClass="bg-emerald-100 dark:bg-emerald-900/60"
          sparkData={sparkData.map(v => v > 0 ? 1 : 0)}
          sparkColor="#10b981"
          delay={0.15}
        />
        <KpiCard
          label="Média por Formulário"
          value={data.avgResponsesPerForm}
          suffix=" resp"
          icon={<TrendingUp className="w-4 h-4 text-amber-500" />}
          colorClass="bg-amber-500"
          iconColorClass="bg-amber-100 dark:bg-amber-900/60"
          sparkData={top5Forms.map(f => f.respostas)}
          sparkColor="#f59e0b"
          delay={0.2}
        />
      </div>

      {/* ─── Visibility Mini Stats ────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.22, duration: 0.4 }}
          className="glass-card rounded-2xl border border-white/10 dark:border-white/5 p-5 flex items-center gap-4"
        >
          <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 rounded-xl shrink-0">
            <Globe className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Formulários Públicos</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-outfit">{data.publicForms}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {data.totalForms > 0 ? Math.round((data.publicForms / data.totalForms) * 100) : 0}%
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">do total</div>
          </div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="glass-card rounded-2xl border border-white/10 dark:border-white/5 p-5 flex items-center gap-4"
        >
          <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-xl shrink-0">
            <Lock className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Formulários Privados</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white font-outfit">{data.privateForms}</p>
          </div>
          <div className="ml-auto text-right">
            <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
              {data.totalForms > 0 ? Math.round((data.privateForms / data.totalForms) * 100) : 0}%
            </div>
            <div className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">do total</div>
          </div>
        </motion.div>
      </div>

      {/* ─── Charts Row 1: Area Chart (full width) ───────────────────────── */}
      <ChartCard
        title="Evolução de Respostas — Últimos 14 Dias"
        subtitle="Submissões diárias e total acumulado"
        badge="14 DIAS"
        delay={0.28}
      >
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={timeSeriesWithCumulative} margin={{ top: 5, right: 8, left: -28, bottom: 0 }}>
            <defs>
              <linearGradient id="gradRespostas" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradAcumulado" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#a855f7" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" />
            <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} interval={1} />
            <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend
              iconType="circle" iconSize={7}
              formatter={(val) => <span style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8' }}>{val}</span>}
            />
            <Area type="monotone" dataKey="acumulado" name="Acumulado" stroke="#a855f7" strokeWidth={2} fill="url(#gradAcumulado)"
              dot={false} activeDot={{ r: 4, fill: '#a855f7', stroke: '#fff', strokeWidth: 2 }} animationDuration={1400} />
            <Area type="monotone" dataKey="respostas" name="Diário" stroke="#6366f1" strokeWidth={2.5} fill="url(#gradRespostas)"
              dot={{ r: 3, fill: '#6366f1', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#6366f1', stroke: '#fff', strokeWidth: 2 }} animationDuration={1000} />
          </AreaChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* ─── Charts Row 2: Bar + Pie ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        {/* Bar Chart */}
        <ChartCard title="Top Formulários por Respostas" subtitle="Ranking dos mais respondidos" badge="TOP 5" delay={0.32}>
          {top5Forms.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-slate-400 dark:text-slate-500 gap-2">
              <BarChart2 className="w-8 h-8 opacity-30" />
              <p className="text-xs font-semibold">Sem dados ainda</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={top5Forms} margin={{ top: 4, right: 4, left: -28, bottom: 0 }} barSize={22}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6366f1" />
                    <stop offset="100%" stopColor="#a855f7" />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.1)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} />
                <YAxis tick={{ fontSize: 9, fill: '#94a3b8', fontWeight: 700 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="respostas" name="Respostas" fill="url(#barGrad)" radius={[8, 8, 0, 0]} animationDuration={1000} animationEasing="ease-out" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartCard>

        {/* Donut / Pie */}
        <ChartCard title="Tipos de Perguntas Usadas" subtitle="Distribuição por tipo em todos os formulários" delay={0.36}>
          {data.questionTypeDistribution.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-[220px] text-slate-400 dark:text-slate-500 gap-2">
              <FileText className="w-8 h-8 opacity-30" />
              <p className="text-xs font-semibold">Nenhuma pergunta criada ainda</p>
            </div>
          ) : (
            <div className="flex items-center gap-4">
              <ResponsiveContainer width="55%" height={220}>
                <PieChart>
                  <Pie data={data.questionTypeDistribution} cx="50%" cy="50%" innerRadius={55} outerRadius={85}
                    paddingAngle={3} dataKey="value" animationBegin={300} animationDuration={1000}>
                    {data.questionTypeDistribution.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} stroke="transparent" />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              {/* Custom legend */}
              <div className="flex-1 space-y-2">
                {data.questionTypeDistribution.map((item, i) => {
                  const total = data.questionTypeDistribution.reduce((s, d) => s + d.value, 0);
                  const pct = Math.round((item.value / total) * 100);
                  return (
                    <div key={i} className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }} />
                      <span className="text-[10px] font-bold text-slate-600 dark:text-slate-400 flex-1 truncate">{item.name}</span>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400">{pct}%</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </ChartCard>
      </div>

      {/* ─── Insights ────────────────────────────────────────────────────────── */}
      {insights.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.5 }}
          className="glass-card rounded-2xl border border-white/10 dark:border-white/5 p-6"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
              <Lightbulb className="w-4 h-4 text-amber-500" />
            </div>
            <div>
              <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Insights Automáticos</h3>
              <p className="text-xs text-slate-400 dark:text-slate-500 font-medium">Observações geradas a partir dos seus dados</p>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {insights.map((insight, i) => (
              <InsightCard key={i} {...insight} delay={0.45 + i * 0.07} />
            ))}
          </div>
        </motion.div>
      )}

      {/* ─── Ranking Table ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.44, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-3 bg-gradient-to-r from-slate-50/50 to-transparent dark:from-slate-900/30">
          <div className="p-2 bg-amber-100 dark:bg-amber-900/40 rounded-xl">
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Ranking de Formulários</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">Ordenado por total de respostas recebidas</p>
          </div>
        </div>
        <div className="overflow-x-auto custom-scrollbar">
          {data.perForm.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400 dark:text-slate-500 gap-2">
              <FileText className="w-10 h-10 opacity-30" />
              <p className="text-xs font-semibold">Nenhum formulário criado ainda</p>
            </div>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-900/40">
                  <th className="text-left px-6 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-12">#</th>
                  <th className="text-left px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Formulário</th>
                  <th className="text-center px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Visibilidade</th>
                  <th className="text-right px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Perguntas</th>
                  <th className="text-right px-6 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 min-w-[180px]">Respostas</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {data.perForm.map((form, idx) => {
                    const maxResp = data.perForm[0]?.respostas || 1;
                    const barWidth = maxResp > 0 ? (form.respostas / maxResp) * 100 : 0;
                    return (
                      <motion.tr
                        key={form.fullName + idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.05 * idx + 0.5, duration: 0.3 }}
                        className="border-t border-slate-100 dark:border-slate-800/50 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors group"
                      >
                        <td className="px-6 py-4">
                          {idx === 0 ? <span className="text-lg">🥇</span>
                            : idx === 1 ? <span className="text-lg">🥈</span>
                              : idx === 2 ? <span className="text-lg">🥉</span>
                                : <span className="w-6 h-6 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg text-[10px] font-black flex items-center justify-center">{idx + 1}</span>}
                        </td>
                        <td className="px-3 py-4">
                          <p className="font-bold text-slate-800 dark:text-slate-200 leading-tight truncate max-w-[200px]" title={form.fullName}>
                            {form.fullName}
                          </p>
                        </td>
                        <td className="px-3 py-4 text-center">
                          {form.isPublic ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 text-[9px] font-black rounded-full border border-emerald-100 dark:border-emerald-900/50 uppercase tracking-wider">
                              <Globe className="w-2.5 h-2.5" /> Público
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 text-[9px] font-black rounded-full border border-slate-200 dark:border-slate-700 uppercase tracking-wider">
                              <Lock className="w-2.5 h-2.5" /> Privado
                            </span>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right">
                          <span className="font-black text-slate-600 dark:text-slate-400">{form.perguntas}</span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex items-center justify-end gap-3">
                            <div className="flex-1 max-w-[100px] h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{ width: `${barWidth}%` }}
                                transition={{ delay: 0.6 + idx * 0.06, duration: 0.7, ease: 'easeOut' }}
                                className={`h-full rounded-full ${form.respostas > 0
                                  ? 'bg-gradient-to-r from-indigo-500 to-violet-500'
                                  : 'bg-slate-300 dark:bg-slate-700'}`}
                              />
                            </div>
                            <span className={`font-black text-sm w-6 text-right ${form.respostas > 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-slate-400 dark:text-slate-600'}`}>
                              {form.respostas}
                            </span>
                          </div>
                        </td>
                      </motion.tr>
                    );
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          )}
        </div>
      </motion.div>

      {/* ─── System Metrics ──────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.55, delay: 0.46, ease: [0.22, 1, 0.36, 1] }}
        className="glass-card rounded-2xl border border-white/10 dark:border-white/5 overflow-hidden"
      >
        <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 flex items-center gap-3 bg-gradient-to-r from-indigo-50/50 to-transparent dark:from-indigo-950/20">
          <div className="p-2 bg-indigo-100 dark:bg-indigo-900/50 rounded-xl">
            <Server className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Métricas do Sistema</h3>
            <p className="text-xs text-slate-400 dark:text-slate-500 font-medium mt-0.5">KPIs de performance, qualidade e infraestrutura</p>
          </div>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-4">

          {/* ── KPI 1: Parsing Time ─────────────────────────────────────────── */}
          {(() => {
            const TARGET_MS = 2000;
            const avg = sysMetrics?.upload?.avgParsingMs ?? null;
            const hasData = avg !== null;
            const ok = hasData && avg <= TARGET_MS;
            const pct = hasData ? Math.min((avg / TARGET_MS) * 100, 100) : 0;
            return (
              <div className={`rounded-2xl border p-5 space-y-3 ${
                !hasData ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                : ok ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Upload className="w-4 h-4 text-indigo-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Tempo Médio de Parsing</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    !hasData ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    : ok ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-400'
                  }`}>
                    {!hasData ? 'Aguardando' : ok ? '✓ Meta OK' : '✗ Acima'}
                  </span>
                </div>
                <div className="text-center py-1">
                  <p className={`text-4xl font-black font-outfit ${
                    !hasData ? 'text-slate-400 dark:text-slate-600'
                    : ok ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {hasData ? `${avg}ms` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Meta: &lt; 2.000 ms</p>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                    <span>0 ms</span><span>2.000 ms</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: hasData ? `${pct}%` : '0%' }}
                      transition={{ delay: 0.7, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        !hasData ? 'bg-slate-300'
                        : ok ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  {!hasData
                    ? 'Nenhum upload realizado ainda. Faça upload de uma planilha para gerar dados.'
                    : `Baseado em ${sysMetrics!.upload.successfulUploads} upload${sysMetrics!.upload.successfulUploads !== 1 ? 's' : ''} bem-sucedido${sysMetrics!.upload.successfulUploads !== 1 ? 's' : ''}.`
                  }
                </p>
              </div>
            );
          })()}

          {/* ── KPI 2: Upload Success Rate ───────────────────────────────────── */}
          {(() => {
            const TARGET_PCT = 99;
            const rate = sysMetrics?.upload?.successRatePct ?? null;
            const total = sysMetrics?.upload?.totalUploads ?? 0;
            const hasData = rate !== null && total > 0;
            const ok = hasData && rate! >= TARGET_PCT;
            const arcPct = hasData ? rate! : 0;
            return (
              <div className={`rounded-2xl border p-5 space-y-3 ${
                !hasData ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                : ok ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-amber-200 dark:border-amber-900/50 bg-amber-50/50 dark:bg-amber-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-violet-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Taxa de Sucesso Uploads</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    !hasData ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    : ok ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-400'
                  }`}>
                    {!hasData ? 'Aguardando' : ok ? '✓ Meta OK' : '⚠ Abaixo'}
                  </span>
                </div>
                <div className="text-center py-1">
                  <p className={`text-4xl font-black font-outfit ${
                    !hasData ? 'text-slate-400 dark:text-slate-600'
                    : ok ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-amber-600 dark:text-amber-400'
                  }`}>
                    {hasData ? `${arcPct.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Meta: &gt; 99%</p>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                    <span>0%</span><span>100%</span>
                  </div>
                  <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: hasData ? `${arcPct}%` : '0%' }}
                      transition={{ delay: 0.75, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        !hasData ? 'bg-slate-300'
                        : ok ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-amber-400 to-amber-500'
                      }`}
                    />
                  </div>
                </div>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                  {!hasData
                    ? 'Nenhum upload realizado ainda. Faça upload de uma planilha para gerar dados.'
                    : `${sysMetrics!.upload.successfulUploads} sucessos / ${total} tentativas (${sysMetrics!.upload.failedUploads} falha${sysMetrics!.upload.failedUploads !== 1 ? 's' : ''}).`
                  }
                </p>
              </div>
            );
          })()}

          {/* ── KPI 3: Test Coverage ─────────────────────────────────────────── */}
          {(() => {
            const TARGET_PCT = 70;
            const cov = sysMetrics?.coverage;
            const lines = cov?.lines ?? null;
            const hasData = lines !== null;
            const ok = hasData && lines! >= TARGET_PCT;
            const pct = hasData ? Math.min(lines!, 100) : 0;
            return (
              <div className={`rounded-2xl border p-5 space-y-3 ${
                !hasData ? 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/30'
                : ok ? 'border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/50 dark:bg-emerald-950/20'
                : 'border-rose-200 dark:border-rose-900/50 bg-rose-50/50 dark:bg-rose-950/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-purple-500" />
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Cobertura de Testes</span>
                  </div>
                  <span className={`text-[9px] font-black uppercase px-2 py-0.5 rounded-full ${
                    !hasData ? 'bg-slate-200 dark:bg-slate-800 text-slate-500'
                    : ok ? 'bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-400'
                    : 'bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-400'
                  }`}>
                    {!hasData ? 'Sem dados' : ok ? '✓ Meta OK' : '✗ Abaixo da meta'}
                  </span>
                </div>
                <div className="text-center py-1">
                  <p className={`text-4xl font-black font-outfit ${
                    !hasData ? 'text-slate-400 dark:text-slate-600'
                    : ok ? 'text-emerald-600 dark:text-emerald-400'
                    : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {hasData ? `${lines!.toFixed(1)}%` : '—'}
                  </p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Meta: &gt; 70% de linhas cobertas</p>
                </div>
                <div>
                  <div className="flex justify-between text-[9px] font-bold text-slate-400 mb-1">
                    <span>0%</span><span>70% (meta)</span>
                  </div>
                  <div className="relative h-2 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="absolute top-0 h-full w-0.5 bg-indigo-400/60 z-10" style={{ left: '70%' }} />
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: hasData ? `${pct}%` : '0%' }}
                      transition={{ delay: 0.8, duration: 0.8, ease: 'easeOut' }}
                      className={`h-full rounded-full ${
                        !hasData ? 'bg-slate-300'
                        : ok ? 'bg-gradient-to-r from-emerald-400 to-emerald-500'
                        : 'bg-gradient-to-r from-rose-400 to-rose-500'
                      }`}
                    />
                  </div>
                </div>
                {hasData && cov && (
                  <div className="grid grid-cols-3 gap-2 pt-1 border-t border-slate-100 dark:border-slate-800/60 mt-1">
                    {[
                      { label: 'Funções', val: cov.functions },
                      { label: 'Branches', val: cov.branches },
                      { label: 'Cobertas', raw: `${cov.linesCovered}/${cov.linesTotal}` },
                    ].map((m: any) => (
                      <div key={m.label} className="text-center">
                        <p className="text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">{m.label}</p>
                        <p className="text-xs font-black text-slate-700 dark:text-slate-300 mt-0.5">
                          {m.raw ?? (m.val !== null ? `${(m.val as number).toFixed(1)}%` : '—')}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
                {!hasData && (
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">
                    Execute <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded text-[9px]">npm test -- --coverage</code> para gerar dados.
                  </p>
                )}
              </div>
            );
          })()}
        </div>
      </motion.div>

    </div>
  );
}
