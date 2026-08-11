
interface PresentationToggleProps {
    checked: boolean;
    onChange: () => void;
    disabled?: boolean;
}

export function PresentationToggle({ checked, onChange, disabled = false }: PresentationToggleProps) {
    return (
        <div className="flex items-center gap-3">
            <span 
                className={`text-xs font-bold uppercase tracking-widest select-none ${disabled ? 'text-slate-300 cursor-not-allowed' : 'text-[#5F665E] cursor-pointer'}`} 
                onClick={disabled ? undefined : onChange}
            >
                Presentar
            </span>
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                aria-label={checked ? "Salir del modo presentación" : "Activar modo presentación"}
                onClick={disabled ? undefined : onChange}
                disabled={disabled}
                className={`relative inline-flex h-[30px] w-[50px] shrink-0 rounded-full border-2 border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFBF7] ${
                    disabled ? 'cursor-not-allowed bg-slate-200 opacity-50' : 'cursor-pointer ' + (checked ? 'bg-[#1E293B]' : 'bg-[#CBD5E1]')
                }`}
                style={{ transition: 'all 180ms ease' }}
            >
                <span
                    className={`pointer-events-none inline-block h-[26px] w-[26px] transform rounded-full bg-white shadow-sm ring-0 ${
                        checked ? 'translate-x-[20px]' : 'translate-x-0'
                    }`}
                    style={{ transition: 'all 180ms ease' }}
                />
            </button>
        </div>
    );
}
