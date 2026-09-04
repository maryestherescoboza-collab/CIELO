import React, { useState } from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import type { Actividad, BCKey } from '../../../types';
import { getCompetenciaDisplay } from '../../../types';
import { SUGERENCIAS_POR_COMPETENCIA } from '../../../constants/productoFinal';

export interface WorkspaceProductoFinalProps {
    activity: Actividad;
    position: WorkWindowPosition;
    zIndex: number;
    onStartDrag: (id: string, e: React.PointerEvent) => void;
    onWindowFocus: (id: string) => void;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
    bcSel?: Record<number, Set<BCKey>>;
}

const ALL_BCS: BCKey[] = ['BC1', 'BC2', 'BC3', 'BC4'];

const WorkspaceProductoFinal: React.FC<WorkspaceProductoFinalProps> = ({
    activity,
    position,
    zIndex,
    onStartDrag,
    onWindowFocus,
    onClose,
    onUpdateActividad,
    bcSel,
}) => {
    const [openSugerencias, setOpenSugerencias] = useState<BCKey | null>(null);

    const assigned = bcSel?.[activity.id] ?? new Set(activity.bcAsignados || []);
    const activeBcs = ALL_BCS.filter(bc => assigned.has(bc));

    const commitProducto = (value: string) => {
        const trimmed = value.trim();
        if (trimmed !== (activity.producto || '').trim()) {
            onUpdateActividad(activity.id, { producto: trimmed });
        }
    };

    return (
        <FloatingWorkWindow
            id="producto-final"
            title="Producto Final"
            barColor="#8FD9B6"
            position={position}
            zIndex={zIndex}
            width={420}
            onStartDrag={onStartDrag}
            onWindowFocus={onWindowFocus}
            onClose={onClose}
        >
            <div className="ws-pf-table">
                <div className="ws-pf-header">
                    <span className="ws-pf-col ws-pf-col-competencia">Competencia</span>
                    <span className="ws-pf-col ws-pf-col-puntos">Puntos</span>
                    <span className="ws-pf-col ws-pf-col-producto">Producto</span>
                </div>
                {activeBcs.length === 0 ? (
                    <div className="ws-pf-empty">
                        Selecciona competencias en la ventana "Competencias a evaluar" para configurar el Producto Final.
                    </div>
                ) : (
                    activeBcs.map(bc => (
                        <div key={bc} className="ws-pf-row">
                            <div className="ws-pf-col ws-pf-col-competencia">
                                <span className="ws-pf-bc-name">{getCompetenciaDisplay(bc)}</span>
                                <button
                                    type="button"
                                    className="ws-pf-sug-toggle"
                                    onClick={() => setOpenSugerencias(openSugerencias === bc ? null : bc)}
                                    title="Ver sugerencias"
                                >
                                    ?
                                </button>
                                {openSugerencias === bc && (
                                    <div className="ws-pf-sugerencias">
                                        {SUGERENCIAS_POR_COMPETENCIA[bc].map(sug => (
                                            <button
                                                key={sug.id}
                                                type="button"
                                                className="ws-pf-sug-item"
                                                onClick={() => {
                                                    const current = (activity.producto || '').trim();
                                                    const newValue = current ? `${current}\n• ${sug.titulo}` : `• ${sug.titulo}`;
                                                    commitProducto(newValue);
                                                    setOpenSugerencias(null);
                                                }}
                                            >
                                                {sug.titulo}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                            <span className="ws-pf-col ws-pf-col-puntos">—</span>
                            <div className="ws-pf-col ws-pf-col-producto">
                                <textarea
                                    className="ws-pf-producto-input"
                                    rows={1}
                                    defaultValue={activity.producto || ''}
                                    placeholder="Evidencia..."
                                    onBlur={(e) => commitProducto(e.currentTarget.value)}
                                />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </FloatingWorkWindow>
    );
};

export default React.memo(WorkspaceProductoFinal);
