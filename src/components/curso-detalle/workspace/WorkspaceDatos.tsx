import React from 'react';
import type { WorkWindowPosition } from './FloatingWorkWindow';
import AutoGrowTextarea from '../../AutoGrowTextarea';
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
    position?: WorkWindowPosition;
    zIndex?: number;
    onStartDrag?: (id: string, e: React.PointerEvent) => void;
    onWindowFocus?: (id: string) => void;
    onClose: () => void;
    onUpdateActividad: (id: number, patch: Partial<Actividad>) => void;
}

// Vista institucional de la actividad (Nombre de la actividad | Fecha | Indicador de logro | Producto)
// Organizada en una fila horizontal con apariencia de tabla institucional limpia y compacta.
const extraerInfoCurricular = (activity: Actividad) => {
    let items: any[] = [];
    if (Array.isArray(activity.indicadores_json)) {
        items = activity.indicadores_json;
    } else if (typeof activity.indicadores_json === 'string') {
        try { items = JSON.parse(activity.indicadores_json); } catch {}
    } else if (Array.isArray(activity.indicadoresJson)) {
        items = activity.indicadoresJson;
    }
    const primer = items[0];
    if (!primer || typeof primer !== 'object') return null;
    if (!primer.descripcion && !primer.fragmento && !primer.codigo) return null;
    return {
        codigo: (primer.codigo as string) || null,
        descripcion: (primer.descripcion || primer.texto as string) || null,
        fragmento: (primer.fragmento as string) || null,
    };
};

