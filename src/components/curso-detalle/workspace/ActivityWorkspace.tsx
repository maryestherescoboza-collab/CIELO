import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './workspace.css';
import type { WorkWindowPosition } from './FloatingWorkWindow';
import WorkspaceDatos from './WorkspaceDatos';
import WorkspaceCompetencias from './WorkspaceCompetencias';
import WorkspaceRecursos from './WorkspaceRecursos';
import WorkspaceFicha from './WorkspaceFicha';
import WorkspaceProductoFinal from './WorkspaceProductoFinal';
import FolderSequenceLauncher from './FolderSequenceLauncher';
import type { Actividad, BCKey, Secuencia, NivelEducativo } from '../../../types';
import type { SeccionSecuencia } from '../../../lib/seccionesSecuencia';
import { useAppStore } from '../../../store/appStore';
import { getSecuenciasSeleccion } from './WorkspaceDatos';


export type ActivityWindowId = 'datos' | 'competencias' | 'recursos' | 'ficha' | 'producto-final';

export interface ActivityWorkspaceProps {
    activity: Actividad;
    actividades?: Actividad[];
    bcSel?: Record<number, Set<BCKey>>;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
    onAddSecuencia?: (s: Omit<Secuencia, 'id'>) => Promise<Secuencia | null>;
    onUpdateSecuencia?: (s: Secuencia) => Promise<void>;
    onToggleBc: (actId: number, bc: BCKey) => void;
    nivelEducativo?: NivelEducativo;
}

const WINDOW_WIDTHS: Record<ActivityWindowId, number> = {
    datos: 320,
    competencias: 344,
    recursos: 304,
    ficha: 300,
    'producto-final': 420,
};

