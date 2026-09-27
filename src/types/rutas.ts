/**
 * Tipos de "Rutas de aprendizaje" (CIELO).
 *
 * Contrato con Supabase. Las 8 entidades son relacionales
 * (ruta_aprendizaje, ruta_etapa, ruta_actividad, ruta_pregunta, ruta_opcion,
 * ruta_intento, ruta_intento_espacio, ruta_progreso). El JSONB aparece solo
 * dentro de `config`, donde son parametros de una actividad o de una pregunta,
 * nunca entidades.
 *
 * Dos capas con permisos distintos:
 *  - RutaDocente*: lo ve y lo edita el dueno de la ficha. INCLUYE las
 *    respuestas correctas: es contenido autoral.
 *  - RutaEstudiante*: lo recibe el Portal. NUNCA incluye respuestas correctas;
 *    solo el veredicto que decide la RPC en servidor.
 */

import type { NotaContenido } from './planClases';

/* ─────────────────────────────────────────────────────────────────────────
   Catalogos
   ───────────────────────────────────────────────────────────────────────── */

export const RUTA_ESTADOS = ['borrador', 'publicada', 'archivada'] as const;
export type RutaEstado = (typeof RUTA_ESTADOS)[number];

export const TIPOS_ACTIVIDAD = [
    'opcion_multiple',
    'verdadero_falso',
    'completar',
    'respuesta_numerica',
    'respuesta_escrita',
    'ordenar_pasos',
    'relacionar',
    'procedimiento_matematico',
] as const;
export type TipoActividad = (typeof TIPOS_ACTIVIDAD)[number];

/**
 * Dominio de la RESPUESTA, independiente del tipo de actividad.
 * "completar" puede ser textual o numerica y ambos se validan distinto.
 * Es la distincion que permite que "completar texto" y "procedimiento
 * matematico" no se mezclen por dentro.
 */
export const TIPOS_RESPUESTA = ['textual', 'numerica', 'expresion', 'booleana', 'ordenada'] as const;
export type TipoRespuesta = (typeof TIPOS_RESPUESTA)[number];

/** Etiquetas en espanol. Fuente unica: el constructor no debe inventarlas. */
export const ETIQUETA_TIPO_ACTIVIDAD: Record<TipoActividad, string> = {
    opcion_multiple: 'Seleccion multiple',
    verdadero_falso: 'Verdadero / Falso',
    completar: 'Completar espacios',
    respuesta_numerica: 'Respuesta numerica',
    respuesta_escrita: 'Respuesta escrita',
    ordenar_pasos: 'Ordenar pasos',
    relacionar: 'Relacionar elementos',
    procedimiento_matematico: 'Procedimiento matematico',
};

/**
 * Tipos que el constructor ofrece en la v1. `ordenar_pasos` y `relacionar`
 * estan en el catalogo de la base de datos (arquitectura lista) pero se
 * anuncian como proximos en lugar de prometer algo que no existe.
 */
export const TIPOS_ACTIVIDAD_V1: TipoActividad[] = [
    'opcion_multiple',
    'verdadero_falso',
    'completar',
    'respuesta_numerica',
    'respuesta_escrita',
    'procedimiento_matematico',
];

export const esTipoActividadV1 = (t: TipoActividad): boolean => TIPOS_ACTIVIDAD_V1.includes(t);

/* ─────────────────────────────────────────────────────────────────────────
   Configuracion (unica parte JSONB del modelo)
   ───────────────────────────────────────────────────────────────────────── */

/** Un espacio en blanco con su respuesta esperada. */
export interface EspacioProcedimiento {
    /** Texto que el docente escribe. Se compara como numero si la pregunta es numerica. */
    respuesta: string;
}

/** Un paso del procedimiento, con sus espacios en orden. */
export interface PasoProcedimiento {
    /** Texto del paso con los huecos marcados, p.ej. "a^2 = [ ]^2 - [ ]^2". */
    texto: string;
    espacios: EspacioProcedimiento[];
}

