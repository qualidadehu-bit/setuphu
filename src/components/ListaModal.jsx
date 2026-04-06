/**
 * @deprecated Componente legado sem consumidores no fluxo atual.
 * Mantido temporariamente para evitar quebra em integracoes antigas.
 */
export default function ListaModal({ title, leitos, onSelect, onClose, btnLabel, btnColor }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <h3 className="font-black text-gray-800 mb-4">{title}</h3>
        <div className="flex flex-col gap-2 max-h-64 overflow-y-auto">
          {leitos.map(l => (
            <div key={l.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-xl hover:bg-gray-50">
              <div>
                <p className="font-bold text-gray-800 text-sm">Leito {l.numero}</p>
                <p className="text-xs text-gray-400">{l.unidade} — {l.quarto}</p>
              </div>
              <button onClick={() => onSelect(l)} className={`${btnColor} text-white text-xs font-bold px-3 py-1.5 rounded-lg`}>{btnLabel}</button>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="mt-4 w-full border border-gray-200 text-gray-600 rounded-xl py-2 text-sm">Cancelar</button>
      </div>
    </div>
  );
}