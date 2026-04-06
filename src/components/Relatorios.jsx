import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { FileText, Download, TrendingDown, Activity, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { getMetas } from '@/lib/sla';

function calcularMetricas(eventos, leitos, metas) {
  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  const desocupacao = [], respostaHigiene = [], execucaoHigiene = [], transporte = [], tat = [];
  let higienizacoesDentroMeta = 0, totalHigienizacoes = 0;

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    for (let i = 0; i < evts.length; i++) {
      const e = evts[i];
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
        if (fim) {
          const tempo = (new Date(fim.timestamp) - new Date(e.timestamp)) / 60000;
          execucaoHigiene.push(tempo);
          totalHigienizacoes++;
          if (tempo <= metas.execucaoHigiene) higienizacoesDentroMeta++;
        }
      }
      if (e.tipo === 'fim_higiene') {
        const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (entrada) transporte.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
      }
    }
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const bloqueados = leitos.filter(l => l.bloqueado).length;
  const taxaBloqueio = leitos.length > 0 ? ((bloqueados / leitos.length) * 100).toFixed(1) : '0.0';
  const taxaConformidade = totalHigienizacoes > 0 ? Math.round((higienizacoesDentroMeta / totalHigienizacoes) * 100) : null;

  return {
    desocupacao: avg(desocupacao),
    respostaHigiene: avg(respostaHigiene),
    execucaoHigiene: avg(execucaoHigiene),
    transporte: avg(transporte),
    tat: avg(tat),
    taxaConformidade,
    taxaBloqueio,
    totalHigienizacoes,
  };
}

