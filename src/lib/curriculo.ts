import type { BloqueCF, CompetenciaCurricular, FilaCompetenciaEspecifica, FilaContenido, FilaIndicador } from '../types/especificaciones';

/**
 * Estructura curricular oficial de las Competencias Fundamentales en Secundaria (4 bloques).
 * BC1 → 1, BC2 → 2, BC3 → 2, BC4 → 2. No se deben inventar ni reordenar bloques.
 */
export const BLOQUES_CF_SECUNDARIA: Array<{ bloque: BloqueCF; competencias: string[] }> = [
  { bloque: 'BC1', competencias: ['Comunicativa'] },
  { bloque: 'BC2', competencias: ['Pensamiento Lógico, Creativo y Crítico', 'Resolución de Problemas'] },
  { bloque: 'BC3', competencias: ['Científica y Tecnológica', 'Ambiental y de la Salud'] },
  { bloque: 'BC4', competencias: ['Ética y Ciudadana', 'Desarrollo Personal y Espiritual'] },
];

/**
 * Estructura curricular oficial de las Competencias Fundamentales en Primaria (3 bloques).
 */
export const BLOQUES_CF_PRIMARIA: Array<{ bloque: BloqueCF; competencias: string[] }> = [
  { bloque: 'BC1', competencias: ['Comunicativa'] },
  {
    bloque: 'BC2',
    competencias: [
      'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica',
      'Pensamiento Lógico, Creativo y Crítico',
      'Resolución de Problemas',
      'Científica y Tecnológica',
      'Tecnológica y Científica',
    ],
  },
  {
    bloque: 'BC3',
    competencias: [
      'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud',
      'Ética y Ciudadana',
      'Desarrollo Personal y Espiritual',
      'Ambiental y de la Salud',
    ],
  },
];

export const BLOQUES_CF = BLOQUES_CF_SECUNDARIA;

export function getBloquesCF(nivel?: string | null): Array<{ bloque: BloqueCF; competencias: string[] }> {
  if (normalizarTexto(nivel) === 'primaria') {
    return BLOQUES_CF_PRIMARIA;
  }
  return BLOQUES_CF_SECUNDARIA;
}

/** Las 7 Competencias Fundamentales en Secundaria (código CE1..CE7 por defecto). */
export const CF_BASE_SECUNDARIA: Array<{ bloque: BloqueCF; nombre: string; codigoPorDefecto: string }> = [
  { bloque: 'BC1', nombre: 'Comunicativa', codigoPorDefecto: 'CE1' },
  { bloque: 'BC2', nombre: 'Pensamiento Lógico, Creativo y Crítico', codigoPorDefecto: 'CE2' },
  { bloque: 'BC2', nombre: 'Resolución de Problemas', codigoPorDefecto: 'CE3' },
  { bloque: 'BC3', nombre: 'Científica y Tecnológica', codigoPorDefecto: 'CE4' },
  { bloque: 'BC3', nombre: 'Ambiental y de la Salud', codigoPorDefecto: 'CE5' },
  { bloque: 'BC4', nombre: 'Ética y Ciudadana', codigoPorDefecto: 'CE6' },
  { bloque: 'BC4', nombre: 'Desarrollo Personal y Espiritual', codigoPorDefecto: 'CE7' },
];

/** Las Competencias Fundamentales en Primaria (3 bloques unificados, código CE1..CE3). */
export const CF_BASE_PRIMARIA: Array<{ bloque: BloqueCF; nombre: string; codigoPorDefecto: string }> = [
  { bloque: 'BC1', nombre: 'Comunicativa', codigoPorDefecto: 'CE1' },
  {
    bloque: 'BC2',
    nombre: 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica',
    codigoPorDefecto: 'CE2',
  },
  {
    bloque: 'BC3',
    nombre: 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud',
    codigoPorDefecto: 'CE3',
  },
];

export const CF_BASE = CF_BASE_SECUNDARIA;

/** Copia fresca de las CF correspondientes al nivel educativo (por defecto Secundaria). */
export function crearCompetenciasBase(nivel?: string | null): CompetenciaCurricular[] {
  const base = normalizarTexto(nivel) === 'primaria' ? CF_BASE_PRIMARIA : CF_BASE_SECUNDARIA;
  return base.map((cf) => ({
    bloque: cf.bloque,
    nombre: cf.nombre,
    codigo: cf.codigoPorDefecto,
    descriptor: '',
  }));
}

/**
 * Paleta CIELO por Competencia Fundamental, usada como acento de los indicadores
 * de logro dentro de Plan de clases → Especificaciones curriculares.
 */
export const COLORES_BLOQUE_CF: Record<BloqueCF, string> = {
  BC1: '#689C63',
  BC2: '#537BAC',
  BC3: '#DEAE4D',
  BC4: '#EB8847',
};

/**
 * Bloque CF a partir de un valor curricular de competencia: acepta el código
 * («BC1»..«BC4») o el nombre exacto de la Competencia Fundamental (curr_indicadores.competencia).
 */
export function bloqueDeCompetencia(valor: unknown, nivel?: string | null): BloqueCF | null {
  const normalizado = normalizarTexto(valor);
  if (!normalizado) return null;
  const codigo = normalizado.match(/^bc\s*([1-4])$/);
  if (codigo) return `BC${codigo[1]}` as BloqueCF;
  const bloques = getBloquesCF(nivel);
  for (const { bloque, competencias } of bloques) {
    if (competencias.some((c) => normalizarTexto(c) === normalizado)) return bloque;
  }
  return null;
}

