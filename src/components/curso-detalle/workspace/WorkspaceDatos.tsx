import React from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import type { Actividad } from '../../../types';

export interface WorkspaceDatosProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
}

// Ventana "Datos de la actividad" (referencia: ventana única con fecha /
// indicador / producto). Los campos editables escriben SOLO en la actividad real
// a través de las funciones existentes (updateActividad).
const WorkspaceDatos: React.FC<WorkspaceDatosProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onUpdateActividad,
}) => {
    const commit = (patch: Partial<Actividad>, raw: string, current: string | undefined) => {
        const value = raw.trim();
        if (value !== (current || '').trim()) {
            onUpdateActividad(activity.id, patch);
        }
    };

    return (
        <FloatingWorkWindow
            id="datos"
            title="Datos de la actividad"
            barColor="#F0C24E"
            position={position}
            zIndex={zIndex}
            width={320}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            <div className="ws-field">
                <div className="ws-field-label">
                    <span className="ws-dot ws-dot-yellow" />
                    Fecha
                </div>
                <input
                    type="date"
                    className="ws-field-input ws-date-input"
                    defaultValue={activity.fecha || ''}
                    onBlur={(e) => commit({ fecha: e.currentTarget.value }, e.currentTarget.value, activity.fecha)}
                />
            </div>

            <div className="ws-field">
                <div className="ws-field-label">
                    <span className="ws-dot ws-dot-blue" />
                    Indicador de logro
                </div>
                <textarea
                    className="ws-field-input"
                    rows={2}
                    defaultValue={activity.indicador || ''}
                    placeholder="¿Qué debe demostrar el estudiante al finalizar?"
                    onBlur={(e) => commit({ indicador: e.currentTarget.value }, e.currentTarget.value, activity.indicador)}
                />
            </div>

            <div className="ws-field">
                <div className="ws-field-label">
                    <span className="ws-dot ws-dot-coral" />
                    Producto
                </div>
                <textarea
                    className="ws-field-input"
                    rows={2}
                    defaultValue={activity.producto || ''}
                    placeholder="Evidencia de trabajo..."
                    onBlur={(e) => commit({ producto: e.currentTarget.value }, e.currentTarget.value, activity.producto)}
                />
            </div>
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceDatos);