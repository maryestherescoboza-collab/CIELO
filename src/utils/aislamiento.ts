import type { Centro, Curso, Estudiante, UserProfile } from '../types';

// ─────────────────────────────────────────────────────────────────────────
// AISLAMIENTO INSTITUCIONAL
// Regla innegociable:
//   CENTRO → CURSO → ESTUDIANTE / ACTIVIDAD / CALIFICACIÓN / RECUPERACIÓN
// `sharedCourseId` NUNCA autoriza compartir datos entre centros distintos;
// siempre está subordinado a `centroId` (o al centro activo como contexto).
// Estas funciones son la frontera única que usan boletines y flujos afines.
// ─────────────────────────────────────────────────────────────────────────

// ¿`cursoIdB` es el mismo curso que `cursoAutorizado` o un curso compartido
// del MISMO centro educativo?
// - Mismo `cursoId` → siempre verdadero (el curso es único a nivel global).
// - Compartido exige: sharedCourseId idéntico y coincidencia de centro.
// - Si hay información de centro (del curso o del contexto) que distinga
//   ambos, el cruce queda denegado. Solo si NINGÚN centro es conocible se
//   conserva el comportamiento heredado (no se puede probar el cruce).
export function perteneceAlContextoDelCurso(
    cursos: Curso[],
    cursoAutorizado: Curso,
    cursoIdB: number,
    centroContexto?: string | null
): boolean {
    if (cursoIdB === cursoAutorizado.id) return true;

    const cursoB = cursos.find(c => c.id === cursoIdB);
    if (!cursoB) return false;

    if (!cursoAutorizado.sharedCourseId || cursoB.sharedCourseId !== cursoAutorizado.sharedCourseId) {
        return false;
    }

    const centroA = cursoAutorizado.centroId || centroContexto || null;
    const centroB = cursoB.centroId || centroContexto || null;

    if (centroA && centroB) return centroA === centroB;

    // Solo uno de los centros es conocible: si el contexto activo indica
    // que el curso B pertenece a otra institución, se deniega.
    if (centroContexto && cursoB.centroId && cursoB.centroId !== centroContexto) {
        return false;
    }
    if (centroContexto && cursoAutorizado.centroId && cursoAutorizado.centroId !== centroContexto) {
        return false;
    }

    return true;
}

// Predicado de pertenencia institucional de un estudiante: su curso debe ser
// el mismo que `curso` o un curso compartido dentro del MISMO centro.
export function esEstudianteDelCurso(
    cursos: Curso[],
    curso: Curso,
    estudiante: Estudiante,
    centroContexto?: string | null
): boolean {
    if (estudiante.cursoId === curso.id) return true;
    return perteneceAlContextoDelCurso(cursos, curso, estudiante.cursoId, centroContexto);
}

// Estudiantes cuyo curso es el mismo que `curso` o compartido dentro del
// mismo centro (sharedCourseId subordinado a centroId), ordenados por lista.
export function estudiantesDelCurso(
    cursos: Curso[],
    estudiantes: Estudiante[],
    curso: Curso,
    centroContexto?: string | null
): Estudiante[] {
    return estudiantes
        .filter(e => esEstudianteDelCurso(cursos, curso, e, centroContexto))
        .sort((a, b) => (a.numeroLista || 0) - (b.numeroLista || 0));
}

// ─────────────────────────────────────────────────────────────────────────
// CONTEXTO INSTITUCIONAL DEL BOLETÍN
// Cadena obligatoria para los datos del centro y del docente:
//   BOLETÍN → CURSO → curso.centroId → CENTRO
//   BOLETÍN → CURSO → curso.userId → PERFIL (docente responsable)
// Nunca se usa el primer centro encontrado, un centro global, el centro del
// usuario que imprime ni información fija.
// ─────────────────────────────────────────────────────────────────────────

// Centro real del boletín resuelto desde el propio curso.
export function obtenerCentroDelCurso(
    centros: Centro[] | undefined,
    curso: Curso | null | undefined
): Centro | null {
    if (!curso?.centroId) return null;
    return (centros || []).find(c => c.id === curso.centroId) || null;
}

// Nombre del docente responsable real del curso, independiente de quién
// genere o imprima el boletín (puede ser un administrador o director).
export function obtenerDocenteResponsable(
    perfiles: UserProfile[] | undefined,
    curso: Curso | null | undefined
): string {
    const perfil = curso?.userId
        ? (perfiles || []).find(p => p.userId === curso.userId)
        : undefined;
    return perfil?.nombreDocente || 'Docente Titular';
}