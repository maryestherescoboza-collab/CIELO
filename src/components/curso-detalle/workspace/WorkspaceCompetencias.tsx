import React from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import type { Actividad, BCKey } from '../../../types';
import { getCompetenciaDisplay } from '../../../types';
import { BC_COLOR_THEMES, BC_ICONS } from '../../../constants/competencias';

export interface WorkspaceCompetenciasProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onToggleBc: (actId: number, bc: BCKey) => void;
}

const ALL_BCS: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];

// Ventana "Competencias a evaluar" (referencia: sección de chips).
// Lee las competencias REALES guardadas en la actividad (bcAsignados) y usa el
// sistema de colores de CIELO (BC_COLOR_THEMES). Alternar un chip usa la misma
// lógica de persistencia que la tabla (onToggleBc).
const WorkspaceCompetencias: React.FC<WorkspaceCompetenciasProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onToggleBc,
}) => {
    const assigned = new Set(activity.bcAsignados || []);

    return (
        <FloatingWorkWindow
            id="competencias"
            title="Competencias a evaluar"
            barColor="#8FD9B6"
            position={position}
            zIndex={zIndex}
            width={344}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            <div className="ws-chip-wrap">
                {ALL_BCS.map((bc) => {
                    const on = assigned.has(bc);
                    const theme = BC_COLOR_THEMES[bc];
                    return (
                        <button
                            key={bc}
                            type="button"
                            title={getCompetenciaDisplay(bc)}
                            onClick={() => onToggleBc(activity.id, bc)}
                            className={`ws-chip ${on ? `on ${theme.active}` : `${theme.bg} ${theme.text}`}`}
                        >
                            {BC_ICONS[bc]}
                            {getCompetenciaDisplay(bc)}
                        </button>
                    );
                })}
            </div>
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceCompetencias);