import { useAppStore, type AcademicCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS, ACADEMIC_SWR_FRESH_MS } from './cacheConfig';
import type { Actividad, CalificacionActividad, RecuperacionBC, CursoDetalleEvaluacion, RecuperacionCotejo } from '../types';
import { normalizeArea } from '../utils/academic';
import {
    getIdbAcademicSlice,
    saveIdbAcademicSlice,
    upsertIdbAcademicRow,
    clearIdbAcademicCacheByUser,
    type AcademicSliceData
} from './academicIdb';

export { type AcademicSliceData } from './academicIdb';

/**
 * Caché académico de CIELO — Arquitectura de 2 capas:
 * 1. Capa L1 (Memoria Zustand): Acceso síncrono instantáneo (0ms) durante la sesión.
 * 2. Capa L2 (IndexedDB): Persistencia duradera de hasta 90 días, tolerante a recargas,
 *    navegación entre cursos, reinicio de pestaña y trabajo sin conexión.
 *
 * Aislamiento estricto:
 *  - Clave: `${userId}:${centroId}:${cursoId}:${asignatura}:${periodo}`.
 *  - Ninguna actividad ni calificación se mezcla entre asignaturas o períodos.
 *  - P2 es el período inicial obligatorio.
 */

export const PERIODOS_ACADEMICOS = ['P1', 'P2', 'P3', 'P4'] as const;

/** Token especial para actividades con `periodo` NULL (bucket propio). */
export const NULL_PERIODO_TOKEN = '__actividad_sin_periodo__';

const SLICE_TTL_MS = CACHE_TTL_MS.calificaciones;

export type AcademicRowType = 'actividades' | 'calificaciones' | 'recuperaciones' | 'cursoDetalle' | 'recuperacionesCotejo';

/**
 * Control en memoria de frescura SWR por sesión.
 * Evita re-consultar a Supabase repetitivamente al cambiar de curso, pestaña o período
 * si la combinación ya fue verificada en la ventana de frescura.
 */
const sessionAcademicVerifiedAt = new Map<string, number>();

export function isAcademicSliceFreshInSession(
    userId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
    asignatura?: string | null | undefined,
): boolean {
    if (!userId || !cursoId) return false;
    const key = `${userId}:${cursoId}:${normalizeArea(asignatura) || 'all'}:${periodo || 'sin-periodo'}`;
    const last = sessionAcademicVerifiedAt.get(key);
    if (!last) return false;
    return Date.now() - last < ACADEMIC_SWR_FRESH_MS;
}

export function markAcademicSliceVerifiedInSession(
    userId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
    asignatura?: string | null | undefined,
): void {
    if (!userId || !cursoId) return;
    const key = `${userId}:${cursoId}:${normalizeArea(asignatura) || 'all'}:${periodo || 'sin-periodo'}`;
    sessionAcademicVerifiedAt.set(key, Date.now());
}

/**
 * Genera la clave compuesta del caché académico.
 * Soporta compatibilidad con llamadas de 4 argumentos `(userId, centroId, cursoId, periodo)`
 * y las llamadas completas de 5 argumentos `(userId, centroId, cursoId, asignatura, periodo)`.
 */
export function academicCacheKey(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignaturaOrPeriodo: string | null | undefined,
    maybePeriodo?: string | null | undefined,
): string {
    let asignatura = 'general';
    let periodo = 'sin-periodo';

    if (maybePeriodo !== undefined) {
        asignatura = normalizeArea(asignaturaOrPeriodo) || 'general';
        periodo = maybePeriodo || 'sin-periodo';
    } else {
        periodo = asignaturaOrPeriodo || 'sin-periodo';
    }

    return `${userId || 'sin-usuario'}:${centroId || 'sin-centro'}:${cursoId ?? 'sin-curso'}:${asignatura}:${periodo}`;
}