const WorkspaceDatos: React.FC<WorkspaceDatosProps> = ({
    activity,
    zIndex = 50,
    onClose,
    onUpdateActividad,
}) => {
    const commit = (patch: Partial<Actividad>, raw: string, current: string | undefined) => {
        const value = raw.trim();
        if (value !== (current || '').trim()) {
            onUpdateActividad(activity.id, patch);
        }
    };

    const infoCurricular = extraerInfoCurricular(activity);
    const indicadorTexto = (activity.indicador || infoCurricular?.descripcion || '').trim();
    const esMismoIndicador = Boolean(
        infoCurricular?.descripcion &&
        indicadorTexto &&
        infoCurricular.descripcion.trim().toLowerCase() === indicadorTexto.toLowerCase()
    );
    const mostrarDescripcionCurricular = Boolean(infoCurricular?.descripcion && !esMismoIndicador);
    const mostrarInfoCurricular = Boolean(
        infoCurricular && (infoCurricular.codigo || infoCurricular.fragmento || mostrarDescripcionCurricular)
    );

    return (
        <div
            className="pointer-events-auto fixed top-4 left-4 right-4 max-w-6xl mx-auto bg-[#FFFDF8] rounded-lg shadow-[5px_5px_0_0_#000000] border-2 border-black overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200 font-sans"
            style={{ zIndex }}
        >
            {/* Botón de cierre estilo brutalista circular */}
            <button
                type="button"
                onClick={onClose}
                className="absolute top-2.5 right-3 z-10 w-7 h-7 flex items-center justify-center border-2 border-black bg-white text-black hover:bg-black hover:text-white transition-all cursor-pointer text-xs font-black shadow-[2px_2px_0_0_#000] active:translate-x-px active:translate-y-px rounded-full"
                title="Cerrar vista"
                aria-label="Cerrar vista"
            >
                ✕
            </button>

            {/* Tabla horizontal brutalista con líneas negras */}
            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse min-w-190">
                    <thead>
                        <tr className="bg-[#F2EFE9] border-b-2 border-black text-[11px] font-black uppercase tracking-[0.14em] text-black">
                            <th scope="col" className="px-4 py-3 border-r-2 border-black w-[20%]">
                                Nombre de la actividad
                            </th>
                            <th scope="col" className="px-4 py-3 border-r-2 border-black w-[13%]">
                                Fecha
                            </th>
                            <th scope="col" className="px-4 py-3 border-r-2 border-black w-[47%]">
                                Indicador de logro
                            </th>
                            <th scope="col" className="px-4 py-3 w-[20%] pr-12">
                                Producto
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="divide-x-2 divide-black align-top bg-white">
                            {/* 1. Nombre de la actividad */}
                            <td className="p-3.5">
                                <AutoGrowTextarea
                                    key={`nom-${activity.id}`}
                                    className="w-full resize-none overflow-hidden bg-transparent font-black text-black text-[13px] leading-snug outline-none focus:bg-[#FAF8F5] focus:ring-1 focus:ring-black/15 rounded p-1 transition-all placeholder:text-neutral-400 font-sans"
                                    defaultValue={activity.nombre || ''}
                                    placeholder="Nombre de la actividad..."
                                    onBlur={(e) => commit({ nombre: e.currentTarget.value }, e.currentTarget.value, activity.nombre)}
                                />
                            </td>

                            {/* 2. Fecha */}
                            <td className="p-3.5">
                                <input
                                    type="date"
                                    className="w-full bg-transparent font-bold text-black text-[12px] outline-none focus:bg-[#FAF8F5] focus:ring-1 focus:ring-black/15 rounded p-1 transition-all font-sans cursor-pointer"
                                    defaultValue={activity.fecha || ''}
                                    onBlur={(e) => commit({ fecha: e.currentTarget.value }, e.currentTarget.value, activity.fecha)}
                                />
                            </td>

                            {/* 3. Indicador de logro */}
                            <td className="p-3.5">
                                <div className="flex flex-col gap-2.5">
                                    {/* Texto completo del indicador de logro con auto-expansión sin corte ni scrollbar */}
                                    <AutoGrowTextarea
                                        key={`ind-${activity.id}`}
                                        className="w-full resize-none overflow-hidden bg-transparent text-neutral-900 font-medium text-[13px] leading-relaxed outline-none focus:bg-[#FAF8F5] focus:ring-1 focus:ring-black/15 rounded p-1 transition-all placeholder:text-neutral-400 font-sans"
                                        defaultValue={indicadorTexto}
                                        placeholder="¿Qué debe demostrar el estudiante al finalizar?"
                                        onBlur={(e) => commit({ indicador: e.currentTarget.value }, e.currentTarget.value, activity.indicador)}
                                    />

                                    {/* Píldora del Currículo Oficial integrada abajo del texto */}
                                    {(infoCurricular?.codigo || mostrarInfoCurricular) && (
                                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-black bg-[#F6F3EC] w-fit shadow-2xs">
                                            {infoCurricular?.codigo && (
                                                <span className="px-1.5 py-0.5 bg-black text-white rounded text-[10px] font-black tracking-wider">
                                                    {infoCurricular.codigo}
                                                </span>
                                            )}
                                            <span className="text-[10px] font-black uppercase tracking-wider text-black">
                                                Currículo oficial
                                            </span>
                                        </div>
                                    )}

                                    {/* Fragmento curricular evaluado específico (si aplica) */}
                                    {infoCurricular?.fragmento && (
                                        <div className="p-2.5 bg-emerald-50/90 border border-emerald-300 rounded-md text-[11px] text-emerald-950 font-medium leading-snug">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-emerald-900 block mb-0.5">
                                                Fragmento evaluado:
                                            </span>
                                            <span className="italic font-semibold">«{infoCurricular.fragmento}»</span>
                                        </div>
                                    )}

                                    {/* Descripción curricular oficial si el docente personalizó el texto */}
                                    {mostrarDescripcionCurricular && infoCurricular?.descripcion && (
                                        <div className="p-2.5 bg-[#F6F3EC] border border-black/20 rounded-md text-[11px] text-neutral-800 font-medium leading-relaxed">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-neutral-600 block mb-0.5">
                                                Descripción curricular base:
                                            </span>
                                            {infoCurricular.descripcion}
                                        </div>
                                    )}
                                </div>
                            </td>

                            {/* 4. Producto */}
                            <td className="p-3.5">
                                <AutoGrowTextarea
                                    key={`prod-${activity.id}`}
                                    className="w-full resize-none overflow-hidden bg-transparent text-neutral-900 font-medium text-[12px] leading-relaxed outline-none focus:bg-[#FAF8F5] focus:ring-1 focus:ring-black/15 rounded p-1 transition-all placeholder:text-neutral-400 font-sans"
                                    defaultValue={activity.producto || ''}
                                    placeholder="Evidencia o producto esperado..."
                                    onBlur={(e) => commit({ producto: e.currentTarget.value }, e.currentTarget.value, activity.producto)}
                                />
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default React.memo(WorkspaceDatos);