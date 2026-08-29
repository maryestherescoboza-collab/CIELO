import { useAppStore, type PerfilCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { UserProfile } from '../types';

const PERFIL_TTL_MS = CACHE_TTL_MS.perfil;

/**
 * Campos del perfil que se cachean. Exclusivamente estos cinco.
 * El resto del perfil (bio, avatar_color, tipo_institucion, asignaturas…)
 * NO se persiste en caché.
 */
export interface PerfilCacheData {
    nombre?: string;
    avatar_url?: string;
    nombre_docente?: string;
    centro_id?: string | null;
    rol?: string;
}

function makeEntry(userId: string, data: PerfilCacheData): PerfilCacheEntry {
    const nowMs = Date.now();
    return {
        userId,
        data,
        cachedAt: nowMs,
        expiresAt: nowMs + PERFIL_TTL_MS,
    };
}

/**
 * Lee del caché la entrada válida del perfil del usuario autenticado.
 * Solo es válida si:
 *  - existe,
 *  - coincide exactamente con el `userId` pedido (aislamiento entre usuarios),
 *  - y no ha expirado (now < expiresAt).
 * Devuelve null si no hay caché válido (el llamador debe consultar Supabase).
 */
export function getValidPerfil(userId: string | null | undefined): PerfilCacheData | null {
    if (!userId) return null;
    const cache = useAppStore.getState().perfilCache;
    const entry = cache[userId];
    if (!entry) return null;
    if (entry.userId !== userId) return null;
    if (Date.now() >= entry.expiresAt) return null;
    return entry.data;
}

/** Devuelve true si existe una entrada de caché válida para el perfil (sin leer el dato). */
export function hasValidPerfil(userId: string | null | undefined): boolean {
    return getValidPerfil(userId) !== null;
}

/**
 * Extrae únicamente los cinco campos cacheados a partir del perfil en memoria.
 * Si el perfil aún no existe, se guardan los valores que sí estén disponibles.
 */
function toCacheData(perfil: Partial<UserProfile> | undefined | null): PerfilCacheData {
    return {
        nombre: perfil?.nombreDocente ?? undefined,
        avatar_url: perfil?.avatarUrl ?? undefined,
        nombre_docente: perfil?.nombreDocente ?? undefined,
        centro_id: perfil?.centro_id ?? undefined,
        rol: perfil?.rol ?? undefined,
    };
}

/**
 * Guarda (o reemplaza) la entrada de caché del perfil del usuario.
 * Renueva cachedAt y expiresAt (3 meses) desde este momento.
 * Mantiene el caché persistente sincronizado con el estado en memoria.
 */
export function savePerfilCache(userId: string | null | undefined, perfil: Partial<UserProfile> | undefined | null): void {
    if (!userId) return;
    useAppStore.getState().setPerfilCache(makeEntry(userId, toCacheData(perfil)));
}

/**
 * Guarda (o reemplaza) la entrada de caché del perfil directamente desde la
 * fila cruda de Supabase (nombres snake_case de la tabla `perfiles`).
 */
export function savePerfilCacheFromRow(userId: string | null | undefined, row: Record<string, unknown> | undefined | null): void {
    if (!userId || !row) return;
    const data: PerfilCacheData = {
        nombre: row.nombre as string | undefined,
        avatar_url: row.avatar_url as string | undefined,
        nombre_docente: row.nombre_docente as string | undefined,
        centro_id: row.centro_id as string | null | undefined,
        rol: row.rol as string | undefined,
    };
    useAppStore.getState().setPerfilCache(makeEntry(userId, data));
}

/** Elimina la entrada de caché del perfil de un usuario (p. ej. al cambiar de usuario). */
export function clearPerfilCache(userId: string | null | undefined): void {
    if (!userId) return;
    useAppStore.getState().setPerfilCache(prev => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
    });
}

export { PERFIL_TTL_MS };
