import { useAppStore, type AcademicCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { Actividad, CalificacionActividad } from '../types';

/**
 * Paso 7 — Caché académico EN MEMORIA por curso + período.
 *
 * Unidad de caché: «actividades + calificaciones» de un curso en UN período.
 * Clave compuesta: `${userId}:${centroId}:${cursoId}:${periodo}`.
 *
 * Reglas de aislamiento:
 *  - Los períodos son conjuntos independientes: tener P1 en caché NUNCA implica
 *    que P2, P3 o P4 estén cargados.
 *  - Una slice solo es válida si pertenece EXACTAMENTE al contexto actual
 *    (usuario + centro + curso + período) y no ha expirado.
 *  - Ante cualquier duda de pertenencia se devuelve MISS (null) → el llamador
 *    consulta Supabase. La seguridad tiene prioridad sobre ahorrar consultas.
 *  - Contiene SOLO datos fuente (nunca promedios ni resultados derivados).
 *  - NO se persiste en localStorage: vive en memoria y muere con la sesión
 *    (se limpia al cambiar de usuario).
 */

export const PERIODOS_ACADEMICOS = ['P1', 'P2', 'P3', 'P4'] as const;

/** Token especial para actividades con `periodo` NULL (bucket propio).
 *  `calificaciones.periodo` es NOT NULL, así que solo «actividades» lo usa. */
export const NULL_PERIODO_TOKEN = '__actividad_sin_periodo__';

/** TTL de la slice: el más conservador de la pareja (calificaciones, 30 días).
 *  Al ser memoria, de todos modos termina con la sesión. */
const SLICE_TTL_MS = CACHE_TTL_MS.calificaciones;

export interface AcademicSliceData {
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
}

export type AcademicRowType = 'actividades' | 'calificaciones';

export function academicCacheKey(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
): string {
    return `${userId || 'sin-usuario'}:${centroId || 'sin-centro'}:${cursoId ?? 'sin-curso'}:${periodo || 'sin-periodo'}`;
}

function makeEntry(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number,
    periodo: string,
    data: AcademicSliceData,
): AcademicCacheEntry {
    const nowMs = Date.now();
    return {
        key: academicCacheKey(userId, centroId, cursoId, periodo),
        userId: userId || 'sin-usuario',
        centroId: centroId || undefined,
        cursoId,
        periodo,
        data,
        cachedAt: nowMs,
        expiresAt: nowMs + SLICE_TTL_MS,
    };
}

/**
 * Lee la slice válida del contexto exacto `{userId, centroId, cursoId, periodo}`.
 * Devuelve null (MISS) si no existe, no coincide la clave, expiró, o los arrays
 * no son listas válidas. Nunca devuelve una slice de otro usuario/curso/período.
 */
export function getValidAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
): AcademicSliceData | null {
    const ts = () => new Date().toISOString();
    if (!userId || !cursoId) {
        console.log(`[DIAG][CACHE_READ] miss motivo=sin-usuario-o-curso key="${academicCacheKey(userId, centroId, cursoId, periodo)}" userId=${userId ?? 'sin-usuario'} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId ?? 'sin-curso'} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    const key = academicCacheKey(userId, centroId, cursoId, periodo);
    const entry = useAppStore.getState().academicCache[key];
    if (!entry) {
        console.log(`[DIAG][CACHE_READ] miss motivo=no-existe key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (entry.key !== key) {
        console.log(`[DIAG][CACHE_READ] miss motivo=key-no-coincide key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (entry.userId !== userId) {
        console.log(`[DIAG][CACHE_READ] miss motivo=userId-no-coincide key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (entry.cursoId !== cursoId) {
        console.log(`[DIAG][CACHE_READ] miss motivo=cursoId-no-coincide key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (Date.now() >= entry.expiresAt) {
        console.log(`[DIAG][CACHE_READ] miss motivo=expirado key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (!entry.data) {
        console.log(`[DIAG][CACHE_READ] miss motivo=sin-data key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    if (!Array.isArray(entry.data.actividades) || !Array.isArray(entry.data.calificaciones)) {
        console.log(`[DIAG][CACHE_READ] miss motivo=arrays-invalidos key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} ts=${ts()}`);
        return null;
    }
    console.log(`[DIAG][CACHE_READ] hit key="${key}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo ?? 'sin-periodo'} actividades=${entry.data.actividades.length} calificaciones=${entry.data.calificaciones.length} ts=${ts()}`);
    return entry.data;
}

export function hasValidAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
): boolean {
    return getValidAcademicSlice(userId, centroId, cursoId, periodo) !== null;
}

/**
 * Guarda (o reemplaza) la slice de un curso+período. Renueva cachedAt/expiresAt.
 * `periodo` null se guarda bajo el token NULL_PERIODO_TOKEN.
 */
export function saveAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    periodo: string | null | undefined,
    data: AcademicSliceData,
): void {
    if (!userId || !cursoId) return;
    useAppStore.getState().setAcademicCache(
        makeEntry(userId, centroId, cursoId, periodo || NULL_PERIODO_TOKEN, data)
    );
    console.log(`[DIAG][CACHE_WRITE] key="${academicCacheKey(userId, centroId, cursoId, periodo || NULL_PERIODO_TOKEN)}" userId=${userId} centroId=${centroId ?? 'sin-centro'} cursoId=${cursoId} periodo=${periodo || NULL_PERIODO_TOKEN} actividades=${data.actividades.length} calificaciones=${data.calificaciones.length} ts=${new Date().toISOString()}`);
}

/**
 * Elimina las slices académicas de un usuario. Si se pasa `cursoId`, solo se
 * eliminan las slices de ESE curso (invalidación granular); sin cursoId, todas
 * las del usuario (cambio de usuario/sesión/contexto de identidad).
 */
export function clearAcademicCacheByUser(userId: string | null | undefined, cursoId?: number): void {
    if (!userId) return;
    const antes = Object.keys(useAppStore.getState().academicCache).length;
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
    const despues = Object.keys(useAppStore.getState().academicCache).length;
    console.log(`[DIAG][CACHE_CLEAR] userId=${userId} cursoId=${cursoId ?? 'todos'} slicesAntes=${antes} slicesDespues=${despues} ts=${new Date().toISOString()}`);
}

/**
 * Write-through de Realtime: actualiza ÚNICAMENTE el registro afectado dentro de
 * las slices existentes del curso, sin invalidar ni sobrescribir otros cursos o
 * períodos. En DELETE también elimina la identidad de cualquier slice del curso
 * (p. ej. si una actividad cambió de período, la fila se retira de la slice vieja).
 * Si no existe la slice destino (porque el período aún no se cargó), no se crea
 * nada: una inyección desde Realtime no constituye completitud.
 */
export function upsertAcademicRow(
    tipo: AcademicRowType,
    row: Actividad | CalificacionActividad,
    cursoId: number,
    periodo: string | null,
    removed?: boolean,
): void {
    const store = useAppStore.getState();
    const uid = store.session?.user?.id;
    if (!uid) return;
    const centroId = store.state.cursos.find(c => c.id === cursoId)?.centroId ?? null;
    const targetKey = academicCacheKey(uid, centroId, cursoId, periodo || NULL_PERIODO_TOKEN);

    useAppStore.getState().setAcademicCache(prev => {
        const prefix = `${uid}:`;
        let changed = false;
        const next: Record<string, AcademicCacheEntry> = {};

        // 1) Retirar la identidad del registro de todas las slices de este usuario+curso.
        for (const key of Object.keys(prev)) {
            const entry = prev[key];
            if (!key.startsWith(prefix) || entry.cursoId !== cursoId) {
                next[key] = entry;
                continue;
            }
            const data: AcademicSliceData = {
                actividades: entry.data.actividades,
                calificaciones: entry.data.calificaciones,
            };
            let dirty = false;
            if (tipo === 'actividades') {
                const id = (row as Actividad).id;
                const antes = data.actividades.length;
                data.actividades = data.actividades.filter(a => !(a.id === id));
                dirty = data.actividades.length !== antes;
            } else {
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

        // 2) Si NO es borrado y la slice destino ya existe, insertar/actualizar SOLO ahí.
        if (!removed) {
            const cur = next[targetKey];
            if (cur) {
                const data: AcademicSliceData = {
                    actividades: [...cur.data.actividades],
                    calificaciones: [...cur.data.calificaciones],
                };
                if (tipo === 'actividades') {
                    const act = row as Actividad;
                    const idx = data.actividades.findIndex(a => a.id === act.id);
                    if (idx !== -1) data.actividades[idx] = act;
                    else data.actividades.push(act);
                } else {
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

        const sliceDestinoExistia = !!useAppStore.getState().academicCache[targetKey];
        const identidad = tipo === 'actividades'
            ? `actividadId=${(row as Actividad).id}`
            : `estudianteId=${(row as CalificacionActividad).estudianteId} actividadId=${(row as CalificacionActividad).actividadId}`;
        console.log(`[DIAG][CACHE_WRITE_REALTIME] tipo=${tipo} removed=${!!removed} cursoId=${cursoId} periodo=${periodo ?? NULL_PERIODO_TOKEN} centroId=${centroId ?? 'sin-centro'} ${identidad} sliceDestinoExistia=${sliceDestinoExistia} key="${targetKey}" ts=${new Date().toISOString()}`);

        return changed ? next : prev;
    });
}