import { useAppStore, type CursoCacheEntry, type CursoCacheData } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';

const CURSOS_TTL_MS = CACHE_TTL_MS.cursos;

/**
 * Clave compuesta que aísla el caché de cursos por usuario y centro.
 * Imposibilita que el usuario A recupere los cursos del usuario B,
 * o que el usuario A+centro X recupere los cursos de A+centro Y.
 */
export function cursoCacheKey(userId: string | null | undefined, centroId: string | null | undefined): string {
    return `${userId || 'sin-usuario'}:${centroId || 'sin-centro'}`;
}

function makeEntry(userId: string, centroId: string | null | undefined, data: CursoCacheData): CursoCacheEntry {
    const nowMs = Date.now();
    return {
        key: cursoCacheKey(userId, centroId),
        userId,
        centroId: centroId || undefined,
        data,
        cachedAt: nowMs,
        expiresAt: nowMs + CURSOS_TTL_MS,
    };
}

/**
 * Lee del caché la entrada válida de cursos del usuario en el centro actual.
 * Solo es válida si:
 *  - existe,
 *  - coincide exactamente con la clave {userId}:{centroId} (aislamiento),
 *  - y no ha expirado (now < expiresAt).
 * Devuelve null si no hay caché válido (el llamador debe consultar Supabase).
 */
export function getValidCursoCache(userId: string | null | undefined, centroId: string | null | undefined): CursoCacheData | null {
    if (!userId) return null;
    const key = cursoCacheKey(userId, centroId);
    const cache = useAppStore.getState().cursoCache;
    const entry = cache[key];
    if (!entry) return null;
    if (entry.key !== key) return null;
    if (Date.now() >= entry.expiresAt) return null;
    return entry.data;
}

/** Devuelve true si existe una entrada de caché válida de cursos para el contexto. */
export function hasValidCursoCache(userId: string | null | undefined, centroId: string | null | undefined): boolean {
    return getValidCursoCache(userId, centroId) !== null;
}

/**
 * Guarda (o reemplaza) la entrada de caché de cursos del usuario en el centro.
 * Renueva cachedAt y expiresAt (2 semanas) desde este momento.
 * Mantiene el caché persistente sincronizado con el estado en memoria.
 */
export function saveCursoCache(userId: string | null | undefined, centroId: string | null | undefined, data: CursoCacheData): void {
    if (!userId) return;
    useAppStore.getState().setCursoCache(makeEntry(userId, centroId, data));
}

/**
 * Elimina las entradas de caché de cursos del usuario (y opcionalmente de un
 * centro concreto). Se usa al invalidar tras escrituras sobre `cursos` o
 * `curso_docentes` (crear/editar/eliminar curso, vincular/desvincular docente).
 */
export function clearCursoCache(userId: string | null | undefined, centroId?: string | null): void {
    if (!userId) return;
    useAppStore.getState().setCursoCache(prev => {
        let next: Record<string, CursoCacheEntry> = {};
        const prefix = `${userId}:`;
        for (const key of Object.keys(prev)) {
            const remove = key.startsWith(prefix) && (centroId === undefined || key === cursoCacheKey(userId, centroId));
            if (!remove) next[key] = prev[key];
        }
        if (Object.keys(next).length === Object.keys(prev).length) return prev;
        return next;
    });
}

export { CURSOS_TTL_MS };
