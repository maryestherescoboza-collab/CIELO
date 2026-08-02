export type Screen =
    | 'inicio' | 'dashboard' | 'cursos' | 'curso-detalle'
    | 'incidencias' | 'planificacion' | 'comunidad'
    | 'rubrica' | 'cotejo' | 'estudiante' | 'calificaciones-anuales' | 'ajustes';

export type NavExtra = {
    cursoId?: number;
    estudianteId?: number;
    actividadId?: number;
} | Record<string, unknown>;

export type Nivel = 1 | 2 | 3 | 4;
export interface Skill { text: string; }

export interface PresenceUser {
    userId: string;
    nombre: string;
    avatarUrl?: string;
    asignatura?: string;
    currentModule?: string;
    onlineSince: string;
}

export const COMPETENCIAS_LABEL = {
  BC1: "Comunicativa",
  BC2: "Científica y tecnológica; ambiental y de la salud",
  BC3: "Desarrollo personal y espiritual; ética y ciudadana",
  BC4: "Pensamiento lógico, creativo y crítico; resolución de problemas",
} as const;

export type Competencia = keyof typeof COMPETENCIAS_LABEL;
export type BCKey = Competencia;

export function getCompetenciaDisplay(bc: string): string {
  return COMPETENCIAS_LABEL[bc as Competencia] || bc;
}

export interface BCScore { nivel: Nivel; puntaje: number; }
export interface Estudiante {
    id: number; nombre: string; apellido: string; avatarColor: string;
    cursoId: number; grupoId: number; sharedCourseId?: string; nivel: Nivel; puntaje: number;
    bc1: BCScore; bc2: BCScore; bc3: BCScore; bc4: BCScore;
    actividadesRecientes: number; enRiesgo: boolean;
    userId?: string;
    numeroLista: number;
}

export interface Curso {
    id: number; nombre: string; asignatura: string;
    grado: string; seccion: string; periodo: string;
    diasSemana: string[]; color: string;
    isTutorOficial?: boolean;
    userId?: string;
    grupoId: number;
    sharedCourseId?: string;
    configuracionEvaluacion?: Record<string, unknown>;
    createdAt?: string;
}

export interface Actividad {
    id: number; nombre: string; cursoId: number;
    fecha: string; periodo: string;
    bcAsignados: Competencia[];
    secuenciaId?: number;
    isRec?: boolean;
    userId?: string;
    asignatura?: string;
    sharedCourseId?: string;
}

export interface CalificacionActividad {
    id?: number;
    cursoId: number;
    estudianteId: number;
    actividadId: number;
    userId: string;
    asignatura: string;
    periodo: string;
    competencias: Competencia[];
    descriptores: string[];
    puntaje: number | null;
    recuperacion: number | null;
    sharedCourseId?: string;
}

export interface RecuperacionBC {
    estudianteId: number; cursoId: number;
    bc: 1 | 2 | 3 | 4; puntaje: number | null;
    periodo: string;
    sharedCourseId?: string;
    asignatura?: string;
    userId?: string;
    fecha?: string;
}

export interface Secuencia {
    id: number; titulo: string; cursoId: number;
    fechaInicio: string; contenidoHtml: string;
    estado: 'Pendiente' | 'En progreso' | 'Completada';
    userId?: string;
    archivoUrl?: string;
    archivoNombre?: string;
    archivoSize?: number;
    archivoTipo?: string;
    archivoFechaCarga?: string;
}

export interface Incidencia {
    id: number; estudianteId: number;
    categoria: 'Conducta' | 'Académico' | 'Salud' | 'Otro';
    descripcion: string; accionesTomadas: string[];
    acuerdos: string; fecha: string;
    gravedad: 'leve' | 'moderada' | 'grave';
    sharedCourseId?: string;
    userId?: string;
}

export interface EventoCalendario {
    id: number; titulo: string; fecha: string;
    tipo: 'evaluacion' | 'reunion' | 'actividad' | 'otro';
}

export interface ResourceData {
    nombre?: string;
    titulo?: string;
    criterios?: Array<{ indicador?: string; titulo?: string; descripcion?: string }>;
    contenidoHtml?: string;
}

export interface Post {
    id: number; autor: string; cargo: string; avatarUrl?: string; avatarColor?: string;
    contenido: string; tiempo: string; fechaPublicacion: string;
    created_at_ts?: number; // Numeric timestamp for performance
    likes: number; likedByMe: boolean;
    tipo: 'rubrica' | 'secuencia' | 'general' | 'cotejo'; asignatura: string;
    userId?: string;
    userBio?: string;
    expiresAt?: string;
    recursoDatos?: ResourceData;
    recursoId?: number;
    isOptimistic?: boolean;
    searchString?: string; // Precomputed for filter performance
}

export interface Docente {
    id: string | number;
    userId?: string;
    nombre: string;
    asignatura: string;
    avatarColor: string;
}

export interface Centro {
    id: string;
    nombre: string;
    codigoCentro?: string;
    tanda?: string;
    telefono?: string;
    distritoEducativo?: string;
    regionalEducacion?: string;
    provincia?: string;
    municipio?: string;
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
}

