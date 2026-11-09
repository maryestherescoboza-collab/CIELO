import { supabase } from '../lib/supabase';
import { useAppStore, type EstudianteCacheEntry } from '../store/appStore';
import type { BCScore, Estudiante } from '../types';
import { CACHE_TTL_MS, ESTUDIANTES_SWR_FRESH_MS } from './cacheConfig';

const ESTUDIANTES_TTL_MS = CACHE_TTL_MS.estudiantes;

/**
 * Control en memoria (por sesión del navegador) de qué claves `${userId}:${centroId}:${cursoId}`
 * ya fueron revalidadas contra Supabase y cuándo. Evita re-consultar a Supabase en cada cambio
 * de módulo, período o asignatura dentro de la misma sesión, mientras que el caché persistente
 * (`estudianteCache` en `localStorage`) mantiene los datos disponibles por hasta 365 días.
 */
const sessionVerifiedAt = new Map<string, number>();

/**
 * Mapa de promesas en vuelo para deduplicar solicitudes concurrentes de estudiantes por curso.
 * Clave: `${userId}:${centroId || 'sin-centro'}:${cursoId}`
 */
const inFlightCourseStudentPromises = new Map<string, Promise<Estudiante[] | null>>();

/**
 * Mapa de promesas en vuelo para solicitudes en lote (p. ej. Dashboard e Incidencias).
 */
const inFlightBatchPromises = new Map<string, Promise<void>>();

/**
 * Mapeador canónico de fila cruda de `estudiantes` (Supabase) a entidad de dominio `Estudiante`.
 */
export function mapEstudianteRow(e: any): Estudiante {
    return {
        id: Number(e.id),
        nombre: (e.nombre as string) || '',
        apellido: (e.apellido as string) || '',
        avatarColor: (e.avatar_color as string) || '#059669',
        cursoId: Number(e.curso_id),
        grupoId: e.grupo_id as number,
        userId: e.docente_id as string,
        sharedCourseId: (e.shared_course_id as string) || (e.grupo_id ? `group_${e.grupo_id}` : String(e.curso_id)),
        nivel: (e.nivel as 1 | 2 | 3 | 4) || 1,
        puntaje: (e.puntaje as number) ?? 0,
        bc1: (e.bc1 as BCScore) || { nivel: 1, puntaje: 0 },
        bc2: (e.bc2 as BCScore) || { nivel: 1, puntaje: 0 },
        bc3: (e.bc3 as BCScore) || { nivel: 1, puntaje: 0 },
        bc4: (e.bc4 as BCScore) || { nivel: 1, puntaje: 0 },
        actividadesRecientes: (e.actividades_recientes as number) ?? 0,
        enRiesgo: Boolean(e.en_riesgo),
        numeroLista: e.numero_lista as number,
        observacion: (e.observacion as string) || undefined,
    };
}

/**
 * Ordena y deduplica por `id` (filtrando IDs <= 0 que son placeholders visuales).
 */
export function normalizeCourseStudents(list: Estudiante[]): Estudiante[] {
    const byId = new Map<number, Estudiante>();
    for (const est of list) {
        if (!est || !(Number(est.id) > 0)) continue;
        byId.set(Number(est.id), est);
    }
    return Array.from(byId.values()).sort((a, b) => {
        const numA = a.numeroLista ?? 0;
        const numB = b.numeroLista ?? 0;
        if (numA !== numB) return numA - numB;
        return a.id - b.id;
    });
}

/**
 * Huella determinista para detectar si hubo cambios reales entre la lista en caché
 * y la lista recién descargada de Supabase.
 */
export function studentsFingerprint(list: Estudiante[]): string {
    const sorted = normalizeCourseStudents(list);
    return sorted
        .map(e =>
            `${e.id}|${e.cursoId}|${e.numeroLista ?? ''}|${e.nombre}|${e.apellido}|${e.sharedCourseId ?? ''}|${e.grupoId ?? ''}|${e.observacion ?? ''}|${e.enRiesgo ? 1 : 0}|${e.puntaje ?? 0}`
        )
        .join(';;');
}

