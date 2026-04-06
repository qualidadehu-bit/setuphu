import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, Eye, EyeOff, ArrowLeft } from 'lucide-react';

export default function GestorLogin({ onLogin }) {
  const [senha, setSenha] = useState('');
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState('');
  const navigate = useNavigate();

  const handleLogin = () => {
    if (senha === 'adm123') {
      sessionStorage.setItem('gestor_autenticado', 'true');
      onLogin();
    } else {
      setErro('Senha incorreta');
      setSenha('');
    }
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-[#183D2A] to-[#0a1f1a] flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-sm">
        <button onClick={() => navigate('/')} className="flex items-center gap-2 text-gray-400 hover:text-gray-800 mb-6 text-sm font-medium transition-colors">
          <ArrowLeft size={16} /> Voltar ao Início
        </button>
        <div className="flex justify-center mb-6">
          <div className="bg-[#12B37A] rounded-full p-4">
            <Lock size={32} className="text-white" />
          </div>
        </div>
        
        <h1 className="text-2xl font-black text-gray-800 text-center mb-2">Acesso Gestor</h1>
        <p className="text-gray-400 text-sm text-center mb-6">Sistema de Gestão Hospital Universitário</p>

        <div className="space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-widest text-gray-600 mb-2">
              Senha de Acesso
            </label>
            <div className="relative">
              <input
                type={showSenha ? 'text' : 'password'}
                value={senha}
                onChange={e => {
                  setSenha(e.target.value);
                  setErro('');
                }}
                onKeyDown={e => e.key === 'Enter' && handleLogin()}
                placeholder="••••••••"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm focus:outline-none focus:border-[#12B37A] focus:ring-1 focus:ring-[#12B37A]"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowSenha(!showSenha)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showSenha ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {erro && (
            <p className="text-red-500 text-xs font-semibold text-center">{erro}</p>
          )}

          <button
            onClick={handleLogin}
            className="w-full bg-[#12B37A] hover:bg-[#0fa068] text-white py-2.5 rounded-xl font-bold text-sm transition-all"
          >
            Acessar Painel
          </button>
        </div>

        <p className="text-gray-400 text-xs text-center mt-6">
          Sistema protegido. Apenas gestores autorizados.
        </p>
      </div>
    </div>
  );
}