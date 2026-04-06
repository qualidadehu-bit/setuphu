import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '@/api/apiClient';
import { BedDouble, ArrowLeft, ChevronDown, ChevronUp, Eye, EyeOff, Lock, AlertCircle, UserCheck, Truck, Sparkles } from 'lucide-react';

const CATEGORIA_ROUTES = {
  escriturario: '/escriturario',
  maqueiro: '/maqueiro',
  higiene: '/higiene',
};

const CATEGORIA_CONFIG = {
  escriturario: { label: 'Escriturário', color: 'bg-blue-500', light: 'bg-blue-50 border-blue-200', badge: 'bg-blue-100 text-blue-700' },
  maqueiro:     { label: 'Maqueiro',     color: 'bg-orange-500', light: 'bg-orange-50 border-orange-200', badge: 'bg-orange-100 text-orange-700' },
  higiene:      { label: 'Higiene',      color: 'bg-[#12B37A]', light: 'bg-green-50 border-green-200', badge: 'bg-green-100 text-green-700' },
};

const MEMBER_PORTAL_SCALE = {
  heroTitle: 'text-5xl md:text-6xl lg:text-7xl',
  rightPanel: 'p-10 md:p-20',
  logo: 'h-28 md:h-32',
  contentWidth: 'max-w-2xl',
  backButton: 'text-base',
  sectionTitle: 'text-4xl',
  sectionSubtitle: 'text-sm tracking-[0.2em]',
  categoryCardPadding: 'p-8',
  categoryIconWrap: 'w-24 h-24 rounded-3xl',
  categoryIconSize: 40,
  categoryTitle: 'text-4xl',
  categoryCount: 'text-xl',
  memberCard: 'p-6 rounded-2xl',
  memberName: 'text-xl',
  memberMatricula: 'text-sm',
  passwordInput: 'py-4 text-base',
  enterButton: 'px-8 py-4 text-base',
};