/**
 * Clave compuesta que aísla la caché de estudiantes por usuario autenticado,
 * centro educativo y curso físico (`cursoId`).
 * Nota: Un curso con varias asignaturas comparte el mismo `cursoId` físico,
 * por lo que la lista de estudiantes nunca se duplica por asignatura ni por período.
 */
export function estudianteCacheKey(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined
): string {
    return `${userId || 'sin-usuario'}:${centroId || 'sin-centro'}:${cursoId ?? 'sin-curso'}`;
}

/**
 * Resuelve el `centroId` asociado a un `cursoId` (o del perfil activo como respaldo).
 */
export function resolveCentroIdForCurso(cursoId: number, fallbackCentroId?: string | null): string | null {
    const storeState = useAppStore.getState().state;
    const curso = storeState.cursos.find(c => Number(c.id) === Number(cursoId));
    if (curso?.centroId) return curso.centroId;
    if (fallbackCentroId) return fallbackCentroId;
    const sessionUserId = useAppStore.getState().session?.user?.id;
    if (sessionUserId) {
        const prof = storeState.perfiles.find(p => p.userId === sessionUserId);
        if (prof?.centro_id) return prof.centro_id;
    }
    return storeState.centroRolActual?.centro_id ?? null;
}

function makeEntry(
    userId: string,
    centroId: string | null | undefined,
    cursoId: number,
    data: Estudiante[],
    preserveCachedAt?: number
): EstudianteCacheEntry {
    const nowMs = Date.now();
    const normalized = normalizeCourseStudents(data);
    return {
        key: estudianteCacheKey(userId, centroId, cursoId),
        userId,
        centroId: centroId || undefined,
        cursoId: Number(cursoId),
        data: normalized,
        cachedAt: preserveCachedAt ?? nowMs,
        updatedAt: nowMs,
        expiresAt: nowMs + ESTUDIANTES_TTL_MS,
    };
}

/**
 * Obtiene la entrada válida del caché persistente de estudiantes para un curso físico.
 * Devuelve `null` si no existe, no coincide con el contexto o superó el TTL de 365 días.
 */
export function getValidEstudianteCacheEntry(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined
): EstudianteCacheEntry | null {
    if (!userId || !cursoId) return null;
    const cId = Number(cursoId);
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cId);
    const key = estudianteCacheKey(userId, resolvedCentro, cId);
    const cache = useAppStore.getState().estudianteCache;
    let entry = cache[key];

    // Respaldo seguro dentro del mismo usuario+curso si aún no se conocía centroId al guardar
    // pero solo cuando no contradice un centroId explícito diferente.
    if (!entry && !resolvedCentro) {
        const prefix = `${userId}:`;
        const suffix = `:${cId}`;
        for (const k of Object.keys(cache)) {
            if (k.startsWith(prefix) && k.endsWith(suffix)) {
                entry = cache[k];
                break;
            }
        }
    }

    if (!entry) return null;
    if (entry.userId !== userId || Number(entry.cursoId) !== cId) return null;
    if (resolvedCentro && entry.centroId && entry.centroId !== resolvedCentro) return null;
    if (Date.now() >= entry.expiresAt) return null;
    if (!Array.isArray(entry.data)) return null;
    return entry;
}

export function getValidEstudianteCache(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined
): Estudiante[] | null {
    const entry = getValidEstudianteCacheEntry(userId, centroId, cursoId);
    return entry ? entry.data : null;
}

export function hasValidEstudianteCache(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined
): boolean {
    return getValidEstudianteCacheEntry(userId, centroId, cursoId) !== null;
}

/**
 * ¿El curso ya fue verificado contra Supabase recientemente en la sesión actual?
 */
