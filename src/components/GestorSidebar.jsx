import { BarChart3, Users, BedDouble, ChevronRight, LogOut, Activity, FileText, MonitorCheck, Settings, Bell } from 'lucide-react';

const NAV_ITEMS = [
  { id: 'tempo-real', label: 'Tempo Real', icon: Activity },
  { id: 'leitos', label: 'Gestão de Leitos', icon: BedDouble },
  { id: 'monitoramento', label: 'Monitoramento', icon: MonitorCheck },
  { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
  { id: 'relatorios', label: 'Relatórios', icon: FileText },
  { id: 'membros', label: 'Gerenciamento de Equipe', icon: Users },
  { id: 'notificacoes', label: 'Notificações', icon: Bell },
  { id: 'configuracoes', label: 'Isolamentos', icon: Settings },
];

export default function GestorSidebar({ activeTab, onTabChange, onLogout }) {
  return (
    <aside className="w-64 min-h-screen bg-[#183D2A] flex flex-col flex-shrink-0">
      {/* Header */}
      <div className="px-5 py-6 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="bg-[#12B37A] rounded-xl p-2">
            <BedDouble size={20} className="text-white" />
          </div>
          <div>
            <p className="text-white font-black text-base leading-tight">Hospital Universitário</p>
            <p className="text-[#12B37A] text-[11px] font-medium tracking-widest">Gestão de Leitos</p>
          </div>
        </div>
      </div>

      {/* Badge Gestor */}
      <div className="px-5 py-4">
        <span className="bg-[#12B37A]/20 text-[#12B37A] text-xs font-bold px-3 py-1.5 rounded-full border border-[#12B37A]/30">
          ⚡ GESTOR MASTER
        </span>
      </div>

      {/* Nav Items */}
      <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
        {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              onClick={() => onTabChange(id)}
              className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-150 group
                ${isActive
                  ? 'bg-[#12B37A] text-white font-semibold shadow-lg'
                  : 'text-[#7FBEA4] hover:text-white hover:bg-white/5 font-medium'
                }`}
            >
              <div className="flex items-center gap-3">
                <Icon size={18} strokeWidth={1.75} className="flex-shrink-0" />
                <span className="text-sm">{label}</span>
              </div>
              {isActive && <ChevronRight size={16} className="text-white/70" />}
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-6 mt-4 border-t border-white/10 pt-4">
        <button
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-[#7FBEA4] hover:text-white hover:bg-white/5 rounded-xl transition-all text-sm font-medium"
        >
          <LogOut size={18} strokeWidth={1.75} />
          Sair
        </button>
      </div>
    </aside>
  );
}