// Capa "escritorio" de la actividad seleccionada. No es un modal: no oscurece ni
// centra nada; dibuja ventanas flotantes que coexisten con la tabla (la capa es
// pointer-events:none, solo las ventanas y la etiqueta responden). Realizada para
// crecer: cualquier ventana futura (Editar, Utilizar, Evidencias...) se añade aquí
// o en FloatingWorkWindow sin rehacer la arquitectura.
const ActivityWorkspace: React.FC<ActivityWorkspaceProps> = ({
    activity,
    actividades,
    bcSel,
    onClose,
    onUpdateActividad,
    onAddSecuencia,
    onUpdateSecuencia,
    onToggleBc,
    nivelEducativo,
}) => {
    const isProductoFinal = !!activity.isProductoFinal;

    const initialPositions = useMemo<Record<ActivityWindowId, WorkWindowPosition>>(() => {
        const vw = typeof window !== 'undefined' ? window.innerWidth : 1280;
        const vh = typeof window !== 'undefined' ? window.innerHeight : 800;
        const clamp = (x: number, w: number) => Math.max(8, Math.min(x, Math.max(8, vw - w - 8)));

        // Altura bajo WorkspaceDatos (aprox. 150px) y margen superior
        const topY = 180;
        // Margen izquierdo que respeta el FolderSequenceLauncher (left: 18px, width: 60px)
        const leftBase = 88;

        if (isProductoFinal) {
            // 4 ventanas flotantes: Competencias (344), Recursos (304), Ficha (300), Producto Final (420)
            const totalWidthRow1 = 344 + 304 + 300; // 948px
            const gap = Math.max(16, Math.min(28, Math.floor((vw - leftBase - totalWidthRow1 - 24) / 3)));
            const startX = Math.max(leftBase, Math.floor((vw - (totalWidthRow1 + gap * 2)) / 2));

            // Si la pantalla es amplia (>= 1600px), caben las 4 en una fila sin solapamiento
            if (vw >= 1600) {
                const total4 = totalWidthRow1 + 420; // 1368px
                const gap4 = Math.max(16, Math.min(24, Math.floor((vw - leftBase - total4 - 24) / 4)));
                const start4 = Math.max(leftBase, Math.floor((vw - (total4 + gap4 * 3)) / 2));
                return {
                    datos: { x: clamp((vw - 320) / 2, WINDOW_WIDTHS.datos), y: 16 },
                    competencias: { x: clamp(start4, WINDOW_WIDTHS.competencias), y: topY },
                    recursos: { x: clamp(start4 + 344 + gap4, WINDOW_WIDTHS.recursos), y: topY },
                    ficha: { x: clamp(start4 + 344 + gap4 + 304 + gap4, WINDOW_WIDTHS.ficha), y: topY },
                    'producto-final': { x: clamp(start4 + 344 + gap4 + 304 + gap4 + 300 + gap4, WINDOW_WIDTHS['producto-final']), y: topY },
                };
            }

            // En pantallas estándar (1200px - 1599px):
            // Fila 1: Competencias, Recursos, Ficha (ordenadas horizontalmente en topY)
            // Fila 2: Producto Final centrado debajo, sin solapar con la fila 1
            const yRow2 = Math.min(topY + 235, Math.max(topY + 180, vh - 340));
            const xProdFinal = clamp(Math.floor((vw - WINDOW_WIDTHS['producto-final']) / 2), WINDOW_WIDTHS['producto-final']);

            return {
                datos: { x: clamp((vw - 320) / 2, WINDOW_WIDTHS.datos), y: 16 },
                competencias: { x: clamp(startX, WINDOW_WIDTHS.competencias), y: topY },
                recursos: { x: clamp(startX + 344 + gap, WINDOW_WIDTHS.recursos), y: topY },
                ficha: { x: clamp(startX + 344 + gap + 304 + gap, WINDOW_WIDTHS.ficha), y: topY },
                'producto-final': { x: xProdFinal, y: yRow2 },
            };
        }

        // Caso estándar (3 ventanas flotantes: Competencias, Recursos, Ficha)
        // Ancho total combinado: 344 + 304 + 300 = 948px distribuidas sin solapamiento
        const totalW = 344 + 304 + 300;
        const availableSpace = vw - leftBase - 24;
        const gap = Math.max(16, Math.min(36, Math.floor((availableSpace - totalW) / 3)));
        const startX = Math.max(leftBase, Math.floor((vw - (totalW + gap * 2)) / 2));

        return {
            datos: { x: clamp((vw - 320) / 2, WINDOW_WIDTHS.datos), y: 16 },
            competencias: { x: clamp(startX, WINDOW_WIDTHS.competencias), y: topY },
            recursos: { x: clamp(startX + 344 + gap, WINDOW_WIDTHS.recursos), y: topY },
            ficha: { x: clamp(startX + 344 + gap + 304 + gap, WINDOW_WIDTHS.ficha), y: topY },
            'producto-final': { x: clamp((vw - 420) / 2, WINDOW_WIDTHS['producto-final']), y: topY + 240 },
        };
    }, [isProductoFinal]);

    const positionsRef = useRef(initialPositions);
    const [positions, setPositions] = useState(initialPositions);
    const [openWins, setOpenWins] = useState<Record<ActivityWindowId, boolean>>({
        datos: true,
        competencias: true,
        recursos: true,
        ficha: true,
        'producto-final': isProductoFinal,
    });
    const [zMap, setZMap] = useState<Record<ActivityWindowId, number>>({
        datos: 30,
        competencias: 22,
        recursos: 14,
        ficha: 18,
        'producto-final': isProductoFinal ? 26 : 0,
    });

    // Sección activa del workspace, elegida desde la carpeta de secuencias.
    // Vive aquí (no en el launcher) para persistir al cerrar/reabrir la carpeta
    // y para que el workspace pueda mostrarla como elemento real de la capa.
    const [seccionActiva, setSeccionActiva] = useState<SeccionSecuencia | null>(null);

    const stateSecuencias = useAppStore((s) => s.state.secuencias);

    // HTML completo de la secuencia activa, fuente única del .session-block que
    // se muestra editado. Se re-deriva al cambiar de secuencia (igual que la
    // limpieza de sección) y se actualiza localmente al guardar un bloque.
    const [secuenciaHtmlActual, setSecuenciaHtmlActual] = useState<string>('');
    const [secuenciaActualObj, setSecuenciaActualObj] = useState<Secuencia | null>(null);

    // Al cambiar de secuencia (por la carpeta O por el selector existente) la
    // sección elegida deja de pertenecer a la secuencia anterior.
    useEffect(() => {
        setSeccionActiva(null);
        const sec =
            getSecuenciasSeleccion(activity.cursoId, activity.secuenciaId, stateSecuencias).find(
                (s) => s.id === activity.secuenciaId
            ) ?? null;
        setSecuenciaHtmlActual(sec?.contenidoHtml ?? '');
        setSecuenciaActualObj(sec);
    }, [activity.secuenciaId, activity.cursoId, stateSecuencias]);

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
            ? [openWins.datos, openWins.competencias, openWins.recursos, openWins.ficha, openWins['producto-final']]
            : [openWins.datos, openWins.competencias, openWins.recursos, openWins.ficha];
        if (relevantWins.every(w => !w)) {
            onClose();
        }
    }, [openWins, onClose, isProductoFinal]);

    return (
        <div className="ws-layer fixed inset-0 z-55 pointer-events-none" data-guide="actividad-workspace">
            <div className="ws-desk" aria-hidden="true" />
            {!openWins.datos && (
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
            )}

            <FolderSequenceLauncher
                activity={activity}
                onUpdateActividad={onUpdateActividad}
                seccionActiva={seccionActiva}
                onSeccionChange={setSeccionActiva}
            />

            {seccionActiva && (
                <SeccionPlanDeClase
                    secuencia={secuenciaActualObj}
                    secuenciaHtmlActual={secuenciaHtmlActual}
                    seccion={seccionActiva}
                />
            )}

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
                    nivelEducativo={nivelEducativo}
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

            {openWins.ficha && (
                <WorkspaceFicha
                    activity={activity}
                    position={positions.ficha}
                    zIndex={zMap.ficha}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('ficha')}
                    onUpdateActividad={onUpdateActividad}
                />
            )}

            {isProductoFinal && openWins['producto-final'] && (
                <WorkspaceProductoFinal
                    activity={activity}
                    position={positions['producto-final']}
                    zIndex={zMap['producto-final']}
                    nivelEducativo={nivelEducativo}
                    onStartDrag={startDrag}
                    onWindowFocus={(id) => bringToFront(id as ActivityWindowId)}
                    onClose={() => closeWindow('producto-final')}
                    onUpdateActividad={onUpdateActividad}
                    bcSel={bcSel}
                    actividades={actividades}
                />
            )}
        </div>
    );
};

