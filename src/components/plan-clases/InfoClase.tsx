import { useRef, useState } from 'react';
import { GraduationCap, CalendarDays, Clock } from 'lucide-react';

export interface InfoClaseDatos {
  curso?: string;
  fecha?: string;
  duracion?: string;
}

interface InfoClaseProps {
  datos: InfoClaseDatos;
  onChange: (datos: InfoClaseDatos) => void;
}

/** Chip discreto y editable para la información contextual de la clase. */
export function InfoClase({ datos, onChange }: InfoClaseProps) {
  const [editCampo, setEditCampo] = useState<keyof InfoClaseDatos | null>(null);
  const [valorTemp, setValorTemp] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const campos: {
    key: keyof InfoClaseDatos;
    icon: React.ReactNode;
    placeholder: string;
  }[] = [
    { key: 'curso', icon: <GraduationCap size={14} />, placeholder: 'Curso · Materia' },
    { key: 'fecha', icon: <CalendarDays size={14} />, placeholder: 'Fecha' },
    { key: 'duracion', icon: <Clock size={14} />, placeholder: 'Duración' },
  ];

  const startEdit = (key: keyof InfoClaseDatos) => {
    setEditCampo(key);
    setValorTemp(datos[key] || '');
    requestAnimationFrame(() => inputRef.current?.focus());
  };

  const commit = () => {
    if (editCampo === null) return;
    const limpio = valorTemp.trim();
    const next = { ...datos };
    if (limpio) next[editCampo] = limpio;
    else delete next[editCampo];
    onChange(next);
    setEditCampo(null);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      {campos.map(({ key, icon, placeholder }) => {
        const value = datos[key];
        const editando = editCampo === key;
        return (
          <button
            key={key}
            onClick={() => startEdit(key)}
            className={`inline-flex items-center gap-1.5 rounded-full border text-[13px] font-medium transition-all
              ${value
                ? 'bg-(--paper-soft)/50 border-(--border-soft) text-(--ink-soft)'
                : 'border-dashed border-(--border-soft) text-(--ink-soft)/60'}`}
            style={{ minHeight: 34, padding: '2px 14px' }}
          >
            <span className="text-(--herb-garden)">{icon}</span>
            {editando ? (
              <input
                ref={inputRef}
                className="bg-transparent outline-none min-w-0 w-28 text-(--ink) placeholder:text-(--ink-soft)/50"
                value={valorTemp}
                placeholder={placeholder}
                onChange={e => setValorTemp(e.target.value)}
                onBlur={commit}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); commit(); }
                  if (e.key === 'Escape') { setEditCampo(null); }
                }}
                onClick={e => e.stopPropagation()}
              />
            ) : (
              <span>{value || placeholder}</span>
            )}
          </button>
        );
      })}
    </div>
  );
}
