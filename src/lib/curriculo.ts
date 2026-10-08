import type { BloqueCF, CompetenciaCurricular, FilaContenido, FilaIndicador } from '../types/especificaciones';

/**
 * Estructura curricular oficial de las 7 Competencias Fundamentales.
 * BC1 → 1, BC2 → 2, BC3 → 2, BC4 → 2. No se deben inventar ni reordenar bloques.
 */
export const BLOQUES_CF: Array<{ bloque: BloqueCF; competencias: string[] }> = [
  { bloque: 'BC1', competencias: ['Comunicativa'] },
  { bloque: 'BC2', competencias: ['Pensamiento Lógico, Creativo y Crítico', 'Resolución de Problemas'] },
  { bloque: 'BC3', competencias: ['Científica y Tecnológica', 'Ambiental y de la Salud'] },
  { bloque: 'BC4', competencias: ['Ética y Ciudadana', 'Desarrollo Personal y Espiritual'] },
];

/** Las 7 Competencias Fundamentales en orden curricular (código CE1..CE7 por defecto). */
export const CF_BASE: Array<{ bloque: BloqueCF; nombre: string; codigoPorDefecto: string }> = [
  { bloque: 'BC1', nombre: 'Comunicativa', codigoPorDefecto: 'CE1' },
  { bloque: 'BC2', nombre: 'Pensamiento Lógico, Creativo y Crítico', codigoPorDefecto: 'CE2' },
  { bloque: 'BC2', nombre: 'Resolución de Problemas', codigoPorDefecto: 'CE3' },
  { bloque: 'BC3', nombre: 'Científica y Tecnológica', codigoPorDefecto: 'CE4' },
  { bloque: 'BC3', nombre: 'Ambiental y de la Salud', codigoPorDefecto: 'CE5' },
  { bloque: 'BC4', nombre: 'Ética y Ciudadana', codigoPorDefecto: 'CE6' },
  { bloque: 'BC4', nombre: 'Desarrollo Personal y Espiritual', codigoPorDefecto: 'CE7' },
];

/** Copia fresca de las 7 CF (cada registro tiene su propio objeto, sin estado compartido). */
export function crearCompetenciasBase(): CompetenciaCurricular[] {
  return CF_BASE.map((cf) => ({
    bloque: cf.bloque,
    nombre: cf.nombre,
    codigo: cf.codigoPorDefecto,
    descriptor: '',
  }));
}

/** La configuración base está completa cuando las 7 CF tienen código y descriptor. */
export function configuracionCompleta(competencias: CompetenciaCurricular[] | null | undefined): boolean {
  if (!Array.isArray(competencias) || competencias.length !== CF_BASE.length) return false;
  return competencias.every((c) => c.bloque && c.nombre.trim() && c.codigo.trim() && c.descriptor.trim());
}

export function normalizarTexto(valor: string | null | undefined): string {
  if (!valor) return '';
  return valor
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Clave comparable de asignatura entre el modelo operativo (slug en curso_docentes)
 * y el catálogo curricular (nombre completo en curr_indicadores / curr_contenidos).
 * Incluye alias por variantes reales de los seeds ("Inglés" vs "Lenguas Extranjeras (Inglés)").
 */
export function claveAsignatura(valor: string | null | undefined): string {
  const n = normalizarTexto(valor);
  if (!n) return '';
  if (n.includes('ingles')) return 'ingles';
  if (n.includes('frances')) return 'frances';
  if (n.includes('formacion')) return 'formacion_integral';
  if (n.includes('artistica')) return 'artistica';
  if (n.includes('naturaleza')) return 'ciencias_naturaleza';
  if (n.includes('sociales')) return 'ciencias_sociales';
  return n;
}

export function claveGrado(valor: string | null | undefined): string {
  return normalizarTexto(valor).replace(/[^a-z0-9]/g, '');
}

export function mismaAsignatura(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = claveAsignatura(a);
  return !!ka && ka === claveAsignatura(b);
}

export function mismoGrado(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = claveGrado(a);
  return !!ka && ka === claveGrado(b);
}

/**
 * Indicadores del catálogo estrictamente para el grado + asignatura indicados.
 * El grado se filtra primero (índice curr_ind_grado_asig_comp) y la asignatura se
 * compara con normalización para absorber diferencias de formato.
 */
export function filtrarIndicadores(
  filas: FilaIndicador[],
  grado: string,
  asignatura: string
): FilaIndicador[] {
  return filas.filter(
    (f) => f.is_active !== false && mismoGrado(f.grado, grado) && mismaAsignatura(f.asignatura, asignatura)
  );
}

/** Contenidos curriculares estrictamente para el grado + asignatura indicados. */
export function filtrarContenidos(
  filas: FilaContenido[],
  grado: string,
  asignatura: string
): FilaContenido[] {
  return filas.filter((f) => mismoGrado(f.grado, grado) && mismaAsignatura(f.asignatura, asignatura));
}
