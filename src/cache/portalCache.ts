import { supabase } from '../lib/supabase';
import { clearStoredToken } from '../lib/googleDrive';
import { SIETE_ASIGNATURAS_OFICIALES, sonMismaAsignatura } from '../constants/asignaturas';

/**
 * Caché compartida y deduplicación de solicitudes en vuelo para `/portal`.
 *
 * Principios de seguridad y arquitectura:
 * 1. Aislamiento estricto por estudiante y sesión (`sessionToken`). Ninguna
 *    entrada puede leerse sin coincidir exactamente con el `sessionToken` activo.
 * 2. Al cambiar de sesión, de enlace (`token`) o detectar sesión inválida, se
 *    purgan inmediatamente tanto la memoria como `sessionStorage` y cualquier
 *    token OAuth en memoria de Google Drive (`clearStoredToken()`).
 * 3. La caché NUNCA sustituye la autorización: únicamente almacena respuestas
 *    que las RPC `SECURITY DEFINER` de Supabase ya autorizaron para ese
 *    `sessionToken`.
 * 4. Deduplicación de promesas en vuelo (`inFlightRequests`) con control de
 *    versión/generación (`cacheGeneration` y `keyGenerationMap`) para evitar que
 *    respuestas iniciadas antes de una invalidación sobrescriban la caché.
 */

export const PORTAL_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutos
export const PORTAL_SIGNED_URL_TTL_MS = 50 * 60 * 1000; // 50 min (para URLs firmadas de 60 min)

const STORAGE_PREFIX = 'portal_cache_v1:';
const ACTIVE_SCOPE_KEY = 'portal_cache_active_scope_v1';

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
  sessionToken: string;
}

const memoryCache = new Map<string, CacheEntry<unknown>>();
const inFlightRequests = new Map<string, Promise<unknown>>();
const keyGenerationMap = new Map<string, number>();
const signedUrlCache = new Map<string, { url: string; expiresAt: number }>();

let currentActiveSessionToken: string | null = null;
let cacheGeneration = 0;

function getKeyGeneration(fullKey: string): number {
  return keyGenerationMap.get(fullKey) ?? 0;
}

function bumpKeyGeneration(fullKey: string): void {
  keyGenerationMap.set(fullKey, getKeyGeneration(fullKey) + 1);
}

/**
 * Normaliza el nombre de asignatura a su nombre canónico oficial cuando
 * coincide con alguna de las asignaturas del catálogo, garantizando que
 * `'Matemática'` y `'matematica'` compartan la misma entrada de caché.
 */
export function canonicalAsignaturaKey(asignatura: string | null | undefined): string {
  if (!asignatura) return '';
  const trimmed = asignatura.trim();
  const oficial = SIETE_ASIGNATURAS_OFICIALES.find((o) => sonMismaAsignatura(o.nombre, trimmed) || sonMismaAsignatura(o.id, trimmed));
  if (oficial) return oficial.id;
  return trimmed.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]/g, '_');
}

/**
 * Garantiza que la caché pertenezca únicamente a la sesión activa actual.
 * Si el `sessionToken` o el alcance (`accessToken:sessionToken`) cambió respecto
 * al anterior, purga toda la caché previa y los tokens de terceros en memoria.
 */
export function ensurePortalSessionScope(sessionToken: string | null | undefined, accessToken?: string): void {
  if (!sessionToken) {
    clearPortalCache();
    return;
  }

  const scopeId = accessToken ? `${accessToken}:${sessionToken}` : sessionToken;

  if (currentActiveSessionToken && currentActiveSessionToken !== sessionToken) {
    clearPortalCache();
  }

  try {
    const savedScope = sessionStorage.getItem(ACTIVE_SCOPE_KEY);
    if (savedScope && savedScope !== scopeId && savedScope !== sessionToken) {
      clearPortalCache();
    }
    sessionStorage.setItem(ACTIVE_SCOPE_KEY, scopeId);
  } catch {
    // Ignorar restricciones de sessionStorage
  }

  currentActiveSessionToken = sessionToken;
}

/**
 * Limpia por completo la caché en memoria, `sessionStorage`, solicitudes en vuelo
 * y tokens OAuth de Google Drive en memoria.
 */
export function clearPortalCache(): void {
  cacheGeneration += 1;
  memoryCache.clear();
  inFlightRequests.clear();
  keyGenerationMap.clear();
  signedUrlCache.clear();
  currentActiveSessionToken = null;
  clearStoredToken();

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (k.startsWith(STORAGE_PREFIX) || k.startsWith('portal_incidencias_') || k === ACTIVE_SCOPE_KEY)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignorar errores de acceso a sessionStorage
  }
}

