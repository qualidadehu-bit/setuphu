import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { Save, RotateCcw, CheckCircle2, AlertTriangle, Shield, Plus, Trash2, ChevronDown, X, Settings } from 'lucide-react';
import { DEFAULT_METAS } from '@/lib/sla';
const DEFAULT_ALERTAS = { notificarGestor: true, alertaVisual: true, relatorio: false };
const DEFAULT_ISOLAMENTOS = [
  { id: 1, label: 'Isolamento de Contato', descricao: 'Protocolo de desinfecção profunda', ativo: true, acrescimo: 20, espera: 0, leitoIds: [] },
  { id: 2, label: 'Isolamento Respiratório', descricao: 'Aguardar renovação do ar (Aerossol)', ativo: false, acrescimo: 40, espera: 30, leitoIds: [] },
];

function loadState(key, def) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || def; }
  catch { return def; }
}

// Multi-select cascading bed selector
function LeitosMultiSelector({ leitos, selected = [], onChange }) {
  const [div, setDiv] = useState('');
  const [unidade, setUnidade] = useState('');
  const [quarto, setQuarto] = useState('');

  const divisoes = [...new Set(leitos.map(l => l.divisao).filter(Boolean))].sort();
  const unidades = div ? [...new Set(leitos.filter(l => l.divisao === div).map(l => l.unidade).filter(Boolean))].sort() : [];
  const quartos = unidade ? [...new Set(leitos.filter(l => l.divisao === div && l.unidade === unidade).map(l => l.quarto).filter(Boolean))].sort() : [];
  const leitosDoQuarto = quarto ? leitos.filter(l => l.divisao === div && l.unidade === unidade && l.quarto === quarto) : [];

  const addLeito = (id) => { if (!selected.includes(id)) onChange([...selected, id]); };
  const removeLeito = (id) => onChange(selected.filter(s => s !== id));

  // Group selected by divisao+unidade for display
  const selectedLeitos = leitos.filter(l => selected.includes(l.id));
  const byDiv = selectedLeitos.reduce((acc, l) => {
    const key = `${l.divisao} › ${l.unidade}`;
    if (!acc[key]) acc[key] = [];
    acc[key].push(l);
    return acc;
  }, {});

  return (
    <div className="space-y-2">
      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">LEITOS ASSOCIADOS (OPCIONAL)</p>

      {/* Selected chips grouped */}
      {Object.entries(byDiv).length > 0 && (
        <div className="flex flex-col gap-1.5">
          {Object.entries(byDiv).map(([group, lts]) => (
            <div key={group} className="bg-gray-50 rounded-lg px-3 py-2">
              <p className="text-[9px] font-bold text-gray-400 uppercase mb-1.5">{group}</p>
              <div className="flex flex-wrap gap-1.5">
                {lts.map(l => (
                  <span key={l.id} className="flex items-center gap-1 bg-[#12B37A]/10 text-[#12B37A] border border-[#12B37A]/30 rounded-full px-2.5 py-0.5 text-xs font-semibold">
                    {l.numero}
                    <button onClick={() => removeLeito(l.id)} className="hover:text-red-500 transition-colors"><X size={10} /></button>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Cascade pickers */}
      <div className="grid grid-cols-3 gap-1.5">
        <div className="relative">
          <select value={div} onChange={e => { setDiv(e.target.value); setUnidade(''); setQuarto(''); }}
            className="w-full appearance-none border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#12B37A] pr-6 bg-white">
            <option value="">Divisão...</option>
            {divisoes.map(d => <option key={d} value={d}>{d}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={unidade} onChange={e => { setUnidade(e.target.value); setQuarto(''); }}
            disabled={!div}
            className="w-full appearance-none border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#12B37A] pr-6 bg-white disabled:opacity-50">
            <option value="">Setor...</option>
            {unidades.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        <div className="relative">
          <select value={quarto} onChange={e => setQuarto(e.target.value)}
            disabled={!unidade}
            className="w-full appearance-none border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:border-[#12B37A] pr-6 bg-white disabled:opacity-50">
            <option value="">Quarto...</option>
            {quartos.map(q => <option key={q} value={q}>{q}</option>)}
          </select>
          <ChevronDown size={10} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
      </div>

      {leitosDoQuarto.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {leitosDoQuarto.map(l => {
            const isSelected = selected.includes(l.id);
            return (
              <button key={l.id} onClick={() => isSelected ? removeLeito(l.id) : addLeito(l.id)}
                className={`px-2.5 py-1 rounded-lg text-xs font-semibold border transition-all ${
                  isSelected ? 'bg-[#12B37A] text-white border-[#12B37A]' : 'border-gray-200 text-gray-600 hover:border-[#12B37A] hover:text-[#12B37A]'
                }`}>
                {isSelected ? '✓ ' : ''}{l.numero}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function GestorConfiguracoes() {
  const [metas, setMetas] = useState(() => loadState('huuel_metas', DEFAULT_METAS));
  const [isolamentos, setIsolamentos] = useState(() => loadState('huuel_isolamentos', DEFAULT_ISOLAMENTOS));
  const [alertas, setAlertas] = useState(() => loadState('huuel_alertas', DEFAULT_ALERTAS));
  const [leitos, setLeitos] = useState([]);
  const [salvo, setSalvo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingLeitos, setLoadingLeitos] = useState(false);
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [ultimaAtualizacao] = useState(new Date().toLocaleString('pt-BR'));
  const [novoForm, setNovoForm] = useState(false);
  const [novo, setNovo] = useState({ label: '', descricao: '', ativo: true, acrescimo: 0, espera: 0, leitoIds: [] });

  useEffect(() => {
    const carregarLeitos = async () => {
      setLoadingLeitos(true);
      try {
        if (!apiClient.meta.isConfigured()) {
          throw new Error(apiClient.meta.getConfigurationError());
        }
        const data = await apiClient.entities.Leito.filter({ ativo: true });
        setLeitos(data);
      } catch (error) {
        console.error(error);
        setLeitos([]);
        setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar leitos para associação.' });
      } finally {
        setLoadingLeitos(false);
      }
    };

    carregarLeitos();
  }, []);

  const salvar = async () => {
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      localStorage.setItem('huuel_metas', JSON.stringify(metas));
      localStorage.setItem('huuel_isolamentos', JSON.stringify(isolamentos));
      localStorage.setItem('huuel_alertas', JSON.stringify(alertas));
      setSalvo(true);
      setFeedback({ type: 'success', message: 'Configurações salvas com sucesso.' });
      setTimeout(() => setSalvo(false), 3000);
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: 'Não foi possível salvar as configurações.' });
    } finally {
      setSaving(false);
    }
  };

  const descartar = () => {
    setMetas(loadState('huuel_metas', DEFAULT_METAS));
    setIsolamentos(loadState('huuel_isolamentos', DEFAULT_ISOLAMENTOS));
    setAlertas(loadState('huuel_alertas', DEFAULT_ALERTAS));
  };

  const updateIsolamento = (id, field, value) => {
    setIsolamentos(prev => prev.map(i => i.id === id ? { ...i, [field]: value } : i));
  };

  const removeIsolamento = (id) => {
    setIsolamentos(prev => prev.filter(i => i.id !== id));
  };

  const addIsolamento = () => {
    if (!novo.label) return;
    setIsolamentos(prev => [...prev, { ...novo, id: Date.now() }]);
    setNovo({ label: '', descricao: '', ativo: true, acrescimo: 0, espera: 0, leitoIds: [] });
    setNovoForm(false);
  };

  const ETAPAS_METAS = [
    { key: 'desocupacao', label: 'DESOCUPAÇÃO', desc: 'Tempo desde a alta até a sinalização de leito livre.' },
    { key: 'higiene', label: 'INÍCIO HIGIENE → TÉRMINO HIGIENE', desc: 'Tempo da execução da higienização (inicio_higiene até fim_higiene).' },
    { key: 'hotelaria', label: 'INÍCIO HOTELARIA → TÉRMINO HOTELARIA', desc: 'Tempo da execução da hotelaria (inicio_hotelaria até fim_hotelaria).' },
    { key: 'tat', label: 'GIRO TOTAL (TAT MACRO)', desc: 'Tempo total do giro de leito (da alta à entrada).' },
  ];

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-black text-gray-800">Isolamentos</h2>
        <p className="text-gray-400 text-sm">Gerencie os protocolos e metas de tempo para cada tipo de isolamento hospitalar.</p>
      </div>
      {feedback.message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {feedback.message}
        </div>
      )}

      {/* Metas Globais */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Settings size={18} className="text-[#12B37A]" />
              <h3 className="font-black text-gray-800">Ajustes de SLA Personalizados (Metas Globais)</h3>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {ETAPAS_METAS.map(etapa => (
              <div key={etapa.key} className="border border-gray-100 rounded-xl p-4">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-1">{etapa.label}</p>
                <p className="text-xs text-gray-500 mb-3 h-8">{etapa.desc}</p>
                <div className="flex items-center gap-2">
                  <input type="number" min={1} value={metas[etapa.key] || ''}
                    onChange={e => setMetas(m => ({ ...m, [etapa.key]: parseInt(e.target.value) || 0 }))}
                    className="w-full text-lg font-black text-gray-700 border-b-2 border-transparent hover:border-gray-200 focus:border-[#12B37A] focus:outline-none bg-gray-50 rounded-lg px-2 text-center" />
                  <span className="text-sm font-semibold text-gray-400">min</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Isolamentos */}
      <div className="mb-8">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <Shield size={18} className="text-[#12B37A]" />
              <h3 className="font-black text-gray-800">Metas por Tipo de Isolamento</h3>
            </div>
            <span className="text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-full">
              Notificação Automática Via App Higiene
            </span>
          </div>

          <div className="flex flex-col gap-4 max-h-[520px] overflow-y-auto pr-1">
            {isolamentos.map((iso) => (
              <div key={iso.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-orange-100 flex-shrink-0">
                      <AlertTriangle size={16} className="text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <input value={iso.label}
                        onChange={e => updateIsolamento(iso.id, 'label', e.target.value)}
                        className="font-bold text-gray-800 text-sm w-full border-b border-transparent hover:border-gray-200 focus:border-[#12B37A] focus:outline-none bg-transparent" />
                      <input value={iso.descricao}
                        onChange={e => updateIsolamento(iso.id, 'descricao', e.target.value)}
                        className="text-xs text-gray-400 w-full border-b border-transparent hover:border-gray-200 focus:border-[#12B37A] focus:outline-none bg-transparent mt-0.5" />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <div className="flex flex-col items-end gap-0.5">
                      <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400">ATIVAR</p>
                      <button onClick={() => updateIsolamento(iso.id, 'ativo', !iso.ativo)}
                        className={`w-10 h-5 rounded-full transition-all relative ${iso.ativo ? 'bg-[#12B37A]' : 'bg-gray-200'}`}>
                        <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-all ${iso.ativo ? 'right-0.5' : 'left-0.5'}`}></div>
                      </button>
                    </div>
                    <button onClick={() => removeIsolamento(iso.id)} className="text-gray-300 hover:text-red-500 p-1 transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="flex gap-4 mb-3">
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">ACRÉSCIMO NO SLA</p>
                    <div className="flex items-center gap-1">
                      <span className="text-gray-400 text-sm">+</span>
                      <input type="number" min={0} value={iso.acrescimo}
                        onChange={e => updateIsolamento(iso.id, 'acrescimo', parseInt(e.target.value) || 0)}
                        className="w-14 text-lg font-black text-gray-700 border-b-2 border-gray-200 focus:border-[#12B37A] focus:outline-none bg-transparent text-center" />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1">ESPERA/AERAÇÃO</p>
                    <div className="flex items-center gap-1">
                      <input type="number" min={0} value={iso.espera}
                        onChange={e => updateIsolamento(iso.id, 'espera', parseInt(e.target.value) || 0)}
                        className="w-14 text-lg font-black text-gray-700 border-b-2 border-gray-200 focus:border-[#12B37A] focus:outline-none bg-transparent text-center" />
                      <span className="text-xs text-gray-400">min</span>
                    </div>
                  </div>
                </div>

                <LeitosMultiSelector leitos={leitos} selected={iso.leitoIds || []}
                  onChange={val => updateIsolamento(iso.id, 'leitoIds', val)} />
              </div>
            ))}

            {novoForm ? (
              <div className="border-2 border-dashed border-[#12B37A]/40 rounded-xl p-4 bg-[#12B37A]/5">
                <p className="text-xs font-bold text-gray-700 mb-3">Novo Tipo de Isolamento</p>
                <div className="flex flex-col gap-2 mb-3">
                  <input placeholder="Nome do isolamento *" value={novo.label}
                    onChange={e => setNovo(n => ({ ...n, label: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#12B37A]" />
                  <input placeholder="Descrição do protocolo" value={novo.descricao}
                    onChange={e => setNovo(n => ({ ...n, descricao: e.target.value }))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#12B37A]" />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Acréscimo SLA (min)</label>
                      <input type="number" min={0} value={novo.acrescimo}
                        onChange={e => setNovo(n => ({ ...n, acrescimo: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#12B37A]" />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Espera/Aeração (min)</label>
                      <input type="number" min={0} value={novo.espera}
                        onChange={e => setNovo(n => ({ ...n, espera: parseInt(e.target.value) || 0 }))}
                        className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#12B37A]" />
                    </div>
                  </div>
                </div>
                <LeitosMultiSelector leitos={leitos} selected={novo.leitoIds || []} onChange={val => setNovo(n => ({ ...n, leitoIds: val }))} />
                <div className="flex gap-2 mt-3">
                  <button onClick={() => setNovoForm(false)} className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2 text-sm">Cancelar</button>
                  <button onClick={addIsolamento} disabled={!novo.label}
                    className="flex-1 bg-[#12B37A] hover:bg-[#0fa068] disabled:opacity-50 text-white rounded-lg py-2 text-sm font-bold">
                    Adicionar
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setNovoForm(true)}
                className="flex items-center justify-center gap-2 border-2 border-dashed border-gray-200 hover:border-[#12B37A] text-gray-400 hover:text-[#12B37A] rounded-xl py-3 text-sm font-semibold transition-all">
                <Plus size={16} /> Adicionar Tipo de Isolamento
              </button>
            )}
          </div>
          {loadingLeitos && <p className="text-xs text-gray-400 mt-3">Carregando lista de leitos...</p>}
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-gray-100 pt-5">
        <p className="text-xs text-gray-400 flex items-center gap-1.5">
          <CheckCircle2 size={13} className="text-[#12B37A]" />
          Última atualização: {ultimaAtualizacao}
        </p>
        <div className="flex items-center gap-3">
          <button onClick={descartar} className="flex items-center gap-2 border border-gray-200 text-gray-600 px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-gray-50 transition-all">
            <RotateCcw size={14} /> Descartar
          </button>
          <button onClick={salvar}
            disabled={saving}
            className={`flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${salvo ? 'bg-[#12B37A] text-white' : 'bg-[#183D2A] hover:bg-[#12B37A] text-white'}`}>
            {salvo ? <CheckCircle2 size={15} /> : <Save size={15} />}
            {saving ? 'Salvando...' : salvo ? 'Metas Salvas!' : 'Confirmar Todas as Metas'}
          </button>
        </div>
      </div>
    </div>
  );
}