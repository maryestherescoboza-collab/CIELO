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

/** Un elemento que el estudiante puede colocar en un espacio. */
export type ElementoProcedimiento =
    | { tipo: 'numero'; valor: string }
    | { tipo: 'operador'; valor: string }
    | { tipo: 'variable'; valor: string }
    | { tipo: 'simbolo'; valor: string };

/**
 * Un espacio en blanco con su respuesta esperada.
 *
 * `piezas` es la lista CONTROLADA de elementos que el estudiante puede usar
 * (requisito 8): si viene vacia se cae a texto libre, pero cuando el docente la
 * define el Portal ofrece un keypad y no un teclado matematico ilimitado.
 */
export interface EspacioProcedimiento {
    /** Texto que el docente escribe. Se compara como numero si la pregunta es numerica. */
    respuesta: string;
    /** Elementos sugeridos para construir la respuesta. */
    piezas?: ElementoProcedimiento[];
    /** Texto de ayuda: que se espera en este espacio concreto. */
    pista?: string;
}

/** Un paso del procedimiento, con sus espacios en orden. */
export interface PasoProcedimiento {
    /** Texto del paso con los huecos marcados, p.ej. "a^2 = [ ]^2 - [ ]^2". */
    texto: string;
    espacios: EspacioProcedimiento[];
    /**
     * Piezas a nivel de PASO, compartidas por todos sus espacios.
     *
     * Es lo que permite que el paso se resuelva de una vez: el estudiante
     * construye `a² = (5)² + (3)²` rellenando los dos huecos del mismo paso, en
     * lugar de perder una pregunta por cada numero. El desglose por hueco sigue
     * existiendo (`espaciosPublicos`) para colorear el acierto, pero la
     * correccion se hace contra el paso completo.
     */
    piezas?: ElementoProcedimiento[];
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
    /** Indica si esta actividad requiere que el estudiante suba un producto/evidencia */
    solicita_producto?: boolean;
    /** Nombre del producto solicitado, p.ej. "Ensayo final" */
    nombre_producto?: string;
    /** Instrucción específica para el producto solicitado */
    instruccion_producto?: string;
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
    /** 0-100 de la actividad completa, recien recalculado en el servidor. */
    puntaje_actividad?: number;
    /** La actividad quedo completa y, si venia de CIELO, ya se\notro a calificaciones. */
    actividad_completada?: boolean;
    error?: string;
}

/* ─────────────────────────────────────────────────────────────────────────
   Ponderación
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Todo lo que la ruta necesita para repartir 100% y calcular el puntaje.
 *
 * Regla del producto, que es lo que el docente pidió y lo que el servidor
 * valida (ruta_actualizar_pesos):
 *
 *   Actividad = 0-100 según sus preguntas y ruta_pregunta.peso
 *   Etapa     = Σ(Actividad × pesoActividad / 100)
 *   Ruta      = Σ(Etapa     × pesoEtapa     / 100)
 *
 * Ejemplo: 80×0.40 + 100×0.60 = 92 en la etapa; esa etapa al 20% aporta
 * 92 × 0.20 = 18.4 a la Ficha.
 *
 * La suma de las etapas de una ruta y la de las actividades de una etapa son
 * exactamente 100. `TOLERANCIA_PESOS` existe porque los porcentajes se
 * guardan con 3 decimales: 33.333 × 3 = 99.999 no es un error de redondeo,
 * es la misma operación.
 */
export const TOTAL_PESOS = 100;

/** 0.001 es la granularidad real de NUMERIC(6,3) en la base. */
export const TOLERANCIA_PESOS = 0.005;

export interface ActividadOrigen {
    id: number;
    nombre: string;
    asignatura?: string | null;
    periodo?: string | null;
    indicador?: string | null;
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

/* ─────────────────────────────────────────────────────────────────────────
   Verdadero / Falso — comportamiento fijo
   ───────────────────────────────────────────────────────────────────────── */

/**
 * Las dos opciones de un item de tipo Verdadero/Falso, con la correcta FIJA.
 *
 * El docente no elige cual es la correcta: siempre es "Verdadero". Por eso las
 * opciones se generan aqui y no se editan en el constructor. El estudiante si
 * ve las dos al responder, y el motor (ruta_evaluar_respuesta) acepta solo la
 * marcada como correcta, de modo que la restriccion se cumple en el servidor y
 * no depende de lo que la interfaz mande.
 *
 * `es_correcta` va en los DATOS, no en la vista: por eso ningun camino
 * (crear, cargar, guardar) puede dejar "Falso" como correcta.
 */
export const TEXTO_VERDADERO_FALSO = {
    verdadero: 'Verdadero',
    falso: 'Falso',
} as const;

/** Opciones nuevas de un item Verdadero/Falso. Devuelve copias, nunca el array compartido. */
export function opcionesVerdaderoFalso(): OpcionDocente[] {
    return [
        { texto: TEXTO_VERDADERO_FALSO.verdadero, orden: 1, es_correcta: true },
        { texto: TEXTO_VERDADERO_FALSO.falso, orden: 2, es_correcta: false },
    ];
}

/**
 * Fuerza la regla sobre opciones existentes o recargadas de la base.
 *
 * Los items de Verdadero/Falso creados antes de este cambio pueden tener
 * "Falso" marcada como correcta. No se borra nada: se corrige la marca para que
 * el comportamiento sea el mismo en items viejos y nuevos, que es lo que
 * significa que sea fijo. Los ids y el orden se conservan para que el historial
 * de intentos siga apuntando a las mismas opciones.
 */
export function normalizarOpcionesVerdaderoFalso(
    opciones: readonly OpcionDocente[] | undefined,
): OpcionDocente[] {
    const lista = (opciones ?? []).map((o) => ({ ...o }));

    if (lista.length === 0) return opcionesVerdaderoFalso();

    const normalizado = (texto: string) =>
        texto
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9+\-*/^(). ]+/g, ' ')
            .trim()
            .toLowerCase();

    const idxVerdadero = lista.findIndex((o) => normalizado(o.texto) === 'verdadero');

    // Si ninguna opción se llama "Verdadero" no se promueve la primera: eso
    // dejaría como correcta una opción arbitraria, justo lo que la regla
    // prohíbe. Se devuelve el par canónico, que además es lo que el trigger
    // `trg_ruta_opcion_verdadero_falso` acaba garantizando en la base, para que
    // lo que ve el docente y lo que guarda no se contradigan.
    if (idxVerdadero < 0) return opcionesVerdaderoFalso();

    return lista.map((o, i) => ({ ...o, es_correcta: i === idxVerdadero }));
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
    /** % dentro de su etapa. La etapa reparte 100 entre sus actividades. */
    peso: number;
    config: ActividadConfig;
    obligatorio: boolean;
    /**
     * public.actividades.id cuando la actividad se reutilizó de CIELO.
     * La actividad NO se copia: la ruta apunta a la original. `null` si la
     * actividad es propia de la ruta.
     */
    actividad_origen_id?: number | null;
    /** Datos de la actividad de CIELO de origen, para mostrarlos en el constructor. */
    actividad_origen?: ActividadOrigen | null;
    preguntas: PreguntaDocente[];
}

