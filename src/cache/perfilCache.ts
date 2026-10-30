import { useAppStore, type PerfilCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { Centro, UserProfile } from '../types';

const PERFIL_TTL_MS = CACHE_TTL_MS.perfil;

/**
 * Conjunto en memoria de usuarios cuyo perfil activo en la UI fue recuperado
 * desde caché local tras una falla temporal de conexión con Supabase.
 * Mientras un userId permanezca en este conjunto, la interfaz puede mostrarse
 * en modo de recuperación, pero NO se autorizan operaciones de escritura
 * basadas únicamente en este estado cacheado hasta que una consulta en vivo a
 * `perfiles` confirme la identidad y permisos vigentes.
 */
const fallbackActiveByUser = new Set<string>();

export function markPerfilRecoveredFromCache(userId: string | null | undefined): void {
    if (!userId) return;
    fallbackActiveByUser.add(userId);
}

export function clearPerfilRecoveredFromCache(userId: string | null | undefined): void {
    if (!userId) return;
    fallbackActiveByUser.delete(userId);
}

export function isPerfilRecoveredFromCache(userId: string | null | undefined): boolean {
    if (!userId) return false;
    return fallbackActiveByUser.has(userId);
}

/**
 * Determina si el error devuelto al consultar `perfiles` corresponde a una
 * falla temporal de red, timeout o indisponibilidad del origen (ej. 522, 524,
 * 502, 503, 504, 429, Failed to fetch), distinguiéndolo explícitamente de
 * errores de sesión cerrada, falta de permisos (401/403/RLS) o fila inexistente (PGRST116).
 */
export function isTemporaryPerfilConnectionError(err: unknown): boolean {
    if (!err) return false;
    const obj = typeof err === 'object' && err !== null ? (err as Record<string, unknown>) : null;
    const code = String(obj?.code ?? '').toUpperCase();
    const status = Number(obj?.status ?? obj?.statusCode ?? 0);

    // No confundir fila inexistente (PGRST116) ni errores de autorización/RLS/JWT con caída de red
    if (code === 'PGRST116' || code === '42501' || code === 'PGRST301') return false;
    if (status === 401 || status === 403 || status === 406) return false;

    if ([408, 429, 500, 502, 503, 504, 520, 521, 522, 523, 524, 530].includes(status)) {
        return true;
    }
    if (['PGRST000', 'PGRST001', 'PGRST002', '57P01', '53300'].includes(code)) {
        return true;
    }

    const rawMsg = err instanceof Error
        ? err.message
        : `${String(obj?.message ?? '')} ${String(obj?.details ?? '')} ${String(obj?.hint ?? '')} ${String(err)}`;
    const lower = rawMsg.toLowerCase();

    if (
        lower.includes('jwt expired') ||
        lower.includes('invalid jwt') ||
        lower.includes('permission denied') ||
        lower.includes('row-level security') ||
        lower.includes('0 rows')
    ) {
        return false;
    }

    return (
        lower.includes('failed to fetch') ||
        lower.includes('network') ||
        lower.includes('fetch error') ||
        lower.includes('load failed') ||
        lower.includes('timeout') ||
        lower.includes('timed out') ||
        lower.includes('gateway') ||
        lower.includes('service unavailable') ||
        lower.includes('too many requests') ||
        lower.includes('connection refused') ||
        lower.includes('aborted') ||
        lower.includes('502') ||
        lower.includes('503') ||
        lower.includes('504') ||
        lower.includes('520') ||
        lower.includes('521') ||
        lower.includes('522') ||
        lower.includes('523') ||
        lower.includes('524') ||
        lower.includes('530') ||
        lower.includes('429')
    );
}

/**
 * Construye un UserProfile mínimo de solo lectura para recuperar la interfaz
 * a partir de una entrada válida de `perfilCache` cuando Supabase no responde.
 */
export function buildUserProfileFromCache(
    userId: string,
    cached: PerfilCacheData,
    resolvedCentro?: Centro
): UserProfile {
    const nombreVisible = (cached.nombre || cached.nombre_docente || '').trim();
    return {
        userId,
        nombreDocente: nombreVisible,
        bio: '',
        avatarUrl: cached.avatar_url || '',
        avatarColor: '',
        createdAt: '',
        trial_extension_activated_at: null,
        asignatura: '',
        institucion: resolvedCentro?.nombre || '',
        instituto: resolvedCentro?.nombre || '',
        centro_id: cached.centro_id || undefined,
        centro: resolvedCentro,
        rol: (cached.rol as UserProfile['rol']) || undefined,
        lastSeen: '',
        publicacionesRealizadas: 0,
    };
}

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
    clearPerfilRecoveredFromCache(userId);
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
    clearPerfilRecoveredFromCache(userId);
    useAppStore.getState().setPerfilCache(prev => {
        if (!(userId in prev)) return prev;
        const next = { ...prev };
        delete next[userId];
        return next;
    });
}

export { PERFIL_TTL_MS };
