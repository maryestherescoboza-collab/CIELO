import { useAppStore, type SecuenciaCacheEntry } from '../store/appStore';
import { CACHE_TTL_MS } from './cacheConfig';
import type { Secuencia } from '../types';

/**
 * Caché EN MEMORIA de secuencias completas.
 *
 * Unidad de caché: UNA secuencia completa (metadata + `contenido_html` +
 * `recursos`) en una sola entrada. Clave: `${userId}:${cursoId}:${secuenciaId}`.
 *
 * Reglas de aislamiento:
 *  - El prefijo `userId` (sesión) aísla por usuario: usuario B jamás recibe
 *    entradas cacheadas del usuario A.
 *  - `cursoId` en la clave garantiza que secuencias del curso A jamás se sirvan
 *    como del curso B (no se depende solo de filtros de UI).
 *  - Ante cualquier duda (clave inexacta, expirada, pertenencia distinta, fila
 *    inválida) se devuelve MISS (null) → el llamador consulta Supabase.
 *    La fuente de verdad siempre es Supabase.
 *  - NO se persiste en localStorage: el contenido HTML no debe sobrevivir a
 *    recargas ni sesiones. Se limpia en `setSession` al cambiar de usuario
 *    (misma estrategia central existente, no se crea una segunda limpieza).
 *  - Un HIT significa solo que "esta entrada concreta está completa y validada",
 *    jamás que "el curso ya está cargado".
 */

const TTL_MS = CACHE_TTL_MS.secuencias;

const ts = () => new Date().toISOString();

export function secuenciaCacheKey(
    userId: string | null | undefined,
    cursoId: number | null | undefined,
    secuenciaId: number | null | undefined,
): string {
    return `${userId || 'sin-usuario'}:${cursoId ?? 'sin-curso'}:${secuenciaId ?? 'sin-secuencia'}`;
}

/** Mapeo a `Secuencia` (camelCase + `recursos` parseado) usado SOLO para el caché. */
function mapSecuenciaRow(row: Record<string, unknown>): Secuencia {
    let recursos: unknown[] = [];
    if (Array.isArray(row.recursos)) recursos = row.recursos;
    else if (typeof row.recursos === 'string') {
        try {
            recursos = JSON.parse(row.recursos);
        } catch {
            recursos = [];
        }
    }
    return {
        id: row.id as number,
        titulo: row.titulo as string,
        cursoId: row.curso_id as number,
        fechaInicio: row.fecha_inicio as string,
        contenidoHtml: row.contenido_html as string,
        estado: row.estado as Secuencia['estado'],
        userId: row.user_id as string | undefined,
        archivoUrl: row.archivo_url as string | undefined,
        archivoNombre: row.archivo_nombre as string | undefined,
        archivoSize: row.archivo_size as number | undefined,
        archivoTipo: row.archivo_tipo as string | undefined,
        archivoFechaCarga: row.archivo_fecha_carga as string | undefined,
        recursos,
    };
}

/** Construye la entrada. Si ya existía, conserva `autorId/activo/createdAt`. */
function makeEntry(
    userId: string,
    sec: Secuencia,
    extra: { autorId?: string; activo?: boolean; createdAt?: string },
    prev: SecuenciaCacheEntry | undefined,
): SecuenciaCacheEntry {
    const nowMs = Date.now();
    return {
        key: secuenciaCacheKey(userId, sec.cursoId, sec.id),
        userId,
        cursoId: sec.cursoId,
        secuenciaId: sec.id,
        autorId: extra.autorId ?? prev?.autorId ?? sec.userId,
        activo: extra.activo ?? prev?.activo,
        createdAt: extra.createdAt ?? prev?.createdAt,
        data: sec,
        cachedAt: nowMs,
        expiresAt: nowMs + TTL_MS,
    };
}

/**
 * Lee la secuencia válida. Con `cursoId` se usa la clave exacta; con `cursoId`
 * null se localiza por prefijo de usuario + id (Comunidad/Detalle/Importación,
 * donde el curso no se conoce a priori). Cualquier duda → null (MISS).
 */
