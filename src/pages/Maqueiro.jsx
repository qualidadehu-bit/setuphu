import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import MemberHeader from '../components/MemberHeader';
import ConfirmPopup from '../components/ConfirmPopup';
import { STATUS_CONFIG } from '../lib/leito-config';
import { concluirNotificacoesDoLeito } from '../lib/notificacao-sistema';
import { Bell, Clock } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getMetas, getMetaForStatus, getSlaColor, calcMinutos } from '../lib/sla';

export default function Maqueiro() {
  const [leitos, setLeitos] = useState([]);
  const [metas, setMetas] = useState(getMetas());
  
  useEffect(() => { setMetas(getMetas()); }, []);
  const [popup, setPopup] = useState(null);
  const [filtroDivisao, setFiltroDivisao] = useState('todas');
  const [filtroUnidade, setFiltroUnidade] = useState('todas');
  const nome = sessionStorage.getItem('membro_nome') || 'Maqueiro';
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
      tipo, responsavel_nome: nome, responsavel_categoria: 'maqueiro', timestamp: now,
    });
    
    // Some maqueiro actions might not change status immediately or in the same way, but most do.
    if (novoStatus) {
      await apiClient.entities.Leito.update(leito.id, { status: novoStatus, ultimo_evento_at: now });
    }
    
    // Auto-conclui as notificações pendentes para este leito destinadas ao maqueiro
    await concluirNotificacoesDoLeito(leito.numero, 'maqueiro');
    
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

  const leitosLivres    = leitosFiltrados.filter(l => l.status === 'livre');
  const total           = leitosFiltrados.length;
  const ocupadosCount   = leitosFiltrados.filter(l => ['ocupado', 'alta_registrada', 'alta_medica_registrada', 'alta_administrativa_registrada'].includes(l.status)).length;
  const pct = total > 0 ? Math.round((ocupadosCount / total) * 100) : 0;
  
  // Maqueiro sees ocupado (to start exit transport), em_transporte, livre (to start entry transport), and any altas.
  const monitoramento = leitosFiltrados.filter(l => ['ocupado', 'alta_registrada', 'alta_medica_registrada', 'alta_administrativa_registrada', 'livre', 'em_transporte'].includes(l.status));

  const sortedMonitoramento = [...monitoramento].sort((a, b) => {
    // Função auxiliar para extrair o valor numérico de strings (ex: "201A" -> 201)
    const getNumericValue = (str) => {
      const match = String(str).match(/\d+/);
      return match ? parseFloat(match[0]) : NaN;
    };

    const quartoA = getNumericValue(a.quarto);
    const quartoB = getNumericValue(b.quarto);

    // Ordenar primeiro por quarto (numérico ou alfabético)
    if (!isNaN(quartoA) && !isNaN(quartoB)) {
      if (quartoA !== quartoB) {
        return quartoA - quartoB;
      }
    } else {
      if (a.quarto < b.quarto) return -1;
      if (a.quarto > b.quarto) return 1;
    }

    // Se os quartos forem iguais, ordenar por numero do leito (numérico ou alfabético)
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

  return (
    <div className="min-h-screen bg-gray-50">
      <MemberHeader />
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Page Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-black text-gray-800">Painel do Maqueiro</h1>
            <p className="text-gray-400 text-sm mt-1 max-w-md">
              Transporte de pacientes e gestão de saídas e entradas nos leitos.
            </p>
          </div>
          <div className="flex items-center gap-3 bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-3">
            <div className="text-right">
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Ocupação</p>
              <p className="text-2xl font-black text-[#183D2A]">{ocupadosCount}<span className="text-gray-400 text-base font-semibold">/{total}</span></p>
            </div>
            <div className="w-12 h-12 rounded-full border-4 border-[#183D2A] flex items-center justify-center">
              <span className="text-xs font-black text-[#183D2A]">{pct}%</span>
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

        {/* Alerta de leitos livres */}
        {leitosLivres.length > 0 && (
          <div className="bg-[#12B37A]/10 border border-[#12B37A]/30 rounded-2xl p-5 mb-6 flex items-center gap-3">
            <Bell size={22} className="text-[#12B37A] animate-pulse flex-shrink-0" />
            <div>
              <p className="font-black text-[#183D2A]">
                {leitosLivres.length} leito{leitosLivres.length > 1 ? 's prontos' : ' pronto'} para receber paciente
              </p>
              <p className="text-sm text-[#12B37A]">Realize o transporte de entrada</p>
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
            <p className="text-center text-gray-300 text-sm py-8">Nenhum leito pendente no momento.</p>
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
                      
                      {['ocupado', 'alta_registrada', 'alta_medica_registrada', 'alta_administrativa_registrada'].includes(l.status) && (
                        <button
                          onClick={() => setPopup({ leito: l, tipo: 'iniciar_transporte' })}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-cyan-600 hover:bg-cyan-700 transition-all shadow-sm"
                        >
                          Iniciar Transp. Saída
                        </button>
                      )}

                      {l.status === 'livre' && (
                        <div className="flex gap-2">
                          <button
                            onClick={() => setPopup({ leito: l, tipo: 'iniciar_transporte' })}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-cyan-600 hover:bg-cyan-700 transition-all shadow-sm"
                          >
                            Iniciar Transp. Entrada
                          </button>
                          <button
                            onClick={() => setPopup({ leito: l, tipo: 'entrada' })}
                            className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-[#183D2A] hover:bg-[#12B37A] transition-all shadow-sm"
                          >
                            Conf. Entrada
                          </button>
                        </div>
                      )}

                      {l.status === 'em_transporte' && (
                        <button
                          onClick={() => setPopup({ leito: l, tipo: 'fim_transporte' })}
                          className="text-xs font-bold px-3 py-1.5 rounded-xl text-white bg-[#183D2A] hover:bg-[#12B37A] transition-all shadow-sm"
                        >
                          Chegou ao Destino
                        </button>
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
        open={!!popup}
        onClose={() => setPopup(null)}
        title={
          popup?.tipo === 'iniciar_transporte' ? 'Iniciar Transporte' :
          popup?.tipo === 'entrada' ? 'Confirmar Entrada' : 'Finalizar Transporte'
        }
        message={
          popup?.tipo === 'iniciar_transporte' ? `Iniciar transporte do paciente para o Leito ${popup?.leito?.numero}?` :
          popup?.tipo === 'entrada' ? `Confirmar chegada do paciente ao Leito ${popup?.leito?.numero}?` :
          `Confirmar que o paciente chegou ao destino no Leito ${popup?.leito?.numero}?`
        }
        confirmLabel={
          popup?.tipo === 'iniciar_transporte' ? 'Iniciar' :
          popup?.tipo === 'entrada' ? 'Confirmar Entrada' : 'Finalizar'
        }
        onConfirm={() => {
          if (popup.tipo === 'iniciar_transporte') registrarEvento(popup.leito, 'inicio_transporte', 'em_transporte');
          else if (popup.tipo === 'entrada') registrarEvento(popup.leito, 'entrada_paciente', 'ocupado');
          else registrarEvento(popup.leito, 'fim_transporte', null); // Transport end leaves the status up to other processes (like hygiene)
          setPopup(null);
        }}
      />
    </div>
  );
}