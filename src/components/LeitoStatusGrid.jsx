import { useState, useEffect, useRef } from 'react';
import { apiClient } from '@/api/apiClient';
import { BedDouble, Lock, Unlock, Home, ChevronDown } from 'lucide-react';
import { STATUS_CONFIG, DEFAULT_STATUS_CONFIG } from '@/lib/leito-config';
import { normalizeBedSignals } from '@/lib/bedSignals';

const UNITS_SCALE = {
  unitCardPadding: 'p-6',
  unitCardMinWidth: 'min-w-[210px]',
  unitCardIconWrap: 'w-14 h-14',
  unitCardIcon: 24,
  unitCardTitle: 'text-xl',
  unitCardMeta: 'text-sm',
  leitoCardPadding: 'p-4',
  leitoNumber: 'text-2xl',
  leitoStatus: 'text-sm',
  summaryCardPadding: 'p-6',
  summaryValue: 'text-5xl',
  summaryLabel: 'text-base',
};

function UnidadeCard({ unidade, leitos, selected, onClick }) {
  const quartos = [...new Set(leitos.map(l => l.quarto))];
  return (
    <button onClick={onClick}
      className={`flex flex-col gap-3 border-2 rounded-2xl ${UNITS_SCALE.unitCardPadding} ${UNITS_SCALE.unitCardMinWidth} text-left transition-all hover:shadow-md flex-shrink-0
        ${selected ? 'border-[#12B37A] bg-[#183D2A] shadow-md' : 'border-gray-200 bg-white hover:border-[#12B37A]/40'}`}>
      {selected && (
        <span className="text-[11px] font-black tracking-widest bg-[#12B37A] text-white px-3 py-1 rounded-full self-start">ATIVO</span>
      )}
      <div className={`${UNITS_SCALE.unitCardIconWrap} rounded-xl flex items-center justify-center ${selected ? 'bg-white/20' : 'bg-gray-100'}`}>
        <Home size={UNITS_SCALE.unitCardIcon} className={selected ? 'text-white' : 'text-[#183D2A]'} />
      </div>
      <div>
        <p className={`${UNITS_SCALE.unitCardTitle} font-black ${selected ? 'text-white' : 'text-gray-800'}`}>{unidade}</p>
        <p className={`${UNITS_SCALE.unitCardMeta} mt-1 ${selected ? 'text-[#7FBEA4]' : 'text-gray-400'}`}>
          📋 {quartos.length} Quarto{quartos.length !== 1 ? 's' : ''}
        </p>
        <p className={`${UNITS_SCALE.unitCardMeta} ${selected ? 'text-[#7FBEA4]' : 'text-gray-400'}`}>
          🛏 {leitos.length} Leito{leitos.length !== 1 ? 's' : ''}
        </p>
      </div>
    </button>
  );
}

