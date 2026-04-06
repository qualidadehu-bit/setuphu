import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer
} from 'recharts';
import { AlertTriangle, CheckCircle2, Sparkles, UserPlus, Bell, Activity, Send, TrendingUp, Download } from 'lucide-react';

function calcMetrics(eventos) {
  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  const altaMedicaSaida = [];
  const altaMedicaAdmin = [];
  const altaAdminSaida = [];
  const higiene = [];
  const hotelaria = [];
  const entradaFinal = [];
  const tat = [];
  const isAltaEvent = (tipo) => ['alta', 'alta_medica', 'alta_administrativa'].includes(tipo);

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach((e) => {
      if (e.tipo === 'alta_medica') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) altaMedicaSaida.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
        const admin = evts.find(x => x.tipo === 'alta_administrativa' && new Date(x.timestamp) > new Date(e.timestamp));
        if (admin) altaMedicaAdmin.push((new Date(admin.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'alta_administrativa') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) altaAdminSaida.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (isAltaEvent(e.tipo)) {
        const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (entrada) tat.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
      }

      if (e.tipo === 'inicio_higiene') {
        const fimHigiene = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fimHigiene) higiene.push((new Date(fimHigiene.timestamp) - new Date(e.timestamp)) / 60000);
      }

      if (e.tipo === 'inicio_hotelaria') {
        const fimHotelaria = evts.find(x => x.tipo === 'fim_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fimHotelaria) {
          hotelaria.push((new Date(fimHotelaria.timestamp) - new Date(e.timestamp)) / 60000);
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(fimHotelaria.timestamp));
          if (entrada) entradaFinal.push((new Date(entrada.timestamp) - new Date(fimHotelaria.timestamp)) / 60000);
        }
      }

      // Fallback legado: quando nao existe hotelaria explicita, usa fim_higiene -> entrada_paciente.
      if (e.tipo === 'fim_higiene') {
        const inicioHotelaria = evts.find(x => x.tipo === 'inicio_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (!inicioHotelaria) {
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
          if (entrada) hotelaria.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
        }
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return {
    altaMedicaSaida: avg(altaMedicaSaida),
    altaMedicaAdmin: avg(altaMedicaAdmin),
    altaAdminSaida: avg(altaAdminSaida),
    higiene: avg(higiene),
    hotelaria: avg(hotelaria),
    entradaFinal: avg(entradaFinal),
    tat: avg(tat),
    totalEventos: eventos.length,
  };
}

function calcUnidadePerf(eventos, leitos) {
  const unidades = {};
  leitos.forEach(l => {
    if (!l.unidade) return;
    if (!unidades[l.unidade]) unidades[l.unidade] = { higiene: [], hotelaria: [], entradaFinal: [] };
  });

  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  Object.entries(byLeito).forEach(([lid, evts]) => {
    const leito = leitos.find(l => l.id === lid);
    if (!leito?.unidade || !unidades[leito.unidade]) return;
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach(e => {
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) unidades[leito.unidade].higiene.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'inicio_hotelaria') {
        const fim = evts.find(x => x.tipo === 'fim_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) {
          unidades[leito.unidade].hotelaria.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(fim.timestamp));
          if (entrada) unidades[leito.unidade].entradaFinal.push((new Date(entrada.timestamp) - new Date(fim.timestamp)) / 60000);
        }
      }
      if (e.tipo === 'fim_higiene') {
        const inicioHotelaria = evts.find(x => x.tipo === 'inicio_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (!inicioHotelaria) {
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
          if (entrada) unidades[leito.unidade].hotelaria.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
        }
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return Object.entries(unidades).slice(0, 5).map(([nome, d]) => ({
    nome,
    higiene: avg(d.higiene),
    hotelaria: avg(d.hotelaria),
    entradaFinal: avg(d.entradaFinal),
  }));
}

function calcHistoricalMetrics(eventos, viewType) {
  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  const byDate = {};

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 0; i < evts.length; i++) {
      const e = evts[i];
      const dt = new Date(e.timestamp);
      
      let dateKey;
      if (viewType === 'Mensal') {
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        dateKey = `${m}/${y}`;
      } else {
        const d = String(dt.getDate()).padStart(2, '0');
        const m = String(dt.getMonth() + 1).padStart(2, '0');
        const y = dt.getFullYear();
        dateKey = `${d}/${m}/${y}`;
      }
      
      if (!byDate[dateKey]) {
        byDate[dateKey] = {
          altaMedicaSaida: [],
          altaMedicaAdmin: [],
          altaAdminSaida: [],
          higiene: [],
          hotelaria: [],
          entradaFinal: []
        };
      }

      if (e.tipo === 'alta_medica') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) byDate[dateKey].altaMedicaSaida.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
        const admin = evts.find(x => x.tipo === 'alta_administrativa' && new Date(x.timestamp) > new Date(e.timestamp));
        if (admin) byDate[dateKey].altaMedicaAdmin.push((new Date(admin.timestamp) - new Date(e.timestamp)) / 60000);
      }

      if (e.tipo === 'alta_administrativa') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) byDate[dateKey].altaAdminSaida.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
      }

      if (e.tipo === 'inicio_higiene') {
        const fimHigiene = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fimHigiene) byDate[dateKey].higiene.push((new Date(fimHigiene.timestamp) - new Date(e.timestamp)) / 60000);
      }

      if (e.tipo === 'inicio_hotelaria') {
        const fimHotelaria = evts.find(x => x.tipo === 'fim_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fimHotelaria) {
          byDate[dateKey].hotelaria.push((new Date(fimHotelaria.timestamp) - new Date(e.timestamp)) / 60000);
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(fimHotelaria.timestamp));
          if (entrada) byDate[dateKey].entradaFinal.push((new Date(entrada.timestamp) - new Date(fimHotelaria.timestamp)) / 60000);
        }
      }

      if (e.tipo === 'fim_higiene') {
        const inicioHotelaria = evts.find(x => x.tipo === 'inicio_hotelaria' && new Date(x.timestamp) > new Date(e.timestamp));
        if (!inicioHotelaria) {
          const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
          if (entrada) byDate[dateKey].hotelaria.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
        }
      }
    }
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : 0;

  return Object.entries(byDate).map(([date, data]) => {
    let sortDate, displayDate;
    if (viewType === 'Mensal') {
      const [m, y] = date.split('/');
      sortDate = `${y}-${m}`;
      displayDate = date;
    } else {
      const [d, m, y] = date.split('/');
      sortDate = `${y}-${m}-${d}`;
      displayDate = `${d}/${m}`;
    }
    
    return {
      date: displayDate,
      sortDate: sortDate,
      "Alta Médica → Saída Paciente": avg(data.altaMedicaSaida),
      "Alta Médica → Alta Administrativa": avg(data.altaMedicaAdmin),
      "Alta Administrativa → Saída Paciente": avg(data.altaAdminSaida),
      "Higiene": avg(data.higiene),
      "Hotelaria": avg(data.hotelaria),
      "Entrada Final": avg(data.entradaFinal),
    };
  }).sort((a, b) => a.sortDate.localeCompare(b.sortDate));
}