export function getValidSecuencia(
    userId: string | null | undefined,
    cursoId: number | null | undefined,
    secuenciaId: number | null | undefined,
): Secuencia | null {
    const t = ts();
    if (!userId || !secuenciaId) {
        console.log(`[SECUENCIA CACHE] MISS motivo=sin-usuario-o-secuencia userId=${userId ?? 'sin-usuario'} secuenciaId=${secuenciaId ?? 'sin-secuencia'} ts=${t}`);
        return null;
    }
    const cache = useAppStore.getState().secuenciaCache;
    const entry = cursoId
        ? cache[secuenciaCacheKey(userId, cursoId, secuenciaId)]
        : Object.values(cache).find(
            e => e && e.key.startsWith(`${userId}:`) && e.secuenciaId === secuenciaId
        );
    const logMiss = (motivo: string) => console.log(`[SECUENCIA CACHE] MISS motivo=${motivo} userId=${userId} cursoId=${cursoId ?? 'sin-curso'} secuenciaId=${secuenciaId} ts=${t}`);
    if (!entry) {
        logMiss('no-existe');
        return null;
    }
    if (entry.userId !== userId || entry.secuenciaId !== secuenciaId || (cursoId && entry.cursoId !== cursoId)) {
        logMiss('pertenencia-no-coincide');
        return null;
    }
    if (entry.key !== secuenciaCacheKey(entry.userId, entry.cursoId, entry.secuenciaId)) {
        logMiss('clave-inconsistente');
        return null;
    }
    if (Date.now() >= entry.expiresAt) {
        logMiss('expirado');
        return null;
    }
    if (!entry.data || typeof entry.data !== 'object' || !Number.isInteger(entry.data.id) || !Number.isInteger(entry.data.cursoId)) {
        logMiss('fila-invalida');
        return null;
    }
    console.log(`[SECUENCIA CACHE] HIT userId=${userId} cursoId=${entry.cursoId} secuenciaId=${secuenciaId} ts=${t}`);
    return entry.data;
}

/**
 * Consulta batch (Comunidad): separa los ids ya cacheados de los que faltan.
 * Logs agregados para no generar ruido por post.
 */
export function getValidSecuenciasByIds(
    userId: string | null | undefined,
    ids: number[] | null | undefined,
): { cacheadas: Secuencia[]; faltantes: number[] } {
    const unicos = Array.from(new Set((ids || []).filter(id => Number.isInteger(id))));
    if (!userId || unicos.length === 0) return { cacheadas: [], faltantes: unicos };
    const cache = useAppStore.getState().secuenciaCache;
    const cacheadas: Secuencia[] = [];
    const faltantes: number[] = [];
    for (const id of unicos) {
        const entry = Object.values(cache).find(
            e => e
                && e.key.startsWith(`${userId}:`)
                && e.secuenciaId === id
                && e.userId === userId
                && e.key === secuenciaCacheKey(e.userId, e.cursoId, e.secuenciaId)
                && Date.now() < e.expiresAt
                && e.data && typeof e.data === 'object'
                && Number.isInteger(e.data.id)
                && Number.isInteger(e.data.cursoId)
        );
        if (entry) cacheadas.push(entry.data);
        else faltantes.push(id);
    }
    const t = ts();
    if (cacheadas.length > 0) {
        console.log(`[SECUENCIA CACHE] HIT batch userId=${userId} cacheadas=${cacheadas.length} ids=[${cacheadas.map(s => s.id).join(',')}] ts=${t}`);
    }
    if (faltantes.length > 0) {
        console.log(`[SECUENCIA CACHE] MISS batch userId=${userId} faltantes=[${faltantes.join(',')}] ts=${t}`);
    }
    return { cacheadas, faltantes };
}

