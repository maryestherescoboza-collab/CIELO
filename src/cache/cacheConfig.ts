import type { CacheResource } from './cacheKeys';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const DAYS = (d: number) => d * DIA;

export const CACHE_TTL_MS: Record<CacheResource, number> = {
    centro: DAYS(30),        // 1 mes (baja variabilidad)
    perfil: DAYS(14),        // 2 semanas
    plantillas: DAYS(30),    // 1 mes
    cursos: DAYS(7),         // 1 semana
    estudiantes: DAYS(365),  // 1 año (lista de estudiantes por curso)
    secuencias: DAYS(7),     // 1 semana (metadatos)
    actividades: 1 * HORA,   // 1 hora (datos operativos)
    calificaciones: 30 * MINUTO, // 30 minutos (alta frecuencia operativa)
};

/** Umbral de "próxima actualización": se refresca en segundo plano si está dentro de este margen. */
export const CACHE_STALE_MARGIN_MS = 10 * MINUTO;

/** Ventana de frescura en sesión para revalidación SWR de estudiantes por curso (evita re-consultas al cambiar entre módulos). */
export const ESTUDIANTES_SWR_FRESH_MS = 10 * MINUTO;

/** TTL de 90 días para el almacenamiento persistente de datos académicos en IndexedDB. */
export const ACADEMIC_IDB_TTL_MS = DAYS(90);

/** Ventana de frescura en sesión para revalidación SWR de cursos y períodos académicos (evita re-consultas redundantes al cambiar de pestaña o curso). */
export const ACADEMIC_SWR_FRESH_MS = 10 * MINUTO;

export interface CacheResourceConfig {
    key: CacheResource;
    ttlMs: number;
    /** Marcar el dato como obsoleto al modificarlo (invalidación por escritura). */
    invalidateOnWrite: CacheResource[];
}

export const CACHE_CONFIG: CacheResourceConfig[] = [
    {
        key: 'centro',
        ttlMs: CACHE_TTL_MS.centro,
        invalidateOnWrite: ['centro'],
    },
    {
        key: 'perfil',
        ttlMs: CACHE_TTL_MS.perfil,
        invalidateOnWrite: ['perfil', 'cursos'],
    },
    {
        key: 'plantillas',
        ttlMs: CACHE_TTL_MS.plantillas,
        invalidateOnWrite: ['plantillas'],
    },
    {
        key: 'cursos',
        ttlMs: CACHE_TTL_MS.cursos,
        invalidateOnWrite: ['cursos', 'actividades', 'calificaciones'],
    },
    {
        key: 'estudiantes',
        ttlMs: CACHE_TTL_MS.estudiantes,
        invalidateOnWrite: ['estudiantes'],
    },
    {
        key: 'actividades',
        ttlMs: CACHE_TTL_MS.actividades,
        invalidateOnWrite: ['actividades', 'calificaciones'],
    },
    {
        key: 'calificaciones',
        ttlMs: CACHE_TTL_MS.calificaciones,
        invalidateOnWrite: ['calificaciones'],
    },
    {
        key: 'secuencias',
        ttlMs: CACHE_TTL_MS.secuencias,
        invalidateOnWrite: ['secuencias'],
    },
];

export function getCacheConfig(resource: CacheResource): CacheResourceConfig {
    return CACHE_CONFIG.find(c => c.key === resource) || {
        key: resource,
        ttlMs: DAYS(1),
        invalidateOnWrite: [resource],
    };
}
