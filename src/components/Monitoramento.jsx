import { useState, useEffect, useCallback } from 'react';
import { apiClient } from '@/api/apiClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import {
  AlertTriangle, CheckCircle2, Bell, Settings, X, Save, TrendingUp, Send
} from 'lucide-react';
import { getSlaTextClass, getSlaStatus } from '../lib/sla';

const DEFAULT_METAS = {
  desocupacao: 30,
  respostaHigiene: 15,
  execucaoHigiene: 30,
  transporte: 20,
  tat: 100,
};

const ETAPAS = [
  { key: 'desocupacao', label: 'Desocupação (Alta → Livre)', categoria: 'escriturario', cor: '#3B82F6' },
  { key: 'respostaHigiene', label: 'Resposta Higiene (Livre → Início)', categoria: 'higiene', cor: '#12B37A' },
  { key: 'execucaoHigiene', label: 'Execução Higiene (Setup Físico)', categoria: 'higiene', cor: '#F59E0B' },
  { key: 'transporte', label: 'Resposta Transporte (Limpo → Entrada)', categoria: 'maqueiro', cor: '#8B5CF6' },
  { key: 'tat', label: 'Giro Total (TAT Macro)', categoria: null, cor: '#183D2A' },
];

const CATEGORIA_LABELS = { escriturario: 'Escriturário', higiene: 'Higiene', maqueiro: 'Maqueiro' };
const CATEGORIA_COLORS = { escriturario: 'bg-blue-100 text-blue-700', higiene: 'bg-green-100 text-green-700', maqueiro: 'bg-orange-100 text-orange-700' };
const METRICS_SCALE = {
  cardPadding: 'p-8',
  title: 'text-sm',
  value: 'text-6xl',
  unit: 'text-2xl',
  meta: 'text-base',
  sub: 'text-sm',
  gridGap: 'gap-5',
  summaryTitle: 'text-sm',
  summaryValue: 'text-6xl',
  summaryUnit: 'text-2xl',
  summarySub: 'text-sm',
};