export function isCourseStudentsFreshInSession(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined
): boolean {
    if (!userId || !cursoId) return false;
    const cId = Number(cursoId);
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cId);
    const key = estudianteCacheKey(userId, resolvedCentro, cId);
    const verifiedAt = sessionVerifiedAt.get(key);
    if (!verifiedAt) return false;
    return Date.now() - verifiedAt < ESTUDIANTES_SWR_FRESH_MS;
}

export function markCourseStudentsVerifiedInSession(
    userId: string,
    centroId: string | null | undefined,
    cursoId: number
): void {
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cursoId);
    const key = estudianteCacheKey(userId, resolvedCentro, Number(cursoId));
    sessionVerifiedAt.set(key, Date.now());
}

/**
 * Guarda o actualiza la lista de estudiantes de un curso en el caché persistente (TTL 365 días).
 * Regla de protección crítica: si `allowEmptyOverwrite` es `false` y el caché ya tenía
 * estudiantes válidos mientras `data` viene vacío, NO sobrescribe con vacío.
 */
export function saveEstudianteCache(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    data: Estudiante[],
    options?: { allowEmptyOverwrite?: boolean; markSessionVerified?: boolean }
): void {
    if (!userId || !cursoId) return;
    const cId = Number(cursoId);
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cId);
    const normalized = normalizeCourseStudents(data);
    const existing = getValidEstudianteCacheEntry(userId, resolvedCentro, cId);

    if (normalized.length === 0 && existing && existing.data.length > 0 && !options?.allowEmptyOverwrite) {
        return;
    }

    const entry = makeEntry(userId, resolvedCentro, cId, normalized, existing?.cachedAt);
    useAppStore.getState().setEstudianteCache(entry);

    if (options?.markSessionVerified !== false) {
        sessionVerifiedAt.set(entry.key, Date.now());
    }
}

/**
 * Sincroniza atómicamente los estudiantes de uno o varios cursos dentro de `state.estudiantes` (Zustand),
 * deduplicando por `estudiante.id` y preservando intactos los estudiantes de los demás cursos.
 */
export function mergeCoursesStudentsIntoStore(
    courseStudentsMap: Map<number, Estudiante[]>,
    options?: { allowEmptyOverwrite?: boolean }
): void {
    if (courseStudentsMap.size === 0) return;

    useAppStore.getState().setAppState(prev => {
        const currentByCourse = new Map<number, Estudiante[]>();
        for (const e of prev.estudiantes) {
            const cId = Number(e.cursoId);
            if (!currentByCourse.has(cId)) currentByCourse.set(cId, []);
            currentByCourse.get(cId)!.push(e);
        }

        let changed = false;
        const targetCourseIds = new Set<number>();

        for (const [rawCursoId, incomingList] of courseStudentsMap.entries()) {
            const cId = Number(rawCursoId);
            const normalizedIncoming = normalizeCourseStudents(incomingList);
            const existingForCourse = currentByCourse.get(cId) || [];

            // Protección contra vaciado accidental: si no se permite sobrescribir con vacío y ya había datos, conservarlos
            if (normalizedIncoming.length === 0 && existingForCourse.length > 0 && !options?.allowEmptyOverwrite) {
                continue;
            }

            if (studentsFingerprint(existingForCourse) !== studentsFingerprint(normalizedIncoming)) {
                changed = true;
                targetCourseIds.add(cId);
                currentByCourse.set(cId, normalizedIncoming);
            }
        }

        if (!changed) return prev;

        // Reconstruir lista global deduplicada por estudiante.id
        const finalById = new Map<number, Estudiante>();
        for (const e of prev.estudiantes) {
            if (!targetCourseIds.has(Number(e.cursoId)) && Number(e.id) > 0) {
                finalById.set(Number(e.id), e);
            }
        }
        for (const cId of targetCourseIds) {
            const list = currentByCourse.get(cId) || [];
            for (const e of list) {
                if (Number(e.id) > 0) {
                    finalById.set(Number(e.id), e);
                }
            }
        }

        return {
            ...prev,
            estudiantes: Array.from(finalById.values()),
        };
    });
}