/**
 * BC real de un indicador de logro: su relación curricular en el catálogo
 * (curr_indicadores.competencia), con un respaldo opcional (p. ej. el bloque
 * de la CE con la que se agrupa) cuando el catálogo no trae el código.
 */
export function bloqueDeIndicador(
  indicador: { competencia?: string | null } | null | undefined,
  respaldo?: BloqueCF | null,
  nivel?: string | null
): BloqueCF | null {
  return bloqueDeCompetencia(indicador?.competencia, nivel) ?? respaldo ?? null;
}

/** La configuración base está completa cuando al menos una competencia está seleccionada con código y descriptor. */
export function configuracionCompleta(competencias: CompetenciaCurricular[] | null | undefined): boolean {
  if (!Array.isArray(competencias) || competencias.length === 0) return false;
  // Se toleran filas malformadas (null, tipos no string) guardadas en JSON: nunca deben romper el render.
  return competencias.every(
    (c) =>
      !!c &&
      typeof c === 'object' &&
      !!c.bloque &&
      normalizarTexto(c.codigo) !== '' &&
      normalizarTexto(c.descriptor) !== ''
  );
}

export function normalizarTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  return String(valor)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Clave comparable de asignatura entre el modelo operativo (slug en curso_docentes)
 * y el catálogo curricular (nombre completo en curr_indicadores / curr_contenidos / curr_competencias_especificas).
 * Incluye alias por variantes reales de los seeds ("Inglés" vs "Lenguas Extranjeras (Inglés)").
 */
export function claveAsignatura(valor: string | null | undefined): string {
  const raw = String(valor ?? '').trim();
  if (!raw) return '';
  if (raw.toLowerCase().startsWith('optativa:')) {
    const limpio = normalizarTexto(raw.slice('optativa:'.length));
    return limpio ? `optativa:${limpio}` : '';
  }
  const n = normalizarTexto(raw);
  if (!n) return '';
  if (n.includes('ingles')) return 'ingles';
  if (n.includes('frances')) return 'frances';
  if (n.includes('formacion')) return 'formacion_integral';
  if (n.includes('artistica')) return 'artistica';
  if (n.includes('naturaleza')) return 'ciencias_naturaleza';
  if (n.includes('sociales')) return 'ciencias_sociales';
  if (n.includes('espanol') || (n.includes('lengua') && !n.includes('extranjera'))) return 'lengua_espanola';
  if (n.includes('matematica')) return 'matematica';
  if (n.includes('fisica') && !n.includes('naturaleza') && !n.includes('quimica')) return 'educacion_fisica';
  return n;
}

export function claveGrado(valor: string | null | undefined): string {
  if (!valor) return '';
  const n = normalizarTexto(valor);
  const match = n.match(/([1-6])\s*(?:ro|do|to|ero|er|o)?/);
  if (match) {
    const num = match[1];
    const suf = num === '1' ? 'ro' : num === '2' ? 'do' : num === '3' ? 'ro' : 'to';
    return `${num}${suf}`;
  }
  return n.replace(/[^a-z0-9]/g, '');
}

export function mismaAsignatura(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = claveAsignatura(a);
  return !!ka && ka === claveAsignatura(b);
}

export function mismoGrado(a: string | null | undefined, b: string | null | undefined): boolean {
  const ka = claveGrado(a);
  return !!ka && ka === claveGrado(b);
}

export function mismoNivel(a?: string | null, b?: string | null): boolean {
  const na = normalizarTexto(a);
  const nb = normalizarTexto(b);
  // Si ambos definen nivel, deben ser estrictamente idénticos
  if (na && nb) {
    return na === nb;
  }
  // Si solo uno especifica nivel, no se asume compatibilidad automática
  // a menos que sea un registro no catalogado
  return !na && !nb;
}

/**
 * Competencias específicas del catálogo oficial estrictamente para el grado + asignatura indicados.
 */
export function filtrarCompetenciasEspecificas(
  filas: FilaCompetenciaEspecifica[],
  grado: string,
  asignatura: string,
  nivel?: string | null
): FilaCompetenciaEspecifica[] {
  if (!Array.isArray(filas)) return [];
  return filas.filter(
    (f) =>
      !!f &&
      typeof f === 'object' &&
      mismoGrado(f.grado, grado) &&
      mismaAsignatura(f.asignatura, asignatura) &&
      mismoNivel(f.nivel, nivel)
  );
}

/**
 * Indicadores del catálogo estrictamente para el grado + asignatura indicados.
 * El grado se filtra primero (índice curr_ind_grado_asig_comp) y la asignatura se
 * compara con normalización para absorber diferencias de formato.
 */
export function filtrarIndicadores(
  filas: FilaIndicador[],
  grado: string,
  asignatura: string,
  nivel?: string | null
): FilaIndicador[] {
  if (!Array.isArray(filas)) return [];
  return filas.filter(
    (f) =>
      !!f &&
      typeof f === 'object' &&
      f.is_active !== false &&
      mismoGrado(f.grado, grado) &&
      mismaAsignatura(f.asignatura, asignatura) &&
      mismoNivel(f.nivel, nivel)
  );
}

/** Contenidos curriculares estrictamente para el grado + asignatura indicados. */
export function filtrarContenidos(
  filas: FilaContenido[],
  grado: string,
  asignatura: string,
  nivel?: string | null
): FilaContenido[] {
  if (!Array.isArray(filas)) return [];
  return filas.filter(
    (f) =>
      !!f &&
      typeof f === 'object' &&
      mismoGrado(f.grado, grado) &&
      mismaAsignatura(f.asignatura, asignatura) &&
      mismoNivel(f.nivel, nivel)
  );
}