function calcMetricas(eventos) {
  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  const desocupacao = [], respostaHigiene = [], execucaoHigiene = [], transporte = [], tat = [];

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach(e => {
      if (e.tipo === 'alta') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) desocupacao.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
        const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (entrada) tat.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'saida_paciente') {
        const ini = evts.find(x => x.tipo === 'inicio_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ini) respostaHigiene.push((new Date(ini.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) execucaoHigiene.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'fim_higiene') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) transporte.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return {
    desocupacao: avg(desocupacao),
    respostaHigiene: avg(respostaHigiene),
    execucaoHigiene: avg(execucaoHigiene),
    transporte: avg(transporte),
    tat: avg(tat),
  };
}

function calcTendencia(eventos) {
  const horas = {};
  for (let h = 0; h < 24; h += 2) {
    const key = `${String(h).padStart(2, '0')}:00`;
    horas[key] = { desocupacao: [], respostaHigiene: [], execucaoHigiene: [], transporte: [] };
  }

  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach(e => {
      const hora = new Date(e.timestamp).getHours();
      const slot = `${String(Math.floor(hora / 2) * 2).padStart(2, '0')}:00`;
      if (!horas[slot]) return;
      const h = horas[slot];
      if (e.tipo === 'alta') {
        const s = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (s) h.desocupacao.push((new Date(s.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'saida_paciente') {
        const ini = evts.find(x => x.tipo === 'inicio_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ini) h.respostaHigiene.push((new Date(ini.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) h.execucaoHigiene.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'fim_higiene') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) h.transporte.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return Object.entries(horas).map(([hora, d]) => ({
    hora,
    'Desocupação': avg(d.desocupacao),
    'Resp. Higiene': avg(d.respostaHigiene),
    'Execução': avg(d.execucaoHigiene),
    'Transporte': avg(d.transporte),
  }));
}

function calcUnidadePerf(eventos, leitos) {
  const unidades = {};
  leitos.forEach(l => { if (l.unidade && !unidades[l.unidade]) unidades[l.unidade] = { higiene: [], transp: [], tat: [] }; });

  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  Object.entries(byLeito).forEach(([lid, evts]) => {
    const leito = leitos.find(l => l.id === lid);
    if (!leito?.unidade || !unidades[leito.unidade]) return;
    const u = unidades[leito.unidade];
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach(e => {
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) u.higiene.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'fim_higiene') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) u.transp.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'alta') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) u.tat.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  return Object.entries(unidades)
    .map(([nome, d]) => ({ nome, higiene: avg(d.higiene), transp: avg(d.transp), tat: avg(d.tat) }))
    .filter(u => u.tat || u.higiene);
}

// ─── Modal de configuração de metas ───────────────────────────────────────────
function ModalMetas({ metas, onChange, onClose }) {
  const [local, setLocal] = useState({ ...metas });

  const salvar = () => { onChange(local); onClose(); };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-black text-gray-800 flex items-center gap-2"><Settings size={18} className="text-[#12B37A]" /> Configurar Metas de Tempo</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>
        <div className="flex flex-col gap-4">
          {ETAPAS.map(etapa => (
            <div key={etapa.key} className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-gray-700">{etapa.label}</p>
                {etapa.categoria && (
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${CATEGORIA_COLORS[etapa.categoria]}`}>
                    {CATEGORIA_LABELS[etapa.categoria]}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <input
                  type="number"
                  min={1}
                  max={999}
                  value={local[etapa.key]}
                  onChange={e => setLocal(p => ({ ...p, [etapa.key]: parseInt(e.target.value) || 0 }))}
                  className="w-20 border border-gray-200 rounded-lg px-3 py-1.5 text-sm font-bold text-center focus:outline-none focus:border-[#12B37A]"
                />
                <span className="text-xs text-gray-400 w-6">min</span>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-medium hover:bg-gray-50">Cancelar</button>
          <button onClick={salvar} className="flex-1 bg-[#12B37A] hover:bg-[#0fa068] text-white rounded-xl py-2.5 text-sm font-bold flex items-center justify-center gap-2">
            <Save size={15} /> Salvar Metas
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Card de métrica ────────────────────────────────────────────────────────
function MetricCard({ label, value, meta, cor, sub }) {
  const status = getSlaStatus(value, meta);
  const colorClass = getSlaTextClass(value, meta);
  return (
    <div className={`bg-white rounded-2xl border shadow-sm ${METRICS_SCALE.cardPadding} border-gray-100`}>
      <p className={`${METRICS_SCALE.title} font-bold uppercase tracking-widest text-gray-400 mb-3`}>{label}</p>
      <p className={`${METRICS_SCALE.value} font-black leading-none ${colorClass}`}>
        {value !== null ? value : '—'}
        {value !== null && <span className={`${METRICS_SCALE.unit} font-semibold text-gray-400 ml-2`}>min</span>}
      </p>
      <div className={`flex items-center gap-2 mt-3 ${METRICS_SCALE.meta} font-semibold ${colorClass}`}>
        {status === 'Atrasado' ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
        Meta: {meta}min — {status}
      </div>
      {sub && <p className={`${METRICS_SCALE.sub} text-gray-400 mt-1`}>{sub}</p>}
    </div>
  );
}

export default function Monitoramento() {
  const [eventos, setEventos] = useState([]);
  const [leitos, setLeitos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [dispensados, setDispensados] = useState(() => {
    try { return JSON.parse(localStorage.getItem('huuel_alertas_dispensados') || '[]'); }
    catch { return []; }
  });
  const [showMetas, setShowMetas] = useState(false);
  const [metas, setMetas] = useState(() => {
    try { return JSON.parse(localStorage.getItem('huuel_metas') || 'null') || DEFAULT_METAS; }
    catch { return DEFAULT_METAS; }
  });
  const [periodo, setPeriodo] = useState('1');
  const [loading, setLoading] = useState(true);

  const salvarMetas = (novasMetas) => {
    setMetas(novasMetas);
    localStorage.setItem('huuel_metas', JSON.stringify(novasMetas));
  };

  const fetchDados = useCallback(() => {
    Promise.all([
      apiClient.entities.EventoLeito.list('-timestamp', 500),
      apiClient.entities.Leito.filter({ ativo: true }),
    ])
      .then(([evts, lts]) => {
        setEventos(evts);
        setLeitos(lts);
      })
      .catch((error) => {
        console.error(error);
        setEventos([]);
        setLeitos([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchDados();
    const unsub = apiClient.entities.EventoLeito.subscribe(() => fetchDados());
    return unsub;
  }, []);

  const corte = new Date(Date.now() - parseInt(periodo) * 24 * 60 * 60 * 1000);
  const eventosFiltrados = periodo === '1'
    ? eventos.filter(e => new Date(e.timestamp) >= new Date(new Date().setHours(0, 0, 0, 0)))
    : eventos.filter(e => new Date(e.timestamp) >= corte);

  const metricas = calcMetricas(eventosFiltrados);
  const tendencia = calcTendencia(eventosFiltrados);
  const unidadePerf = calcUnidadePerf(eventosFiltrados, leitos);

  // Calcular alertas: leitos que passaram da meta em etapas em andamento
  useEffect(() => {
    const novosAlertas = [];
    const now = new Date();

    // Leitos aguardando higiene há mais tempo que a meta de resposta
    leitos.filter(l => l.status === 'aguardando_higiene' && l.ultimo_evento_at).forEach(l => {
      const minutos = (now - new Date(l.ultimo_evento_at)) / 60000;
      if (minutos > metas.respostaHigiene) {
        if (!dispensados.includes(`rh-${l.id}_${l.ultimo_evento_at}`)) {
          novosAlertas.push({
            id: `rh-${l.id}`,
            tipo: 'Resposta Higiene',
            leito: l.numero,
            unidade: l.unidade,
            quarto: l.quarto,
            minutos: Math.round(minutos),
            meta: metas.respostaHigiene,
            categoria: 'higiene',
            cor: 'border-yellow-300 bg-yellow-50',
            icon: 'yellow',
            ultimo_evento: l.ultimo_evento_at,
          });
        }
      }
    });

    // Leitos em higiene há mais tempo que a meta de execução
    leitos.filter(l => l.status === 'em_higiene' && l.ultimo_evento_at).forEach(l => {
      const minutos = (now - new Date(l.ultimo_evento_at)) / 60000;
      if (minutos > metas.execucaoHigiene) {
        if (!dispensados.includes(`eh-${l.id}_${l.ultimo_evento_at}`)) {
          novosAlertas.push({
            id: `eh-${l.id}`,
            tipo: 'Execução Higiene',
            leito: l.numero,
            unidade: l.unidade,
            quarto: l.quarto,
            minutos: Math.round(minutos),
            meta: metas.execucaoHigiene,
            categoria: 'higiene',
            cor: 'border-orange-300 bg-orange-50',
            icon: 'orange',
            ultimo_evento: l.ultimo_evento_at,
          });
        }
      }
    });

    // Leitos livres aguardando maqueiro
    leitos.filter(l => l.status === 'livre' && l.ultimo_evento_at).forEach(l => {
      const minutos = (now - new Date(l.ultimo_evento_at)) / 60000;
      if (minutos > metas.transporte) {
        if (!dispensados.includes(`tr-${l.id}_${l.ultimo_evento_at}`)) {
          novosAlertas.push({
            id: `tr-${l.id}`,
            tipo: 'Transporte',
            leito: l.numero,
            unidade: l.unidade,
            quarto: l.quarto,
            minutos: Math.round(minutos),
            meta: metas.transporte,
            categoria: 'maqueiro',
            cor: 'border-purple-300 bg-purple-50',
            icon: 'purple',
            ultimo_evento: l.ultimo_evento_at,
          });
        }
      }
    });

    setAlertas(novosAlertas);
  }, [leitos, metas, dispensados]);

  const [notificando, setNotificando] = useState({});
  const [notificados, setNotificados] = useState({});

  const notificar = async (alerta) => {
    setNotificando(n => ({ ...n, [alerta.id]: true }));
    try {
      await apiClient.entities.Notificacao.create({
        titulo: `⚠️ Atraso: ${alerta.tipo}`,
        mensagem: `Leito ${alerta.leito} (${alerta.unidade}) aguardando há ${alerta.minutos}min (Meta: ${alerta.meta}min).`,
        tipo: 'alerta_critico',
        leito: String(alerta.leito),
        unidade: alerta.unidade,
        quarto: alerta.quarto || '-',
        categoria_destino: alerta.categoria,
        rota: `/${alerta.categoria}`,
        status: 'pendente'
      });
      dispensarAlerta(alerta);
    } catch (e) {
      console.error(e);
    }
    setNotificando(n => ({ ...n, [alerta.id]: false }));
  };

  const dispensarAlerta = (alerta) => {
    const key = `${alerta.id}_${alerta.ultimo_evento}`;
    const novos = [...dispensados, key];
    setDispensados(novos);
    localStorage.setItem('huuel_alertas_dispensados', JSON.stringify(novos));
  };

  const iconColors = { yellow: 'text-yellow-500', orange: 'text-orange-500', purple: 'text-purple-500', red: 'text-red-500' };

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Monitoramento em Tempo Real</h2>
          <p className="text-gray-400 text-sm mt-0.5">Análise de eficiência operacional do fluxo de leitos</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {['1', '7', '30'].map(d => (
            <button key={d} onClick={() => setPeriodo(d)}
              className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-all ${periodo === d ? 'bg-[#183D2A] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
              {d === '1' ? '24 Horas' : d === '7' ? '7 Dias' : '30 Dias'}
            </button>
          ))}
          <button onClick={() => setShowMetas(true)}
            className="flex items-center gap-2 border border-gray-200 px-4 py-1.5 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all">
            <Settings size={15} /> Metas
          </button>
        </div>
      </div>

      {/* Alertas ativos */}
      {alertas.length > 0 && (
        <div className="mb-6 flex flex-col gap-2">
          {alertas.map(a => (
            <div key={a.id} className={`flex items-center gap-3 rounded-xl border px-4 py-3 ${a.cor}`}>
              <AlertTriangle size={18} className={iconColors[a.icon]} />
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-800 text-sm">
                  <span className="text-red-600">{a.tipo}</span> — Leito {a.leito} ({a.unidade})
                </p>
                <p className="text-xs text-gray-500">
                  {a.minutos} min em espera · Meta: {a.meta} min ·{' '}
                  <span className={`font-bold ${CATEGORIA_COLORS[a.categoria]?.replace('bg-', 'text-').split(' ')[0]}`}>
                    Notificar: {CATEGORIA_LABELS[a.categoria]}
                  </span>
                </p>
              </div>
              <span className={`text-[10px] font-black px-2.5 py-1 rounded-full ${CATEGORIA_COLORS[a.categoria]}`}>
                {CATEGORIA_LABELS[a.categoria]}
              </span>
              <button
                onClick={() => notificar(a)}
                disabled={notificando[a.id] || notificados[a.id]}
                className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-lg transition-all flex-shrink-0 ${
                  notificados[a.id]
                    ? 'bg-green-100 text-green-700 cursor-default'
                    : 'bg-[#183D2A] hover:bg-[#12B37A] text-white'
                }`}
              >
                {notificando[a.id] ? (
                  <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : notificados[a.id] ? (
                  <><CheckCircle2 size={12} /> Notificado</>
                ) : (
                  <><Send size={12} /> Notificar</>
                )}
              </button>
              <button onClick={() => dispensarAlerta(a)} className="text-gray-400 hover:text-gray-600 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div></div>
      ) : (
        <>
          {/* Métricas - linha 1 */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 ${METRICS_SCALE.gridGap} mb-4`}>
            <MetricCard label="Desocupação (Alta → Livre)" value={metricas.desocupacao} meta={metas.desocupacao} cor="#3B82F6" />
            <MetricCard label="Resposta Higiene (Livre → Início)" value={metricas.respostaHigiene} meta={metas.respostaHigiene} cor="#12B37A" />
            <MetricCard label="Execução Higiene (Setup Físico)" value={metricas.execucaoHigiene} meta={metas.execucaoHigiene} cor="#F59E0B" />
            <MetricCard label="Resposta Transporte" value={metricas.transporte} meta={metas.transporte} cor="#8B5CF6" />
          </div>

          {/* Métricas - linha 2 */}
          <div className={`grid grid-cols-2 lg:grid-cols-4 ${METRICS_SCALE.gridGap} mb-8`}>
            <MetricCard label="Giro Total (TAT Macro)" value={metricas.tat} meta={metas.tat} cor="#183D2A" sub={`Meta: ${metas.tat}min`} />
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${METRICS_SCALE.cardPadding}`}>
              <p className={`${METRICS_SCALE.summaryTitle} font-bold uppercase tracking-widest text-gray-400 mb-3`}>Leitos Bloqueados (%)</p>
              <p className={`${METRICS_SCALE.summaryValue} font-black text-[#183D2A] leading-none`}>
                {leitos.length > 0 ? ((leitos.filter(l => l.bloqueado).length / leitos.length) * 100).toFixed(1) : '0.0'}
                <span className={`${METRICS_SCALE.summaryUnit} font-semibold text-gray-400 ml-2`}>%</span>
              </p>
              <p className={`${METRICS_SCALE.summarySub} text-gray-400 mt-3`}>{leitos.filter(l => l.bloqueado).length} leito(s) bloqueado(s)</p>
            </div>
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${METRICS_SCALE.cardPadding}`}>
              <p className={`${METRICS_SCALE.summaryTitle} font-bold uppercase tracking-widest text-gray-400 mb-3`}>Alertas Ativos</p>
              <p className={`${METRICS_SCALE.summaryValue} leading-none font-black ${alertas.length > 0 ? 'text-red-600' : 'text-[#12B37A]'}`}>{alertas.length}</p>
              <p className={`${METRICS_SCALE.summarySub} text-gray-400 mt-3`}>{alertas.length === 0 ? 'Todos os setores OK' : 'Atenção necessária'}</p>
            </div>
            <div className={`bg-white rounded-2xl border border-gray-100 shadow-sm ${METRICS_SCALE.cardPadding}`}>
              <p className={`${METRICS_SCALE.summaryTitle} font-bold uppercase tracking-widest text-gray-400 mb-3`}>Leitos Disponíveis</p>
              <p className={`${METRICS_SCALE.summaryValue} leading-none font-black text-[#12B37A]`}>{leitos.filter(l => l.status === 'livre' && !l.bloqueado).length}</p>
              <p className={`${METRICS_SCALE.summarySub} text-gray-400 mt-3`}>de {leitos.filter(l => !l.bloqueado).length} ativos</p>
            </div>
          </div>

          {/* Gráfico e Performance por Bloco */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
            {/* Gráfico */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center gap-2 mb-1">
                <TrendingUp size={16} className="text-[#12B37A]" />
                <h3 className="font-black text-gray-800">Gráfico de Tendência de Gargalos</h3>
              </div>
              <p className="text-gray-400 text-xs mb-4">Timeline diária de eficiência por etapa do setup (Minutos)</p>
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={tendencia} margin={{ top: 5, right: 5, left: -25, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} unit="m" />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '11px', border: '1px solid #E5E7EB' }} formatter={v => v !== null ? [`${v} min`] : ['—']} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Line type="monotone" dataKey="Desocupação" stroke="#3B82F6" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="Resp. Higiene" stroke="#12B37A" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="Execução" stroke="#F59E0B" strokeWidth={2} dot={false} connectNulls />
                  <Line type="monotone" dataKey="Transporte" stroke="#8B5CF6" strokeWidth={2} dot={false} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Alertas Operacionais */}
            <div className="bg-[#183D2A] rounded-2xl p-5 flex flex-col gap-3">
              <div className="flex items-center gap-2">
                <Bell size={16} className="text-[#12B37A]" />
                <h3 className="font-black text-white text-sm">Alertas Operacionais</h3>
              </div>
              {alertas.length === 0 ? (
                <div className="flex flex-col items-center justify-center flex-1 gap-2 py-6">
                  <CheckCircle2 size={32} className="text-[#12B37A]" />
                  <p className="text-[#7FBEA4] text-sm text-center">Todos os setores dentro da meta</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2 overflow-y-auto max-h-64">
                  {alertas.map(a => (
                    <div key={a.id} className="bg-white/10 rounded-xl p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-xs font-bold truncate">{a.tipo}</p>
                          <p className="text-[#7FBEA4] text-[10px]">Leito {a.leito} — {a.unidade}</p>
                          <p className="text-yellow-400 text-[10px] font-semibold mt-0.5">{a.minutos}min · Meta {a.meta}min</p>
                        </div>
                        <span className={`text-[9px] font-black px-2 py-1 rounded-full flex-shrink-0 ${CATEGORIA_COLORS[a.categoria]}`}>
                          {CATEGORIA_LABELS[a.categoria]}
                        </span>
                      </div>
                      <button
                        onClick={() => notificar(a)}
                        disabled={notificando[a.id] || notificados[a.id]}
                        className={`w-full flex items-center justify-center gap-1.5 text-[10px] font-bold px-2 py-1.5 rounded-lg transition-all ${
                          notificados[a.id]
                            ? 'bg-green-500/20 text-green-400 cursor-default'
                            : 'bg-[#12B37A]/30 hover:bg-[#12B37A] text-white'
                        }`}
                      >
                        {notificando[a.id] ? (
                          <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : notificados[a.id] ? (
                          <><CheckCircle2 size={10} /> Notificado</>
                        ) : (
                          <><Send size={10} /> Notificar {CATEGORIA_LABELS[a.categoria]}</>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-auto">
                <p className="text-[#7FBEA4] text-[10px] text-center">Metas configuráveis · Atualização automática</p>
              </div>
            </div>
          </div>

          {/* Performance por Bloco */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-black text-gray-800">Performance por Bloco</h3>
            </div>
            {unidadePerf.length === 0 ? (
              <p className="text-center text-gray-300 text-sm py-8">Sem dados no período selecionado.</p>
            ) : (
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    {['Unidade', 'Higienização', 'Transporte', 'TAT Macro'].map(h => (
                      <th key={h} className="px-5 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {unidadePerf.map(u => {
                    const higExcede = u.higiene && u.higiene > metas.execucaoHigiene;
                    const trExcede = u.transp && u.transp > metas.transporte;
                    const tatExcede = u.tat && u.tat > metas.tat;
                    return (
                      <tr key={u.nome} className="hover:bg-gray-50/50">
                        <td className="px-5 py-3 font-bold text-sm text-[#12B37A]">{u.nome}</td>
                        <td className={`px-5 py-3 text-sm font-bold ${getSlaTextClass(u.higiene, metas.execucaoHigiene)}`}>
                          {u.higiene ? `${u.higiene}m` : '—'}
                        </td>
                        <td className={`px-5 py-3 text-sm font-bold ${getSlaTextClass(u.transp, metas.transporte)}`}>
                          {u.transp ? `${u.transp}m` : '—'}
                        </td>
                        <td className={`px-5 py-3 text-sm font-black ${getSlaTextClass(u.tat, metas.tat)}`}>
                          {u.tat ? `${u.tat}m` : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        </>
      )}

      {showMetas && <ModalMetas metas={metas} onChange={salvarMetas} onClose={() => setShowMetas(false)} />}
    </div>
  );
}