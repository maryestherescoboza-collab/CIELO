import React from 'react';
import { Eye } from 'lucide-react';

export interface ActivityViewTabProps {
    activityId: number;
    isOpen: boolean;
    onOpen: () => void;
}

// Pestaña "VER" adherida a la columna de la actividad en el encabezado de la tabla.
// Vive dentro de la columna (se desplaza con ella en el scroll horizontal; nunca es fija).
// Su apertura se identifica por el id REAL de la actividad.
const ActivityViewTab: React.FC<ActivityViewTabProps> = (props) => {
    const { isOpen, onOpen } = props;

    return (
        <button
            type="button"
            data-guide={`ver-actividad-${props.activityId}`}
            onClick={onOpen}
            title={isOpen ? 'Espacio de trabajo abierto' : 'Ver espacio de trabajo de la actividad'}
            aria-pressed={isOpen}
            className={`mb-2 flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[9px] font-black uppercase tracking-[0.18em] transition-all cursor-pointer border select-none ${
                isOpen
                    ? 'bg-[#262626] text-[#FFFDF8] border-[#262626] shadow-[2px_2px_0_rgba(38,38,38,0.35)]'
                    : 'bg-base-creme text-[#5F665E] border-(--border-soft) hover:border-[#2E3330]/40 hover:text-[#2E3330] shadow-[0_1px_1px_rgba(46,51,48,0.08)] hover:shadow-[2px_2px_0_rgba(46,51,48,0.15)]'
            }`}
        >
            <Eye size={10} strokeWidth={2.5} aria-hidden="true" />
            VER
        </button>
    );
};

export default React.memo(ActivityViewTab);