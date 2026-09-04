import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './workspace.css';
import type { WorkWindowPosition } from './FloatingWorkWindow';
import WorkspaceDatos from './WorkspaceDatos';
import WorkspaceCompetencias from './WorkspaceCompetencias';
import WorkspaceRecursos from './WorkspaceRecursos';
import WorkspaceProductoFinal from './WorkspaceProductoFinal';
import type { Actividad, BCKey, Secuencia } from '../../../types';
import { PRODUCTO_FINAL_NAME } from '../../../constants/productoFinal';

export type ActivityWindowId = 'datos' | 'competencias' | 'recursos' | 'producto-final';

export interface ActivityWorkspaceProps {
    activity: Actividad;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
    onAddSecuencia?: (s: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
    onUpdateSecuencia?: (s: Secuencia) => Promise<void>;
    onToggleBc: (actId: number, bc: BCKey) => void;
}

const WINDOW_WIDTHS: Record<ActivityWindowId, number> = {
    datos: 320,
    competencias: 344,
    recursos: 304,
    'producto-final': 420,
};

// Capa "escritorio" de la actividad seleccionada. No es un modal: no oscurece ni
// centra nada; dibuja ventanas flotantes que coexisten con la tabla (la capa es
// pointer-events:none, solo las ventanas y la etiqueta responden). Realizada para
// crecer: cualquier ventana futura (Editar, Utilizar, Evidencias...) se añade aquí
// o en FloatingWorkWindow sin rehacer la arquitectura.
const ActivityWorkspace: React.FC<ActivityWorkspaceProps> = ({
    activity,
    onClose,
    onUpdateActividad,
    onAddSecuencia,
    onUpdateSecuencia,
    onToggleBc,
}) => {
    const isProductoFinal = activity.nombre === PRODUCTO_FINAL_NAME;

    const initialPositions = useMemo<Record<ActivityWindowId, WorkWindowPosition>>(() => {
        const vw = window.innerWidth;
        const vh = window.innerHeight;
        const clamp = (x: number, w: number) => Math.max(6, Math.min(x, Math.max(6, vw - w - 6)));
        return {
            datos: { x: clamp(Math.max(6, (vw - 344) / 2 - 26), WINDOW_WIDTHS.datos), y: Math.max(6, Math.min(72, vh - 130)) },
            competencias: { x: clamp(Math.max(6, (vw - 344) / 2 + 6), WINDOW_WIDTHS.competencias), y: Math.max(6, Math.min(150, vh - 170)) },
            recursos: { x: clamp(Math.max(6, (vw - 304) / 2 + 38), WINDOW_WIDTHS.recursos), y: Math.max(6, Math.min(228, vh - 210)) },
            'producto-final': { x: clamp(Math.max(6, (vw - 420) / 2), WINDOW_WIDTHS['producto-final']), y: Math.max(6, Math.min(280, vh - 260)) },
        };
    }, []);

    const positionsRef = useRef(initialPositions);
    const [positions, setPositions] = useState(initialPositions);
    const [openWins, setOpenWins] = useState<Record<ActivityWindowId, boolean>>({
        datos: true,
        competencias: true,
        recursos: true,
        'producto-final': isProductoFinal,
    });
    const [zMap, setZMap] = useState<Record<ActivityWindowId, number>>({
        datos: 30,
        competencias: 22,
        recursos: 14,
        'producto-final': isProductoFinal ? 26 : 0,
    });

    const bringToFront = useCallback((id: ActivityWindowId) => {
        setZMap((prev) => {
            const max = Math.max(...Object.values(prev));
            if (prev[id] === max) return prev;
            return { ...prev, [id]: max + 1 };
        });
    }, []);

    const startDrag = useCallback((id: string, e: React.PointerEvent) => {
        const winId = id as ActivityWindowId;
        if (!WINDOW_WIDTHS[winId]) return;
        bringToFront(winId);
        e.preventDefault();
        const base = { ...positionsRef.current[winId] };
        const offX = e.clientX - base.x;
        const offY = e.clientY - base.y;
        const onMove = (ev: PointerEvent) => {
            ev.preventDefault();
            const maxX = Math.max(0, window.innerWidth - 70);
            const maxY = Math.max(0, window.innerHeight - 36);
            const x = Math.max(0, Math.min(ev.clientX - offX, maxX));
            const y = Math.max(0, Math.min(ev.clientY - offY, maxY));
            setPositions((p) => {
                const next = { ...p, [winId]: { x, y } };
                positionsRef.current = next;
                return next;
            });
        };
        const onUp = () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
            window.removeEventListener('pointercancel', onUp);
            window.removeEventListener('blur', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
        window.addEventListener('pointercancel', onUp);
        window.addEventListener('blur', onUp);
    }, [bringToFront]);

    const closeWindow = useCallback((id: ActivityWindowId) => {
        setOpenWins((w) => ({ ...w, [id]: false }));
    }, []);

    // Si el docente cierra todas las ventanas, la capa se retira por completo
    // (Curso Detalle queda exactamente como antes). Cerrar nunca borra ni cambia
    // la actividad: solo retira la interfaz flotante.
    useEffect(() => {
        const relevantWins = isProductoFinal
            ? [openWins.datos, openWins.competencias, openWins.recursos, openWins['producto-final']]
            : [openWins.datos, openWins.competencias, openWins.recursos];
        if (relevantWins.every(w => !w)) {
            onClose();
        }
    }, [openWins, onClose, isProductoFinal]);

    return (
        <div className="ws-layer fixed inset-0 z-[55] pointer-events-none" data-guide="actividad-workspace">
            <div className="ws-desk" aria-hidden="true" />
            <div className="ws-activity-tag pointer-events-auto" style={{ top: 16, left: 16 }}>
                <span className="ws-activity-tag-name">Espacio de trabajo · {activity.nombre}</span>
                <button
                    type="button"
                    className="ws-close"
                    onClick={onClose}
                    title="Cerrar espacio de trabajo"
                    aria-label="Cerrar espacio de trabajo"
                >
                    ✕
                </button>
            </div>

            {openWins.datos && (
                <WorkspaceDatos
                    activity={activity}
                    position={positions.datos}
                    zIndex={zMap.datos}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('datos')}
                    onUpdateActividad={onUpdateActividad}
                />
            )}

            {openWins.competencias && (
                <WorkspaceCompetencias
                    activity={activity}
                    position={positions.competencias}
                    zIndex={zMap.competencias}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('competencias')}
                    onToggleBc={onToggleBc}
                />
            )}

            {openWins.recursos && (
                <WorkspaceRecursos
                    activity={activity}
                    position={positions.recursos}
                    zIndex={zMap.recursos}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('recursos')}
                    onUpdateActividad={onUpdateActividad}
                    onAddSecuencia={onAddSecuencia}
                    onUpdateSecuencia={onUpdateSecuencia}
                />
            )}

            {isProductoFinal && openWins['producto-final'] && (
                <WorkspaceProductoFinal
                    activity={activity}
                    position={positions['producto-final']}
                    zIndex={zMap['producto-final']}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('producto-final')}
                    onUpdateActividad={onUpdateActividad}
                    bcSel={undefined}
                />
            )}
        </div>
    );
};

export default React.memo(ActivityWorkspace);