/**
 * Guarda (o reemplaza) UNA secuencia completa en caché.
 * Si ya existía la entrada → UPDATE (reemplaza HTML + recursos juntos);
 * si no → WRITE. Nunca combina metadata nueva con contenido antiguo.
 */
export function saveSecuencia(
    userId: string | null | undefined,
    sec: Secuencia | null | undefined,
): void {
    if (!userId || !sec || !Number.isInteger(sec.id) || !Number.isInteger(sec.cursoId)) return;
    guardarEntrada(userId, sec, {});
}

/** Guarda a partir de una fila cruda de Supabase (snake_case), mapeándola. */
export function saveRawSecuencia(
    userId: string | null | undefined,
    row: Record<string, unknown> | null | undefined,
): void {
    if (!userId || !row || !Number.isInteger(row.id) || !Number.isInteger(row.curso_id)) return;
    guardarEntrada(userId, mapSecuenciaRow(row), {
        autorId: row.user_id as string | undefined,
        activo: row.activo as boolean | undefined,
        createdAt: row.created_at as string | undefined,
    });
}

function guardarEntrada(
    userId: string,
    sec: Secuencia,
    extra: { autorId?: string; activo?: boolean; createdAt?: string },
): void {
    const key = secuenciaCacheKey(userId, sec.cursoId, sec.id);
    const store = useAppStore.getState();
    const prev = store.secuenciaCache[key];
    const existeAntes = !!prev;
    store.setSecuenciaCache(makeEntry(userId, sec, extra, prev));
    const t = ts();
    if (existeAntes) {
        console.log(`[SECUENCIA CACHE] UPDATE userId=${userId} cursoId=${sec.cursoId} secuenciaId=${sec.id} ts=${t}`);
    } else {
        console.log(`[SECUENCIA CACHE] WRITE userId=${userId} cursoId=${sec.cursoId} secuenciaId=${sec.id} ts=${t}`);
    }
}

/**
 * Escritura en lote desde la carga amplia de Planificación (una sola escritura
 * de Zustand + un único log). Respeta el conjunto activo que devuelve la query.
 */
export function saveSecuencias(
    userId: string | null | undefined,
    secs: Secuencia[] | null | undefined,
): void {
    if (!userId) return;
    const validas = (secs || []).filter(s => s && Number.isInteger(s.id) && Number.isInteger(s.cursoId));
    if (validas.length === 0) return;
    const store = useAppStore.getState();
    store.setSecuenciaCache(prev => {
        const next: Record<string, SecuenciaCacheEntry> = { ...prev };
        for (const sec of validas) {
            const key = secuenciaCacheKey(userId, sec.cursoId, sec.id);
            next[key] = makeEntry(userId, sec, {}, next[key]);
        }
        return next;
    });
    const cursos = Array.from(new Set(validas.map(s => s.cursoId))).join(',');
    console.log(`[SECUENCIA CACHE] WRITE bulk userId=${userId} n=${validas.length} curso(s)=[${cursos}] ts=${ts()}`);
}

/**
 * Invalidación granular: elimina ÚNICAMENTE la secuencia indicada del usuario.
 * Usado por DELETE/desactivación. No invalida otros cursos.
 */
export function removeSecuenciaCached(
    userId: string | null | undefined,
    secuenciaId: number | null | undefined,
): void {
    if (!userId || !secuenciaId) return;
    const store = useAppStore.getState();
    let removed = 0;
    store.setSecuenciaCache(prev => {
        const next: Record<string, SecuenciaCacheEntry> = {};
        let changed = false;
        for (const key of Object.keys(prev)) {
            const e = prev[key];
            if (e && e.userId === userId && e.secuenciaId === secuenciaId) {
                changed = true;
                removed++;
                continue;
            }
            next[key] = e;
        }
        return changed ? next : prev;
    });
    if (removed > 0) {
        console.log(`[SECUENCIA CACHE] INVALIDATE userId=${userId} secuenciaId=${secuenciaId} ts=${ts()}`);
    }
}