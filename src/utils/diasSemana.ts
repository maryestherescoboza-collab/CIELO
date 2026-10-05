/**
 * Normalización de días y horas para el horario docente.
 *
 * La fuente de verdad de los DÍAS es `curso_docentes.dias_semana`, pero ese campo
 * se escribe desde distintas pantallas con formatos distintos: abreviado
 * ('Lun', 'Mie', 'Sáb' en NewCourseModal/Cursos) o completo ('lunes',
 * 'miércoles'). Cualquier comparación ingenua entre esos valores falla en
 * silencio y el curso deja de aparecer en la grilla semanal.
 *
 * Este módulo NO es una segunda fuente de verdad: es el único lugar donde se
 * traducen los valores almacenados a una clave canónica comparable
 * ('lunes' ... 'domingo'), tanto para `dias_semana` como para `horarios[].dia`.
 */

export const DIAS_SEMANA_CANONICOS = [
    'lunes',
    'martes',
    'miercoles',
    'jueves',
    'viernes',
    'sabado',
    'domingo',
] as const;

export type DiaSemana = (typeof DIAS_SEMANA_CANONICOS)[number];

const ALIAS: Record<string, DiaSemana> = {
    lun: 'lunes',
    lunes: 'lunes',
    mar: 'martes',
    martes: 'martes',
    mie: 'miercoles',
    mier: 'miercoles',
    miercoles: 'miercoles',
    jue: 'jueves',
    jueves: 'jueves',
    vie: 'viernes',
    viernes: 'viernes',
    sab: 'sabado',
    sabado: 'sabado',
    dom: 'domingo',
    domingo: 'domingo',
};

const sinAcentos = (valor: string) => valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

/** Traduce cualquier variante de nombre de día a la clave canónica. */
export const normalizarDia = (valor?: string | null): DiaSemana | null => {
    if (valor === null || valor === undefined) return null;
    const base = sinAcentos(String(valor).trim().toLowerCase()).replace(/[^a-z]/g, '');
    if (!base) return null;
    if (ALIAS[base]) return ALIAS[base];
    return DIAS_SEMANA_CANONICOS.find((d) => d.startsWith(base)) ?? null;
};

/** Clave canónica del día de la semana de una fecha. */
export const diaDeSemana = (fecha: Date): DiaSemana =>
    normalizarDia(fecha.toLocaleDateString('es-ES', { weekday: 'long' })) ?? 'lunes';

/**
 * REGLA FUNDAMENTAL: un `curso_docente` existe en un día únicamente si ese día
 * está dentro de `dias_semana`. No se modifica `dias_semana` desde la vista.
 */
export const cdImparteEnDia = (
    cd: { diasSemana?: string[] | null } | null | undefined,
    dia?: string | null
): boolean => {
    const objetivo = normalizarDia(dia);
    if (!objetivo) return false;
    if (!cd || !Array.isArray(cd.diasSemana)) return false;
    return cd.diasSemana.some((d) => normalizarDia(d) === objetivo);
};

/** Compara asignaturas sin distinguir acentos, mayúsculas ni espacios sobrantes. */
export const normalizarAsignatura = (valor?: string | null): string =>
    sinAcentos(String(valor ?? '').trim().toLowerCase()).replace(/\s+/g, ' ');

/**
 * Normaliza una hora a 'HH:MM'. Tolera el formato 'HH:MM:SS' que devuelve
 * PostgREST para las columnas TIME. Devuelve null si no es una hora válida.
 */
export const normalizarHora = (valor?: string | null): string | null => {
    if (!valor) return null;
    const match = String(valor).trim().match(/^(\d{1,2}):(\d{2})/);
    if (!match) return null;
    const h = Number(match[1]);
    const m = Number(match[2]);
    if (!Number.isInteger(h) || !Number.isInteger(m) || h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
};