function makeEntry(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number,
    asignatura: string,
    periodo: string,
    data: AcademicSliceData,
): AcademicCacheEntry {
    const nowMs = Date.now();
    return {
        key: academicCacheKey(userId, centroId, cursoId, asignatura, periodo),
        userId: userId || 'sin-usuario',
        centroId: centroId || undefined,
        cursoId,
        periodo,
        data: {
            actividades: data.actividades || [],
            calificaciones: data.calificaciones || [],
        },
        cachedAt: nowMs,
        expiresAt: nowMs + SLICE_TTL_MS,
    };
}

/**
 * Lee la slice válida en memoria L1.
 */
export function getValidAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignaturaOrPeriodo: string | null | undefined,
    maybePeriodo?: string | null | undefined,
): AcademicSliceData | null {
    if (!userId || !cursoId) return null;

    const key = academicCacheKey(userId, centroId, cursoId, asignaturaOrPeriodo, maybePeriodo);
    const entry = useAppStore.getState().academicCache[key];
    if (!entry) return null;
    if (entry.key !== key || entry.userId !== userId || entry.cursoId !== cursoId) return null;
    // Las calificaciones NUNCA se descartan automáticamente: siempre se conservan intactas
    if (!entry.data || !Array.isArray(entry.data.actividades) || !Array.isArray(entry.data.calificaciones)) return null;

    return entry.data;
}

export function hasValidAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignaturaOrPeriodo: string | null | undefined,
    maybePeriodo?: string | null | undefined,
): boolean {
    return getValidAcademicSlice(userId, centroId, cursoId, asignaturaOrPeriodo, maybePeriodo) !== null;
}

/**
 * Cache-First: Lee primero de memoria (L1), luego de IndexedDB (L2).
 * Si existe en IndexedDB, rehidrata memoria L1 de inmediato para accesos síncronos posteriores.
 */
export async function ensureAcademicSliceFromIdb(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignatura: string | null | undefined,
    periodo: string | null | undefined,
): Promise<AcademicSliceData | null> {
    if (!userId || !cursoId) return null;

    const memSlice = getValidAcademicSlice(userId, centroId, cursoId, asignatura, periodo);
    if (memSlice) return memSlice;

    const idbData = await getIdbAcademicSlice(userId, centroId, cursoId, asignatura, periodo);
    if (idbData) {
        saveAcademicSlice(userId, centroId, cursoId, asignatura, periodo, idbData);
        return idbData;
    }

    return null;
}

/**
 * Guarda la slice de un curso en memoria L1 y en IndexedDB L2 (90 días).
 */
export function saveAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignaturaOrPeriodo: string | null | undefined,
    periodoOrData: string | AcademicSliceData | null | undefined,
    maybeData?: AcademicSliceData,
): void {
    if (!userId || !cursoId) return;

    let asignatura = 'general';
    let periodo = 'sin-periodo';
    let data: AcademicSliceData;

    if (maybeData !== undefined) {
        asignatura = normalizeArea(asignaturaOrPeriodo) || 'general';
        periodo = (periodoOrData as string) || 'sin-periodo';
        data = maybeData;
    } else {
        periodo = (asignaturaOrPeriodo as string) || NULL_PERIODO_TOKEN;
        data = (periodoOrData as AcademicSliceData) || { actividades: [], calificaciones: [] };
    }

    // 1. Guardar en memoria L1 (Zustand)
    useAppStore.getState().setAcademicCache(
        makeEntry(userId, centroId, cursoId, asignatura, periodo, data)
    );

    // 2. Persistir asíncronamente en IndexedDB L2 (90 días)
    void saveIdbAcademicSlice(userId, centroId, cursoId, asignatura, periodo, data);
}

/**
 * Elimina las slices académicas de un usuario en memoria L1 y en IndexedDB L2.
 */