/**
 * Hidrata inmediatamente en `state.estudiantes` todos los estudiantes en caché persistente
 * pertenecientes a la lista de cursos físicos (`cursoIds`) del usuario y centro actuales.
 * Devuelve la lista de `cursoId` que tuvieron HIT válido en caché.
 */
export function hydrateStudentsFromCacheForCourses(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoIds: number[]
): { hydratedCourseIds: number[]; missingCourseIds: number[]; staleCourseIds: number[] } {
    if (!userId || !Array.isArray(cursoIds) || cursoIds.length === 0) {
        return { hydratedCourseIds: [], missingCourseIds: [], staleCourseIds: [] };
    }

    const uniqueCursoIds = Array.from(new Set(cursoIds.map(id => Number(id)).filter(id => id > 0)));
    const hydratedCourseIds: number[] = [];
    const missingCourseIds: number[] = [];
    const staleCourseIds: number[] = [];
    const mapToMerge = new Map<number, Estudiante[]>();

    for (const cId of uniqueCursoIds) {
        const cCentro = centroId ?? resolveCentroIdForCurso(cId);
        const cached = getValidEstudianteCache(userId, cCentro, cId);
        if (cached !== null) {
            hydratedCourseIds.push(cId);
            mapToMerge.set(cId, cached);
            if (!isCourseStudentsFreshInSession(userId, cCentro, cId)) {
                staleCourseIds.push(cId);
            }
        } else {
            missingCourseIds.push(cId);
        }
    }

    if (mapToMerge.size > 0) {
        mergeCoursesStudentsIntoStore(mapToMerge, { allowEmptyOverwrite: false });
    }

    return { hydratedCourseIds, missingCourseIds, staleCourseIds };
}

/**
 * Write-through selectivo de un curso específico a partir del estado actual en memoria (`state.estudiantes`).
 * Se invoca tras matricular, editar, retirar o reordenar estudiantes de un curso.
 * Actualiza ÚNICAMENTE la entrada de caché de ese `cursoId` sin invalidar otros cursos.
 */
export function syncCourseStudentsCacheFromStore(
    cursoId: number,
    options?: { allowEmptyOverwrite?: boolean }
): void {
    const store = useAppStore.getState();
    const userId = store.session?.user?.id;
    if (!userId || !cursoId) return;
    const cId = Number(cursoId);
    const centroId = resolveCentroIdForCurso(cId);
    const courseStudents = store.state.estudiantes.filter(
        e => Number(e.cursoId) === cId && Number(e.id) > 0
    );
    saveEstudianteCache(userId, centroId, cId, courseStudents, {
        allowEmptyOverwrite: options?.allowEmptyOverwrite ?? (courseStudents.length === 0),
        markSessionVerified: true,
    });
}

/**
 * Invalida selectivamente el caché de estudiantes de un curso específico (o de todos los cursos
 * de un usuario si no se pasa `cursoId`, p. ej. al eliminar un curso).
 * Por defecto solo fuerza que la próxima lectura revalide en segundo plano sin borrar los últimos
 * datos válidos (salvo que `hardDelete` sea true).
 */