export interface EtapaDocente {
    id?: string;
    titulo: string;
    descripcion?: string | null;
    orden: number;
    /** % dentro de la ruta. La ruta reparte 100 entre sus etapas. */
    peso: number;
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
   Catálogo de actividades que YA existen en CIELO
   ───────────────────────────────────────────────────────────────────────── */

export interface ActividadExistente {
    id: number;
    nombre: string;
    asignatura?: string | null;
    periodo?: string | null;
    fecha?: string | null;
    indicador?: string | null;
    descripcion?: string | null;
    curso_id: number;
    /** Ya está vinculada en ESTA ruta: no se puede volver a agregar. */
    en_esta_ruta: boolean;
    /** Dónde se está usando en otra ruta. Informativo, no bloquea. */
    usada_en?: { ruta: string; etapa: string } | null;
}

/* ─────────────────────────────────────────────────────────────────────────
   Puntajes ponderados
   ───────────────────────────────────────────────────────────────────────── */

export interface PuntajeEtapa {
    id: string;
    titulo: string;
    peso: number;
    /** 0-100 dentro de la etapa. */
    puntaje: number;
    /** Cuánto aporta esta etapa al total de la ruta (puntaje × peso / 100). */
    aporte: number;
    actividades: { id: string; titulo?: string | null; peso: number; puntaje: number }[];
}

export interface PuntajesRuta {
    etapas: PuntajeEtapa[];
    /** 0-100 ponderado de toda la ruta. */
    puntaje: number;
}

/**
 * Cuaderno de notas del docente.
 *
 * No extiende de PuntajesRuta a proposito: aqui las etapas son el ESQUELETO
 * (lo que el docente configuro) y cada estudiante trae su propio desglose,
 * mientras que en PuntajesRuta las etapas traen el puntaje de una sola persona.
 */
export interface PuntajesDocente {
    etapas: { id: string; titulo: string; peso: number }[];
    estudiantes: {
        estudiante_id: number;
        nombre: string;
        /** 0-100 ponderado. */
        puntaje: number;
        completadas: number;
        etapas: { id: string; puntaje: number; aporte: number }[];
    }[];
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
/** Lo que el estudiante recibe de un espacio: NUNCA la respuesta. */
export interface EspacioPublico {
    /** Piezas disponibles para construir la respuesta, si el docente las definiio. */
    piezas?: ElementoProcedimiento[];
    pista?: string;
}

export interface PasoPublico {
    texto: string;
    espacios: number;
    /** Controlada por el servidor. Vacio = texto libre. */
    piezas?: ElementoProcedimiento[];
    /** Guia por espacio, alineada con `espacios`. */
    espaciosPublicos?: EspacioPublico[];
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
    /** ID de la actividad de CIELO (public.actividades) vinculada, si la hay. */
    actividad_origen_id?: number | null;
    /** % dentro de la etapa. */
    peso: number;
    /** 0-100 del estudiante en esta actividad. */
    puntaje: number;
    preguntas: PreguntaEstudiante[];
}

export interface EtapaEstudiante {
    id: string;
    titulo: string;
    descripcion?: string | null;
    orden: number;
    /** % dentro de la ruta. */
    peso: number;
    /** 0-100 del estudiante en la etapa, ya ponderado por sus actividades. */
    puntaje: number;
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
    /** 0-100 ponderado de toda la ruta. */
    puntaje: number;
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
    /** 0-100 ponderado (antes sumaba puntos crudos de preguntas). */
    puntaje: number;
    etapas: {
        id: string;
        titulo: string;
        peso: number;
        puntaje: number;
        completada: boolean;
        desbloqueada: boolean;
    }[];
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
