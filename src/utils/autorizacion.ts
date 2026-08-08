import type { UserProfile } from '../types';

// ────────────────────────────────────────────────────────────────────────
// AUTORIZACIÓN DE ROLES
// ────────────────────────────────────────────────────────────────────────
// La plataforma distingue DOS niveles de acceso para el entorno:
//   - ADMINISTRATIVO (Centro Panel): cualquier rol administrativo reconocido
//     (administrador, administrador_centro, administrador_global y el rol
//     heredado director) confiere acceso de gestión del centro.
//   - DOCENTE: el rol 'docente' (y solo 'docente') entra al flujo docente.
//
// MODELO DE DATOS: en perfiles.rol la migración binaria deja 'administrador'
// o 'docente'. Las variantes 'administrador_centro' / 'administrador_global'
// y el rol legado 'director' pueden persistir en centro_roles o en datos
// heredados; todas se tratan como administrativas en este módulo único.
// Uno de los 4 roles administrativos NUNCA se degrada a docente.
export type RolAdministrativo = 'administrador' | 'administrador_centro' | 'administrador_global' | 'director';
export type RolUsuario = 'docente' | RolAdministrativo;

export const ROLES_ADMINISTRATIVOS: readonly RolAdministrativo[] = [
    'administrador',
    'administrador_centro',
    'administrador_global',
    'director',
];

export function esRolAdministrador(rol?: string | null): rol is RolAdministrativo {
    return !!rol && (ROLES_ADMINISTRATIVOS as readonly string[]).includes(rol);
}

export function esRolDocente(rol?: string | null): boolean {
    return rol === 'docente';
}

export interface AnalisisAcceso {
    rol: 'administrador' | 'docente';
    centro_id?: string;
}

// Resolución de acceso EXCLUSIVA de perfiles.rol (normalizado):
// cualquier rol administrativo (los 4) se resuelve a 'administrador' y
// devuelve el centro del perfil como centro de gestión; 'docente' resuelve
// al flujo docente; cualquier otro valor/ausente carece de acceso definido.
export function analizarRolAcceso(opts: {
    perfil?: UserProfile | null;
}): AnalisisAcceso | null {
    const { perfil } = opts;
    const rol = perfil?.rol;
    if (esRolAdministrador(rol)) {
        return { rol: 'administrador', centro_id: perfil?.centro_id };
    }
    if (esRolDocente(rol)) {
        return { rol: 'docente' };
    }
    return null;
}