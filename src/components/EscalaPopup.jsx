import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { X, Plus, AlertTriangle, CheckCircle2, Trash2 } from 'lucide-react';

const TURNOS = [
  { key: 'manha', label: 'Manhã (07h-13h)' },
  { key: 'tarde', label: 'Tarde (13h-19h)' },
  { key: 'noite', label: 'Noite (19h-07h)' },
];

const CAT_COLORS = {
  escriturario: 'bg-blue-100 text-blue-700',
  maqueiro: 'bg-orange-100 text-orange-700',
  higiene: 'bg-green-100 text-green-700',
};
const CAT_LABELS = { escriturario: 'Escriturário', maqueiro: 'Maqueiro', higiene: 'Higiene' };

function getInitials(nome) {
  if (!nome) return '??';
  const p = nome.trim().split(' ');
  return (p[0][0] + (p[1]?.[0] || '')).toUpperCase();
}

export default function EscalaPopup({ data, onClose, membros }) {
  const [escalas, setEscalas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addTurno, setAddTurno] = useState(null); // turno key being added
  const [selectedMembro, setSelectedMembro] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingEscalaId, setUpdatingEscalaId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const dataLabel = new Date(data + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const fetchEscalas = () => {
    apiClient.entities.Escala
      .filter({ data })
      .then((d) => {
        setEscalas(d);
      })
      .catch((error) => {
        console.error(error);
        setEscalas([]);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => { fetchEscalas(); }, [data]);

  const addMembro = async () => {
    if (!selectedMembro || !addTurno) return;
    const m = membros.find(x => x.id === selectedMembro);
    if (!m) return;
    // Check not already in this turno
    if (escalas.find(e => e.turno === addTurno && e.membro_id === m.id)) {
      setAddTurno(null); setSelectedMembro(''); return;
    }
    setSaving(true);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Escala.create({ data, turno: addTurno, membro_id: m.id, membro_nome: m.responsavel, categoria: m.categoria, status: 'escalado' });
      setAddTurno(null);
      setSelectedMembro('');
      setFeedback({ type: 'success', message: 'Membro adicionado à escala.' });
      fetchEscalas();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao adicionar membro na escala.' });
    } finally {
      setSaving(false);
    }
  };

  const toggleFalta = async (escala) => {
    setUpdatingEscalaId(escala.id);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Escala.update(escala.id, { status: escala.status === 'falta' ? 'escalado' : 'falta' });
      fetchEscalas();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao atualizar status da escala.' });
    } finally {
      setUpdatingEscalaId(null);
    }
  };

  const removeEscala = async (id) => {
    setUpdatingEscalaId(id);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Escala.delete(id);
      fetchEscalas();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao remover item da escala.' });
    } finally {
      setUpdatingEscalaId(null);
    }
  };

  // Membros not yet in this turno
  const membrosDisponiveis = (turno) => {
    const jaEscalados = escalas.filter(e => e.turno === turno).map(e => e.membro_id);
    return membros.filter(m => !jaEscalados.includes(m.id));
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="bg-[#183D2A] px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div>
            <p className="font-black text-white">Escala do Dia</p>
            <p className="text-[#7FBEA4] text-xs capitalize">{dataLabel}</p>
          </div>
          <button onClick={onClose} className="text-[#7FBEA4] hover:text-white"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 flex flex-col gap-4">
          {feedback.message && (
            <div className={`rounded-xl border px-3 py-2 text-xs ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
              {feedback.message}
            </div>
          )}
          {loading ? (
            <div className="flex justify-center py-8"><div className="w-7 h-7 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div></div>
          ) : (
            TURNOS.map(turno => {
              const turnoEscalas = escalas.filter(e => e.turno === turno.key);
              const cats = ['maqueiro', 'higiene', 'escriturario'];

              return (
                <div key={turno.key} className="border border-gray-100 rounded-2xl overflow-hidden">
                  <div className="bg-gray-50 px-4 py-3 flex items-center justify-between">
                    <p className="font-bold text-gray-700 text-sm">{turno.label}</p>
                    <button
                      onClick={() => { setAddTurno(turno.key); setSelectedMembro(''); }}
                      className="flex items-center gap-1 text-[#12B37A] text-xs font-bold hover:bg-[#12B37A]/10 px-2 py-1 rounded-lg transition-all"
                    >
                      <Plus size={13} /> Adicionar
                    </button>
                  </div>

                  {/* Add form */}
                  {addTurno === turno.key && (
                    <div className="px-4 py-3 bg-[#12B37A]/5 border-b border-gray-100 flex gap-2">
                      <select
                        value={selectedMembro}
                        onChange={e => setSelectedMembro(e.target.value)}
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-[#12B37A]"
                      >
                        <option value="">Selecionar membro...</option>
                        {membrosDisponiveis(turno.key).map(m => (
                          <option key={m.id} value={m.id}>{m.responsavel} — {CAT_LABELS[m.categoria]}</option>
                        ))}
                      </select>
                      <button onClick={addMembro} disabled={!selectedMembro || saving}
                        className="bg-[#12B37A] hover:bg-[#0fa068] disabled:opacity-50 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">
                        {saving ? '...' : 'OK'}
                      </button>
                      <button onClick={() => setAddTurno(null)} className="text-gray-400 hover:text-gray-600 px-2"><X size={16} /></button>
                    </div>
                  )}

                  {/* Members by category */}
                  <div className="divide-y divide-gray-50">
                    {cats.map(cat => {
                      const catEscalas = turnoEscalas.filter(e => e.categoria === cat);
                      if (catEscalas.length === 0) return null;
                      return (
                        <div key={cat} className="px-4 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-2">{CAT_LABELS[cat]}</p>
                          <div className="flex flex-col gap-1.5">
                            {catEscalas.map(e => (
                              <div key={e.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${e.status === 'falta' ? 'bg-red-50' : 'bg-gray-50'}`}>
                                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[10px] font-black flex-shrink-0 ${e.status === 'falta' ? 'bg-red-400' : 'bg-[#12B37A]'}`}>
                                  {getInitials(e.membro_nome)}
                                </div>
                                <p className={`flex-1 text-sm font-semibold ${e.status === 'falta' ? 'text-red-500 line-through' : 'text-gray-700'}`}>{e.membro_nome}</p>
                                {e.status === 'falta' && <span className="text-[10px] font-bold text-red-500 bg-red-100 px-2 py-0.5 rounded-full">Falta</span>}
                                <button onClick={() => toggleFalta(e)} disabled={updatingEscalaId === e.id} title={e.status === 'falta' ? 'Remover falta' : 'Marcar falta'}
                                  className={`p-1.5 rounded-lg transition-all disabled:opacity-50 ${e.status === 'falta' ? 'text-green-600 hover:bg-green-100' : 'text-yellow-500 hover:bg-yellow-50'}`}>
                                  {e.status === 'falta' ? <CheckCircle2 size={14} /> : <AlertTriangle size={14} />}
                                </button>
                                <button onClick={() => removeEscala(e.id)} disabled={updatingEscalaId === e.id} className="text-gray-300 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-all disabled:opacity-50">
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })}
                    {turnoEscalas.length === 0 && (
                      <p className="px-4 py-4 text-gray-300 text-sm text-center">Nenhum membro escalado.</p>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        <div className="px-5 py-4 border-t border-gray-100 flex-shrink-0">
          <button onClick={onClose} className="w-full border border-gray-200 text-gray-600 rounded-xl py-2.5 text-sm font-semibold hover:bg-gray-50">Fechar</button>
        </div>
      </div>
    </div>
  );
}