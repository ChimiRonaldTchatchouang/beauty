export interface UssdOption {
  index: number;
  label: string;
}

/** Fenêtre de type USSD (comme sur un vrai téléphone) avec choix numérotés. */
export function UssdDialog({
  title,
  options,
  onSelect,
  onCancel,
}: {
  title: string;
  options: UssdOption[];
  onSelect: (index: number) => void;
  onCancel: () => void;
}) {
  return (
    <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-[280px] rounded-lg bg-white p-4 shadow-xl">
        <p className="mb-3 text-sm font-medium text-gray-800">{title}</p>
        <div className="space-y-1">
          {options.map((o) => (
            <button
              key={o.index}
              onClick={() => onSelect(o.index)}
              className="block w-full rounded px-2 py-2 text-left text-sm text-gray-700 hover:bg-gray-100"
            >
              {o.index}. {o.label}
            </button>
          ))}
        </div>
        <div className="mt-3 flex justify-end">
          <button onClick={onCancel} className="text-xs text-gray-500">
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