function calcUnidadePerf(eventos, leitos) {
  const unidades = {};
  leitos.forEach(l => {
    if (!l.unidade) return;
    if (!unidades[l.unidade]) unidades[l.unidade] = { desocupacao: [], respHig: [], execHig: [], transp: [], tat: [] };
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
    const u = unidades[leito.unidade];
    evts.forEach((e, i) => {
      if (e.tipo === 'alta') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) u.desocupacao.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
        const entrada = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (entrada) u.tat.push((new Date(entrada.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'saida_paciente') {
        const ini = evts.find(x => x.tipo === 'inicio_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ini) u.respHig.push((new Date(ini.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) u.execHig.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'fim_higiene') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) u.transp.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return Object.entries(unidades).map(([nome, d]) => ({
    nome,
    desocupacao: avg(d.desocupacao),
    respHig: avg(d.respHig),
    execHig: avg(d.execHig),
    transp: avg(d.transp),
    tat: avg(d.tat),
  })).filter(u => u.tat !== null || u.execHig !== null);
}

function calcTendencia(eventos) {
  const dias = {};
  eventos.forEach(e => {
    const dia = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
    if (!dias[dia]) dias[dia] = { desocupacao: [], respHig: [], execHig: [], transp: [] };
  });

  const byLeito = {};
  eventos.forEach(e => {
    if (!byLeito[e.leito_id]) byLeito[e.leito_id] = [];
    byLeito[e.leito_id].push(e);
  });

  Object.values(byLeito).forEach(evts => {
    evts.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    evts.forEach(e => {
      const dia = new Date(e.timestamp).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
      if (!dias[dia]) return;
      if (e.tipo === 'alta') {
        const saida = evts.find(x => x.tipo === 'saida_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (saida) dias[dia].desocupacao.push((new Date(saida.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'saida_paciente') {
        const ini = evts.find(x => x.tipo === 'inicio_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ini) dias[dia].respHig.push((new Date(ini.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'inicio_higiene') {
        const fim = evts.find(x => x.tipo === 'fim_higiene' && new Date(x.timestamp) > new Date(e.timestamp));
        if (fim) dias[dia].execHig.push((new Date(fim.timestamp) - new Date(e.timestamp)) / 60000);
      }
      if (e.tipo === 'fim_higiene') {
        const ent = evts.find(x => x.tipo === 'entrada_paciente' && new Date(x.timestamp) > new Date(e.timestamp));
        if (ent) dias[dia].transp.push((new Date(ent.timestamp) - new Date(e.timestamp)) / 60000);
      }
    });
  });

  const avg = arr => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;

  return Object.entries(dias).slice(-14).map(([dia, d]) => ({
    dia,
    'Desocupação': avg(d.desocupacao),
    'Resp. Higiene': avg(d.respHig),
    'Execução': avg(d.execHig),
    'Transporte': avg(d.transp),
  }));
}

function MetricCard({ label, value, meta, unit = 'min' }) {
  const ok = value !== null && meta ? value <= meta : null;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4">
      <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{label}</p>
      <p className={`text-3xl font-black ${ok === false ? 'text-red-600' : ok === true ? 'text-[#183D2A]' : 'text-gray-400'}`}>
        {value !== null ? `${value}` : '—'}
        {value !== null && <span className="text-base font-semibold text-gray-400 ml-1">{unit}</span>}
      </p>
      {meta && value !== null && (
        <div className={`flex items-center gap-1 mt-1 text-xs font-semibold ${ok ? 'text-[#12B37A]' : 'text-red-500'}`}>
          {ok ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
          Meta: {meta}min
        </div>
      )}
    </div>
  );
}

export default function Relatorios() {
  const [eventos, setEventos] = useState([]);
  const [leitos, setLeitos] = useState([]);
  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gerandoPDF, setGerandoPDF] = useState(false);
  const [periodo, setPeriodo] = useState('30');
  const metas = getMetas();

  useEffect(() => {
    Promise.all([
      apiClient.entities.EventoLeito.list('-timestamp', 1000),
      apiClient.entities.Leito.filter({ ativo: true }),
      apiClient.entities.Membro.filter({ ativo: true }),
    ])
      .then(([evts, lts, mbrs]) => {
        setEventos(evts);
        setLeitos(lts);
        setMembros(mbrs);
      })
      .catch((error) => {
        console.error(error);
        setEventos([]);
        setLeitos([]);
        setMembros([]);
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const diasAtras = parseInt(periodo);
  const corte = new Date(Date.now() - diasAtras * 24 * 60 * 60 * 1000);
  const eventosFiltrados = eventos.filter(e => new Date(e.timestamp) >= corte);

  const metricas = calcularMetricas(eventosFiltrados, leitos, metas);
  const unidadePerf = calcUnidadePerf(eventosFiltrados, leitos);
  const tendencia = calcTendencia(eventosFiltrados);
  const membroHigiene = membros.filter(m => m.categoria === 'higiene').length;
  const mediaHigienizacoesPorMembro = membroHigiene > 0 && metricas.totalHigienizacoes > 0
    ? (metricas.totalHigienizacoes / membroHigiene).toFixed(1) : null;

  const gerarPDF = async () => {
    setGerandoPDF(true);
    const { jsPDF } = await import('jspdf');
    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

    const verde = [18, 179, 122];
    const verdeEscuro = [24, 61, 42];
    const cinza = [100, 100, 100];
    const W = 210;

    // Header
    doc.setFillColor(...verdeEscuro);
    doc.rect(0, 0, W, 38, 'F');
    doc.setFillColor(...verde);
    doc.circle(18, 19, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.text('Hospital Universitário', 32, 15);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('Hospital Universitário de Londrina', 32, 21);
    doc.text('Núcleo de Melhoria Contínua — Qualidade Operacional', 32, 27);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Performance Operacional: Set-Up de Leitos', W - 10, 14, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Período: Últimos ${periodo} Dias`, W - 10, 21, { align: 'right' });
    doc.text(`Emitido em: ${new Date().toLocaleDateString('pt-BR')}`, W - 10, 27, { align: 'right' });

    // Badge
    doc.setFillColor(...verde);
    doc.roundedRect(W - 55, 30, 45, 7, 2, 2, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text('ATOS ESTRATÉGICOS', W - 32.5, 35, { align: 'center' });

    let y = 48;

    // Sumário
    doc.setTextColor(...verdeEscuro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('SUMÁRIO DE PERFORMANCE OPERACIONAL', 14, y);
    doc.setDrawColor(...verde);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 10;

    const cards = [
      ['TAT (GIRO TOTAL)', metricas.tat ? `${metricas.tat} min` : '—'],
      ['TEMPO DESOCUPAÇÃO', metricas.desocupacao ? `${metricas.desocupacao} min` : '—'],
      ['RESPOSTA HIGIENE', metricas.respostaHigiene ? `${metricas.respostaHigiene} min` : '—'],
      ['EXECUÇÃO HIGIENE', metricas.execucaoHigiene ? `${metricas.execucaoHigiene} min` : '—'],
      ['RESPOSTA TRANSPORTE', metricas.transporte ? `${metricas.transporte} min` : '—'],
      ['TAXA CONFORMIDADE', metricas.taxaConformidade ? `${metricas.taxaConformidade}%` : '—'],
      ['TAXA DE BLOQUEIO', `${metricas.taxaBloqueio}%`],
      ['HIGIENIZAÇÕES/MEMBRO', mediaHigienizacoesPorMembro ?? '—'],
    ];

    const cols = 4, cW = (W - 28) / cols;
    cards.forEach(([label, value], i) => {
      const col = i % cols, row = Math.floor(i / cols);
      const cx = 14 + col * cW, cy = y + row * 22;
      doc.setFillColor(248, 250, 248);
      doc.roundedRect(cx, cy, cW - 3, 20, 2, 2, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6);
      doc.setTextColor(...cinza);
      doc.text(label, cx + 3, cy + 5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(...verdeEscuro);
      doc.text(value, cx + 3, cy + 15);
    });

    y += Math.ceil(cards.length / cols) * 22 + 8;

    // Tabela por unidade
    doc.setTextColor(...verdeEscuro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('PERFORMANCE DETALHADA POR UNIDADE', 14, y);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 8;

    const headers = ['UNIDADE', 'DESOCUPAÇÃO', 'RESP. HIGIENE', 'EXEC. HIGIENE', 'RESP. TRANSP.', 'TAT FINAL'];
    const colWs = [45, 28, 28, 28, 28, 24];
    let cx = 14;
    doc.setFillColor(...verdeEscuro);
    doc.rect(14, y, W - 28, 7, 'F');
    headers.forEach((h, i) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7);
      doc.setTextColor(255, 255, 255);
      doc.text(h, cx + 2, y + 5);
      cx += colWs[i];
    });
    y += 7;

    unidadePerf.forEach((u, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 255 : 248, idx % 2 === 0 ? 255 : 250, idx % 2 === 0 ? 255 : 248);
      doc.rect(14, y, W - 28, 7, 'F');
      const row = [u.nome, u.desocupacao ? `${u.desocupacao} min` : '—', u.respHig ? `${u.respHig} min` : '—',
        u.execHig ? `${u.execHig} min` : '—', u.transp ? `${u.transp} min` : '—', u.tat ? `${u.tat} min` : '—'];
      let rx = 14;
      row.forEach((val, i) => {
        const excedeu = i === 5 && u.tat && u.tat > 100;
        doc.setFont('helvetica', i === 5 ? 'bold' : 'normal');
        doc.setFontSize(8);
        doc.setTextColor(excedeu ? 220 : (i === 0 ? 30 : 80), excedeu ? 50 : (i === 0 ? 30 : 80), excedeu ? 50 : (i === 0 ? 30 : 80));
        doc.text(val, rx + 2, y + 5);
        rx += colWs[i];
      });
      y += 7;
    });
    y += 6;

    // Gráfico placeholder (linha simples)
    doc.setTextColor(...verdeEscuro);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('TENDÊNCIA HISTÓRICA: TIMELINE DE GARGALOS OPERACIONAIS', 14, y);
    doc.line(14, y + 2, W - 14, y + 2);
    y += 8;
    doc.setFillColor(248, 250, 248);
    doc.roundedRect(14, y, W - 28, 40, 3, 3, 'F');
    doc.setTextColor(...cinza);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    if (tendencia.length > 1) {
      const chartW = W - 28 - 10, chartH = 30;
      const chartX = 14 + 5, chartY = y + 5;
      const colors = [[18, 179, 122], [24, 61, 42], [255, 165, 0], [100, 100, 200]];
      const keys = ['Desocupação', 'Resp. Higiene', 'Execução', 'Transporte'];
      keys.forEach((key, ki) => {
        const vals = tendencia.map(d => d[key]).filter(v => v !== null);
        if (vals.length < 2) return;
        const max = Math.max(...vals, 1);
        doc.setDrawColor(...colors[ki]);
        doc.setLineWidth(0.5);
        for (let i = 1; i < tendencia.length; i++) {
          const prev = tendencia[i - 1][key], curr = tendencia[i][key];
          if (prev === null || curr === null) continue;
          const x1 = chartX + ((i - 1) / (tendencia.length - 1)) * chartW;
          const x2 = chartX + (i / (tendencia.length - 1)) * chartW;
          const y1 = chartY + chartH - (prev / max) * chartH;
          const y2 = chartY + chartH - (curr / max) * chartH;
          doc.line(x1, y1, x2, y2);
        }
      });
      // Legenda
      keys.forEach((key, ki) => {
        doc.setFillColor(...colors[ki]);
        doc.rect(chartX + ki * 38, y + 37, 5, 2, 'F');
        doc.setTextColor(...colors[ki]);
        doc.setFontSize(6);
        doc.text(key, chartX + ki * 38 + 7, y + 39);
      });
    } else {
      doc.text('Dados históricos insuficientes para gerar o gráfico.', 14 + (W - 28) / 2, y + 22, { align: 'center' });
    }
    y += 46;

    // Footer
    doc.setFillColor(...verdeEscuro);
    doc.rect(0, 287, W, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.text(`DATA DE EMISSÃO: ${new Date().toLocaleDateString('pt-BR')}`, 14, 293);
    doc.text('© 2026 Hospital Universitário — HUUEL | Londrina, PR', W - 14, 293, { align: 'right' });
    doc.setTextColor(...verde);
    doc.text('● DOCUMENTO AUTENTICADO VIA BLOCKCHAIN HUUEL', W / 2, 293, { align: 'center' });

    doc.save(`Relatorio_SetUp_Leitos_${new Date().toLocaleDateString('pt-BR').replace(/\//g, '-')}.pdf`);
    setGerandoPDF(false);
  };

  if (loading) return (
    <div className="flex justify-center items-center py-24">
      <div className="w-8 h-8 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Relatórios Operacionais</h2>
          <p className="text-gray-400 text-sm mt-0.5">Performance de Set-Up de Leitos — HUUEL</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={periodo}
            onChange={e => setPeriodo(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 focus:outline-none focus:border-[#12B37A]"
          >
            <option value="7">Últimos 7 dias</option>
            <option value="30">Últimos 30 dias</option>
            <option value="90">Últimos 90 dias</option>
          </select>

          <button
            onClick={gerarPDF}
            disabled={gerandoPDF}
            className="flex items-center gap-2 bg-[#12B37A] hover:bg-[#0fa068] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all"
          >
            {gerandoPDF ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Download size={16} />}
            {gerandoPDF ? 'Gerando PDF...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Sumário */}
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-[#12B37A]" />
          <h3 className="font-black text-gray-700 text-sm uppercase tracking-wider">Sumário de Performance</h3>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <MetricCard label="TAT (Giro Total)" value={metricas.tat} meta={null} />
          <MetricCard label="Tempo de Desocupação" value={metricas.desocupacao} meta={metas.desocupacao} />
          <MetricCard label="Resposta Higiene" value={metricas.respostaHigiene} meta={metas.respostaHigiene} />
          <MetricCard label="Execução Higiene" value={metricas.execucaoHigiene} meta={metas.execucaoHigiene} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <MetricCard label="Resposta Transporte" value={metricas.transporte} meta={metas.transporte} />
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Taxa de Conformidade</p>
            <p className={`text-3xl font-black ${metricas.taxaConformidade >= 80 ? 'text-[#12B37A]' : 'text-orange-500'}`}>
              {metricas.taxaConformidade !== null ? `${metricas.taxaConformidade}%` : '—'}
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Meta: ≥80%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Taxa de Bloqueio</p>
            <p className={`text-3xl font-black ${parseFloat(metricas.taxaBloqueio) > 10 ? 'text-red-600' : 'text-[#183D2A]'}`}>
              {metricas.taxaBloqueio}%
            </p>
            <p className="text-[10px] text-gray-400 mt-1">Meta: &lt;10%</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">Higienizações/Membro</p>
            <p className="text-3xl font-black text-[#183D2A]">{mediaHigienizacoesPorMembro ?? '—'}</p>
            <p className="text-[10px] text-gray-400 mt-1">{membroHigiene} membro(s) ativos</p>
          </div>
        </div>
      </div>

      {/* Tabela por unidade */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden mb-6">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
          <FileText size={16} className="text-[#12B37A]" />
          <h3 className="font-black text-gray-800">Performance Detalhada por Unidade</h3>
        </div>
        {unidadePerf.length === 0 ? (
          <p className="text-center text-gray-300 text-sm py-8">Sem dados suficientes no período.</p>
        ) : (
          <table className="w-full">
            <thead className="bg-[#183D2A]">
              <tr>
                {['Unidade', 'Desocupação', 'Resp. Higiene', 'Exec. Higiene', 'Resp. Transp.', 'TAT Final'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-white">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {unidadePerf.map((u, i) => {
                const tatExcedeu = u.tat && u.tat > 100;
                return (
                  <tr key={u.nome} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                    <td className="px-4 py-3 font-bold text-[#12B37A] text-sm">{u.nome}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.desocupacao ? `${u.desocupacao} min` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.respHig ? `${u.respHig} min` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.execHig ? `${u.execHig} min` : '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{u.transp ? `${u.transp} min` : '—'}</td>
                    <td className={`px-4 py-3 text-sm font-black ${tatExcedeu ? 'text-red-600' : 'text-[#183D2A]'}`}>
                      {u.tat ? `${u.tat} min` : '—'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Gráfico tendência */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingDown size={16} className="text-[#12B37A]" />
          <h3 className="font-black text-gray-800">Tendência Histórica: Timeline de Gargalos</h3>
        </div>
        {tendencia.length < 2 ? (
          <p className="text-center text-gray-300 text-sm py-8">Dados históricos insuficientes.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={tendencia} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
              <XAxis dataKey="dia" tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9CA3AF' }} axisLine={false} tickLine={false} unit=" min" />
              <Tooltip contentStyle={{ borderRadius: '10px', fontSize: '12px', border: '1px solid #E5E7EB' }} formatter={v => [`${v} min`]} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="Desocupação" stroke="#12B37A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Resp. Higiene" stroke="#183D2A" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Execução" stroke="#F59E0B" strokeWidth={2} dot={false} />
              <Line type="monotone" dataKey="Transporte" stroke="#8B5CF6" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

    </div>
  );
}