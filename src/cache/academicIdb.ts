import type { Actividad, CalificacionActividad, RecuperacionBC, CursoDetalleEvaluacion, RecuperacionCotejo } from '../types';
import { normalizeArea } from '../utils/academic';
import { ACADEMIC_IDB_TTL_MS } from './cacheConfig';

export interface AcademicSliceData {
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
    recuperaciones?: RecuperacionBC[];
    cursoDetalle?: CursoDetalleEvaluacion[];
    recuperacionesCotejo?: RecuperacionCotejo[];
}

export interface AcademicIdbEntry {
    key: string;
    userId: string;
    centroId: string;
    cursoId: number;
    asignatura: string;
    periodo: string;
    data: AcademicSliceData;
    cachedAt: number;
    updatedAt: number;
    expiresAt: number;
    syncFingerprint?: string;
}

export interface AcademicSyncMeta {
    key: string;
    userId: string;
    cursoId: number;
    periodo: string;
    lastSyncedAt: number;
    fingerprint?: string;
}

const DB_NAME = 'cielo_academic_v1';
const DB_VERSION = 1;
const STORE_SLICES = 'academic_slices';
const STORE_META = 'academic_sync_meta';

let dbInstance: IDBDatabase | null = null;
let dbPromise: Promise<IDBDatabase | null> | null = null;

/**
 * Genera la clave compuesta para IndexedDB:
 * `${userId}:${centroId || 'sin-centro'}:${cursoId}:${normalizeArea(asignatura)}:${periodo}`
 */
export function academicIdbKey(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignatura: string | null | undefined,
    periodo: string | null | undefined,
): string {
    const normAsig = normalizeArea(asignatura) || 'general';
    return `${userId || 'sin-usuario'}:${centroId || 'sin-centro'}:${cursoId ?? 'sin-curso'}:${normAsig}:${periodo || 'sin-periodo'}`;
}

/**
 * Calcula una huella determinista de la slice para detectar cambios entre sincronizaciones.
 */
export function computeAcademicSliceFingerprint(data: AcademicSliceData): string {
    const acts = (data.actividades || []).map(a => `${a.id}:${a.nombre}:${a.periodo}:${a.asignatura}:${a.fecha}`).sort().join(';');
    const cals = (data.calificaciones || []).map(c => `${c.estudianteId}_${c.actividadId}:${c.puntaje ?? ''}:${c.recuperacion ?? ''}`).sort().join(';');
    const recs = (data.recuperaciones || []).map(r => `${r.estudianteId}_${r.bc}_${r.periodo}:${r.puntaje ?? ''}`).sort().join(';');
    return `${acts}##${cals}##${recs}`;
}

/**
 * Abre o reutiliza la conexión singleton a IndexedDB.
 */
export function openAcademicDB(): Promise<IDBDatabase | null> {
    if (typeof window === 'undefined' || !window.indexedDB) {
        return Promise.resolve(null);
    }
    if (dbInstance) {
        return Promise.resolve(dbInstance);
    }
    if (dbPromise) {
        return dbPromise;
    }

    dbPromise = new Promise((resolve) => {
        try {
            const req = window.indexedDB.open(DB_NAME, DB_VERSION);

            req.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                if (!db.objectStoreNames.contains(STORE_SLICES)) {
                    const store = db.createObjectStore(STORE_SLICES, { keyPath: 'key' });
                    store.createIndex('by_user', 'userId', { unique: false });
                    store.createIndex('by_curso', 'cursoId', { unique: false });
                    store.createIndex('by_user_curso', ['userId', 'cursoId'], { unique: false });
                    store.createIndex('by_user_curso_asig', ['userId', 'cursoId', 'asignatura'], { unique: false });
                    store.createIndex('by_expires', 'expiresAt', { unique: false });
                }
                if (!db.objectStoreNames.contains(STORE_META)) {
                    const metaStore = db.createObjectStore(STORE_META, { keyPath: 'key' });
                    metaStore.createIndex('by_user_curso', ['userId', 'cursoId'], { unique: false });
                }
            };

            req.onsuccess = () => {
                dbInstance = req.result;
                dbInstance.onversionchange = () => {
                    dbInstance?.close();
                    dbInstance = null;
                    dbPromise = null;
                };
                resolve(dbInstance);
            };

            req.onerror = () => {
                console.warn('[IDB] No se pudo abrir la base de datos académica cielo_academic_v1:', req.error);
                dbInstance = null;
                dbPromise = null;
                resolve(null);
            };
        } catch (e) {
            console.warn('[IDB] Excepción al abrir IndexedDB:', e);
            dbInstance = null;
            dbPromise = null;
            resolve(null);
        }
    });

    return dbPromise;
}

/**
 * Recupera una slice académica específica desde IndexedDB.
 * Retorna null si no existe, si no coincide el usuario o si los datos están corruptos.
 */