function buildStorageKey(sessionToken: string, namespace: string, subKey = ''): string {
  return `${STORAGE_PREFIX}${sessionToken}:${namespace}${subKey ? `:${subKey}` : ''}`;
}

export function getPortalCache<T>(
  sessionToken: string | null | undefined,
  namespace: string,
  subKey = ''
): T | null {
  if (!sessionToken) return null;
  ensurePortalSessionScope(sessionToken);

  const fullKey = buildStorageKey(sessionToken, namespace, subKey);
  const now = Date.now();

  const mem = memoryCache.get(fullKey);
  if (mem) {
    if (mem.sessionToken === sessionToken && mem.expiresAt > now) {
      return mem.data as T;
    }
    memoryCache.delete(fullKey);
  }

  try {
    const raw = sessionStorage.getItem(fullKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry<T>;
    if (parsed && parsed.sessionToken === sessionToken && parsed.expiresAt > now) {
      memoryCache.set(fullKey, parsed as CacheEntry<unknown>);
      return parsed.data;
    }
    sessionStorage.removeItem(fullKey);
  } catch {
    // Ignorar errores de parseo o almacenamiento
  }

  return null;
}

export function setPortalCache<T>(
  sessionToken: string | null | undefined,
  namespace: string,
  subKey: string,
  data: T,
  ttlMs: number = PORTAL_CACHE_TTL_MS
): void {
  if (!sessionToken) return;
  ensurePortalSessionScope(sessionToken);

  const fullKey = buildStorageKey(sessionToken, namespace, subKey);
  const entry: CacheEntry<T> = {
    data,
    expiresAt: Date.now() + ttlMs,
    sessionToken,
  };

  memoryCache.set(fullKey, entry as CacheEntry<unknown>);

  try {
    sessionStorage.setItem(fullKey, JSON.stringify(entry));
  } catch {
    // Si sessionStorage alcanza su cuota, memoryCache sigue activa durante la sesión
  }
}

/**
 * Invalida todas las entradas de un `namespace` (o una `subKey` específica) para la sesión actual,
 * incrementando la generación de las claves afectadas y descartando promesas en vuelo anteriores.
 */
export function invalidatePortalCacheNamespace(
  sessionToken: string | null | undefined,
  namespace: string,
  subKey?: string
): void {
  if (!sessionToken) return;
  const prefix = subKey !== undefined
    ? buildStorageKey(sessionToken, namespace, subKey)
    : `${STORAGE_PREFIX}${sessionToken}:${namespace}`;

  if (subKey !== undefined) {
    bumpKeyGeneration(prefix);
  } else {
    cacheGeneration += 1;
  }

  for (const key of Array.from(memoryCache.keys())) {
    if (subKey !== undefined ? key === prefix : key.startsWith(prefix)) {
      memoryCache.delete(key);
      bumpKeyGeneration(key);
    }
  }

  for (const key of Array.from(inFlightRequests.keys())) {
    if (subKey !== undefined ? key === prefix : key.startsWith(prefix)) {
      inFlightRequests.delete(key);
      bumpKeyGeneration(key);
    }
  }

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const k = sessionStorage.key(i);
      if (k && (subKey !== undefined ? k === prefix : k.startsWith(prefix))) {
        keysToRemove.push(k);
        bumpKeyGeneration(k);
      }
    }
    keysToRemove.forEach((k) => sessionStorage.removeItem(k));
  } catch {
    // Ignorar errores de sessionStorage
  }
}

/**
 * Invalida las cachés afectadas al crear o eliminar una evidencia del portafolio.
 */
export function invalidatePortalPortafolioCache(sessionToken: string | null | undefined): void {
  if (!sessionToken) return;
  invalidatePortalCacheNamespace(sessionToken, 'portafolio_evidencias');
  invalidatePortalCacheNamespace(sessionToken, 'portafolio_actividades');
  invalidatePortalCacheNamespace(sessionToken, 'ficha_detalle');
  invalidatePortalCacheNamespace(sessionToken, 'asignaturas');
  invalidatePortalCacheNamespace(sessionToken, 'evidencias_asig');
}

/**
 * Invalida la caché del estado de Google Drive del estudiante.
 */
export function invalidatePortalDriveCache(sessionToken: string | null | undefined): void {
  if (!sessionToken) return;
  invalidatePortalCacheNamespace(sessionToken, 'drive_estado');
}

/**
 * Invalida los comentarios de una ficha específica tras publicar uno nuevo.
 */
export function invalidatePortalFichaComentariosCache(
  sessionToken: string | null | undefined,
  notaId: string
): void {
  if (!sessionToken) return;
  invalidatePortalCacheNamespace(sessionToken, 'ficha_comentarios', notaId);
}