interface SeccionPlanDeClaseProps {
    secuencia: Secuencia | null;
    secuenciaHtmlActual: string;
    seccion: SeccionSecuencia;
}

// Vista del plan de clase seleccionado: renderiza el .session-block COMPLETO
// (HTML real de Planificaciones Diarias, no un resumen) en SOLO LECTURA. Esta
// vista es exclusivamente de consulta: no permite editar textos ni campos, no
// ejecuta lógica de guardado y no modifica el contenidoHtml. El editor original
// de Planificaciones Diarias sigue funcionando exactamente como antes.
const SeccionPlanDeClase: React.FC<SeccionPlanDeClaseProps> = ({
    secuencia,
    secuenciaHtmlActual,
    seccion,
}) => {
    if (!secuencia) {
        return null;
    }

    // Estilos embebidos (<style>) de la planificación: el .session-block usa
    // clases (.editable, .label, tablas...) estilizadas en el <style> del
    // contenidoHtml completo. Se inyectan aquí para que el bloque aislado se
    // vea exactamente con su formato original, sin duplicar la fuente de datos.
    const estilosEmbebidos = useMemo(() => {
        const doc = new DOMParser().parseFromString(secuenciaHtmlActual, 'text/html');
        return Array.from(doc.querySelectorAll('style')).map((s) => s.textContent ?? '').join('\n');
    }, [secuenciaHtmlActual]);

    // Solo lectura: se eliminan los atributos contenteditable del bloque para
    // que ningún campo permita edición; el resto del HTML se conserva íntegro.
    const htmlSoloLectura = useMemo(
        () => seccion.html.replace(/ contenteditable=("[^"]*"|'[^']*'|[^\s>]+)/gi, ''),
        [seccion.html]
    );

    return (
        <div className="ws-section-view pointer-events-auto" data-guide="seccion-plan-de-clase">
            <div className="ws-section-view-tag">Sección: {seccion.titulo}</div>
            {estilosEmbebidos && <style dangerouslySetInnerHTML={{ __html: estilosEmbebidos }} />}
            <div
                className="ws-section-view-prose"
                dangerouslySetInnerHTML={{ __html: htmlSoloLectura }}
            />
        </div>
    );
};

export default React.memo(ActivityWorkspace);