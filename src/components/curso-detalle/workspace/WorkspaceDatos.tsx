import React from 'react';
import FloatingWorkWindow, { type WorkWindowPosition } from './FloatingWorkWindow';
import { supabase } from '../../../lib/supabase';
import type { Actividad, Secuencia } from '../../../types';

const secuenciasFallbackCache = new Map<number, Secuencia[]>();
const secuenciasFallbackFetched = new Set<number>();

const rawASecuencia = (s: Record<string, unknown>): Secuencia => ({
    id: s.id as number,
    titulo: s.titulo as string,
    cursoId: s.curso_id as number,
    fechaInicio: s.fecha_inicio as string,
    contenidoHtml: s.contenido_html as string,
    estado: s.estado as 'Pendiente' | 'En progreso' | 'Completada',
    archivoUrl: (s.archivo_url as string) ?? undefined,
    archivoNombre: (s.archivo_nombre as string) ?? undefined,
    archivoSize: (s.archivo_size as number) ?? undefined,
    archivoTipo: (s.archivo_tipo as string) ?? undefined,
    archivoFechaCarga: (s.archivo_fecha_carga as string) ?? undefined,
});

// Única fuente de secuencias disponibles del workspace (store + respaldo por
// curso). Compartida entre el selector de WorkspaceDatos y la carpeta flotante.
const cargarSecuenciasFallback = async (cursoId: number): Promise<Secuencia[]> => {
    if (secuenciasFallbackFetched.has(cursoId)) {
        return secuenciasFallbackCache.get(cursoId) ?? [];
    }
    secuenciasFallbackFetched.add(cursoId);
    try {
        const { data } = await supabase
            .from('secuencias')
            .select('*')
            .eq('curso_id', cursoId)
            .eq('activo', true);
        const mapeadas = (data as Record<string, unknown>[] | null)?.map(rawASecuencia) ?? [];
        secuenciasFallbackCache.set(cursoId, mapeadas);
        return mapeadas;
    } catch {
        return secuenciasFallbackCache.get(cursoId) ?? [];
    }
};

export const getSecuenciasSeleccion = (
    cursoId: number | null | undefined,
    secuenciaActualId: number | null | undefined,
    stateSecuencias: Secuencia[]
): Secuencia[] => {
    const extra = cursoId != null ? secuenciasFallbackCache.get(cursoId) ?? [] : [];
    const secuenciasCurso = [
        ...(cursoId != null ? stateSecuencias.filter((s) => s.cursoId === cursoId) : []),
        ...extra,
    ].filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i);
    if (secuenciaActualId != null && !secuenciasCurso.some((s) => s.id === secuenciaActualId)) {
        const actual = [...secuenciasCurso, ...stateSecuencias].find((s) => s.id === secuenciaActualId);
        if (actual) return [...secuenciasCurso, actual];
    }
    return secuenciasCurso;
};

export const ensureSecuenciasSeleccion = (
    cursoId: number | null | undefined,
    stateSecuencias: Secuencia[]
): void => {
    if (cursoId == null) return;
    if (stateSecuencias.some((s) => s.cursoId === cursoId)) return;
    if (secuenciasFallbackFetched.has(cursoId)) return;
    void cargarSecuenciasFallback(cursoId);
};

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