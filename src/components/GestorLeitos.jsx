import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { Plus, Pencil, Trash2, BedDouble, X, Save, Download } from 'lucide-react';
import { gerarTodosLeitos } from '../utils/estrutura';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ALLOWED_BED_SIGNALS, getBedSignalMeaning, normalizeBedSignals } from '../lib/bedSignals';

const STATUS_LABELS = {
  ocupado: 'Ocupado', alta_registrada: 'Alta Registrada', aguardando_higiene: 'Ag. Higiene',
  em_higiene: 'Em Higiene', livre: 'Livre', aguardando_paciente: 'Ag. Paciente',
};

const EMPTY = { numero: '', divisao: '', unidade: '', quarto: '', status: 'ocupado', ativo: true, sinalizacoes: [] };

export default function GestorLeitos() {
  const gestorAutenticado = sessionStorage.getItem('gestor_autenticado') === 'true';
  const memberCategory = (sessionStorage.getItem('membro_categoria') || '').trim().toLowerCase();
  const canManageSignals =
    gestorAutenticado || memberCategory === 'gestor' || memberCategory === 'admin';
  const [leitos, setLeitos] = useState([]);
  const [filtroDivisao, setFiltroDivisao] = useState('todas');
  const [filtroUnidade, setFiltroUnidade] = useState('todas');
  const [form, setForm] = useState(null);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [updatingId, setUpdatingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchLeitos = async () => {
    try {
      if (!apiClient.meta.isConfigured()) {
        throw new Error(apiClient.meta.getConfigurationError());
      }
      const data = await apiClient.entities.Leito.list('-created_date');
      setLeitos(data.map((leito) => ({ ...leito, sinalizacoes: normalizeBedSignals(leito?.sinalizacoes) })));
    } catch (error) {
      console.error(error);
      setLeitos([]);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar leitos.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchLeitos(); }, []);

  const handleSeedEstrutura = async () => {
    if (!confirm('Isso vai criar TODOS os leitos da estrutura padrão do hospital. Continuar?')) return;
    setSeeding(true);
    setFeedback({ type: '', message: '' });
    try {
      const todos = gerarTodosLeitos();
      for (let i = 0; i < todos.length; i += 50) {
        await apiClient.entities.Leito.bulkCreate(todos.slice(i, i + 50));
      }
      setFeedback({ type: 'success', message: 'Estrutura padrão criada com sucesso.' });
      await fetchLeitos();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao criar estrutura padrão.' });
    } finally {
      setSeeding(false);
    }
  };

  const handleQuickStatusChange = async (leito, newStatus, newBloqueado) => {
    setUpdatingId(leito.id);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Leito.update(leito.id, {
        status: newStatus,
        bloqueado: newBloqueado,
        sinalizacoes: normalizeBedSignals(leito?.sinalizacoes),
        ultimo_evento_at: new Date().toISOString(),
      });
      await fetchLeitos();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao atualizar status do leito.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleSave = async () => {
    setFeedback({ type: '', message: '' });
    if (!form.numero || !form.divisao || !form.unidade || !form.quarto) {
      setFeedback({ type: 'error', message: 'Preencha os campos obrigatórios: Número, Divisão, Unidade e Quarto.' });
      return;
    }

    setSaving(true);
    try {
      if (form.id) {
        const currentLeito = leitos.find((item) => item.id === form.id);
        await apiClient.entities.Leito.update(form.id, {
          numero: form.numero,
          divisao: form.divisao,
          unidade: form.unidade,
          quarto: form.quarto,
          status: form.status,
          ativo: form.ativo,
          sinalizacoes: canManageSignals
            ? normalizeBedSignals(form.sinalizacoes)
            : normalizeBedSignals(currentLeito?.sinalizacoes),
        });
      } else {
        const numeros = form.numero.split(',').map(n => n.trim()).filter(n => n);
        if (numeros.length === 0) {
          throw new Error('Informe pelo menos um número de leito válido.');
        }
        const novosLeitos = numeros.map(num => ({
          numero: num,
          divisao: form.divisao,
          unidade: form.unidade,
          quarto: form.quarto,
          status: form.status || 'ocupado',
          ativo: true,
          sinalizacoes: canManageSignals ? normalizeBedSignals(form.sinalizacoes) : [],
        }));
        await apiClient.entities.Leito.bulkCreate(novosLeitos);
      }
      setForm(null);
      setFeedback({ type: 'success', message: 'Leito(s) salvo(s) com sucesso.' });
      await fetchLeitos();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao salvar leito.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (confirm('Remover este leito?')) {
      setDeletingId(id);
      setFeedback({ type: '', message: '' });
      try {
        await apiClient.entities.Leito.delete(id);
        setFeedback({ type: 'success', message: 'Leito removido com sucesso.' });
        await fetchLeitos();
      } catch (error) {
        console.error(error);
        setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao remover leito.' });
      } finally {
        setDeletingId(null);
      }
    }
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

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-1">Gestão de Leitos</h2>
          <p className="text-gray-500 text-sm">Cadastre e gerencie os leitos do hospital</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleSeedEstrutura}
            disabled={seeding}
            className="flex items-center gap-2 bg-[#183D2A] hover:bg-[#12B37A] text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg disabled:opacity-60"
          >
            <Download size={16} />
            {seeding ? 'Criando...' : 'Criar Estrutura Padrão'}
          </button>
          <button
            onClick={() => setForm({ ...EMPTY })}
            className="flex items-center gap-2 bg-[#12B37A] hover:bg-[#0fa068] text-white px-5 py-2.5 rounded-xl font-semibold text-sm transition-all hover:shadow-lg hover:-translate-y-0.5"
          >
            <Plus size={18} /> Novo Leito
          </button>
        </div>
      </div>
      {feedback.message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {feedback.message}
        </div>
      )}

      {form && (
        <div className="bg-white border border-[#12B37A]/30 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800">{form.id ? 'Editar Leito' : 'Novo Leito'}</h3>
            <button onClick={() => setForm(null)}><X size={20} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Divisão *</label>
              <input
                value={form.divisao || ''}
                onChange={e => setForm(f => ({ ...f, divisao: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]"
                placeholder="Ex: MaternoInfantil, Internamento"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unidade/Setor *</label>
              <input
                value={form.unidade || ''}
                onChange={e => setForm(f => ({ ...f, unidade: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]"
                placeholder="Ex: Pediatria, Clínica Médica"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Quarto *</label>
              <input
                value={form.quarto || ''}
                onChange={e => setForm(f => ({ ...f, quarto: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]"
                placeholder="Ex: 201A, Enfermaria B"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Número(s) do(s) Leito(s) *</label>
              <input
                value={form.numero}
                onChange={e => setForm(f => ({ ...f, numero: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]"
                placeholder={form.id ? "Ex: 01" : "Ex: 01, 02, 03 (separados por vírgula)"}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Status Inicial</label>
              <select
                value={form.status}
                onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]"
              >
                {Object.entries(STATUS_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Sinalizações do Leito</label>
              <div className="flex flex-wrap gap-2">
                {ALLOWED_BED_SIGNALS.map((signal) => {
                  const selected = (form.sinalizacoes || []).includes(signal);
                  return (
                    <button
                      key={signal}
                      type="button"
                      title={getBedSignalMeaning(signal)}
                      onClick={() => {
                        if (!canManageSignals) return;
                        setForm((current) => {
                          const currentSignals = normalizeBedSignals(current.sinalizacoes);
                          const nextSignals = currentSignals.includes(signal)
                            ? currentSignals.filter((item) => item !== signal)
                            : [...currentSignals, signal];
                          return { ...current, sinalizacoes: nextSignals };
                        });
                      }}
                      disabled={!canManageSignals}
                      className={`text-[11px] font-bold px-3 py-1.5 rounded-full border transition-colors ${
                        selected
                          ? 'bg-[#183D2A] text-white border-[#183D2A]'
                          : 'bg-[#fffdf8] text-gray-700 border-gray-300 hover:bg-gray-50'
                      } ${!canManageSignals ? 'opacity-60 cursor-not-allowed' : ''}`}
                    >
                      {signal}
                    </button>
                  );
                })}
              </div>
              <p className="text-[11px] text-gray-500 mt-2">
                {canManageSignals
                  ? 'Definição exclusiva do Gestor Master. Categorias operacionais apenas visualizam estas tags.'
                  : 'Visualização apenas. Sinalizações só podem ser alteradas por login de Gestor Master.'}
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <button onClick={() => setForm(null)} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#12B37A] text-white px-5 py-2 rounded-xl text-sm font-semibold hover:bg-[#0fa068] disabled:opacity-60">
              <Save size={16} /> {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

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

      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div>
        </div>
      ) : leitos.length === 0 ? (
        <div className="col-span-4 py-16 text-center">
          <BedDouble size={40} className="mx-auto text-gray-200 mb-3" />
          <p className="text-gray-400">Nenhum leito cadastrado.</p>
          <p className="text-gray-300 text-sm mt-1">Use "Criar Estrutura Padrão" para importar todos os leitos.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {[...new Set(leitosFiltrados.map(l => l.divisao).filter(Boolean))].sort().map(divisao => (
            <div key={divisao} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="bg-gray-50 border-b border-gray-100 px-5 py-3">
                <h3 className="font-black text-gray-800 flex items-center gap-2">
                  <div className="w-2 h-4 bg-[#12B37A] rounded-sm"></div>
                  {divisao}
                </h3>
              </div>
              <div className="p-5 flex flex-col gap-6">
                {[...new Set(leitosFiltrados.filter(l => l.divisao === divisao).map(l => l.unidade).filter(Boolean))].sort().map(unidade => (
                  <div key={unidade}>
                    <h4 className="font-bold text-[#183D2A] border-b pb-2 mb-3">{unidade}</h4>
                    <div className="flex flex-col gap-4">
                      {[...new Set(leitosFiltrados.filter(l => l.divisao === divisao && l.unidade === unidade).map(l => l.quarto).filter(Boolean))].sort((a, b) => {
                        const na = parseFloat(a) || a; const nb = parseFloat(b) || b;
                        return na > nb ? 1 : na < nb ? -1 : 0;
                      }).map(quarto => (
                        <div key={quarto} className="pl-4 border-l-2 border-gray-100">
                          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">Quarto {quarto}</p>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                            {leitosFiltrados.filter(l => l.divisao === divisao && l.unidade === unidade && l.quarto === quarto)
                              .sort((a, b) => {
                                const na = parseFloat(String(a.numero).replace(/[^0-9.]/g, '')) || 0;
                                const nb = parseFloat(String(b.numero).replace(/[^0-9.]/g, '')) || 0;
                                return na - nb;
                              })
                              .map(l => (
                                <div key={l.id} className="bg-white border border-gray-200 rounded-xl p-3 shadow-sm hover:shadow-md transition-all hover:border-[#12B37A]/30">
                                  <div className="flex items-start justify-between mb-2">
                                    <p className="font-black text-gray-800 text-sm">{l.numero}</p>
                                    <div className="flex gap-1 -mr-1 -mt-1">
                                      <button onClick={() => setForm({ ...l, sinalizacoes: normalizeBedSignals(l?.sinalizacoes) })} disabled={deletingId === l.id || updatingId === l.id} className="text-gray-300 hover:text-[#12B37A] p-1 disabled:opacity-50"><Pencil size={12} /></button>
                                      <button onClick={() => handleDelete(l.id)} disabled={deletingId === l.id || updatingId === l.id} className="text-gray-300 hover:text-red-500 p-1 disabled:opacity-50"><Trash2 size={12} /></button>
                                    </div>
                                  </div>
                                  <div className="flex flex-col gap-1.5 mt-2">
                                    {(normalizeBedSignals(l.sinalizacoes)).length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {normalizeBedSignals(l.sinalizacoes).map((signal) => (
                                          <span
                                            key={`${l.id}-${signal}`}
                                            title={getBedSignalMeaning(signal)}
                                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                              signal === 'CR'
                                                ? 'border-red-300 bg-red-50 text-red-700'
                                                : signal === 'SS'
                                                  ? 'border-yellow-300 bg-yellow-50 text-yellow-700'
                                                  : signal === 'UCP'
                                                    ? 'border-emerald-300 bg-emerald-50 text-emerald-700'
                                                    : 'border-slate-300 bg-slate-50 text-slate-700'
                                            }`}
                                          >
                                            {signal}
                                          </span>
                                        ))}
                                      </div>
                                    )}
                                    <button
                                      onClick={() => handleQuickStatusChange(l, 'livre', false)}
                                      disabled={updatingId === l.id || deletingId === l.id}
                                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${l.status === 'livre' && !l.bloqueado ? 'bg-green-100 text-green-700 border-green-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                      Livre
                                    </button>
                                    <button
                                      onClick={() => handleQuickStatusChange(l, 'ocupado', false)}
                                      disabled={updatingId === l.id || deletingId === l.id}
                                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${l.status === 'ocupado' && !l.bloqueado ? 'bg-blue-100 text-blue-700 border-blue-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                      Ocupado
                                    </button>
                                    <button
                                      onClick={() => handleQuickStatusChange(l, l.status, true)}
                                      disabled={updatingId === l.id || deletingId === l.id}
                                      className={`text-[10px] font-bold px-2 py-1 rounded-lg transition-all border ${l.bloqueado ? 'bg-red-100 text-red-700 border-red-200' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}
                                    >
                                      Bloqueado
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}