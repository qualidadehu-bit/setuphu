import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, X, CheckCheck, ExternalLink } from 'lucide-react';
import { apiClient } from '@/api/apiClient';
import { marcarNotificacaoComoLida } from '../lib/notificacao-sistema';

const TIPO_CONFIG = {
  higiene:       { cor: 'bg-yellow-400', borda: 'border-yellow-400' },
  transporte:    { cor: 'bg-[#12B37A]',  borda: 'border-[#12B37A]' },
  alerta_critico:{ cor: 'bg-red-500',    borda: 'border-red-500' },
};

const buildNotificationUrl = (rota, unidade, leito) => {
  if (!rota) return '/';
  const url = new URL(rota, window.location.origin);
  if (unidade) url.searchParams.set('unidade', unidade);
  if (leito) url.searchParams.set('leito', leito);
  return `${url.pathname}${url.search}${url.hash}`;
};

function ToastNotif({ notif, onDismiss, onNavigate }) {
  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.higiene;

  useEffect(() => {
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, []);

  return (
    <div className={`flex items-start gap-3 bg-[#183D2A] border-l-4 ${cfg.borda} text-white px-4 py-3 rounded-xl shadow-2xl w-80 animate-[slideIn_0.3s_ease-out]`}>
      <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.cor} animate-pulse`}></div>
      <div className="flex-1 min-w-0">
        <p className="font-bold text-sm">{notif.titulo}</p>
        <p className="text-white/70 text-xs mt-0.5 line-clamp-2">{notif.mensagem}</p>
        {notif.rota && (
          <button
            onClick={() => { 
              const url = buildNotificationUrl(notif.rota, notif.unidade, notif.leito);
              onNavigate(url); 
              onDismiss(); 
            }}
            className="flex items-center gap-1 text-[#12B37A] text-xs font-bold mt-1.5 hover:underline"
          >
            Ir agora <ExternalLink size={10} />
          </button>
        )}
      </div>
      <button onClick={onDismiss} className="text-white/40 hover:text-white flex-shrink-0">
        <X size={14} />
      </button>
    </div>
  );
}

export default function NotificacoesPendentes() {
  const navigate = useNavigate();
  const [notificacoes, setNotificacoes] = useState([]);
  const [aberto, setAberto] = useState(false);
  const [toasts, setToasts] = useState([]);
  const prevCountRef = useRef(0);
  const categoria = sessionStorage.getItem('membro_categoria');

  const carregarNotificacoes = async () => {
    if (!categoria) return;
    const notifs = await apiClient.entities.Notificacao.filter({
      categoria_destino: categoria,
      status: 'pendente'
    }, '-created_date');
    
    setNotificacoes(notifs);

    if (notifs.length > prevCountRef.current) {
      const novas = notifs.slice(0, notifs.length - prevCountRef.current);
      novas.forEach(n => {
        setToasts(prev => [...prev, { ...n, _key: n.id }]);
      });
    }
    prevCountRef.current = notifs.length;
  };

  useEffect(() => {
    if (!categoria) return;
    carregarNotificacoes();
    const unsub = apiClient.entities.Notificacao.subscribe(() => carregarNotificacoes());
    return unsub;
  }, [categoria]);

  const handleMarcarComoLida = async (notifId) => {
    await marcarNotificacaoComoLida(notifId);
    carregarNotificacoes();
  };

  const dismissToast = (key) => {
    setToasts(prev => prev.filter(t => t._key !== key));
  };

  if (!categoria) return null;

  return (
    <>
      {/* Toasts flutuantes */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-3 items-end">
        {toasts.map(t => (
          <ToastNotif key={t._key} notif={t} onDismiss={() => dismissToast(t._key)} onNavigate={navigate} />
        ))}
      </div>

      {/* Ícone do sino */}
      <div className="relative">
        <button
          onClick={() => setAberto(!aberto)}
          className={`relative p-2 rounded-xl transition-all ${
            notificacoes.length > 0
              ? 'bg-[#12B37A] text-white shadow-lg shadow-[#12B37A]/40'
              : 'text-[#7FBEA4] hover:bg-white/10'
          }`}
        >
          <Bell size={20} className={notificacoes.length > 0 ? 'animate-[wiggle_0.6s_ease-in-out_infinite]' : ''} />
          {notificacoes.length > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#183D2A]">
              {notificacoes.length > 9 ? '9+' : notificacoes.length}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {aberto && (
          <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl border border-gray-200 shadow-2xl z-50 max-h-96 overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-[#183D2A] to-[#12B37A] px-4 py-3 text-white rounded-t-2xl flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm">Notificações</h3>
                <p className="text-[11px] text-white/70">{notificacoes.length} pendente{notificacoes.length !== 1 ? 's' : ''}</p>
              </div>
              <button onClick={() => setAberto(false)} className="text-white/60 hover:text-white">
                <X size={16} />
              </button>
            </div>

            {notificacoes.length === 0 ? (
              <p className="text-center text-gray-300 text-sm py-8">Nenhuma notificação</p>
            ) : (
              <div className="divide-y divide-gray-100">
                {notificacoes.map((notif) => {
                  const cfg = TIPO_CONFIG[notif.tipo] || TIPO_CONFIG.higiene;
                  return (
                    <div key={notif.id} className={`p-4 hover:bg-gray-50 transition-colors border-l-4 ${cfg.borda}`}>
                      <div className="flex items-start gap-3">
                        <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${cfg.cor}`}></div>
                        <div className="flex-1 min-w-0">
                          <p className="font-bold text-gray-800 text-sm">{notif.titulo}</p>
                          <p className="text-gray-600 text-xs mt-1 line-clamp-2">{notif.mensagem}</p>
                          <p className="text-gray-400 text-[11px] mt-1">
                            Criada: {new Date(notif.created_date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </p>
                        </div>
                        <button
                          onClick={() => handleMarcarComoLida(notif.id)}
                          className="text-gray-300 hover:text-[#12B37A] flex-shrink-0"
                          title="Marcar como concluída"
                        >
                          <CheckCheck size={16} />
                        </button>
                      </div>
                      {notif.rota && (
                        <button
                          onClick={() => {
                            const url = buildNotificationUrl(notif.rota, notif.unidade, notif.leito);
                            navigate(url);
                            setAberto(false);
                          }}
                          className="mt-2 flex items-center gap-1 text-[#12B37A] hover:text-[#0fa068] text-xs font-bold"
                        >
                          <ExternalLink size={11} /> Ir para o leito
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}