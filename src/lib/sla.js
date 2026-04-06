export const DEFAULT_METAS = { 
  desocupacao: 30, 
  higiene: 45, 
  hotelaria: 20,
  tat: 100
};

export const getMetas = () => {
  try { 
    const saved = JSON.parse(localStorage.getItem('huuel_metas') || 'null');
    return saved ? { ...DEFAULT_METAS, ...saved } : DEFAULT_METAS;
  } catch { 
    return DEFAULT_METAS; 
  }
};

export const getMetaForStatus = (status, metas) => {
  if (['alta_registrada', 'alta_medica_registrada', 'alta_administrativa_registrada'].includes(status)) return metas.desocupacao;
  if (status === 'em_higiene') return metas.higiene;
  if (status === 'livre' || status === 'em_transporte') return metas.hotelaria;
  return null;
};

export const getSlaColor = (minutos, meta) => {
  if (meta === null || meta === undefined) return 'text-gray-500 bg-gray-100 border-gray-200';
  const percent = (minutos / meta) * 100;
  if (percent <= 80) return 'text-[#12B37A] bg-[#12B37A]/10 border-[#12B37A]/20';
  if (percent <= 100) return 'text-yellow-600 bg-yellow-100 border-yellow-200';
  return 'text-red-600 bg-red-100 border-red-200';
};

export const getSlaTextClass = (minutos, meta) => {
  if (meta === null || meta === undefined || minutos === null || minutos === undefined) return 'text-gray-800';
  const percent = (minutos / meta) * 100;
  if (percent <= 80) return 'text-[#12B37A]';
  if (percent <= 100) return 'text-yellow-500';
  return 'text-red-600';
};

export const calcMinutos = (ultimo_evento_at) => {
  if (!ultimo_evento_at) return 0;
  return Math.floor((Date.now() - new Date(ultimo_evento_at).getTime()) / 60000);
};

export const getSlaStatus = (minutos, meta) => {
  if (meta === null || meta === undefined || minutos === null || minutos === undefined) return '';
  const percent = (minutos / meta) * 100;
  if (percent <= 80) return 'Eficiente';
  if (percent <= 100) return 'Atenção';
  return 'Atrasado';
};