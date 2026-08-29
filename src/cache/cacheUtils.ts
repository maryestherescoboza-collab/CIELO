import type { CacheResource } from './cacheKeys';
import { cacheKeyFor, type CacheKeyParts } from './cacheKeys';
import { getCacheConfig, CACHE_STALE_MARGIN_MS } from './cacheConfig';

export interface CacheEntry<T = unknown> {
    key: string;
    data: T;
    createdAt: number;
    updatedAt: number;
    expiresAt: number;
}

export type CacheMap = Record<string, CacheEntry>;

export function now(): number {
    return Date.now();
}

/** Envuelve el valor y fija la expiración según el TTL del recurso. */
export function makeCacheEntry<T>(key: string, data: T, ttlMs?: number): CacheEntry<T> {
    const created = now();
    const resource = key.split(':')[0] as CacheResource;
    const ttl = ttlMs ?? getCacheConfig(resource).ttlMs;
    return {
        key,
        data,
        createdAt: created,
        updatedAt: created,
        expiresAt: created + ttl,
    };
}

export function cacheExists(cache: CacheMap, key: string): boolean {
    return key in cache;
}

/** ¿Pertenece la entrada al usuario/centro/curso correctos? */
export function cacheOwns(cache: CacheMap, key: string, parts: CacheKeyParts): boolean {
    const entry = cache[key];
    if (!entry) return false;
    return key === cacheKeyFor(parts);
}

/** ¿La entrada existe pero ya superó su TTL? */
export function cacheIsExpired(entry: CacheEntry | undefined, nowMs: number = now()): boolean {
    if (!entry) return true;
    return nowMs >= entry.expiresAt;
}

/** ¿La entrada está vencida o no pertenece al dueño esperado? */
export function cacheIsValid(cache: CacheMap, key: string, parts: CacheKeyParts, nowMs: number = now()): boolean {
    if (!cacheOwns(cache, key, parts)) return false;
    return !cacheIsExpired(cache[key], nowMs);
}

/** ¿Está dentro del margen de "próxima actualización" (stale próximo)? */
export function cacheNeedsRefresh(entry: CacheEntry | undefined, nowMs: number = now()): boolean {
    if (!entry) return true;
    return nowMs >= entry.expiresAt - CACHE_STALE_MARGIN_MS;
}

/** Revela cuándo se debería actualizar (expiración) y cuándo eliminar. */
export function cacheStatus(cache: CacheMap, key: string, parts: CacheKeyParts, nowMs: number = now()) {
    const entry = cache[key];
    const exists = !!entry;
    const owned = cacheOwns(cache, key, parts);
    const expired = cacheIsExpired(entry, nowMs);
    const needRefresh = cacheNeedsRefresh(entry, nowMs);
    return {
        exists,
        owned,
        valid: exists && owned && !expired,
        expired,
        needRefresh,
        refreshAt: entry ? entry.expiresAt - CACHE_STALE_MARGIN_MS : null,
        expireAt: entry ? entry.expiresAt : null,
    };
}

/** Inserta o reemplaza una entrada, fijando timestamps y expiración. */
export function cacheSet<T>(cache: CacheMap, key: string, data: T, ttlMs?: number): CacheMap {
    return { ...cache, [key]: makeCacheEntry(key, data, ttlMs) };
}

/** Actualiza `updatedAt` (y extiende la expiración) sin reemplazar el valor. */
export function cacheTouch(cache: CacheMap, key: string, ttlMs?: number): CacheMap {
    const entry = cache[key];
    if (!entry) return cache;
    const resource = key.split(':')[0] as CacheResource;
    const ttl = ttlMs ?? getCacheConfig(resource).ttlMs;
    const touchedAt = now();
    return {
        ...cache,
        [key]: {
            ...entry,
            updatedAt: touchedAt,
            expiresAt: touchedAt + ttl,
        },
    };
}

/** Elimina una entrada concreta por su clave. */
export function cacheRemove(cache: CacheMap, key: string): CacheMap {
    if (!(key in cache)) return cache;
    const next = { ...cache };
    delete next[key];
    return next;
}

/** Elimina todas las entradas de un recurso (p. ej. al cambiar de centro/año). */
export function cacheClearResource(cache: CacheMap, resource: string): CacheMap {
    const prefix = `${resource}:`;
    const next: CacheMap = {};
    for (const key of Object.keys(cache)) {
        if (!key.startsWith(prefix)) next[key] = cache[key];
    }
    return next;
}

/** Elimina las entradas vencidas que ya no sirven memoria. */
export function cachePruneExpired(cache: CacheMap, nowMs: number = now()): CacheMap {
    const next: CacheMap = {};
    for (const key of Object.keys(cache)) {
        if (!cacheIsExpired(cache[key], nowMs)) next[key] = cache[key];
    }
    return next;
}

/**
 * Invalida por escritura: elimina la clave escrita y las de los recursos
 * relacionados según `invalidateOnWrite` — usando el mismo centro/curso
 * para no tocar datos de otros centros.
 */
export function cacheInvalidate(
    cache: CacheMap,
    resource: CacheResource,
    related: CacheKeyParts[],
): CacheMap {
    const config = getCacheConfig(resource);
    let next = cache;

    config.invalidateOnWrite.forEach(target => {
        related.forEach(parts => {
            next = cacheRemove(next, cacheKeyFor({ ...parts, resource: target }));
        });
    });

    return next;
}