function StatCard({ label, value, sub, highlight }) {
  return (
    <div className={`rounded-xl p-3 border ${highlight ? 'border-red-200 bg-red-50' : 'border-gray-100 bg-white'}`}>
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{label}</p>
      <p className={`text-2xl font-black ${highlight ? 'text-red-600' : 'text-[#183D2A]'}`}>{value ?? '—'}</p>
      {sub && <p className="text-[10px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function DashboardCharts() {
  const [eventos, setEventos] = useState([]);
  const [leitos, setLeitos] = useState([]);
  const [divisaoSel, setDivisaoSel] = useState('Todas');
  const [unidadeSel, setUnidadeSel] = useState('Todas');
  const [timeView, setTimeView] = useState('Diário');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      apiClient.entities.EventoLeito.list('-timestamp', 500),
      apiClient.entities.Leito.list('-created_date', 300),
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

  const divisoes = ['Todas', ...Array.from(new Set(leitos.map(l => l.divisao).filter(Boolean))).sort()];
  const unidadesDaDivisao = divisaoSel === 'Todas'
    ? Array.from(new Set(leitos.map(l => l.unidade).filter(Boolean))).sort()
    : Array.from(new Set(leitos.filter(l => l.divisao === divisaoSel).map(l => l.unidade).filter(Boolean))).sort();
  const unidades = ['Todas', ...unidadesDaDivisao];

  const leitosFiltrados = leitos
    .filter(l => divisaoSel === 'Todas' || l.divisao === divisaoSel)
    .filter(l => unidadeSel === 'Todas' || l.unidade === unidadeSel);
  const eventosFiltrados = unidadeSel === 'Todas' ? eventos : eventos.filter(e => leitosFiltrados.some(l => l.id === e.leito_id));

  const now = new Date();
  const currentEventos = eventosFiltrados.filter(e => {
    const d = new Date(e.timestamp);
    if (timeView === 'Diário') {
      return d.getDate() === now.getDate() && d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    } else {
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }
  });

  const metrics = calcMetrics(currentEventos);
  const unidadePerf = calcUnidadePerf(currentEventos, leitosFiltrados);

  const historicalData = calcHistoricalMetrics(eventosFiltrados, timeView);

  const totalOcupados = leitosFiltrados.filter(l => l.status === 'ocupado').length;
  const totalLeitos = leitosFiltrados.filter(l => l.ativo).length;
  const ocupacao = totalLeitos > 0 ? Math.round((totalOcupados / totalLeitos) * 100) : 0;
  const gargalos = leitosFiltrados.filter(l => ['aguardando_higiene', 'alta_registrada'].includes(l.status)).length;

  // Alertas: leitos aguardando higiene há mais tempo
  const alertas = leitosFiltrados
    .filter(l => l.status === 'aguardando_higiene' && l.ultimo_evento_at)
    .sort((a, b) => new Date(a.ultimo_evento_at) - new Date(b.ultimo_evento_at))
    .slice(0, 2);

  const steps = [
    { icon: Activity, label: 'Alta Médica → Saída Paciente', sub: `${metrics.altaMedicaSaida || '—'} min`, color: 'bg-blue-100 text-blue-600' },
    { icon: Bell, label: 'Alta Médica → Alta Administrativa', sub: `${metrics.altaMedicaAdmin || '—'} min`, color: 'bg-indigo-100 text-indigo-600' },
    { icon: Send, label: 'Alta Administrativa → Saída Paciente', sub: `${metrics.altaAdminSaida || '—'} min`, color: 'bg-rose-100 text-rose-600' },
    { icon: Sparkles, label: 'Início Higiene → Término Higiene', sub: `${metrics.higiene || '—'} min`, color: 'bg-[#12B37A]/20 text-[#12B37A]' },
    { icon: UserPlus, label: 'Início Hotelaria → Término Hotelaria', sub: `${metrics.hotelaria || '—'} min`, color: 'bg-purple-100 text-purple-600' },
    { icon: TrendingUp, label: 'Término Hotelaria → Entrada Paciente', sub: `${metrics.entradaFinal || '—'} min`, color: 'bg-amber-100 text-amber-600' },
    { icon: Download, label: 'Giro Total (TAT Macro)', sub: `${metrics.tat || '—'} min`, color: 'bg-slate-100 text-slate-700' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Monitoramento em Tempo Real</h2>
          <p className="text-gray-400 text-sm mt-0.5">Análise de eficiência operacional do fluxo de leitos</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={divisaoSel}
            onChange={e => { setDivisaoSel(e.target.value); setUnidadeSel('Todas'); }}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#12B37A] font-semibold"
          >
            {divisoes.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <select
            value={unidadeSel}
            onChange={e => setUnidadeSel(e.target.value)}
            disabled={divisaoSel === 'Todas'}
            className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 bg-white focus:outline-none focus:border-[#12B37A] font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <div className="flex bg-gray-100 p-1 rounded-lg ml-2">
            {['Diário', 'Mensal'].map(v => (
              <button
                key={v}
                onClick={() => setTimeView(v)}
                className={`px-3 py-1.5 text-sm font-bold rounded-md transition-all ${
                  timeView === v ? 'bg-[#183D2A] text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-24">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div>
        </div>
      ) : (
        <>
          {/* Top section: Flow + Resumo Operacional */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
            {/* Fluxo Ativo */}
            <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-center justify-between mb-5">
                <p className="font-bold text-gray-800">
                  <span className="text-[#12B37A]">●</span> <span className="font-black">Fluxo Ativo</span> de Giro de Leitos
                </p>
                <span className="flex items-center gap-1.5 text-xs font-bold text-[#12B37A] bg-[#12B37A]/10 px-2.5 py-1 rounded-full border border-[#12B37A]/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#12B37A] animate-pulse"></span> LIVE
                </span>
              </div>

              {/* Steps */}
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 mb-5">
                {steps.map(({ icon: Icon, label, sub, color }) => (
                  <div key={label} className="flex flex-col items-center text-center gap-1.5 rounded-xl border border-gray-100 bg-white p-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${color}`}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-gray-700 leading-tight">{label}</p>
                      <p className="text-[10px] text-gray-500 font-medium">{sub}</p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Metrics */}
              <div className="grid grid-cols-4 gap-3">
                <StatCard label="Giro de Leitos" value={(totalLeitos > 0 ? (metrics.totalEventos / totalLeitos).toFixed(1) : '—')} sub="Média por leito" />
                <StatCard label="Ocupação" value={`${ocupacao}%`} sub="Capacidade atual" />
                <StatCard label="Eventos" value={metrics.totalEventos} sub="Total registrado" />
                <StatCard label="Gargalos" value={gargalos} sub="Atenção necessária" highlight={gargalos > 3} />
              </div>
            </div>

            {/* Resumo Operacional */}
            <div className="bg-[#183D2A] rounded-2xl p-5 flex flex-col gap-4">
              <div>
                <p className="text-white font-black text-base mb-1">Resumo Operacional</p>
                {alertas.length > 0 ? (
                  <p className="text-[#7FBEA4] text-xs">
                    {alertas.length} leito{alertas.length > 1 ? 's aguardando' : ' aguardando'} higiene há mais tempo
                  </p>
                ) : (
                  <p className="text-[#7FBEA4] text-xs">Todos os setores operando normalmente</p>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {alertas.length > 0 ? alertas.map(l => (
                  <div key={l.id} className="bg-white/10 rounded-xl p-3 flex items-start gap-2">
                    <AlertTriangle size={16} className="text-yellow-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-xs font-bold">Higiene Atrasada</p>
                      <p className="text-[#7FBEA4] text-[10px]">Leito {l.numero} — {l.unidade}</p>
                    </div>
                    <span className="text-[10px] bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full font-semibold">Notificar</span>
                  </div>
                )) : (
                  <div className="bg-white/10 rounded-xl p-3 flex items-start gap-2">
                    <CheckCircle2 size={16} className="text-[#12B37A] flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-xs font-bold">Fluxo Normal</p>
                      <p className="text-[#7FBEA4] text-[10px]">Todos os leitos em dia</p>
                    </div>
                  </div>
                )}
              </div>


            </div>
          </div>

          {/* Bottom section */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-4">
            <div className="flex items-start justify-between mb-4">
              <div>
                <p className="font-black text-gray-800">Evolução Histórica dos Tempos Médios (Minutos)</p>
                <p className="text-[#12B37A] text-xs">Acompanhamento do fluxo completo de indicadores</p>
              </div>
            </div>
            
            {historicalData.length === 0 ? (
              <p className="text-center text-gray-400 py-10">Sem dados históricos para exibir</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={historicalData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                  <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E5E7EB' }} formatter={v => [`${v} min`]} />
                  
                  <Line type="monotone" dataKey="Higiene" stroke="#12B37A" strokeWidth={3} dot={{r: 4}} activeDot={{r: 6}} />
                  <Line type="monotone" dataKey="Hotelaria" stroke="#A855F7" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                  <Line type="monotone" dataKey="Entrada Final" stroke="#F97316" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                  <Line type="monotone" dataKey="Alta Médica → Saída Paciente" stroke="#3B82F6" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                  <Line type="monotone" dataKey="Alta Médica → Alta Administrativa" stroke="#6366F1" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                  <Line type="monotone" dataKey="Alta Administrativa → Saída Paciente" stroke="#FB7185" strokeWidth={2} dot={{r: 3}} activeDot={{r: 5}} />
                </LineChart>
              </ResponsiveContainer>
            )}
            
            {/* Custom Legend */}
            <div className="flex flex-wrap items-center justify-center gap-4 mt-6">
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#12B37A]"></span><span className="text-[10px] font-bold text-gray-600">Início Higiene → Término Higiene</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#A855F7]"></span><span className="text-[10px] font-bold text-gray-600">Início Hotelaria → Término Hotelaria</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#F97316]"></span><span className="text-[10px] font-bold text-gray-600">Término Hotelaria → Entrada Paciente</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#3B82F6]"></span><span className="text-[10px] font-bold text-gray-600">Alta Médica → Saída Paciente</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#6366F1]"></span><span className="text-[10px] font-bold text-gray-600">Alta Médica → Alta Administrativa</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-3 rounded-full bg-[#FB7185]"></span><span className="text-[10px] font-bold text-gray-600">Alta Administrativa → Saída Paciente</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Admissão de Pacientes */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="font-black text-gray-800">Admissão de Pacientes</p>
                  <p className="text-[#12B37A] text-xs">Término Hotelaria → Entrada Paciente</p>
                </div>
                <div className="text-right">
                  <p className="text-2xl font-black text-gray-800">{metrics.entradaFinal ? `${metrics.entradaFinal} min` : '—'}</p>
                  <p className="text-[10px] text-red-400">-15% ↓</p>
                </div>
              </div>
              {unidadePerf.length === 0 ? (
                <p className="text-gray-300 text-sm text-center py-6">Sem dados suficientes</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {unidadePerf.slice(0, 4).map(u => {
                    const max = Math.max(...unidadePerf.map(x => x.higiene || 0), 60);
                    const pct = u.higiene ? Math.round((u.higiene / max) * 100) : 30;
                    return (
                      <div key={u.nome} className="flex items-center gap-3">
                        <p className="text-xs text-gray-500 w-24 truncate">{u.nome}</p>
                        <div className="flex-1 bg-gray-100 rounded-full h-2">
                          <div className="bg-[#183D2A] h-2 rounded-full" style={{ width: `${pct}%` }}></div>
                        </div>
                        <p className="text-xs font-bold text-gray-700 w-10 text-right">{u.higiene ? `${u.higiene}m` : '—'}</p>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Performance por Unidade */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <p className="font-black text-gray-800 mb-4">Performance por Unidade</p>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-gray-400 pb-2">Unidade</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-[#12B37A] pb-2">Higiene</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-purple-400 pb-2">Hotelaria</th>
                    <th className="text-left text-[10px] font-bold uppercase tracking-widest text-blue-400 pb-2">Leitos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {unidadePerf.length === 0 ? (
                    <tr><td colSpan={4} className="py-6 text-center text-gray-300 text-sm">Sem dados</td></tr>
                  ) : unidadePerf.map(u => (
                    <tr key={u.nome} className="hover:bg-gray-50/50">
                      <td className="py-2.5 text-sm font-semibold text-[#12B37A]">{u.nome}</td>
                      <td className={`py-2.5 text-sm font-bold ${u.higiene > 30 ? 'text-red-500' : 'text-gray-700'}`}>
                        {u.higiene ? `${u.higiene}m` : '—'}
                      </td>
                      <td className="py-2.5 text-sm text-gray-600">{u.hotelaria ? `${u.hotelaria}m` : '—'}</td>
                      <td className="py-2.5 text-sm text-gray-600">{leitos.filter(l => l.unidade === u.nome && l.ativo).length}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}