/**
 * Invalida el detalle y listado de rutas, además de evidencias, asignaturas y
 * dashboard cuando el estudiante completa una actividad de Ruta de Aprendizaje
 * que proyecta una calificación.
 */
export function invalidatePortalRutaCache(
  sessionToken: string | null | undefined,
  rutaId: string,
  notaId?: string
): void {
  if (!sessionToken) return;
  if (rutaId) {
    invalidatePortalCacheNamespace(sessionToken, 'ruta_detalle', rutaId);
  } else {
    invalidatePortalCacheNamespace(sessionToken, 'ruta_detalle');
  }
  if (notaId) {
    invalidatePortalCacheNamespace(sessionToken, 'ficha_rutas', notaId);
  } else {
    invalidatePortalCacheNamespace(sessionToken, 'ficha_rutas');
  }
  invalidatePortalCacheNamespace(sessionToken, 'evidencias_asig');
  invalidatePortalCacheNamespace(sessionToken, 'asignaturas');
  invalidatePortalCacheNamespace(sessionToken, 'dashboard');
}

/**
 * Ejecuta `fetcher` solo si no existe una entrada válida en caché ni una solicitud
 * idéntica en vuelo. Verifica versión/generación antes de escribir en caché para
 * impedir que una solicitud iniciada antes de una invalidación escriba datos obsoletos.
 */
export async function fetchWithPortalCache<T>(
  sessionToken: string,
  namespace: string,
  subKey: string,
  fetcher: () => Promise<T>,
  options?: { ttlMs?: number; forceRefresh?: boolean }
): Promise<T> {
  ensurePortalSessionScope(sessionToken);

  if (!options?.forceRefresh) {
    const cached = getPortalCache<T>(sessionToken, namespace, subKey);
    if (cached !== null) {
      return cached;
    }
  }

  const fullKey = buildStorageKey(sessionToken, namespace, subKey);

  if (!options?.forceRefresh) {
    const existingPromise = inFlightRequests.get(fullKey);
    if (existingPromise) {
      return existingPromise as Promise<T>;
    }
  } else {
    bumpKeyGeneration(fullKey);
  }

  const startGlobalGen = cacheGeneration;
  const startKeyGen = getKeyGeneration(fullKey);

  let promise!: Promise<T>;
  promise = (async () => {
    try {
      const result = await fetcher();
      const isSameSession = currentActiveSessionToken === sessionToken;
      const isSameGeneration =
        cacheGeneration === startGlobalGen && getKeyGeneration(fullKey) === startKeyGen;

      if (isSameSession && isSameGeneration) {
        setPortalCache(sessionToken, namespace, subKey, result, options?.ttlMs ?? PORTAL_CACHE_TTL_MS);
      }
      return result;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Sesión inválida') || msg.includes('Acceso inactivo')) {
        clearPortalCache();
      }
      throw err;
    } finally {
      if (inFlightRequests.get(fullKey) === promise) {
        inFlightRequests.delete(fullKey);
      }
    }
  })();

  inFlightRequests.set(fullKey, promise);
  return promise;
}

/* ═════════════════════════════════════════════════════════════════════════
   HELPERS RPC COMPARTIDOS DEL PORTAL (CON CACHÉ + DEDUPLICACIÓN)
   ═════════════════════════════════════════════════════════════════════════ */

function assertRpcData<T>(data: unknown, rpcError: { message?: string } | null, fallbackMsg: string): T {
  if (rpcError) throw new Error(rpcError.message || fallbackMsg);
  if (data && typeof data === 'object' && 'error' in (data as Record<string, unknown>)) {
    const errVal = (data as Record<string, unknown>).error;
    if (typeof errVal === 'string' && errVal.trim()) {
      throw new Error(errVal);
    }
  }
  return (data ?? ([] as unknown)) as T;
}

export async function fetchPortalContextCached<T = any>(sessionToken: string): Promise<T> {
  return fetchWithPortalCache<T>(sessionToken, 'context', 'main', async () => {
    const { data, error } = await supabase.rpc('portal_get_context', {
      p_session_token: sessionToken,
    });
    if (error) throw error;
    return data as T;
  });
}

export async function fetchPortalAsignaturasCached<T = any>(
  sessionToken: string,
  periodo: string
): Promise<T[]> {
  return fetchWithPortalCache<T[]>(sessionToken, 'asignaturas', periodo, async () => {
    const { data, error } = await supabase.rpc('portal_get_asignaturas', {
      p_session_token: sessionToken,
      p_periodo: periodo,
    });
    const res = assertRpcData<T[]>(data, error, 'Error al cargar las asignaturas');
    return Array.isArray(res) ? res : [];
  });
}

