export const ALLOWED_BED_SIGNALS = ['PR', 'MR', 'CR', 'DR', 'SS', 'UCP'];

export const normalizeBedSignals = (signals) => {
  if (!Array.isArray(signals)) return [];
  const normalized = signals
    .map((signal) => String(signal || '').trim().toUpperCase())
    .map((signal) => (signal === 'CP' ? 'UCP' : signal))
    .filter((signal) => ALLOWED_BED_SIGNALS.includes(signal));
  return Array.from(new Set(normalized));
};

export const getBedSignalMeaning = (signal) => {
  if (signal === 'DR') return 'Demanda Reprimida';
  if (signal === 'UCP') return 'Cuidados Paliativos';
  if (signal === 'SS') return 'Serviço Social';
  return 'Isolamento';
};
