import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Download, ShieldCheck, Users } from 'lucide-react';

const HOME_SCALE = {
  heroTitle: 'text-5xl md:text-6xl lg:text-7xl',
  rightPanel: 'p-10 md:p-20',
  optionsWrap: 'max-w-xl space-y-6',
  optionCard: 'gap-8 rounded-2xl p-8',
  optionIconWrap: 'w-20 h-20 rounded-2xl',
  optionText: 'text-3xl',
  optionIconSize: 40,
};

const runtimeImportMeta = /** @type {{env?: {VITE_APK_DOWNLOAD_URL?: string}}} */ (/** @type {any} */ (import.meta));
const apkDownloadUrl = runtimeImportMeta.env?.VITE_APK_DOWNLOAD_URL?.trim() || '';

export default function Home() {
  const HERO_BG_URL = '/images/hu-entrada.png';
  const LOGO_URL = '/images/logo-qualidade-hu.png';
  const [showLogo, setShowLogo] = useState(true);

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
        <h1 className={`relative ${HOME_SCALE.heroTitle} font-black text-white text-center tracking-tight drop-shadow-[0_4px_4px_rgba(0,0,0,0.8)] px-4`}>
          SetUp de Leitos<br />HU/UEL
        </h1>
      </div>

      {/* Coluna Direita: Painel e Botões */}
      <div className={`md:w-1/2 bg-white flex flex-col items-center justify-center ${HOME_SCALE.rightPanel} relative`}>
        {showLogo && (
          <img
            src={LOGO_URL}
            alt="Escritório de Qualidade HUUEL"
            className="absolute top-8 right-8 h-24 object-contain"
            onError={() => setShowLogo(false)}
          />
        )}
        <div className={`w-full ${HOME_SCALE.optionsWrap}`}>
          <Link to="/membro" className="block">
            <div className={`flex items-center bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${HOME_SCALE.optionCard}`}>
              <div className={`${HOME_SCALE.optionIconWrap} bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors`}>
                <Users size={HOME_SCALE.optionIconSize} className="text-indigo-600" />
              </div>
              <span className={`${HOME_SCALE.optionText} font-bold text-gray-800`}>Membros</span>
            </div>
          </Link>

          <Link to="/gestor" className="block">
            <div className={`flex items-center bg-white border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${HOME_SCALE.optionCard}`}>
              <div className={`${HOME_SCALE.optionIconWrap} bg-indigo-50 flex items-center justify-center group-hover:bg-indigo-100 transition-colors`}>
                <ShieldCheck size={HOME_SCALE.optionIconSize} className="text-indigo-600" />
              </div>
              <span className={`${HOME_SCALE.optionText} font-bold text-gray-800`}>Administrativo</span>
            </div>
          </Link>

          {apkDownloadUrl ? (
            <a
              href={apkDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <div
                className={`flex items-center bg-[#f0fdf4] border border-emerald-200/80 shadow-sm hover:shadow-md transition-all duration-200 cursor-pointer group ${HOME_SCALE.optionCard}`}
              >
                <div className={`${HOME_SCALE.optionIconWrap} bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors`}>
                  <Download size={HOME_SCALE.optionIconSize} className="text-emerald-700" />
                </div>
                <span className={`${HOME_SCALE.optionText} font-bold text-emerald-900`}>Baixar o app (APK)</span>
              </div>
            </a>
          ) : null}
        </div>
        
        <p className="text-gray-400 text-xs mt-16 text-center">Sistema de Gestão Hospitalar v1.0</p>
      </div>
    </div>
  );
}