export function clearAcademicCacheByUser(userId: string | null | undefined, cursoId?: number): void {
    if (!userId) return;

    // Limpieza L1
    useAppStore.getState().setAcademicCache(prev => {
        const prefix = `${userId}:`;
        let changed = false;
        const next: Record<string, AcademicCacheEntry> = {};
        for (const key of Object.keys(prev)) {
            const entry = prev[key];
            const remove = key.startsWith(prefix) && (cursoId === undefined || entry.cursoId === cursoId);
            if (!remove) next[key] = entry;
            else changed = true;
        }
        return changed ? next : prev;
    });

    // Limpieza L2
    void clearIdbAcademicCacheByUser(userId, cursoId);

    // Limpieza de control de sesión
    if (cursoId) {
        for (const k of Array.from(sessionAcademicVerifiedAt.keys())) {
            if (k.startsWith(`${userId}:${cursoId}:`)) {
                sessionAcademicVerifiedAt.delete(k);
            }
        }
    } else {
        sessionAcademicVerifiedAt.clear();
    }
}

/**
 * Write-through selectivo para mutaciones locales y Realtime en memoria L1 y en IndexedDB L2.
 */
export function upsertAcademicRow(
    tipo: AcademicRowType,
    row: Actividad | CalificacionActividad | RecuperacionBC | CursoDetalleEvaluacion | RecuperacionCotejo,
    cursoId: number,
    periodo: string | null,
    removed?: boolean,
    asignaturaParam?: string | null,
): void {
    const store = useAppStore.getState();
    const uid = store.session?.user?.id;
    if (!uid) return;
    const centroId = store.state.cursos.find(c => c.id === cursoId)?.centroId ?? null;
    const asigRow = (row as any).asignatura || asignaturaParam || '';
    const normAsig = normalizeArea(asigRow) || 'general';
    const normPeriodo = periodo || (row as any).periodo || NULL_PERIODO_TOKEN;
    const targetKey = academicCacheKey(uid, centroId, cursoId, normAsig, normPeriodo);

    // 1. Actualizar memoria L1
    useAppStore.getState().setAcademicCache(prev => {
        const prefix = `${uid}:`;
        let changed = false;
        const next: Record<string, AcademicCacheEntry> = {};

        for (const key of Object.keys(prev)) {
            const entry = prev[key];
            if (!key.startsWith(prefix) || entry.cursoId !== cursoId) {
                next[key] = entry;
                continue;
            }
            const data = {
                actividades: [...entry.data.actividades],
                calificaciones: [...entry.data.calificaciones],
            };
            let dirty = false;
            if (tipo === 'actividades') {
                const id = (row as Actividad).id;
                const antes = data.actividades.length;
                data.actividades = data.actividades.filter(a => !(a.id === id));
                dirty = data.actividades.length !== antes;
            } else if (tipo === 'calificaciones') {
                const cal = row as CalificacionActividad;
                const antes = data.calificaciones.length;
                data.calificaciones = data.calificaciones.filter(
                    c => !(c.estudianteId === cal.estudianteId && c.actividadId === cal.actividadId)
                );
                dirty = data.calificaciones.length !== antes;
            }
            if (dirty) changed = true;
            next[key] = { ...entry, data };
        }

        if (!removed) {
            const cur = next[targetKey] || prev[targetKey];
            if (cur) {
                const data = {
                    actividades: [...cur.data.actividades],
                    calificaciones: [...cur.data.calificaciones],
                };
                if (tipo === 'actividades') {
                    const act = row as Actividad;
                    const idx = data.actividades.findIndex(a => a.id === act.id);
                    if (idx !== -1) data.actividades[idx] = act;
                    else data.actividades.push(act);
                } else if (tipo === 'calificaciones') {
                    const cal = row as CalificacionActividad;
                    const idx = data.calificaciones.findIndex(
                        c => c.estudianteId === cal.estudianteId && c.actividadId === cal.actividadId
                    );
                    if (idx !== -1) data.calificaciones[idx] = cal;
                    else data.calificaciones.push(cal);
                }
                next[targetKey] = { ...cur, data };
                changed = true;
            }
        }

        return changed ? next : prev;
    });

    // 2. Write-through a IndexedDB L2
    void upsertIdbAcademicRow(
        tipo,
        row,
        cursoId,
        normAsig,
        normPeriodo,
        uid,
        centroId,
        removed
    );
}
