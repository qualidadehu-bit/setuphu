import { useState, useEffect } from 'react';
import { useNavigate, Outlet, useLocation } from 'react-router-dom';
import GestorSidebar from '../components/GestorSidebar';
import GestorLogin from '../components/GestorLogin';

import { Menu } from 'lucide-react';

export default function Gestor() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [autenticado, setAutenticado] = useState(false);

  useEffect(() => {
    const gestorAutenticado = sessionStorage.getItem('gestor_autenticado') === 'true';
    setAutenticado(gestorAutenticado);
  }, []);

  if (!autenticado) {
    return <GestorLogin onLogin={() => setAutenticado(true)} />;
  }

  const handleLogout = () => {
    sessionStorage.removeItem('gestor_autenticado');
    navigate('/');
  };

  const pathLastPart = location.pathname.split('/').pop();
  const activeTab = pathLastPart === 'gestor' || !pathLastPart ? 'tempo-real' : pathLastPart;

  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/50 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar desktop */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:z-40 lg:flex lg:w-64 lg:flex-col">
        <GestorSidebar activeTab={activeTab} onTabChange={(tab) => navigate(`/gestor/${tab}`)} onLogout={handleLogout} />
      </div>

      {/* Sidebar mobile */}
      <div className={`fixed left-0 top-0 h-full z-30 transition-transform duration-300 lg:hidden ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <GestorSidebar activeTab={activeTab} onTabChange={(tab) => { navigate(`/gestor/${tab}`); setSidebarOpen(false); }} onLogout={handleLogout} />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Mobile header */}
        <div className="lg:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
          <button onClick={() => setSidebarOpen(true)} className="p-2 rounded-lg hover:bg-gray-100">
            <Menu size={22} className="text-[#183D2A]" />
          </button>
          <div className="text-center">
            <p className="font-black text-[#183D2A] text-sm">HUUEL — Gestor Master</p>
          </div>
          <div className="w-9"></div>
        </div>

        {/* Page content */}
        <main className="flex-1 p-6 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}