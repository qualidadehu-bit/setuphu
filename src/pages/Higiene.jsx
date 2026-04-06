import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import { notificarMaqueiro, concluirNotificacoesDoLeito } from '../lib/notificacao-sistema';
import MemberHeader from '../components/MemberHeader';
import ConfirmPopup from '../components/ConfirmPopup';
import { STATUS_CONFIG } from '../lib/leito-config';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Clock, CheckSquare, AlertTriangle, X } from 'lucide-react';
import { getMetas, getMetaForStatus, getSlaColor, calcMinutos } from '../lib/sla';

const LIMITES_HIGIENE = {
  aguardando_higiene: 15,
  em_higiene: 30,
};

export default function Higiene() {
  const [leitos, setLeitos] = useState([]);
  const [metas, setMetas] = useState(getMetas());
  
  useEffect(() => { setMetas(getMetas()); }, []);
  const [filtroDivisao, setFiltroDivisao] = useState('todas');
  const [filtroUnidade, setFiltroUnidade] = useState('todas');
  const [popup, setPopup] = useState(null);
  const [alertaDismissed, setAlertaDismissed] = useState(false);
  // Removed unused tick state
  const nome = sessionStorage.getItem('membro_nome') || 'Higiene';
  const location = useLocation();

  useEffect(() => {
    if (leitos.length > 0) {
      const params = new URLSearchParams(location.search);
      const unidadeUrl = params.get('unidade');
      const leitoUrl = params.get('leito');
      
      if (unidadeUrl) {
        const leitoEncontrado = leitos.find(l => l.unidade === unidadeUrl);
        if (leitoEncontrado) {
          setFiltroDivisao(leitoEncontrado.divisao);
          setFiltroUnidade(unidadeUrl);
        }
      }
      
      if (leitoUrl) {
        setTimeout(() => {
          const el = document.getElementById(`leito-${leitoUrl}`);
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' });
            el.classList.add('ring-4', 'ring-[#12B37A]', 'ring-offset-2', 'bg-green-50');
            setTimeout(() => el.classList.remove('ring-4', 'ring-[#12B37A]', 'ring-offset-2', 'bg-green-50'), 3000);
          }
        }, 500);
      }
    }
  }, [leitos.length, location.search]);



  useEffect(() => {
    setAlertaDismissed(false);
  }, [leitos.length]);

  const fetchLeitos = () => apiClient.entities.Leito.filter({ ativo: true }).then(setLeitos);

  useEffect(() => {
    fetchLeitos();
    const unsub = apiClient.entities.Leito.subscribe(() => fetchLeitos());
    return unsub;
  }, []);

  const registrarEvento = async (leito, tipo, novoStatus) => {
    const now = new Date().toISOString();
    await apiClient.entities.EventoLeito.create({
      leito_id: leito.id, leito_numero: leito.numero,
      tipo, responsavel_nome: nome, responsavel_categoria: 'higiene', timestamp: now,
    });
    await apiClient.entities.Leito.update(leito.id, { status: novoStatus, ultimo_evento_at: now });
    if (tipo === 'fim_higiene') {
      await notificarMaqueiro(leito.numero, leito.unidade, leito.quarto);
    }
    
    // Auto-conclui as notificações pendentes para este leito destinadas à equipe de higiene
    await concluirNotificacoesDoLeito(leito.numero, 'higiene');
    
    fetchLeitos();
  };

  const divisoes = [...new Set(leitos.map(l => l.divisao).filter(Boolean))].sort();
  const unidades = filtroDivisao === 'todas' 
    ? [...new Set(leitos.map(l => l.unidade).filter(Boolean))].sort()
    : [...new Set(leitos.filter(l => l.divisao === filtroDivisao).map(l => l.unidade).filter(Boolean))].sort();

  const leitosFiltrados = leitos.filter(l => {
    if (filtroDivisao !== 'todas' && l.divisao !== filtroDivisao) return false;
    if (filtroUnidade !== 'todas' && l.unidade !== filtroUnidade) return false;
    return true;
  });

  const aguardando = leitosFiltrados.filter(l => l.status === 'aguardando_higiene');
  const emHigiene  = leitosFiltrados.filter(l => l.status === 'em_higiene');
  const total      = leitosFiltrados.length;
  const emProcesso = aguardando.length + emHigiene.length;
  const pct = total > 0 ? Math.round((emProcesso / total) * 100) : 0;
  const monitoramento = leitosFiltrados.filter(l => ['aguardando_higiene', 'em_higiene'].includes(l.status));

  const sortedMonitoramento = [...monitoramento].sort((a, b) => {
    const getNumericValue = (str) => {
      const match = String(str).match(/\d+/);
      return match ? parseFloat(match[0]) : NaN;
    };

    const quartoA = getNumericValue(a.quarto);
    const quartoB = getNumericValue(b.quarto);

    if (!isNaN(quartoA) && !isNaN(quartoB)) {
      if (quartoA !== quartoB) {
        return quartoA - quartoB;
      }
    } else {
      if (a.quarto < b.quarto) return -1;
      if (a.quarto > b.quarto) return 1;
    }

    const numeroA = getNumericValue(a.numero);
    const numeroB = getNumericValue(b.numero);

    if (!isNaN(numeroA) && !isNaN(numeroB)) {
      return numeroA - numeroB;
    } else {
      if (a.numero < b.numero) return -1;
      if (a.numero > b.numero) return 1;
      return 0;
    }
  });

  const leitosAtrasados = monitoramento.filter(l => {
    const limite = LIMITES_HIGIENE[l.status];
    if (!limite || !l.ultimo_evento_at) return false;
    return calcMinutos(l.ultimo_evento_at) >= limite;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <MemberHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Painel de Higiene</h1>
            <p className="text-gray-400 text-sm mt-1 max-w-md">
              Gestão da higienização dos leitos para garantir disponibilidade imediata.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Em Processo</p>
              <p className="text-2xl font-black text-[#183D2A]">{emProcesso}<span className="text-gray-400 text-base font-semibold">/{total}</span></p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#12B37A] flex items-center justify-center">
              <span className="text-xs font-black text-[#12B37A]">{pct}%</span>
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="w-full sm:w-64">
            <Select value={filtroDivisao} onValueChange={(v) => { setFiltroDivisao(v); setFiltroUnidade('todas'); }}>
              <SelectTrigger className="bg-white border-gray-200">
                <SelectValue placeholder="Todas as Divisões" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as Divisões</SelectItem>
                {divisoes.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="w-full sm:w-64">
            <Select value={filtroUnidade} onValueChange={setFiltroUnidade}>
              <SelectTrigger className="bg-white border-gray-200">
                <SelectValue placeholder="Todos os Setores" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todos os Setores</SelectItem>
                {unidades.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Popup de alerta de demora */}
        {!alertaDismissed && leitosAtrasados.length > 0 && (
          <div className="mb-6 bg-red-50 border border-red-300 rounded-xl p-4 animate-pulse-once">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <AlertTriangle size={18} className="text-red-500" />
                </div>
                <div>
                  <p className="font-black text-red-700 text-sm">⚠️ Atenção: {leitosAtrasados.length} leito{leitosAtrasados.length > 1 ? 's com demora' : ' com demora'}!</p>
                  <div className="mt-1.5 flex flex-col gap-1">
                    {leitosAtrasados.map(l => (
                      <p key={l.id} className="text-xs text-red-600">
                        <span className="font-bold">Leito {l.numero}</span> — {l.unidade}, {l.quarto} —{' '}
                        <span className="font-bold">{calcMinutos(l.ultimo_evento_at)} min</span> aguardando
                      </p>
                    ))}
                  </div>
                </div>
              </div>
              <button onClick={() => setAlertaDismissed(true)} className="text-red-300 hover:text-red-500 flex-shrink-0">
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        {/* Monitoramento Flat List */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-1 h-5 bg-[#12B37A] rounded-full"></div>
              <h3 className="font-black text-gray-800">Monitoramento em Tempo Real</h3>
            </div>
            <span className="flex items-center gap-1.5 text-xs font-bold text-[#12B37A] bg-[#12B37A]/10 px-2.5 py-1 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-[#12B37A] animate-pulse"></span> AO VIVO
            </span>
          </div>

          {sortedMonitoramento.length === 0 ? (
            <p className="text-center text-gray-300 text-sm py-8">Nenhum leito para exibir.</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-50">
              {sortedMonitoramento.map(l => {
                const cfg = STATUS_CONFIG[l.status] || STATUS_CONFIG.ocupado;
                const meta = getMetaForStatus(l.status, metas);
                const minutos = l.ultimo_evento_at ? calcMinutos(l.ultimo_evento_at) : null;
                const isAtrasado = meta && minutos !== null ? (minutos / meta) * 100 > 100 : false;

                return (
                  <div id={`leito-${l.numero}`} key={l.id} className={`flex items-center gap-4 py-4 -mx-2 px-2 rounded-xl transition-all ${isAtrasado ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50/50'}`}>
                    <div className={`w-14 h-14 rounded-xl flex flex-col items-center justify-center flex-shrink-0 ${isAtrasado ? 'bg-red-100' : 'bg-gray-100'}`}>
                      <p className={`text-[9px] font-bold uppercase ${isAtrasado ? 'text-red-400' : 'text-gray-400'}`}>Leito</p>
                      <p className={`font-black text-base leading-tight ${isAtrasado ? 'text-red-700' : 'text-gray-700'}`}>{l.numero}</p>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-bold text-sm truncate ${isAtrasado ? 'text-red-800' : 'text-gray-800'}`}>{l.unidade} — {l.quarto}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {l.ultimo_evento_at && (
                          <p className={`text-xs flex items-center gap-1 ${isAtrasado ? 'text-red-500' : 'text-gray-400'}`}>
                            <Clock size={10} /> {new Date(l.ultimo_evento_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        )}
                        {meta && minutos !== null && (
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-lg border ${getSlaColor(minutos, meta)}`}>
                            {minutos}m / {meta}m
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap justify-end">
                      <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${cfg.color}`}>{cfg.label}</span>
                      
                      {l.status === 'aguardando_higiene' && (
                        <button onClick={() => setPopup({ leito: l, tipo: 'iniciar' })}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-yellow-500 hover:bg-yellow-600 transition-all shadow-sm">
                          Iniciar
                        </button>
                      )}
                      
                      {l.status === 'em_higiene' && (
                        <div className="flex gap-2">
                          <button onClick={() => setPopup({ leito: l, tipo: 'etapa' })}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl text-[#12B37A] border border-[#12B37A] hover:bg-[#12B37A]/10 transition-all shadow-sm">
                            <CheckSquare size={14} className="inline-block" />
                          </button>
                          <button onClick={() => setPopup({ leito: l, tipo: 'finalizar' })}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-[#183D2A] hover:bg-[#12B37A] transition-all shadow-sm">
                            Finalizar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <ConfirmPopup
        open={!!popup && popup.leito !== null}
        onClose={() => setPopup(null)}
        title={
          popup?.tipo === 'iniciar' ? 'Iniciar Higienização' :
          popup?.tipo === 'etapa' ? 'Concluir Etapa' :
          'Finalizar Higienização'
        }
        message={
          popup?.tipo === 'iniciar' ? `Iniciar higienização do Leito ${popup?.leito?.numero}?` :
          popup?.tipo === 'etapa' ? `Confirmar conclusão de etapa no Leito ${popup?.leito?.numero}?` :
          `Confirmar que o Leito ${popup?.leito?.numero} está pronto para novo paciente?`
        }
        confirmLabel={
          popup?.tipo === 'iniciar' ? 'Iniciar' :
          popup?.tipo === 'etapa' ? 'Concluir Etapa' :
          'Finalizar'
        }
        onConfirm={() => {
          if (popup.tipo === 'iniciar') registrarEvento(popup.leito, 'inicio_higiene', 'em_higiene');
          else if (popup.tipo === 'etapa') registrarEvento(popup.leito, 'etapa_higiene', 'em_higiene');
          else if (popup.tipo === 'finalizar') registrarEvento(popup.leito, 'fim_higiene', 'livre');
          setPopup(null);
        }}
      />
    </div>
  );
}