/**
 * Variable matematica declarada por el docente.
 * El generador automatico de variantes NO esta implementado en la v1, pero
 * el lugar donde vive ya existe: al activarlo, `ruta_pregunta.config.variables`
 * describe que se puede variar y `ruta_intento.instancia` guarda con que
 * valores se concreto cada intento.
 */
export interface VariableMatematica {
    clave: string;
    valor: number;
    min?: number;
    max?: number;
}

export interface PreguntaConfig {
    /** Respuesta principal. Solo para tipos sin espacios. */
    respuestaEsperada?: string;
    /** Alternatas que tambien se aceptan. */
    respuestasAceptadas?: string[];
    /** Tolerancia absoluta (respuesta numerica). */
    toleranciaAbs?: number;
    /** Tolerancia relativa, proporcional al valor esperado. */
    toleranciaRel?: number;
    /** Solo en procedimiento_matematico. La verdad vive aqui, en la base. */
    pasos?: PasoProcedimiento[];
    /** Preparado para el generador de variantes (§6). */
    variables?: VariableMatematica[];
}

export interface ActividadConfig {
    /** Datos del enunciado, p.ej. ["b = 2", "c = 3"]. */
    datos?: string[];
    toleranciaAbs?: number;
    toleranciaRel?: number;
    unidad?: string;
}

export type ModoDesbloqueo = 'secuencial' | 'abierta' | 'porcentaje';

export interface ReglaDesbloqueo {
    modo: ModoDesbloqueo;
    /** Solo con modo 'porcentaje'. */
    porcentaje?: number;
}

/* ─────────────────────────────────────────────────────────────────────────
   Formas de respuesta (lo que el estudiante envía)
   ───────────────────────────────────────────────────────────────────────── */

export interface RespuestaEscalar {
    texto: string;
}

export interface RespuestaOpciones {
    opcionIds: string[];
}

export interface RespuestaOrden {
    orden: string[];
}

/** Respuesta de un procedimiento: un valor por paso y espacio. */
export interface RespuestaEspacio {
    paso: number;
    espacio: number;
    valor: string;
}

export interface RespuestaProcedimiento {
    espacios: RespuestaEspacio[];
}

export type RespuestaRuta =
    | RespuestaEscalar
    | RespuestaOpciones
    | RespuestaOrden
    | RespuestaProcedimiento;

/* ─────────────────────────────────────────────────────────────────────────
   Veredicto (lo que devuelve la RPC)
   ───────────────────────────────────────────────────────────────────────── */

export interface DetalleEspacio {
    paso: number;
    espacio: number;
    correcto: boolean;
}

