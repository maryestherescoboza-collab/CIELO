/**
 * FASE 5: Caché controlado en memoria con clave de aislamiento multi-tenant
 * (`userId:centroId:cursoId:asignatura:periodo:resource`) e invalidación selectiva en escrituras.
 */

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
}

const DEFAULT_TTL_MS = 30_000; // 30 segundos para datos de consulta frecuente
const store = new Map<string, CacheEntry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

export function buildTenantCacheKey(params: {
  userId: string;
  centroId: string | null;
  cursoId?: number | string;
  asignatura?: string | null;
  periodo?: string | null;
  resource: string;
}): string {
  const {
    userId,
    centroId,
    cursoId = '*',
    asignatura = '*',
    periodo = '*',
    resource,
  } = params;
  return `${userId}::${centroId ?? 'no-centro'}::${cursoId}::${(asignatura || '*').toLowerCase().trim()}::${periodo || '*'}::${resource}`;
}

export async function withTenantCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  ttlMs: number = DEFAULT_TTL_MS
): Promise<T> {
  const now = Date.now();
  const cached = store.get(key);
  if (cached && cached.expiresAt > now) {
    return cached.value as T;
  }

  const existingPromise = inflight.get(key);
  if (existingPromise) {
    return existingPromise as Promise<T>;
  }

  const promise = (async () => {
    try {
      const value = await fetcher();
      store.set(key, { value, expiresAt: Date.now() + ttlMs });
      return value;
    } finally {
      inflight.delete(key);
    }
  })();

  inflight.set(key, promise);
  return promise;
}

/**
 * Invalida las entradas del caché asociadas a un curso cuando se crea una actividad.
 */
export function invalidateCourseCache(userId: string, centroId: string | null, cursoId: number): void {
  const prefix = `${userId}::${centroId ?? 'no-centro'}::${cursoId}::`;
  for (const key of store.keys()) {
    if (key.startsWith(prefix)) {
      store.delete(key);
    }
  }
}

export function clearAllMCPCache(): void {
  store.clear();
  inflight.clear();
}