export default function SelecaoMembro() {
  const HERO_BG_URL = '/images/hu-entrada.png';
  const LOGO_URL = '/images/logo-qualidade-hu.png';

  const [membros, setMembros] = useState([]);
  const [loading, setLoading] = useState(true);
  const [aberta, setAberta] = useState(null); // categoria aberta
  const [senhas, setSenhas] = useState({}); // { membroId: string }
  const [showSenha, setShowSenha] = useState({}); // { membroId: bool }
  const [erro, setErro] = useState(null);
  const [showLogo, setShowLogo] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    apiClient.entities.Membro
      .filter({ ativo: true })
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
  }, []);

  const toggleCategoria = (cat) => {
    setAberta(prev => prev === cat ? null : cat);
    setErro(null);
    setSenhas({});
  };

  const handleLogin = async (membro) => {
    const senhaDigitada = senhas[membro.id] || '';
    const res = await apiClient.functions.invoke('senhaAuth', { action: 'verify', senha: senhaDigitada, hash: membro.senha });
    if (!res.data.valido) {
      setErro(membro.id);
      return;
    }
    sessionStorage.setItem('membro_id', membro.id);
    sessionStorage.setItem('membro_nome', membro.responsavel);
    sessionStorage.setItem('membro_categoria', membro.categoria);
    navigate(CATEGORIA_ROUTES[membro.categoria]);
  };

  const categorias = ['escriturario', 'maqueiro', 'higiene'];

  const BGS = {
    escriturario: 'bg-blue-50 group-hover:bg-blue-100',
    maqueiro: 'bg-orange-50 group-hover:bg-orange-100',
    higiene: 'bg-green-50 group-hover:bg-green-100'
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Coluna Esquerda: Imagem e Texto */}
      <div 
        className="md:w-1/2 relative flex items-center justify-center min-h-[40vh] md:min-h-screen"
        style={{
          backgroundColor: '#183D2A',
          backgroundImage: `linear-gradient(to bottom, rgba(24,61,42,0.25), rgba(24,61,42,0.25)), url(${HERO_BG_URL})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="absolute inset-0 bg-black/20"></div>
        <h1 className={`relative ${MEMBER_PORTAL_SCALE.heroTitle} font-black text-white text-center tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] px-4`}>
          SetUp de Leitos<br />HU/UEL
        </h1>
      </div>

      {/* Coluna Direita: Painel e Botões */}
      <div className={`md:w-1/2 bg-white flex flex-col items-center justify-center ${MEMBER_PORTAL_SCALE.rightPanel} relative`}>
        {showLogo && (
          <img
            src={LOGO_URL}
            alt="Escritório de Qualidade HUUEL"
            className={`absolute top-8 right-8 ${MEMBER_PORTAL_SCALE.logo} object-contain`}
            onError={() => setShowLogo(false)}
          />
        )}
        <div className={`w-full ${MEMBER_PORTAL_SCALE.contentWidth}`}>
          <button onClick={() => navigate('/')} className={`flex items-center gap-2 text-gray-400 hover:text-gray-800 mb-10 transition-colors ${MEMBER_PORTAL_SCALE.backButton}`}>
            <ArrowLeft size={18} /> Voltar ao Início
          </button>

          <div className="flex items-center gap-4 mb-10">
            <BedDouble className="text-[#12B37A]" size={40} />
            <div>
              <h1 className={`${MEMBER_PORTAL_SCALE.sectionTitle} font-black text-gray-800`}>Acesso da Equipe</h1>
              <p className={`text-gray-500 ${MEMBER_PORTAL_SCALE.sectionSubtitle}`}>SELECIONE SUA CATEGORIA</p>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center py-16">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-[#12B37A] rounded-full animate-spin"></div>
            </div>
          ) : (
            <div className="flex flex-col gap-6">
              {categorias.map(cat => {
                const cfg = CATEGORIA_CONFIG[cat];
                const lista = membros.filter(m => m.categoria === cat);
                const isOpen = aberta === cat;

                return (
                  <div key={cat} className="bg-white border border-gray-100 rounded-2xl shadow-sm transition-all duration-200 overflow-hidden">
                    {/* Botão da categoria (Card) */}
                    <button
                      onClick={() => toggleCategoria(cat)}
                      className={`w-full flex items-center justify-between ${MEMBER_PORTAL_SCALE.categoryCardPadding} transition-all duration-200 group cursor-pointer
                        ${isOpen ? 'bg-gray-50' : 'hover:bg-gray-50 hover:shadow-md'}`}
                    >
                      <div className="flex items-center gap-8">
                        <div className={`${MEMBER_PORTAL_SCALE.categoryIconWrap} flex items-center justify-center transition-colors ${BGS[cat]}`}>
                          {cat === 'escriturario' && <UserCheck size={MEMBER_PORTAL_SCALE.categoryIconSize} className="text-blue-600" />}
                          {cat === 'maqueiro' && <Truck size={MEMBER_PORTAL_SCALE.categoryIconSize} className="text-orange-600" />}
                          {cat === 'higiene' && <Sparkles size={MEMBER_PORTAL_SCALE.categoryIconSize} className="text-[#12B37A]" />}
                        </div>
                        <div className="text-left">
                          <span className={`${MEMBER_PORTAL_SCALE.categoryTitle} font-bold text-gray-800 block mb-2`}>{cfg.label}</span>
                          <span className={`text-gray-500 font-medium ${MEMBER_PORTAL_SCALE.categoryCount}`}>{lista.length} membro{lista.length !== 1 ? 's' : ''}</span>
                        </div>
                      </div>
                      {isOpen
                        ? <ChevronUp size={32} className="text-gray-400" />
                        : <ChevronDown size={32} className="text-gray-400" />}
                    </button>

                    {/* Menu suspenso com os membros */}
                    {isOpen && (
                      <div className="bg-white border-t border-gray-100 p-6">
                        {lista.length === 0 ? (
                          <div className="py-6 text-center">
                            <p className="text-gray-500 text-sm">Nenhum membro cadastrado nesta categoria.</p>
                          </div>
                        ) : (
                          <div className="flex flex-col gap-4">
                            {lista.map(m => (
                              <div key={m.id} className={`${MEMBER_PORTAL_SCALE.memberCard} border border-gray-100 bg-gray-50/50`}>
                                <p className={`font-bold text-gray-800 mb-2 ${MEMBER_PORTAL_SCALE.memberName}`}>{m.responsavel}</p>
                                {m.matricula && <p className={`text-gray-500 font-medium mb-4 ${MEMBER_PORTAL_SCALE.memberMatricula}`}>Mat: {m.matricula}</p>}

                                <div className="flex gap-2">
                                  <div className="relative flex-1">
                                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                    <input
                                      type={showSenha[m.id] ? 'text' : 'password'}
                                      placeholder="Digite sua senha"
                                      value={senhas[m.id] || ''}
                                      onChange={e => {
                                        setSenhas(prev => ({ ...prev, [m.id]: e.target.value }));
                                        setErro(null);
                                      }}
                                      onKeyDown={e => e.key === 'Enter' && handleLogin(m)}
                                      className={`w-full pl-10 pr-12 rounded-xl bg-white border text-gray-800 placeholder-gray-400 focus:outline-none focus:border-[#12B37A] transition-colors ${MEMBER_PORTAL_SCALE.passwordInput}
                                        ${erro === m.id ? 'border-red-400' : 'border-gray-200'}`}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowSenha(prev => ({ ...prev, [m.id]: !prev[m.id] }))}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                                    >
                                      {showSenha[m.id] ? <EyeOff size={14} /> : <Eye size={14} />}
                                    </button>
                                  </div>
                                  <button
                                    onClick={() => handleLogin(m)}
                                    className={`${MEMBER_PORTAL_SCALE.enterButton} rounded-xl text-white font-bold transition-all hover:shadow-lg hover:-translate-y-0.5 ${cfg.color} hover:brightness-110`}
                                  >
                                    Entrar
                                  </button>
                                </div>

                                {erro === m.id && (
                                  <div className="flex items-center gap-1.5 mt-2 text-red-500 text-xs font-semibold">
                                    <AlertCircle size={12} /> Senha incorreta. Tente novamente.
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
          <p className="text-gray-400 text-xs mt-16 text-center">Sistema de Gestão Hospitalar v1.0</p>
        </div>
      </div>
    </div>
  );
}