export function invalidateCursoEstudianteCache(
    userId: string | null | undefined,
    cursoId?: number | null,
    options?: { centroId?: string | null; hardDelete?: boolean }
): void {
    if (!userId) return;
    const cId = cursoId != null ? Number(cursoId) : undefined;
    const resolvedCentro = cId ? (options?.centroId ?? resolveCentroIdForCurso(cId)) : options?.centroId;

    // 1. Marcar como no verificado en la sesión actual para forzar revalidación en segundo plano
    for (const k of Array.from(sessionVerifiedAt.keys())) {
        if (cId !== undefined) {
            if (k.startsWith(`${userId}:`) && k.endsWith(`:${cId}`)) {
                sessionVerifiedAt.delete(k);
            }
        } else if (k.startsWith(`${userId}:`)) {
            sessionVerifiedAt.delete(k);
        }
    }

    // 2. Si se pide borrado duro (p. ej. al desvincularse de un curso), remover la entrada del store
    if (options?.hardDelete) {
        useAppStore.getState().setEstudianteCache(prev => {
            const next: Record<string, EstudianteCacheEntry> = {};
            for (const key of Object.keys(prev)) {
                const entry = prev[key];
                const matchesUser = entry?.userId === userId || key.startsWith(`${userId}:`);
                const matchesCourse = cId === undefined || Number(entry?.cursoId) === cId || key.endsWith(`:${cId}`);
                const matchesCentro = !resolvedCentro || !entry?.centroId || entry.centroId === resolvedCentro;
                if (!(matchesUser && matchesCourse && matchesCentro)) {
                    next[key] = entry;
                }
            }
            return next;
        });
    }
}

/**
 * Consulta a Supabase los estudiantes de UN curso físico con deduplicación de promesas en vuelo,
 * actualiza `estudianteCache` y `state.estudiantes` solo si hay cambios reales, y protege
 * los datos existentes ante cualquier error de conexión o lentitud.
 */
export async function fetchAndSyncCourseStudents(
    userId: string,
    centroId: string | null | undefined,
    cursoId: number,
    options?: { forceNetwork?: boolean }
): Promise<Estudiante[] | null> {
    if (!userId || !cursoId) return null;
    const cId = Number(cursoId);
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cId);
    const key = estudianteCacheKey(userId, resolvedCentro, cId);

    // Si ya hay una petición en vuelo para este mismo curso, reutilizarla (evita duplicación concurrente)
    const existingPromise = inFlightCourseStudentPromises.get(key);
    if (existingPromise) {
        return existingPromise;
    }

    // Si no se fuerza red y ya está fresco en esta sesión y tiene caché válido, devolver caché inmediatamente
    const cached = getValidEstudianteCache(userId, resolvedCentro, cId);
    if (!options?.forceNetwork && cached !== null && isCourseStudentsFreshInSession(userId, resolvedCentro, cId)) {
        mergeCoursesStudentsIntoStore(new Map([[cId, cached]]), { allowEmptyOverwrite: false });
        return cached;
    }

    const promise = (async (): Promise<Estudiante[] | null> => {
        try {
            const { data, error } = await supabase
                .from('estudiantes')
                .select('*')
                .eq('activo', true)
                .eq('curso_id', cId);

            if (error || !Array.isArray(data)) {
                console.warn(
                    `[EstudianteCache] Error o respuesta inválida al consultar estudiantes del curso ${cId}; conservando caché local.`,
                    error
                );
                // Conservar últimos datos válidos disponibles
                return getValidEstudianteCache(userId, resolvedCentro, cId);
            }

            const mapped = normalizeCourseStudents(data.map(mapEstudianteRow));
            const previousCached = getValidEstudianteCache(userId, resolvedCentro, cId);

            // Actualizar caché persistente (365 días) y marcar como verificado en la sesión actual
            saveEstudianteCache(userId, resolvedCentro, cId, mapped, {
                allowEmptyOverwrite: true,
                markSessionVerified: true,
            });

            // Sincronizar con Zustand solo si no había caché previa o si hubo cambios
            if (!previousCached || studentsFingerprint(previousCached) !== studentsFingerprint(mapped)) {
                mergeCoursesStudentsIntoStore(new Map([[cId, mapped]]), { allowEmptyOverwrite: true });
            } else {
                // Asegurar que el store en memoria tenga los estudiantes aunque el caché no haya cambiado
                const inStore = useAppStore.getState().state.estudiantes.filter(e => Number(e.cursoId) === cId);
                if (studentsFingerprint(inStore) !== studentsFingerprint(mapped)) {
                    mergeCoursesStudentsIntoStore(new Map([[cId, mapped]]), { allowEmptyOverwrite: true });
                }
            }

            return mapped;
        } catch (err) {
            console.warn(
                `[EstudianteCache] Excepción de red al consultar estudiantes del curso ${cId}; conservando datos en caché.`,
                err
            );
            return getValidEstudianteCache(userId, resolvedCentro, cId);
        } finally {
            inFlightCourseStudentPromises.delete(key);
        }
    })();

    inFlightCourseStudentPromises.set(key, promise);
    return promise;
}

