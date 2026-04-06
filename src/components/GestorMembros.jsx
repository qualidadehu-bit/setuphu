import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { Plus, Pencil, Trash2, UserCheck, X, Save, Eye, EyeOff, Users, Truck, Sparkles, Search, ChevronLeft, ChevronRight, Eye as EyeIcon, AlertTriangle } from 'lucide-react';
import EscalaPopup from './EscalaPopup';

const CATEGORIA_LABELS = { escriturario: 'Escriturário', maqueiro: 'Maqueiro', higiene: 'Higiene' };
const CATEGORIA_COLORS = { escriturario: 'bg-blue-100 text-blue-700', maqueiro: 'bg-orange-100 text-orange-700', higiene: 'bg-green-100 text-green-700' };
const CATEGORIA_AVATAR = { escriturario: 'bg-blue-500', maqueiro: 'bg-orange-500', higiene: 'bg-[#12B37A]' };
const EMPTY = { responsavel: '', categoria: 'escriturario', matricula: '', senha: '', ativo: true };
const DIAS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'];
const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

async function hashSenha(senha) {
  const res = await apiClient.functions.invoke('senhaAuth', { action: 'hash', senha });
  return res.data.hash;
}

function getInitials(nome) {
  if (!nome) return '??';
  const p = nome.trim().split(' ');
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
}