export async function fetchPortalFichasCompartidasCached<T = any>(
  sessionToken: string,
  asignatura?: string
): Promise<T[]> {
  const canon = asignatura ? canonicalAsignaturaKey(asignatura) : 'all';
  return fetchWithPortalCache<T[]>(sessionToken, 'fichas_compartidas', canon, async () => {
    const { data, error } = await supabase.rpc('portal_get_fichas_compartidas', {
      p_session_token: sessionToken,
      p_asignatura: asignatura || null,
    });
    const res = assertRpcData<T[]>(data, error, 'Error al cargar las fichas');
    return Array.isArray(res) ? res : [];
  });
}

export async function fetchPortalEvidenciasAsignaturaCached<T = any>(
  sessionToken: string,
  periodo: string,
  asignatura: string,
  options?: { mostrarEvidencias?: boolean; totalActividades?: number }
): Promise<T[]> {
  if (options?.mostrarEvidencias === false) {
    return [];
  }
  if (options?.totalActividades !== undefined && options.totalActividades <= 0) {
    return [];
  }

  const canon = canonicalAsignaturaKey(asignatura);
  const subKey = `${periodo}:${canon}`;

  return fetchWithPortalCache<T[]>(sessionToken, 'evidencias_asig', subKey, async () => {
    const { data, error } = await supabase.rpc('portal_get_evidencias', {
      p_session_token: sessionToken,
      p_periodo: periodo,
      p_asignatura: asignatura,
    });
    const res = assertRpcData<T[]>(data, error, 'Error al cargar las evidencias');
    return Array.isArray(res) ? res : [];
  });
}

/**
 * En la base de datos (`portal_get_incidencias`), la tabla `public.incidencias`
 * filtra por `estudiante_id`, `activo` y `published_until` de la publicación.
 * Si `mostrarIncidencias === false`, devuelve `[]` directamente.
 * La clave incluye `periodo` y `publishedUntil` explícitamente (sin escritura
 * secundaria sin `publishedUntil`), evitando reutilizar incidencias de otro
 * período o con un corte de publicación distinto.
 */
export async function fetchPortalIncidenciasAsignaturaCached<T = any>(
  sessionToken: string,
  periodo: string,
  asignatura: string,
  options?: { mostrarIncidencias?: boolean; publishedUntil?: string | null }
): Promise<T[]> {
  if (options?.mostrarIncidencias === false) {
    return [];
  }

  const canon = canonicalAsignaturaKey(asignatura);
  const pubToken =
    options && 'publishedUntil' in options
      ? `pub_${options.publishedUntil ?? 'LIVE'}`
      : `asig_${canon}`;
  const scopeKey = `${periodo}:${pubToken}`;

  return fetchWithPortalCache<T[]>(
    sessionToken,
    'incidencias_scope',
    scopeKey,
    async () => {
      const { data, error } = await supabase.rpc('portal_get_incidencias', {
        p_session_token: sessionToken,
        p_periodo: periodo,
        p_asignatura: asignatura,
      });
      const res = assertRpcData<T[]>(data, error, 'Error al cargar las incidencias');
      return Array.isArray(res) ? res : [];
    }
  );
}

export async function fetchPortalRecuperacionesCached<T = any>(
  sessionToken: string,
  periodo: string,
  asignatura: string,
  options?: { mostrarRecuperacion?: boolean }
): Promise<T[]> {
  if (options?.mostrarRecuperacion === false) {
    return [];
  }

  const canon = canonicalAsignaturaKey(asignatura);
  const subKey = `${periodo}:${canon}`;

  return fetchWithPortalCache<T[]>(sessionToken, 'recuperaciones_asig', subKey, async () => {
    const { data, error } = await supabase.rpc('portal_get_recuperaciones', {
      p_session_token: sessionToken,
      p_periodo: periodo,
      p_asignatura: asignatura,
    });
    const res = assertRpcData<T[]>(data, error, 'Error al cargar las recuperaciones');
    return Array.isArray(res) ? res : [];
  });
}

/* ═════════════════════════════════════════════════════════════════════════
   CACHÉ DE ENLACES FIRMADOS DE SUPABASE STORAGE
   ═════════════════════════════════════════════════════════════════════════ */

export function getCachedSignedUrl(storagePath: string): string | null {
  const entry = signedUrlCache.get(storagePath);
  if (!entry) return null;
  if (entry.expiresAt > Date.now()) {
    return entry.url;
  }
  signedUrlCache.delete(storagePath);
  return null;
}

export function setCachedSignedUrl(
  storagePath: string,
  url: string,
  ttlMs: number = PORTAL_SIGNED_URL_TTL_MS
): void {
  signedUrlCache.set(storagePath, {
    url,
    expiresAt: Date.now() + ttlMs,
  });
}

export function removeCachedSignedUrl(storagePath: string | null | undefined): void {
  if (!storagePath) return;
  signedUrlCache.delete(storagePath);
}
