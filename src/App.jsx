import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import Home from './pages/Home';
import SelecaoMembro from './pages/SelecaoMembro';
import Escriturario from './pages/Escriturario';
import Higiene from './pages/Higiene';
import Gestor from './pages/Gestor';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Relatorios from './components/Relatorios';
import Monitoramento from './components/Monitoramento';
import GestorConfiguracoes from './components/GestorConfiguracoes';
import LeitoStatusGrid from './components/LeitoStatusGrid';
import DashboardCharts from './components/DashboardCharts';
import GestorMembros from './components/GestorMembros';
import GestorNotificacoes from './components/GestorNotificacoes';
import GestorLeitos from './components/GestorLeitos';
// Add page imports here

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    }
    // For auth_required or other errors, still render the app
    // (this app uses its own session-based auth)
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/membro" element={<SelecaoMembro />} />
      <Route path="/escriturario" element={<Escriturario />} />
      <Route path="/maqueiro" element={<Navigate to="/membro" replace />} />
      <Route path="/higiene" element={<Higiene />} />
      <Route path="/gestor" element={<Gestor />}>
        <Route index element={<LeitoStatusGrid />} />
        <Route path="tempo-real" element={<LeitoStatusGrid />} />
        <Route path="leitos" element={<GestorLeitos />} />
        <Route path="monitoramento" element={<Monitoramento />} />
        <Route path="indicadores" element={<DashboardCharts />} />
        <Route path="relatorios" element={<Relatorios />} />
        <Route path="membros" element={<GestorMembros />} />
        <Route path="notificacoes" element={<GestorNotificacoes />} />
        <Route path="configuracoes" element={<GestorConfiguracoes />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App