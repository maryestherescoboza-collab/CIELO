import React, { useRef } from 'react';
import { Calendar, Loader2 } from 'lucide-react';

interface FechaPickerCompactProps {
    value: string; // formato YYYY-MM-DD
    onChange: (date: string) => void;
    disabled?: boolean;
    isSaving?: boolean;
    className?: string;
    title?: string;
}

export function formatFechaDisplay(fechaStr: string): string {
    if (!fechaStr) return 'Sin fecha';
    try {
        const parts = fechaStr.split('-');
        if (parts.length === 3) {
            const year = Number(parts[0]);
            const month = Number(parts[1]) - 1;
            const day = Number(parts[2]);
            const date = new Date(year, month, day);
            if (!isNaN(date.getTime())) {
                return date
                    .toLocaleDateString('es-ES', {
                        day: 'numeric',
                        month: 'short',
                        year: 'numeric',
                    })
                    .replace('.', '');
            }
        }
        return fechaStr;
    } catch {
        return fechaStr;
    }
}

export const FechaPickerCompact: React.FC<FechaPickerCompactProps> = ({
    value,
    onChange,
    disabled = false,
    isSaving = false,
    className = '',
    title = 'Pulsar para cambiar la fecha',
}) => {
    const inputRef = useRef<HTMLInputElement>(null);

    const handleClick = (e: React.MouseEvent) => {
        if (disabled || isSaving) return;
        if (e.target === inputRef.current) return;
        try {
            if (typeof inputRef.current?.showPicker === 'function') {
                inputRef.current.showPicker();
            } else {
                inputRef.current?.focus();
            }
        } catch {
            inputRef.current?.focus();
        }
    };

    return (
        <div
            role="button"
            tabIndex={disabled || isSaving ? -1 : 0}
            onClick={handleClick}
            onKeyDown={(e) => {
                if (disabled || isSaving) return;
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    try {
                        inputRef.current?.showPicker?.();
                    } catch {
                        inputRef.current?.focus();
                    }
                }
            }}
            title={title}
            className={`relative inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-(--border-soft) bg-(--linen)/35 hover:bg-white text-(--ink) hover:text-(--primary) hover:border-(--primary)/40 transition-all cursor-pointer group shadow-xs select-none focus:outline-none focus-visible:ring-2 focus-visible:ring-(--primary)/30 focus-visible:border-(--primary) ${
                disabled || isSaving ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''
            } ${className}`}
        >
            {isSaving ? (
                <Loader2 size={13} className="text-(--primary) animate-spin shrink-0" />
            ) : (
                <Calendar
                    size={13}
                    className="text-(--primary) shrink-0 group-hover:scale-110 transition-transform"
                />
            )}
            <span className="text-xs font-bold leading-none tracking-tight whitespace-nowrap">
                {formatFechaDisplay(value)}
            </span>
            <input
                ref={inputRef}
                type="date"
                value={value || ''}
                onChange={(e) => {
                    if (e.target.value) {
                        onChange(e.target.value);
                    }
                }}
                disabled={disabled || isSaving}
                aria-label="Seleccionar fecha"
                tabIndex={-1}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                onClick={(e) => {
                    e.stopPropagation();
                    if (disabled || isSaving) return;
                    try {
                        (e.currentTarget as HTMLInputElement).showPicker?.();
                    } catch {}
                }}
            />
        </div>
    );
};
