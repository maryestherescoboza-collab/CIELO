import type { CacheResource } from './cacheKeys';

const SEGUNDO = 1000;
const MINUTO = 60 * SEGUNDO;
const HORA = 60 * MINUTO;
const DIA = 24 * HORA;

const DAYS = (d: number) => d * DIA;

export const CACHE_TTL_MS: Record<CacheResource, number> = {
    centro: DAYS(90),        // 3 meses
    perfil: DAYS(90),        // 3 meses
    plantillas: DAYS(180),   // 6 meses
    cursos: DAYS(14),        // 2 semanas
    actividades: DAYS(120),  // 4 meses
    calificaciones: DAYS(30),// 1 mes
    secuencias: DAYS(30),    // 1 mes
};

/** Umbral de "próxima actualización": se refresca en segundo plano si está dentro de este margen. */
export const CACHE_STALE_MARGIN_MS = DAYS(1);

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