function LeitoCard({ leito, onToggle, onChangeStatus }) {
  const [showMenu, setShowMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ vertical: 'bottom', horizontal: 'left' });
  const ref = useRef(null);
  const cfg = STATUS_CONFIG[leito.status] || DEFAULT_STATUS_CONFIG;

  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setShowMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleMenuClick = (e) => {
    e.stopPropagation();
    if (!showMenu && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceRight = window.innerWidth - rect.left;
      setMenuPosition({
        vertical: spaceBelow < 150 ? 'top' : 'bottom',
        horizontal: spaceRight < 150 ? 'right' : 'left'
      });
    }
    setShowMenu(s => !s);
  };

  const statusOptions = [
    { value: 'livre',   label: 'Livre',   color: 'text-green-600' },
    { value: 'ocupado', label: 'Ocupado', color: 'text-gray-600' },
  ];

  return (
    <div ref={ref} className="relative">
      <div
        className={`flex flex-col gap-2 rounded-xl ${UNITS_SCALE.leitoCardPadding} border transition-all hover:shadow-md
          ${leito.bloqueado ? 'bg-red-50 border-red-200 opacity-75' : 'bg-white border-gray-200'}`}
      >
        <div className="flex items-center justify-between">
          <span className={`w-3 h-3 rounded-full flex-shrink-0 ${cfg.dot}`}></span>
          <div className="flex items-center gap-1">
            <button
              onClick={() => onToggle(leito)}
              title={leito.bloqueado ? 'Desbloquear' : 'Bloquear'}
              className="text-gray-300 hover:text-red-500 transition-colors"
            >
              {leito.bloqueado ? <Lock size={16} className="text-red-500" /> : <Unlock size={16} />}
            </button>
            {!leito.bloqueado && (
              <button onClick={handleMenuClick} className="text-gray-300 hover:text-[#12B37A] transition-colors">
                <ChevronDown size={16} />
              </button>
            )}
          </div>
        </div>
        <p className={`${UNITS_SCALE.leitoNumber} font-black leading-tight ${leito.bloqueado ? 'text-red-600' : 'text-gray-700'}`}>{leito.numero}</p>
        <span className={`${UNITS_SCALE.leitoStatus} font-semibold px-3 py-1 rounded-full ${leito.bloqueado ? 'bg-red-100 text-red-600' : cfg.color}`}>
          {leito.bloqueado ? 'Bloq.' : cfg.label}
        </span>
      </div>

      {showMenu && (
        <div className={`absolute z-30 bg-white border border-gray-200 rounded-xl shadow-lg py-1 min-w-[160px] ${menuPosition.vertical === 'bottom' ? 'top-full mt-1' : 'bottom-full mb-1'} ${menuPosition.horizontal === 'right' ? 'right-0' : 'left-0'}`}>
          {statusOptions.map(opt => (
            <button
              key={opt.value}
              onClick={() => { onChangeStatus(leito, opt.value); setShowMenu(false); }}
              className={`w-full text-left px-4 py-3 text-sm font-semibold hover:bg-gray-50 transition-colors ${opt.color} ${
                leito.status === opt.value ? 'bg-gray-50 font-black' : ''
              }`}
            >
              {leito.status === opt.value ? '✓ ' : ''}{opt.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UnidadeDetalhes({ unidade, leitos, onToggle, onChangeStatus }) {
  const quartos = [...new Set(leitos.map(l => l.quarto))].sort((a, b) => {
    const na = parseFloat(a) || a;
    const nb = parseFloat(b) || b;
    return na > nb ? 1 : na < nb ? -1 : 0;
  });

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
      <div className="px-7 py-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
        <div>
          <p className="font-black text-gray-800 text-2xl">{unidade}</p>
          <p className="text-gray-400 text-base mt-1">{leitos.length} leitos · {quartos.length} quartos · Clique em ▼ para alterar status ou no cadeado para bloquear</p>
        </div>
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-2 text-green-600"><span className="w-3 h-3 rounded-full bg-green-500"></span>{leitos.filter(l => l.status === 'livre' && !l.bloqueado).length} livres</span>
          <span className="flex items-center gap-2 text-gray-500"><span className="w-3 h-3 rounded-full bg-gray-400"></span>{leitos.filter(l => l.status === 'ocupado' && !l.bloqueado).length} ocupados</span>
          <span className="flex items-center gap-2 text-red-500"><span className="w-3 h-3 rounded-full bg-red-400"></span>{leitos.filter(l => l.bloqueado).length} bloq.</span>
        </div>
      </div>
      <div className="p-7 flex flex-col gap-6">
        {quartos.map(quarto => {
          const leitosQ = leitos.filter(l => l.quarto === quarto);
          return (
            <div key={quarto}>
              <p className="text-sm font-bold text-gray-500 mb-3 uppercase tracking-wide">{quarto}</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {[...leitosQ].sort((a, b) => {
                  const na = parseFloat(String(a.numero).replace(/[^0-9.]/g, '')) || 0;
                  const nb = parseFloat(String(b.numero).replace(/[^0-9.]/g, '')) || 0;
                  return na - nb;
                }).map((l) => <LeitoCard key={l.id} leito={l} onToggle={onToggle} onChangeStatus={onChangeStatus} />)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function LeitoStatusGrid() {
  const [leitos, setLeitos] = useState([]);
  const [selectedUnitByDivisao, setSelectedUnitByDivisao] = useState({});
  const isInitialized = useRef(false);

  const fetchLeitos = () => {
    apiClient.entities.Leito
      .filter({ ativo: true })
      .then((data) => {
        setLeitos(
          data.map((leito) => ({ ...leito, sinalizacoes: normalizeBedSignals(leito?.sinalizacoes) })),
        );
        if (!isInitialized.current) {
          const divisoes = [...new Set(data.map(l => l.divisao).filter(Boolean))];
          const initialSelection = {};
          divisoes.forEach(d => {
            const u = [...new Set(data.filter(l => l.divisao === d).map(l => l.unidade))].sort()[0];
            if (u) initialSelection[d] = u;
          });
          setSelectedUnitByDivisao(initialSelection);
          isInitialized.current = true;
        }
      })
      .catch((error) => {
        console.error(error);
        setLeitos([]);
      });
  };

  useEffect(() => {
    fetchLeitos();
    const unsub = apiClient.entities.Leito.subscribe(() => fetchLeitos());
    return unsub;
  }, []);

  const handleToggle = async (leito) => {
    await apiClient.entities.Leito.update(leito.id, {
      bloqueado: !leito.bloqueado,
      sinalizacoes: normalizeBedSignals(leito?.sinalizacoes),
    });
    fetchLeitos();
  };

  const handleChangeStatus = async (leito, novoStatus) => {
    await apiClient.entities.Leito.update(leito.id, {
      status: novoStatus,
      ultimo_evento_at: new Date().toISOString(),
      sinalizacoes: normalizeBedSignals(leito?.sinalizacoes),
    });
    fetchLeitos();
  };

  const totalLeitos = leitos.length;
  const livres = leitos.filter(l => l.status === 'livre' && !l.bloqueado).length;
  const processo = leitos.filter(l => ['aguardando_higiene', 'em_higiene', 'alta_registrada'].includes(l.status)).length;
  const bloqueados = leitos.filter(l => l.bloqueado).length;

  const divisoes = [...new Set(leitos.map(l => l.divisao).filter(Boolean))].sort();

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-3xl font-black text-gray-800">Visualização Geral e Gestão de Unidades</h2>
        <div className="flex items-center gap-2 text-[#12B37A] bg-[#12B37A]/10 px-4 py-2 rounded-full text-sm font-semibold">
          <span className="w-3 h-3 rounded-full bg-[#12B37A] animate-pulse"></span> Ao Vivo
        </div>
      </div>

      <div className="grid grid-cols-2 xl:grid-cols-4 gap-5 mb-10">
        {[
          { label: 'Total de Leitos', value: totalLeitos, color: 'text-gray-700', bg: 'bg-gray-50' },
          { label: 'Livres', value: livres, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Em Processo', value: processo, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Bloqueados', value: bloqueados, color: 'text-red-600', bg: 'bg-red-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} rounded-xl ${UNITS_SCALE.summaryCardPadding} text-center border border-gray-100`}>
            <p className={`${UNITS_SCALE.summaryValue} font-black leading-none ${s.color}`}>{s.value}</p>
            <p className={`text-gray-500 mt-2 ${UNITS_SCALE.summaryLabel}`}>{s.label}</p>
          </div>
        ))}
      </div>

      {leitos.length === 0 ? (
        <div className="bg-gray-50 rounded-2xl p-16 text-center border border-dashed border-gray-200">
          <BedDouble size={48} className="mx-auto text-gray-200 mb-4" />
          <p className="text-gray-400 font-medium">Nenhum leito cadastrado.</p>
          <p className="text-gray-300 text-sm mt-1">Vá em "Leitos" e clique em "Criar Estrutura Padrão".</p>
        </div>
      ) : (
        <>
          {divisoes.map(divisao => {
            const leitosDivisao = leitos.filter(l => l.divisao === divisao);
            const unidadesDivisao = [...new Set(leitosDivisao.map(l => l.unidade))].sort();
            const selectedUnidade = selectedUnitByDivisao[divisao];
            
            return (
              <div key={divisao} className="mb-10">
                <div className="flex items-center gap-3 mb-5">
                  <div className="w-1.5 h-7 bg-[#12B37A] rounded-full"></div>
                  <h3 className="font-black text-[#183D2A] text-2xl">{divisao}</h3>
                  <span className="text-base text-gray-400">{unidadesDivisao.length} unidades</span>
                </div>
                <div className="flex gap-4 overflow-x-auto pb-3 mb-6">
                  {unidadesDivisao.map(unidade => (
                    <UnidadeCard
                      key={unidade}
                      unidade={unidade}
                      leitos={leitosDivisao.filter(l => l.unidade === unidade)}
                      selected={selectedUnidade === unidade}
                      onClick={() => setSelectedUnitByDivisao(prev => ({ ...prev, [divisao]: unidade }))}
                    />
                  ))}
                </div>
                {selectedUnidade && (
                  <UnidadeDetalhes
                    unidade={selectedUnidade}
                    leitos={leitosDivisao.filter(l => l.unidade === selectedUnidade)}
                    onToggle={handleToggle}
                    onChangeStatus={handleChangeStatus}
                  />
                )}
              </div>
            );
          })}
        </>
      )}
    </div>
  );
}