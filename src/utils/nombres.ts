// ─────────────────────────────────────────────────────────────────────────
// NOMBRE VISIBLE DE DOCENTES
// Regla innegociable:
//   perfiles.nombre (primero) / perfiles.nombre_docente (legado) → NOMBRE VISIBLE
//   auth.users.email                                        → CORREO (no nombre)
// El nombre que se muestra de un docente se resuelve SOLO desde el perfil.
// Nunca se deriva de la parte local del correo (`email.split('@')[0]`) ni de
// ninguna heurística sobre el correo. Si no hay nombre (perfil aún no cargado
// o vacío) se usa un fallback neutro, nunca un nombre inventado.
// ─────────────────────────────────────────────────────────────────────────

export const NOMBRE_NEUTRO = 'Docente';

interface NombrePerfil {
    nombreDocente?: string;
    nombre?: string | null;
    nombre_docente?: string | null;
}

// Resuelve el nombre visible de un docente a partir de su perfil.
// Acepta tanto el perfil de dominio (UserProfile.nombreDocente) como una fila
// cruda de `perfiles` (nombre → nombre_docente). `fallback` solo se usa si el
// perfil no aporta ningún nombre.
export function obtenerNombreVisible(
    perfil?: NombrePerfil | null,
    fallback: string = NOMBRE_NEUTRO
): string {
    const nombre =
        (perfil?.nombreDocente?.trim() || '') ||
        (perfil?.nombre?.trim() || '') ||
        (perfil?.nombre_docente?.trim() || '');
    return nombre || fallback;
}