function MiniCalendar({ onDayClick }) {
  const today = new Date();
  const [mes, setMes] = useState(today.getMonth());
  const [ano, setAno] = useState(today.getFullYear());

  const firstDay = new Date(ano, mes, 1).getDay();
  const daysInMonth = new Date(ano, mes + 1, 0).getDate();
  const cells = Array(firstDay).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const prev = () => { if (mes === 0) { setMes(11); setAno(a => a - 1); } else setMes(m => m - 1); };
  const next = () => { if (mes === 11) { setMes(0); setAno(a => a + 1); } else setMes(m => m + 1); };

  const toDateStr = (d) => `${ano}-${String(mes + 1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="font-bold text-white text-sm">{MESES[mes]} {ano}</p>
        <div className="flex gap-1">
          <button onClick={prev} className="text-[#7FBEA4] hover:text-white p-1"><ChevronLeft size={14} /></button>
          <button onClick={next} className="text-[#7FBEA4] hover:text-white p-1"><ChevronRight size={14} /></button>
        </div>
      </div>
      <div className="grid grid-cols-7 gap-0.5 mb-1">
        {DIAS.map((d, i) => <p key={i} className="text-[10px] font-bold text-[#7FBEA4] text-center">{d}</p>)}
      </div>
      <div className="grid grid-cols-7 gap-0.5">
        {cells.map((d, i) => (
          <div key={i} onClick={() => d && onDayClick(toDateStr(d))}
            className={`text-center text-[11px] rounded-full w-6 h-6 flex items-center justify-center mx-auto
              ${d === today.getDate() && mes === today.getMonth() && ano === today.getFullYear()
                ? 'bg-[#12B37A] text-white font-black'
                : d ? 'text-[#7FBEA4] hover:text-white hover:bg-white/10 cursor-pointer' : ''}`}>
            {d}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function GestorMembros() {
  const [membros, setMembros] = useState([]);
  const [leitos, setLeitos] = useState([]);
  const [form, setForm] = useState(null);
  const [showSenha, setShowSenha] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const [formError, setFormError] = useState('');
  const [feedback, setFeedback] = useState({ type: '', message: '' });
  const [search, setSearch] = useState('');
  const [showAll, setShowAll] = useState(false);
  const [escalaDia, setEscalaDia] = useState(null);
  const [escalasHoje, setEscalasHoje] = useState([]);

  const hoje = new Date().toISOString().split('T')[0];

  const fetchMembros = () => {
    apiClient.entities.Membro
      .list('-created_date')
      .then((data) => {
        setMembros(data);
      })
      .catch((error) => {
        console.error(error);
        setMembros([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  const fetchEscalasHoje = () => {
    apiClient.entities.Escala
      .filter({ data: hoje })
      .then(setEscalasHoje)
      .catch((error) => {
        console.error(error);
        setEscalasHoje([]);
      });
  };

  useEffect(() => {
    const carregarDados = async () => {
      if (!apiClient.meta.isConfigured()) {
        setFeedback({ type: 'error', message: apiClient.meta.getConfigurationError() });
        setLoading(false);
        return;
      }
      fetchMembros();
      apiClient.entities.Leito
        .filter({ ativo: true })
        .then(setLeitos)
        .catch((error) => {
          console.error(error);
          setLeitos([]);
        });
      fetchEscalasHoje();
    };
    carregarDados();
  }, []);

  const handleSave = async () => {
    setFormError('');
    setFeedback({ type: '', message: '' });
    if (!form.responsavel) return setFormError('Preencha o nome do responsável.');
    if (!form.categoria) return setFormError('Selecione uma categoria.');
    if (!form.id && !form.senha) return setFormError('Digite uma senha para o novo membro.');
    setSaving(true);
    try {
      let senhaFinal = form._senhaAtual;
      if (form.senha) {
        senhaFinal = await hashSenha(form.senha);
      }
      if (!senhaFinal) {
        throw new Error('Não foi possível gerar a senha do membro. Verifique a configuração da API.');
      }
      if (form.id) {
        await apiClient.entities.Membro.update(form.id, { responsavel: form.responsavel, categoria: form.categoria, matricula: form.matricula, senha: senhaFinal, ativo: form.ativo });
      } else {
        await apiClient.entities.Membro.create({ responsavel: form.responsavel, categoria: form.categoria, matricula: form.matricula, senha: senhaFinal, ativo: true });
      }
      setFeedback({ type: 'success', message: 'Membro salvo com sucesso.' });
      setForm(null);
      setShowSenha(false);
      fetchMembros();
    } catch (error) {
      console.error(error);
      setFormError(error instanceof Error ? error.message : 'Falha ao salvar membro.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remover este membro?')) return;
    setDeletingId(id);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Membro.delete(id);
      setFeedback({ type: 'success', message: 'Membro removido com sucesso.' });
      fetchMembros();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao remover membro.' });
    } finally {
      setDeletingId(null);
    }
  };

  const totalAtivos = membros.filter(m => m.ativo !== false).length;
  const maqueiros = membros.filter(m => m.categoria === 'maqueiro' && m.ativo !== false).length;
  const higieneCount = membros.filter(m => m.categoria === 'higiene' && m.ativo !== false).length;
  const escriturarios = membros.filter(m => m.categoria === 'escriturario' && m.ativo !== false).length;

  const filtrados = membros.filter(m =>
    m.responsavel?.toLowerCase().includes(search.toLowerCase()) ||
    CATEGORIA_LABELS[m.categoria]?.toLowerCase().includes(search.toLowerCase())
  );
  const exibidos = showAll ? filtrados : filtrados.slice(0, 5);

  const unidades = [...new Set(leitos.map(l => l.unidade).filter(Boolean))].sort().slice(0, 4);
  const eficiencia = unidades.map(u => {
    const lts = leitos.filter(l => l.unidade === u);
    const livres = lts.filter(l => l.status === 'livre' && !l.bloqueado).length;
    const pct = lts.length > 0 ? Math.round((livres / lts.length) * 100) : 0;
    return { nome: u, pct };
  });

  const TURNO_LIST = [
    { key: 'manha', label: 'Manhã (07h-13h)' },
    { key: 'tarde', label: 'Tarde (13h-19h)' },
    { key: 'noite', label: 'Noite (19h-07h)' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h2 className="text-2xl font-black text-gray-800">Visão Geral da Operação</h2>
          <p className="text-gray-400 text-sm mt-0.5">Monitoramento em tempo real da equipe assistencial e operacional.</p>
        </div>
        <button
          onClick={() => { setForm({ ...EMPTY }); setShowSenha(false); }}
          className="flex items-center gap-2 bg-[#12B37A] hover:bg-[#0fa068] text-white px-4 py-2 rounded-xl font-bold text-sm transition-all"
        >
          <Plus size={16} /> Novo Membro
        </button>
      </div>
      {feedback.message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {feedback.message}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'TOTAL ACTIVE STAFF', value: totalAtivos, icon: <Users size={20} className="text-gray-500" />, bg: 'bg-gray-100' },
          { label: 'ESCRITURÁRIOS', value: escriturarios, icon: <UserCheck size={20} className="text-blue-500" />, bg: 'bg-blue-50' },
          { label: 'AVAILABLE TRANSPORT', value: maqueiros, icon: <Truck size={20} className="text-orange-500" />, bg: 'bg-orange-50' },
          { label: 'HYGIENISTS DUTY', value: higieneCount, icon: <Sparkles size={20} className="text-[#12B37A]" />, bg: 'bg-green-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 flex items-center gap-4">
            <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center flex-shrink-0`}>{s.icon}</div>
            <div>
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">{s.label}</p>
              <p className="text-3xl font-black text-gray-800">{String(s.value).padStart(2, '0')}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Form */}
      {form && (
        <div className="bg-white border border-[#12B37A]/30 rounded-2xl p-6 mb-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-gray-800">{form.id ? 'Editar Membro' : 'Novo Membro'}</h3>
            <button onClick={() => setForm(null)}><X size={20} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Responsável *</label>
              <input value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]" placeholder="Nome do responsável" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Categoria *</label>
              <select value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]">
                {Object.entries(CATEGORIA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Matrícula</label>
              <input value={form.matricula || ''} onChange={e => setForm(f => ({ ...f, matricula: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:border-[#12B37A]" placeholder="Opcional" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1.5">Senha de Acesso *</label>
              <div className="relative">
                <input type={showSenha ? 'text' : 'password'} value={form.senha || ''} onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#12B37A]" placeholder="Crie uma senha" />
                <button type="button" onClick={() => setShowSenha(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
          </div>
          {formError && <p className="text-red-500 text-xs mt-3">{formError}</p>}
          <div className="flex justify-end gap-3 mt-4">
            <button onClick={() => { setForm(null); setFormError(''); }} className="px-5 py-2 border border-gray-200 text-gray-600 rounded-xl text-sm">Cancelar</button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 bg-[#12B37A] hover:bg-[#0fa068] disabled:opacity-60 text-white px-5 py-2 rounded-xl text-sm font-semibold">
              {saving ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={16} />}
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {/* Main 2-column layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Monitoring table */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-1 h-5 bg-[#12B37A] rounded-full"></div>
                <h3 className="font-black text-gray-800">Monitoramento de Plantão Ativo</h3>
              </div>
              <div className="relative">
                <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filtrar por nome ou categoria..."
                  className="pl-9 pr-4 py-1.5 border border-gray-200 rounded-xl text-xs focus:outline-none focus:border-[#12B37A] w-52" />
              </div>
            </div>

            {loading ? (
              <div className="flex justify-center py-12"><div className="w-7 h-7 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div></div>
            ) : (
              <>
                <table className="w-full">
                  <thead className="bg-gray-50 border-b border-gray-100">
                    <tr>
                      {['Nome', 'Cargo', 'Matrícula', 'Status', ''].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-[10px] font-bold uppercase tracking-wider text-gray-400">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {filtrados.length === 0 ? (
                      <tr><td colSpan={5} className="py-12 text-center">
                        <UserCheck size={36} className="mx-auto text-gray-200 mb-2" />
                        <p className="text-gray-400 text-sm">Nenhum membro encontrado.</p>
                      </td></tr>
                    ) : exibidos.map(m => (
                      <tr key={m.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${CATEGORIA_AVATAR[m.categoria] || 'bg-gray-400'} flex items-center justify-center text-white text-[11px] font-black flex-shrink-0`}>
                              {getInitials(m.responsavel)}
                            </div>
                            <p className="font-semibold text-gray-800 text-sm">{m.responsavel}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${CATEGORIA_COLORS[m.categoria]}`}>
                            {CATEGORIA_LABELS[m.categoria]}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-gray-400 text-sm">{m.matricula || '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${m.ativo !== false ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                            {m.ativo !== false ? '● Ativo' : '● Off'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            <button onClick={() => { setForm({ ...m, senha: '', _senhaAtual: m.senha }); setShowSenha(false); }} disabled={deletingId === m.id} className="text-gray-300 hover:text-[#12B37A] p-1.5 rounded-lg hover:bg-[#12B37A]/10 transition-all disabled:opacity-50"><Pencil size={14} /></button>
                            <button onClick={() => handleDelete(m.id)} disabled={deletingId === m.id} className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50"><Trash2 size={14} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtrados.length > 5 && (
                  <div className="px-5 py-3 border-t border-gray-100 text-center">
                    <button onClick={() => setShowAll(s => !s)} className="text-[#12B37A] text-sm font-bold hover:underline">
                      {showAll ? 'Ver menos' : `Ver todos os ${filtrados.length} membros`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Right: Escalas + Eficiência */}
        <div className="flex flex-col gap-4">
          {/* Próximas Escalas */}
          <div className="bg-[#183D2A] rounded-2xl p-5">
            <p className="font-black text-white mb-1">Próximas Escalas</p>
            <p className="text-[10px] text-[#7FBEA4] mb-4">Clique em um dia para gerenciar escalas</p>
            <MiniCalendar onDayClick={setEscalaDia} />
            <div className="mt-5">
              <p className="text-[10px] font-bold uppercase tracking-widest text-[#7FBEA4] mb-3">TURNOS HOJE</p>
              <div className="flex flex-col gap-2">
                {TURNO_LIST.map(turno => {
                  const te = escalasHoje.filter(e => e.turno === turno.key);
                  const faltas = te.filter(e => e.status === 'falta').length;
                  const maqT = te.filter(e => e.categoria === 'maqueiro' && e.status === 'escalado').length;
                  const higT = te.filter(e => e.categoria === 'higiene' && e.status === 'escalado').length;
                  const hasWarn = faltas > 0;
                  return (
                    <div key={turno.key} className={`rounded-xl p-3 ${hasWarn ? 'bg-orange-500/20 border border-orange-500/30' : 'bg-white/10'}`}>
                      <div className="flex items-center justify-between mb-1">
                        <p className={`text-xs font-bold ${hasWarn ? 'text-orange-300' : 'text-white'}`}>{turno.label}</p>
                        {hasWarn ? <AlertTriangle size={13} className="text-orange-400" /> : <EyeIcon size={13} className="text-[#12B37A]" />}
                      </div>
                      {hasWarn && <p className="text-[10px] text-orange-400 font-semibold mb-1">{faltas} falta{faltas > 1 ? 's' : ''} registrada{faltas > 1 ? 's' : ''}</p>}
                      <div className="flex gap-3">
                        <span className="text-[10px] text-orange-300">🚑 {maqT} maq.</span>
                        <span className="text-[10px] text-[#12B37A]">🧹 {higT} hig.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Eficiência de Limpeza */}
          {eficiencia.length > 0 && (
            <div className="bg-[#183D2A] rounded-2xl p-5">
              <p className="font-black text-white mb-1">Eficiência de Limpeza</p>
              <p className="text-[10px] text-[#7FBEA4] mb-4">% de leitos livres por unidade</p>
              <div className="flex items-end gap-3 justify-around h-28">
                {eficiencia.map(u => (
                  <div key={u.nome} className="flex flex-col items-center gap-1 flex-1">
                    <p className="text-[10px] font-bold text-[#12B37A]">{u.pct}%</p>
                    <div className="w-full bg-white/10 rounded-t-lg relative overflow-hidden" style={{ height: '64px' }}>
                      <div className="w-full bg-[#12B37A] rounded-t-lg absolute bottom-0 transition-all" style={{ height: `${Math.max(u.pct, 4)}%` }}></div>
                    </div>
                    <p className="text-[9px] text-[#7FBEA4] text-center leading-tight">{u.nome}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 pt-3 border-t border-white/10">
                <p className="text-[10px] text-[#7FBEA4]">Meta de tempo médio: 15min</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Popup de escala */}
      {escalaDia && (
        <EscalaPopup
          data={escalaDia}
          membros={membros}
          onClose={() => { setEscalaDia(null); fetchEscalasHoje(); }}
        />
      )}
    </div>
  );
}