export interface VeredictoIntento {
    correcto: boolean;
    numeroIntento?: number;
    /** Espacios correctos (procedimiento matematico). */
    parciales?: number;
    totalEspacios?: number;
    detalleEspacios?: DetalleEspacio[];
    pista?: string | null;
    retroalimentacion?: string | null;
    error?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   Capa DOCENTE — incluye respuestas correctas
   ───────────────────────────────────────────────────────────────────────── */

export interface OpcionDocente {
    id?: string;
    texto: string;
    orden: number;
    es_correcta: boolean;
    clave?: string | null;
    valor?: string | null;
}

export interface PreguntaDocente {
    id?: string;
    orden: number;
    enunciado: string;
    tipo_respuesta: TipoRespuesta;
    config: PreguntaConfig;
    pista?: string | null;
    retroalimentacion_ok?: string | null;
    retroalimentacion_error?: string | null;
    peso: number;
    opciones: OpcionDocente[];
}

export interface ActividadDocente {
    id?: string;
    tipo: TipoActividad;
    tipo_etiqueta?: string;
    titulo?: string | null;
    instrucciones?: string | null;
    orden: number;
    config: ActividadConfig;
    obligatorio: boolean;
    preguntas: PreguntaDocente[];
}

export interface EtapaDocente {
    id?: string;
    titulo: string;
    descripcion?: string | null;
    orden: number;
    actividades: ActividadDocente[];
}

export interface RutaDocente {
    id: string;
    nota_id: string;
    titulo: string;
    descripcion?: string | null;
    estado: RutaEstado;
    regla_desbloqueo: ReglaDesbloqueo;
    creado_en: string;
    actualizado_en: string;
    etapas: EtapaDocente[];
}

export interface RutaResumen {
    id: string;
    titulo: string;
    estado: RutaEstado;
    descripcion?: string | null;
    actualizado_en: string;
    total_etapas: number;
    total_actividades: number;
}

/* ─────────────────────────────────────────────────────────────────────────
   Capa ESTUDIANTE — nunca incluye respuestas correctas
   ───────────────────────────────────────────────────────────────────────── */

export interface OpcionEstudiante {
    id: string;
    texto: string;
    clave?: string | null;
}

/**
 * Paso del procedimiento tal como lo ve el estudiante: el texto y cuantos
 * huecos dibujar. NUNCA la respuesta de cada hueco, que vive solo en
 * ruta_pregunta.config y sale unicamente dentro de ruta_evaluar_respuesta.
 */
export interface PasoPublico {
    texto: string;
    espacios: number;
}

export interface PreguntaEstudiante {
    id: string;
    orden: number;
    enunciado: string;
    tipo_respuesta: TipoRespuesta;
    pista?: string | null;
    peso: number;
    /** Vacio salvo en procedimiento_matematico. */
    pasos: PasoPublico[];
    opciones: OpcionEstudiante[];
}

export interface ActividadEstudiante {
    id: string;
    tipo: TipoActividad;
    tipo_etiqueta: string;
    titulo?: string | null;
    instrucciones?: string | null;
    config: ActividadConfig;
    obligatorio: boolean;
    completada: boolean;
    preguntas: PreguntaEstudiante[];
}

export interface EtapaEstudiante {
    id: string;
    titulo: string;
    descripcion?: string | null;
    orden: number;
    completada: boolean;
    /** Lo resuelve el servidor (ruta_etapa_desbloqueada). La UI solo lo refleja. */
    desbloqueada: boolean;
    actividades: ActividadEstudiante[];
}

export interface RutaEstudiante {
    id: string;
    titulo: string;
    descripcion?: string | null;
    regla_desbloqueo: ReglaDesbloqueo;
    porcentaje_requerido: number;
    etapas: EtapaEstudiante[];
    progreso: { total: number; completadas: number };
}

export interface ResumenRutaEstudiante {
    id: string;
    titulo: string;
    descripcion?: string | null;
    total_etapas: number;
    total_actividades: number;
    completadas: number;
}

export interface ProgresoRuta {
    totalActividades: number;
    completadas: number;
    puntaje: number;
    etapas: { id: string; titulo: string; completada: boolean }[];
}

/* ─────────────────────────────────────────────────────────────────────────
   Unions discriminadas por TIPO DE ACTIVIDAD
   Lo que el constructor y el renderer necesitan para no tratarlo todo igual.
   ───────────────────────────────────────────────────────────────────────── */

export interface PreguntaProcedimiento extends PreguntaDocente {
    tipo_respuesta: 'numerica' | 'expresion' | 'textual';
    config: PreguntaConfig & { pasos: PasoProcedimiento[] };
}

export interface ActividadProcedimiento extends ActividadDocente {
    tipo: 'procedimiento_matematico';
}

/** Cantidad de espacios que declara una actividad de procedimiento. */
export function contarEspacios(pregunta: PreguntaDocente): number {
    return (pregunta.config?.pasos ?? []).reduce((total, paso) => total + paso.espacios.length, 0);
}

/** Reexport para no romper la importacion desde types/index.ts */
export type { NotaContenido };