export async function getIdbAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignatura: string | null | undefined,
    periodo: string | null | undefined,
): Promise<AcademicSliceData | null> {
    if (!userId || !cursoId) return null;
    const db = await openAcademicDB();
    if (!db) return null;

    const key = academicIdbKey(userId, centroId, cursoId, asignatura, periodo);
    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_SLICES, 'readonly');
            const store = tx.objectStore(STORE_SLICES);
            const req = store.get(key);

            req.onsuccess = () => {
                const entry = req.result as AcademicIdbEntry | undefined;
                if (!entry) {
                    resolve(null);
                    return;
                }
                // Verificación de aislamiento estricto
                if (entry.userId !== userId || entry.cursoId !== cursoId) {
                    resolve(null);
                    return;
                }
                // Los datos en IndexedDB NUNCA se borran ni se descartan automáticamente.
                // Siempre se entregan para garantizar disponibilidad permanente sin riesgo de pérdida.
                if (!entry.data || !Array.isArray(entry.data.actividades) || !Array.isArray(entry.data.calificaciones)) {
                    resolve(null);
                    return;
                }
                resolve(entry.data);
            };

            req.onerror = () => {
                resolve(null);
            };
        } catch (e) {
            console.warn('[IDB] Error al leer slice de IndexedDB:', e);
            resolve(null);
        }
    });
}

/**
 * Guarda o actualiza una slice académica completa en IndexedDB con TTL de 90 días.
 */
export async function saveIdbAcademicSlice(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
    asignatura: string | null | undefined,
    periodo: string | null | undefined,
    data: AcademicSliceData,
): Promise<void> {
    if (!userId || !cursoId) return;
    const db = await openAcademicDB();
    if (!db) return;

    const normAsig = normalizeArea(asignatura) || 'general';
    const normPeriodo = periodo || 'sin-periodo';
    const key = academicIdbKey(userId, centroId, cursoId, normAsig, normPeriodo);
    const now = Date.now();

    const entry: AcademicIdbEntry = {
        key,
        userId,
        centroId: centroId || 'sin-centro',
        cursoId,
        asignatura: normAsig,
        periodo: normPeriodo,
        data: {
            actividades: data.actividades || [],
            calificaciones: data.calificaciones || [],
            recuperaciones: data.recuperaciones || [],
            cursoDetalle: data.cursoDetalle || [],
            recuperacionesCotejo: data.recuperacionesCotejo || [],
        },
        cachedAt: now,
        updatedAt: now,
        expiresAt: now + ACADEMIC_IDB_TTL_MS,
        syncFingerprint: computeAcademicSliceFingerprint(data),
    };

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_SLICES, 'readwrite');
            const store = tx.objectStore(STORE_SLICES);
            store.put(entry);
            tx.oncomplete = () => resolve();
            tx.onerror = () => {
                console.warn('[IDB] Error guardando slice en IndexedDB:', tx.error);
                resolve();
            };
        } catch (e) {
            console.warn('[IDB] Excepción al guardar slice en IndexedDB:', e);
            resolve();
        }
    });
}

/**
 * Recupera todas las slices cacheadas en IndexedDB para un curso físico específico.
 * Permite rehidratar todas las asignaturas y períodos del curso de una sola vez.
 */
export async function getAllIdbAcademicSlicesForCourse(
    userId: string | null | undefined,
    centroId: string | null | undefined,
    cursoId: number | null | undefined,
): Promise<AcademicIdbEntry[]> {
    if (!userId || !cursoId) return [];
    const db = await openAcademicDB();
    if (!db) return [];

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_SLICES, 'readonly');
            const store = tx.objectStore(STORE_SLICES);
            const index = store.index('by_user_curso');
            const req = index.getAll([userId, cursoId]);

            req.onsuccess = () => {
                const results = (req.result || []) as AcademicIdbEntry[];
                // Filtrar entradas válidas y no corruptas
                const valid = results.filter(entry =>
                    entry.userId === userId &&
                    (!centroId || entry.centroId === centroId) &&
                    entry.cursoId === cursoId &&
                    entry.data &&
                    Array.isArray(entry.data.actividades) &&
                    Array.isArray(entry.data.calificaciones)
                );
                resolve(valid);
            };

            req.onerror = () => resolve([]);
        } catch (e) {
            console.warn('[IDB] Error al obtener slices del curso:', e);
            resolve([]);
        }
    });
}

/**
 * Write-through selectivo a IndexedDB para mutaciones locales o eventos Realtime.
 */
