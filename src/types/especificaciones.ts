// Especificaciones curriculares (Plan de Clases)
// Configuración base: usuario + curso + asignatura
// Selecciones: usuario + curso + asignatura + período

export type BloqueCF = 'BC1' | 'BC2' | 'BC3' | 'BC4';

/** Una Competencia Fundamental con su Competencia Específica registrada (código + descriptor). */
export interface CompetenciaCurricular {
  bloque: BloqueCF;
  nombre: string;
  /** Código curricular (CE1, CE2, ...). NO es un id de base de datos. */
  codigo: string;
  descriptor: string;
}

/** Combinación curso + asignatura del usuario (fuente: curso_docentes ⨝ cursos). */
export interface CombinacionCurricular {
  key: string;
  cursoId: number;
  cursoDocenteId: number | null;
  grado: string;
  seccion: string;
  cursoNombre: string;
  /** Valor crudo de asignatura (slug o nombre legado). */
  asignatura: string;
  /** Nombre para mostrar. */
  asignaturaNombre: string;
}

export interface EspecificacionDB {
  id: string;
  usuario_id: string;
  curso_id: number;
  curso_docente_id: number | null;
  grado: string;
  seccion: string;
  asignatura: string;
  competencias: CompetenciaCurricular[];
  periodo_actual: string | null;
  paso_actual: number;
  creado_en: string;
  actualizado_en: string;
}

export interface SeleccionContenido {
  /** id de curr_contenidos */
  contenido_id: string;
  contenido: string;
}

export interface SeleccionIndicador {
  /** id de curr_indicadores */
  curr_indicador_id: string;
  codigo: string | null;
}

export interface EspecificacionPeriodoDB {
  id: string;
  especificacion_id: string;
  periodo: string;
  competencias_especificas: CompetenciaCurricular[];
  contenidos: SeleccionContenido[];
  indicadores: SeleccionIndicador[];
  actualizado_en: string;
}

/** Filas del catálogo curricular (curr_indicadores / curr_contenidos). */
export interface FilaIndicador {
  id: string;
  grado: string;
  asignatura: string;
  competencia: string;
  codigo: string | null;
  descripcion: string;
  is_active?: boolean;
}

export interface FilaContenido {
  id: string;
  grado: string;
  asignatura: string;
  contenido: string;
}
