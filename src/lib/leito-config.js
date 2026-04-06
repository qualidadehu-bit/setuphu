export const STATUS_CONFIG = {
  ocupado:                        { label: 'Ocupado',        color: 'bg-gray-200 text-gray-600',    dot: 'bg-gray-400' },
  alta_registrada:                { label: 'Alta',           color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  alta_medica_registrada:         { label: 'Alta Médica',    color: 'bg-indigo-100 text-indigo-700',dot: 'bg-indigo-500' },
  alta_administrativa_registrada: { label: 'Alta Admin.',    color: 'bg-blue-100 text-blue-700',    dot: 'bg-blue-500' },
  aguardando_higiene:             { label: 'Ag. Higiene',    color: 'bg-yellow-100 text-yellow-700',dot: 'bg-yellow-500' },
  em_higiene:         { label: 'Em Higiene',     color: 'bg-orange-100 text-orange-700',dot: 'bg-orange-500 animate-pulse' },
  livre:              { label: 'Livre',          color: 'bg-green-100 text-green-700',  dot: 'bg-green-500' },
  aguardando_paciente:{ label: 'Ag. Paciente',   color: 'bg-purple-100 text-purple-700',dot: 'bg-purple-500' },
  em_transporte:      { label: 'Em Transporte',  color: 'bg-cyan-100 text-cyan-700',    dot: 'bg-cyan-500 animate-pulse' },
};

export const DEFAULT_STATUS_CONFIG = STATUS_CONFIG.ocupado;

export const CATEGORIA_LABELS = {
  escriturario: 'Escriturário',
  maqueiro: 'Maqueiro',
  higiene: 'Higiene',
};

export const CATEGORIA_COLORS = {
  escriturario: 'bg-blue-500',
  maqueiro: 'bg-orange-500',
  higiene: 'bg-[#12B37A]',
};