/**
 * Estrategia Stale-While-Revalidate (SWR) para un curso físico (`cursoId`):
 * 1. Si existe caché persistente válido, hidrata inmediatamente `state.estudiantes` (0ms espera)
 *    y lanza revalidación en segundo plano SOLO si el curso no fue verificado recientemente en la sesión.
 * 2. Si NO existe caché para ese curso, espera la consulta a Supabase (deduplicada).
 */
export async function ensureCourseStudentsSWR(
    userId: string,
    centroId: string | null | undefined,
    cursoId: number,
    options?: { forceBackgroundRevalidate?: boolean }
): Promise<{ fromCache: boolean; students: Estudiante[] }> {
    const cId = Number(cursoId);
    const resolvedCentro = centroId ?? resolveCentroIdForCurso(cId);
    const cached = getValidEstudianteCache(userId, resolvedCentro, cId);

    if (cached !== null) {
        // 1. Hidratar inmediatamente el estado en memoria si aún no están presentes
        const currentInStore = useAppStore.getState().state.estudiantes.filter(e => Number(e.cursoId) === cId);
        if (studentsFingerprint(currentInStore) !== studentsFingerprint(cached)) {
            mergeCoursesStudentsIntoStore(new Map([[cId, cached]]), { allowEmptyOverwrite: false });
        }

        // 2. Revalidar en segundo plano (sin bloquear la UI) si corresponde
        const needsRevalidation =
            options?.forceBackgroundRevalidate || !isCourseStudentsFreshInSession(userId, resolvedCentro, cId);
        if (needsRevalidation) {
            void fetchAndSyncCourseStudents(userId, resolvedCentro, cId, { forceNetwork: true });
        }

        return { fromCache: true, students: cached };
    }

    // Cache MISS: consultar Supabase y poblar caché + store
    const fetched = await fetchAndSyncCourseStudents(userId, resolvedCentro, cId, { forceNetwork: true });
    const fallbackInStore = useAppStore.getState().state.estudiantes.filter(e => Number(e.cursoId) === cId);
    return {
        fromCache: false,
        students: fetched ?? fallbackInStore,
    };
}

/**
 * Estrategia Stale-While-Revalidate (SWR) en lote para múltiples cursos físicos (`cursoIds`),
 * usada por Dashboard, Incidencias y la carga inicial:
 * 1. Deduplica `cursoIds` físicos (un curso con múltiples asignaturas solo se procesa una vez).
 * 2. Hidrata inmediatamente en `state.estudiantes` todos los cursos que tengan caché válido.
 * 3. Para los cursos SIN caché (`missingCourseIds`), realiza una consulta única `.in('curso_id', missingCourseIds)`
 *    de forma bloqueante (o no bloqueante si todos estaban en caché).
 * 4. Para los cursos CON caché pero aún no verificados en la sesión (`staleCourseIds`),
 *    ejecuta una revalidación silenciosa en segundo plano y actualiza solo los cursos con diferencias.
 * 5. En caso de fallo de red en cualquiera de las consultas, NUNCA vacía ni sobrescribe los estudiantes
 *    ya presentes en caché o en `state.estudiantes`.
 */
