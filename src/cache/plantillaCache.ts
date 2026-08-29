import { useAppStore, type PlantillaCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { Plantilla } from '../types';

const PLANTILLA_TTL_MS = CACHE_TTL_MS.plantillas;

function makeEntry(userId: string, plantillas: Plantilla[]): PlantillaCacheEntry {
    const nowMs = Date.now();
    return {
        key: userId,
        userId,
        data: plantillas,
        cachedAt: nowMs,
        expiresAt: nowMs + PLANTILLA_TTL_MS,
    };
}

/**
 * Lee del caché las plantillas válidas del usuario autenticado.
 * Solo son válidas si:
 *  - existe la entrada,
 *  - coincide exactamente con el `userId` pedido (aislamiento entre usuarios),
 *  - y no ha expirado (now < expiresAt).
 * Las plantillas pertenecen a su creador (`plantillas.user_id`), así que el
 * aislamiento por usuario es la única dimensión válida (la tabla no tiene
 * `centro_id` ni `curso_id`).
 * Devuelve null si no hay caché válido (el llamador debe consultar Supabase).
 */
export function getValidPlantillaCache(userId: string | null | undefined): Plantilla[] | null {
    if (!userId) return null;
    const cache = useAppStore.getState().plantillaCache;
    const entry = cache[userId];
    if (!entry) return null;
    if (entry.key !== userId) return null;
    if (Date.now() >= entry.expiresAt) return null;
    return entry.data;
}

/** Devuelve true si existe una entrada de caché válida de plantillas para el usuario. */
export function hasValidPlantillaCache(userId: string | null | undefined): boolean {
    return getValidPlantillaCache(userId) !== null;
}

/**
 * Guarda (o reemplaza) la entrada de caché de plantillas del usuario.
 * Renueva cachedAt y expiresAt (6 meses) desde este momento.
 * Mantiene el caché persistente sincronizado con el estado en memoria.
 */
export function savePlantillaCache(userId: string | null | undefined, plantillas: Plantilla[]): void {
    if (!userId) return;
    useAppStore.getState().setPlantillaCache(makeEntry(userId, plantillas));
}

/**
 * Elimina la entrada de caché de plantillas del usuario.
 * Se usa al invalidar tras escrituras sobre `plantillas`
 * (crear, editar, archivar/eliminar o importar una plantilla).
 */
export function clearPlantillaCache(userId: string | null | undefined): void {
    if (!userId) return;
    useAppStore.getState().setPlantillaCache(prev => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
    });
}

/**
 * Devuelve el subconjunto de `ids` que el usuario ya tiene disponibles en su
 * caché válido (plantillas propias ya cacheadas). Permite consultar Supabase
 * solo por los ids realmente faltantes y evita consultas redundantes cuando
 * `loadRubricaCotejoData` todavía no ha poblado el estado en memoria.
 *
 * Aislamiento: solo se devuelven ids cuya fila pertenezca a `plantillas.user_id`
 * del usuario pedido; nunca las plantillas compartidas de otros docentes.
 */
export function getAvailablePlantillaIds(userId: string | null | undefined, ids: readonly number[]): Set<number> {
    const available = new Set<number>();
    if (!userId || ids.length === 0) return available;
    const cached = getValidPlantillaCache(userId);
    if (!cached) return available;
    for (const pl of cached) {
        if (ids.includes(pl.id)) available.add(pl.id);
    }
    return available;
}

/**
 * Busca una plantilla propia por id dentro del caché válido del usuario.
 * Devuelve la plantilla (ya mapeada, camelCase) o null si no está cacheada.
 */
export function getCachedPlantillaById(userId: string | null | undefined, id: number): Plantilla | null {
    if (!userId) return null;
    const cached = getValidPlantillaCache(userId);
    if (!cached) return null;
    return cached.find(pl => pl.id === id) || null;
}

export { PLANTILLA_TTL_MS };
