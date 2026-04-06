import { useState, useEffect } from 'react';
import { apiClient } from '@/api/apiClient';
import { CheckCircle2, Clock, Bell, User, XCircle, X } from 'lucide-react';

export default function GestorNotificacoes() {
  const [notificacoes, setNotificacoes] = useState([]);
  const [mostrarApenasPendentes, setMostrarApenasPendentes] = useState(true);
  const [loading, setLoading] = useState(true);
  const [cancelingId, setCancelingId] = useState(null);
  const [feedback, setFeedback] = useState({ type: '', message: '' });

  const fetchNotifs = async () => {
    setLoading(true);
    try {
      if (!apiClient.meta.isConfigured()) {
        throw new Error(apiClient.meta.getConfigurationError());
      }
      const res = await apiClient.entities.Notificacao.list('-created_date', 200);
      setNotificacoes(res);
    } catch (error) {
      console.error(error);
      setNotificacoes([]);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao carregar notificações.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifs();
    const unsub = apiClient.entities.Notificacao.subscribe(() => fetchNotifs());
    return unsub;
  }, []);

  const formatDate = (iso) => {
    if (!iso) return '-';
    return new Date(iso).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  };

  const handleCancelar = async (id) => {
    if (!window.confirm('Tem certeza que deseja cancelar esta notificação?')) return;
    setCancelingId(id);
    setFeedback({ type: '', message: '' });
    try {
      await apiClient.entities.Notificacao.update(id, {
        status: 'cancelada',
        data_conclusao: new Date().toISOString()
      });
      setFeedback({ type: 'success', message: 'Notificação cancelada com sucesso.' });
      fetchNotifs();
    } catch (error) {
      console.error(error);
      setFeedback({ type: 'error', message: error instanceof Error ? error.message : 'Falha ao cancelar notificação.' });
    } finally {
      setCancelingId(null);
    }
  };

  const pendentesCount = notificacoes.filter(n => n.status === 'pendente').length;
  
  const notificacoesExibidas = mostrarApenasPendentes 
    ? notificacoes.filter(n => n.status === 'pendente')
    : notificacoes;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
            <Bell className="text-blue-600" size={24} />
          </div>
          <div>
            <h2 className="text-xl font-black text-gray-800">Histórico e Controle de Notificações</h2>
            <p className="text-sm text-gray-500">Acompanhe as chamadas em tempo real e os tempos de resposta das equipes.</p>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-100 rounded-xl px-4 py-2 text-center">
          <p className="text-[10px] font-bold text-orange-500 uppercase">Aguardando Ação</p>
          <p className="text-xl font-black text-orange-600 leading-none mt-1">{pendentesCount}</p>
        </div>
      </div>

      <div className="flex justify-end mb-4">
        <label className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-1.5 rounded-lg border border-gray-200">
          <input 
            type="checkbox" 
            checked={mostrarApenasPendentes}
            onChange={(e) => setMostrarApenasPendentes(e.target.checked)}
            className="w-4 h-4 text-[#183D2A] rounded focus:ring-[#12B37A]"
          />
          <span className="text-sm font-semibold text-gray-700">Ocultar concluídas/canceladas</span>
        </label>
      </div>
      {feedback.message && (
        <div className={`mb-4 rounded-xl border px-4 py-3 text-sm ${feedback.type === 'error' ? 'border-red-200 bg-red-50 text-red-600' : 'border-green-200 bg-green-50 text-green-700'}`}>
          {feedback.message}
        </div>
      )}

      <div className="overflow-x-auto border border-gray-100 rounded-xl">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50/80 text-gray-500 uppercase font-bold text-[10px]">
            <tr>
              <th className="px-4 py-3">Evento / Tipo</th>
              <th className="px-4 py-3">Leito/Local</th>
              <th className="px-4 py-3">Equipe Destino</th>
              <th className="px-4 py-3">Criada em</th>
              <th className="px-4 py-3">Concluída em</th>
              <th className="px-4 py-3 text-right">Status</th>
              <th className="px-4 py-3 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-gray-400">Carregando notificações...</td>
              </tr>
            ) : notificacoesExibidas.map(n => (
              <tr key={n.id} className="hover:bg-gray-50/50 transition-colors">
                <td className="px-4 py-3">
                  <p className="font-semibold text-gray-800">{n.titulo}</p>
                  <p className="text-gray-500 text-xs mt-0.5 line-clamp-1 max-w-xs" title={n.mensagem}>{n.mensagem}</p>
                </td>
                <td className="px-4 py-3">
                  {n.leito ? (
                    <span className="font-bold text-gray-700">Leito {n.leito}</span>
                  ) : <span className="text-gray-400">-</span>}
                </td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1.5 bg-gray-100 text-gray-600 px-2 py-1 rounded-md text-[10px] font-bold uppercase tracking-wide">
                    <User size={10} />
                    {n.categoria_destino}
                  </span>
                </td>
                <td className="px-4 py-3 text-gray-600 font-medium">{formatDate(n.created_date)}</td>
                <td className="px-4 py-3 text-gray-600 font-medium">{formatDate(n.data_conclusao)}</td>
                <td className="px-4 py-3 text-right">
                  {n.status === 'concluida' ? (
                    <span className="inline-flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2.5 py-1 rounded-md">
                      <CheckCircle2 size={14} /> Concluída
                    </span>
                  ) : n.status === 'cancelada' ? (
                    <span className="inline-flex items-center gap-1 text-gray-500 text-xs font-bold bg-gray-100 px-2.5 py-1 rounded-md">
                      <XCircle size={14} /> Cancelada
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 text-orange-500 text-xs font-bold bg-orange-50 px-2.5 py-1 rounded-md animate-pulse">
                      <Clock size={14} /> Pendente
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-center">
                  {n.status === 'pendente' && (
                    <button 
                      onClick={() => handleCancelar(n.id)}
                      disabled={cancelingId === n.id}
                      className="text-red-400 hover:text-red-600 bg-red-50 hover:bg-red-100 p-1.5 rounded-md transition-colors inline-flex items-center justify-center disabled:opacity-50"
                      title="Cancelar Notificação"
                    >
                      {cancelingId === n.id ? <Clock size={16} /> : <X size={16} />}
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {!loading && notificacoesExibidas.length === 0 && (
              <tr>
                <td colSpan="7" className="text-center py-10 text-gray-400">Nenhuma notificação para exibir.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}