export async function ensureMultipleCoursesStudentsSWR(
    userId: string,
    centroId: string | null | undefined,
    cursoIds: number[],
    options?: { forceBackgroundRevalidateAll?: boolean }
): Promise<void> {
    if (!userId || !Array.isArray(cursoIds) || cursoIds.length === 0) return;

    const uniqueCursoIds = Array.from(new Set(cursoIds.map(id => Number(id)).filter(id => id > 0))).sort((a, b) => a - b);
    if (uniqueCursoIds.length === 0) return;

    // 1. Hidratar inmediatamente desde caché persistente
    const { missingCourseIds, staleCourseIds } = hydrateStudentsFromCacheForCourses(
        userId,
        centroId,
        uniqueCursoIds
    );

    const fetchBatchFromSupabase = async (targetIds: number[], isBackground: boolean) => {
        if (targetIds.length === 0) return;
        const batchKey = `${userId}:${centroId || 'sin-centro'}:${targetIds.join(',')}`;
        const existingBatch = inFlightBatchPromises.get(batchKey);
        if (existingBatch) {
            if (!isBackground) await existingBatch;
            return;
        }

        const batchPromise = (async () => {
            try {
                const { data, error } = await supabase
                    .from('estudiantes')
                    .select('*')
                    .eq('activo', true)
                    .in('curso_id', targetIds);

                if (error || !Array.isArray(data)) {
                    console.warn(
                        `[EstudianteCache] Error al consultar lote de estudiantes para cursos [${targetIds.join(',')}]; conservando datos en caché.`,
                        error
                    );
                    return;
                }

                // Agrupar resultados por cursoId físico
                const grouped = new Map<number, Estudiante[]>();
                for (const cId of targetIds) {
                    grouped.set(cId, []);
                }
                for (const row of data) {
                    const mapped = mapEstudianteRow(row);
                    const cId = Number(mapped.cursoId);
                    if (!grouped.has(cId)) grouped.set(cId, []);
                    grouped.get(cId)!.push(mapped);
                }

                const changedMap = new Map<number, Estudiante[]>();
                for (const cId of targetIds) {
                    const list = normalizeCourseStudents(grouped.get(cId) || []);
                    const cCentro = centroId ?? resolveCentroIdForCurso(cId);
                    const prevCached = getValidEstudianteCache(userId, cCentro, cId);

                    saveEstudianteCache(userId, cCentro, cId, list, {
                        allowEmptyOverwrite: true,
                        markSessionVerified: true,
                    });

                    const inStore = useAppStore.getState().state.estudiantes.filter(e => Number(e.cursoId) === cId);
                    if (
                        !prevCached ||
                        studentsFingerprint(prevCached) !== studentsFingerprint(list) ||
                        studentsFingerprint(inStore) !== studentsFingerprint(list)
                    ) {
                        changedMap.set(cId, list);
                    }
                }

                if (changedMap.size > 0) {
                    mergeCoursesStudentsIntoStore(changedMap, { allowEmptyOverwrite: true });
                }
            } catch (err) {
                console.warn(
                    `[EstudianteCache] Excepción de red en consulta por lote [${targetIds.join(',')}]; conservando caché local.`,
                    err
                );
            } finally {
                inFlightBatchPromises.delete(batchKey);
            }
        })();

        inFlightBatchPromises.set(batchKey, batchPromise);
        if (!isBackground) {
            await batchPromise;
        }
    };

    // 2. Si faltan cursos que no estaban en caché, consultarlos ahora
    if (missingCourseIds.length > 0) {
        await fetchBatchFromSupabase(missingCourseIds, false);
    }

    // 3. Para los cursos que sí estaban en caché pero requieren verificación en segundo plano,
    // revalidarlos sin bloquear la interfaz
    const coursesToRevalidate = options?.forceBackgroundRevalidateAll
        ? uniqueCursoIds.filter(id => !missingCourseIds.includes(id))
        : staleCourseIds;

    if (coursesToRevalidate.length > 0) {
        void fetchBatchFromSupabase(coursesToRevalidate, true);
    }
}

export { ESTUDIANTES_TTL_MS };

