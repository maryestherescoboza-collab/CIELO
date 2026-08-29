import { useAppStore, type CentroCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { Centro } from '../types';

const CENTRO_TTL_MS = CACHE_TTL_MS.centro;

function makeEntry(centro: Centro): CentroCacheEntry {
    const nowMs = Date.now();
    return {
        centroId: centro.id,
        data: centro,
        cachedAt: nowMs,
        expiresAt: nowMs + CENTRO_TTL_MS,
    };
}

/**
 * Lee del caché la entrada válida del centro.
 * Solo es válida si:
 *  - existe,
 *  - coincide exactamente con el `centroId` pedido (aislamiento),
 *  - y no ha expirado (now < expiresAt).
 * Devuelve null si no hay caché válido (el llamador debe consultar Supabase).
 */
export function getValidCentro(centroId: string | null | undefined): Centro | null {
    if (!centroId) return null;
    const cache = useAppStore.getState().centroCache;
    const entry = cache[centroId];
    if (!entry) return null;
    if (entry.centroId !== centroId) return null;
    if (Date.now() >= entry.expiresAt) return null;
    return entry.data;
}

/** Devuelve true si existe una entrada de caché válida para el centro (sin leer el dato). */
export function hasValidCentro(centroId: string | null | undefined): boolean {
    return getValidCentro(centroId) !== null;
}

/**
 * Guarda (o reemplaza) la entrada de caché del centro.
 * Renueva cachedAt y expiresAt (3 meses) desde este momento.
 * Mantiene el caché persistente sincronizado con el estado en memoria.
 */
export function saveCentroCache(centro: Centro | undefined | null): void {
    if (!centro?.id) return;
    useAppStore.getState().setCentroCache(makeEntry(centro));
}

/** Elimina la entrada de caché de un centro (p. ej. al cambiar de centro). */
export function clearCentroCache(centroId: string | null | undefined): void {
    if (!centroId) return;
    useAppStore.getState().setCentroCache(prev => {
        if (!(centroId in prev)) return prev;
        const next = { ...prev };
        delete next[centroId];
        return next;
    });
}

export { CENTRO_TTL_MS };
