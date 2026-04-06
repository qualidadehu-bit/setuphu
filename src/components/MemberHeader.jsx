import { useNavigate } from 'react-router-dom';
import { BedDouble, LogOut } from 'lucide-react';
import NotificacoesPendentes from './NotificacoesPendentes';
import { CATEGORIA_LABELS } from '../lib/leito-config';

const CATEGORIA_COLORS_BADGE = {
  escriturario: 'bg-blue-500',
  maqueiro: 'bg-orange-500',
  higiene: 'bg-[#12B37A]',
};

export default function MemberHeader() {
  const navigate = useNavigate();
  const nome = sessionStorage.getItem('membro_nome') || 'Responsável';
  const categoria = sessionStorage.getItem('membro_categoria') || '';

  const handleLogout = () => {
    sessionStorage.clear();
    navigate('/membro');
  };

  return (
    <header className="bg-[#183D2A] border-b border-white/10 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <BedDouble className="text-[#12B37A]" size={24} />
        <div>
          <p className="text-white font-black text-sm">Hospital Universitário</p>
          <p className="text-[#12B37A] text-[10px] tracking-widest">GESTÃO DE LEITOS</p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <NotificacoesPendentes />
        <div className="text-right">
          <p className="text-white font-semibold text-sm">{nome}</p>
          {categoria && (
            <span className={`text-[10px] font-bold text-white px-2 py-0.5 rounded-full ${CATEGORIA_COLORS_BADGE[categoria]}`}>
              {CATEGORIA_LABELS[categoria]}
            </span>
          )}
        </div>
        <button onClick={handleLogout} className="text-[#7FBEA4] hover:text-white transition-colors p-1">
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
}