export type CacheResource =
    | 'centro'
    | 'perfil'
    | 'plantillas'
    | 'cursos'
    | 'actividades'
    | 'calificaciones'
    | 'secuencias';

export interface CacheKeyParts {
    resource: CacheResource;
    centroId?: string;
    userId?: string;
    cursoId?: number;
}

const RESOURCE_PREFIX: Record<CacheResource, string> = {
    centro: 'centro',
    perfil: 'perfil',
    plantillas: 'plantillas',
    cursos: 'cursos',
    actividades: 'actividades',
    calificaciones: 'calificaciones',
    secuencias: 'secuencias',
};

/**
 * Clave única y aislada por usuario/centro.
 * Formato: {resource}:{scope…}
 *  - centro:{centroId}
 *  - perfil:{userId}
 *  - curso:{cursoId}:{centroId}
 */
export function cacheKeyFor({ resource, centroId, userId, cursoId }: CacheKeyParts): string {
    const prefix = RESOURCE_PREFIX[resource];

    switch (resource) {
        case 'centro':
            return `${prefix}:${centroId || 'sin-centro'}`;
        case 'perfil':
            return `${prefix}:${userId || 'sin-usuario'}`;
        case 'plantillas':
            return `${prefix}:${centroId || 'sin-centro'}:${userId || 'sin-usuario'}`;
        case 'cursos':
            return `${prefix}:${centroId || 'sin-centro'}`;
        case 'actividades':
            return `${prefix}:${cursoId ?? 'sin-curso'}:${centroId || 'sin-centro'}`;
        case 'calificaciones':
            return `${prefix}:${cursoId ?? 'sin-curso'}:${centroId || 'sin-centro'}`;
        case 'secuencias':
            return `${prefix}:${userId || 'sin-usuario'}:${cursoId ?? 'sin-curso'}`;
    }
}

export function cacheKeyFromString(key: string): CacheKeyParts {
    const [resource, ...rest] = key.split(':');
    const parts: CacheKeyParts = { resource: resource as CacheResource, centroId: undefined, userId: undefined, cursoId: undefined };

    switch (resource) {
        case 'centro':
            parts.centroId = rest[0] !== 'sin-centro' ? rest[0] : undefined;
            break;
        case 'perfil':
            parts.userId = rest[0] !== 'sin-usuario' ? rest[0] : undefined;
            break;
        case 'plantillas':
            parts.centroId = rest[0] !== 'sin-centro' ? rest[0] : undefined;
            parts.userId = rest[1] !== 'sin-usuario' ? rest[1] : undefined;
            break;
        case 'cursos':
            parts.centroId = rest[0] !== 'sin-centro' ? rest[0] : undefined;
            break;
        case 'actividades':
        case 'calificaciones': {
            parts.cursoId = rest[0] !== 'sin-curso' && rest[0] !== undefined ? Number(rest[0]) : undefined;
            parts.centroId = rest[1] !== 'sin-centro' ? rest[1] : undefined;
            break;
        }
        case 'secuencias': {
            parts.userId = rest[0] !== 'sin-usuario' ? rest[0] : undefined;
            parts.cursoId = rest[1] !== 'sin-curso' && rest[1] !== undefined ? Number(rest[1]) : undefined;
            break;
        }
    }

    return parts;
}

export function isResourceKey(key: string, resource: CacheResource): boolean {
    return key.startsWith(RESOURCE_PREFIX[resource] + ':');
}