export async function upsertIdbAcademicRow(
    tipo: 'actividades' | 'calificaciones' | 'recuperaciones' | 'cursoDetalle' | 'recuperacionesCotejo',
    row: any,
    cursoId: number,
    asignatura: string | null | undefined,
    periodo: string | null | undefined,
    userId: string,
    centroId: string | null | undefined,
    removed = false,
): Promise<void> {
    if (!userId || !cursoId) return;
    const db = await openAcademicDB();
    if (!db) return;

    const normAsig = normalizeArea(asignatura || row.asignatura) || 'general';
    const normPeriodo = periodo || row.periodo || 'sin-periodo';
    const key = academicIdbKey(userId, centroId, cursoId, normAsig, normPeriodo);

    return new Promise((resolve) => {
        try {
            const tx = db.transaction(STORE_SLICES, 'readwrite');
            const store = tx.objectStore(STORE_SLICES);
            const req = store.get(key);

            req.onsuccess = () => {
                const entry = req.result as AcademicIdbEntry | undefined;
                if (!entry && removed) {
                    resolve();
                    return;
                }

                const now = Date.now();
                const existingData: AcademicSliceData = entry?.data || {
                    actividades: [],
                    calificaciones: [],
                    recuperaciones: [],
                    cursoDetalle: [],
                    recuperacionesCotejo: [],
                };

                const data: AcademicSliceData = {
                    actividades: [...(existingData.actividades || [])],
                    calificaciones: [...(existingData.calificaciones || [])],
                    recuperaciones: [...(existingData.recuperaciones || [])],
                    cursoDetalle: [...(existingData.cursoDetalle || [])],
                    recuperacionesCotejo: [...(existingData.recuperacionesCotejo || [])],
                };

                if (tipo === 'actividades') {
                    const act = row as Actividad;
                    data.actividades = data.actividades.filter(a => a.id !== act.id);
                    if (!removed) {
                        data.actividades.push(act);
                    }
                } else if (tipo === 'calificaciones') {
                    const cal = row as CalificacionActividad;
                    data.calificaciones = data.calificaciones.filter(
                        c => !(c.estudianteId === cal.estudianteId && c.actividadId === cal.actividadId)
                    );
                    if (!removed) {
                        data.calificaciones.push(cal);
                    }
                } else if (tipo === 'recuperaciones') {
                    const rec = row as RecuperacionBC;
                    data.recuperaciones = (data.recuperaciones || []).filter(
                        r => !(r.estudianteId === rec.estudianteId && r.bc === rec.bc && r.periodo === rec.periodo && r.asignatura === rec.asignatura)
                    );
                    if (!removed) {
                        data.recuperaciones.push(rec);
                    }
                } else if (tipo === 'cursoDetalle') {
                    const cd = row as CursoDetalleEvaluacion;
                    data.cursoDetalle = (data.cursoDetalle || []).filter(
                        d => !(d.estudianteId === cd.estudianteId && d.actividadId === cd.actividadId)
                    );
                    if (!removed) {
                        data.cursoDetalle.push(cd);
                    }
                } else if (tipo === 'recuperacionesCotejo') {
                    const rc = row as RecuperacionCotejo;
                    data.recuperacionesCotejo = (data.recuperacionesCotejo || []).filter(
                        r => !(r.estudianteId === rc.estudianteId && r.actividadId === rc.actividadId && r.indicador === rc.indicador)
                    );
                    if (!removed) {
                        data.recuperacionesCotejo.push(rc);
                    }
                }

                const updatedEntry: AcademicIdbEntry = {
                    key,
                    userId,
                    centroId: centroId || entry?.centroId || 'sin-centro',
                    cursoId,
                    asignatura: normAsig,
                    periodo: normPeriodo,
                    data,
                    cachedAt: entry?.cachedAt || now,
                    updatedAt: now,
                    expiresAt: (entry?.cachedAt || now) + ACADEMIC_IDB_TTL_MS,
                    syncFingerprint: computeAcademicSliceFingerprint(data),
                };

                store.put(updatedEntry);
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch (e) {
            console.warn('[IDB] Error en upsertIdbAcademicRow:', e);
            resolve();
        }
    });
}

/**
 * Elimina las slices académicas asociadas a un usuario en IndexedDB.
 * Si se pasa cursoId, solo las de ese curso (invalidación selectiva).
 */
export async function clearIdbAcademicCacheByUser(userId: string | null | undefined, cursoId?: number): Promise<void> {
    if (!userId) return;
    const db = await openAcademicDB();
    if (!db) return;

    return new Promise((resolve) => {
        try {
            const tx = db.transaction([STORE_SLICES, STORE_META], 'readwrite');
            const store = tx.objectStore(STORE_SLICES);
            const index = store.index('by_user');
            const req = index.openCursor(IDBKeyRange.only(userId));

            req.onsuccess = (event) => {
                const cursor = (event.target as IDBRequest).result as IDBCursorWithValue | null;
                if (cursor) {
                    const entry = cursor.value as AcademicIdbEntry;
                    if (cursoId === undefined || entry.cursoId === cursoId) {
                        cursor.delete();
                    }
                    cursor.continue();
                }
            };

            tx.oncomplete = () => resolve();
            tx.onerror = () => resolve();
        } catch (e) {
            console.warn('[IDB] Error limpiando caché académica de usuario en IndexedDB:', e);
            resolve();
        }
    });
}