export interface UserProfile {
    userId: string;
    nombreDocente: string;
    bio: string;
    avatarUrl: string;
    asignatura: string;
    asignaturas?: string[];
    lastSeen?: string;
    currentModule?: string;
    totalCorazones?: number;
    publicacionesRealizadas?: number;
    avatarColor?: string;
    institucion?: string;
    instituto?: string;
    centro_id?: string;
    centro?: Centro;
}

export interface Notification {
    id: number;
    userId: string;
    actorId?: string;
    titulo: string;
    mensaje: string;
    leida: boolean;
    tipo?: string;
    postId?: number;
    grado?: string;
    seccion?: string;
    estado?: 'pendiente' | 'resuelto';
    createdAt: string;
    fechaLectura?: string;
}

export interface ReportData {
    postId: number;
    razon: string;
    comentario?: string;
}

export interface ComunidadUIState {
    activeModal: 'preview' | 'report' | 'import' | null;
    selectedPostId: number | null;
}

export interface SearchResults {
    estudiantes: Estudiante[];
    cursos: Curso[];
    actividades: Actividad[];
}

export interface DescriptorRubrica {
    id: string;
    bc: Competencia; indicador: string;
    estrategico: string; autonomo: string;
    resolutivo: string; receptivo: string;
    plantillaId?: number | null;
}

export interface NivelPuntaje {
    nivel: Nivel; nombre: string; puntaje: number;
    color: string; description: string;
}

export interface EvaluacionRubrica {
    id: number; estudianteId: number; actividadId: number; cursoId: number;
    fecha: string; selecciones: Partial<Record<Competencia, Nivel>>;
    observaciones?: string; puntajeTotal: number; plantillaId?: number | null;
    sharedCourseId?: string;
}

export interface CriterioCotejo {
    id: number; titulo: string; descripcion: string;
}

export interface EvaluacionCotejo {
    id: number; estudianteId: number; actividadId: number; cursoId: number;
    fecha: string; respuestas: Record<number, number | null>;
    comentarios?: string; puntaje: number; plantillaId?: number | null;
    sharedCourseId?: string;
}

export interface Grupo {
    id: number;
    nombre: string;
    grado: string;
    seccion: string;
    createdAt?: string;
}

export interface Plantilla {
    id: number;
    tipo: 'rubrica' | 'cotejo';
    nombre: string;
    datos: Record<string, unknown>;
    createdAt?: string;
}

export interface CursoDetalleEvaluacion {
    id: number;
    userId?: string;
    cursoId: number;
    actividadId: number;
    estudianteId: number;
    rubricaData: Record<string, unknown>;
    cotejoData: Record<string, unknown>;
    puntajeTotal: number | null;
    observaciones: string[];
    plantillaId?: number | null;
    descriptores?: string[];
    sharedCourseId?: string;
    createdAt?: string;
}

export interface CompetenciaPeriodo {
    id: number;
    cursoId: number;
    estudianteId: number;
    periodo: string;
    bc1: number;
    bc2: number;
    bc3: number;
    bc4: number;
    createdAt?: string;
}

export interface CursoDocente {
    id: number;
    cursoId: number;
    userId: string;
    rol: 'tutor' | 'co-docente';
    asignatura: string;
    createdAt?: string;
}

export interface AppState {
    cursos: Curso[];
    estudiantes: Estudiante[];
    incidencias: Incidencia[];
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
    recuperaciones: RecuperacionBC[];
    secuencias: Secuencia[];
    eventos: EventoCalendario[];
    posts: Post[];
    descriptoresRubrica: DescriptorRubrica[];
    nivelesPuntaje: NivelPuntaje[];
    evaluacionesRubrica: EvaluacionRubrica[];
    criteriosCotejo: CriterioCotejo[];
    evaluacionesCotejo: EvaluacionCotejo[];
    instituto?: string;
    docentes: Docente[];
    plantillas: Plantilla[];
    cursoDetalle: CursoDetalleEvaluacion[];
    perfilBio?: string;
    perfilAvatarUrl?: string;
    nombreDocente?: string;
    tipoInstitucion?: 'publica' | 'privada';
    perfilAvatarColor?: string;
    asignaturas?: string[];
    perfiles: UserProfile[];
    notificaciones: Notification[];

    cursoDocentes: CursoDocente[];
    grupos: Grupo[];
    registrosAnecdoticos: RegistroAnecdotico[];
    registroImagenes: RegistroImagen[];
}

export interface RegistroAnecdotico {
    id: number;
    cursoId: number;
    profileId: string;
    fecha: string;
    titulo: string;
    descripcion: string;
    createdAt: string;
    updatedAt: string;
}

export interface RegistroImagen {
    id: number;
    registroId: number;
    imagenUrl: string;
    createdAt: string;
}

export interface FloatingRubricWindow {
    id: string; // Float window ID (e.g. `float-comp-${descId}`)
    descriptorId: string;
    cursoId: number;
    actividadId: number;
    position: { x: number; y: number };
}
