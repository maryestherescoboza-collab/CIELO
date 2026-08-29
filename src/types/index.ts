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
    centroId?: string;
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
    indicador?: string;
    producto?: string;
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
    id?: number;
    estudianteId: number; cursoId: number;
    bc: 1 | 2 | 3 | 4; puntaje: number | null;
    periodo: string;
    sharedCourseId?: string;
    asignatura?: string;
    userId?: string;
    fecha?: string;
}

// Lista de Cotejo de Recuperación: una fila por EVIDENCIA LOGRADA (✓).
// La AUSENCIA de registro = celda vacía = NO LOGRADO. No existe el
// estado "no evaluado" ni "X": vacío NO participa como evaluado, pero
// SÍ cuenta en el denominador (todas las evidencias participan).
// Los indicadores son fijos (src/constants/recuperacionCotejo.ts).
// Las COLUMNAS son las actividades reales (actividad_id) que cumplen:
//   puntaje < 70  Y  la competencia de la actividad == BC a recuperar.
// Contexto de un BC abierto en la Lista de Cotejo, usado al guardar para
// garantizar que la cabecera de recuperaciones.puntaje SIEMPRE se reescriba
// con el resultado_final (incluso si el BC quedó con 0 evidencia marcada).
export interface ContextoRecuperacion {
    estudianteId: number;
    bc: 1 | 2 | 3 | 4;
    periodo: string;
}

export interface RecuperacionCotejo {
    id: number;
    recuperacionId: number;
    estudianteId: number;
    cursoId: number;
    bc: 1 | 2 | 3 | 4;
    periodo: string;
    asignatura: string;
    indicador: string;
    actividadId: number;
    sharedCourseId?: string;
    userId: string;
    createdAt?: string;
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
    recursos?: any[];
}

export type TipoRecurso = 'documento' | 'video' | 'web' | 'canva' | 'pdf' | 'presentacion' | 'otro' | 'wakelet';

export interface RecursoPlanificacion {
    id: number;
    planificacionId: number;
    titulo: string;
    url: string;
    tipo: TipoRecurso;
    orden: number;
    userId: string;
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

export type PrioridadEvento = 'CRITICA' | 'ALTA' | 'MEDIA' | 'BAJA';

export interface EventoCalendario {
    id: number;
    titulo: string;
    fecha: string;
    tipo: 'evaluacion' | 'reunion' | 'actividad' | 'otro'
        | 'academico' | 'administrativo' | 'feriado' | 'receso'
        | 'institucional' | 'conmemoracion' | 'planificacion';
    descripcion?: string;
    fechaInicio?: string;
    fechaFin?: string;
    updatedAt?: string;
}

export interface TareaDocente {
    id: string;
    tareaId: string;
    docenteId: string;
    estado: 'pendiente' | 'en_progreso' | 'completada' | 'vencida';
    fechaEntrega?: string;
    observaciones?: string;
    archivosEntrega?: string;
    createdAt?: string;
}

export interface TareaInstitucional {
    id: string;
    centroId: string;
    titulo: string;
    descripcion: string;
    prioridad: string;
    fechaLimite: string;
    createdBy?: string;
    asignaciones?: TareaDocente[];
    createdAt?: string;
}

export interface ResourceData {
    nombre?: string;
    titulo?: string;
    criterios?: Array<{ indicador?: string; titulo?: string; descripcion?: string }>;
    contenidoHtml?: string;
    recursoCompartido?: {
        id: string;
        url: string;
        tipo: string;
        titulo: string;
        categoria?: string;
        descripcion?: string;
    };
}

export interface Post {
    id: number; autor: string; cargo: string; avatarUrl?: string; avatarColor?: string;
    contenido: string; tiempo: string; fechaPublicacion: string;
    created_at_ts?: number; // Numeric timestamp for performance
    tipo: 'rubrica' | 'secuencia' | 'general' | 'cotejo' | 'recurso'; asignatura: string;
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
    estado?: 'pendiente' | 'activo' | 'suspendido' | 'cancelado';
    afiliado?: boolean;
}

export type RolAdministrativoRaw = 'administrador' | 'administrador_centro' | 'administrador_global' | 'director';

export interface CentroRol {
    id: string;
    centro_id: string;
    user_id: string;
    rol: 'docente' | RolAdministrativoRaw;
    created_at?: string;
}

export interface CodigoAccesoCentro {
    id: string;
    centro_id: string;
    codigo: string;
    usos_restantes?: number | null;
    valido_hasta?: string | null;
    created_by?: string;
    created_at?: string;
    estado?: 'activo' | 'inactivo' | 'expirado';
}

export interface Suscripcion {
    id: string;
    tipo: 'individual' | 'institucional' | 'promocional';
    estado: 'activa' | 'pendiente' | 'vencida' | 'cancelada';
    user_id?: string;
    centro_id?: string;
    fecha_inicio?: string;
    fecha_fin?: string;
    tilopay_customer_id?: string;
    tilopay_subscription_id?: string;
    created_at?: string;
    updated_at?: string;
}

export interface UserProfile {
    userId: string;
    nombreDocente: string;
    bio: string;
    avatarUrl: string;
    asignatura: string;
    asignaturas?: string[];
    lastSeen?: string;
    publicacionesRealizadas?: number;
    avatarColor?: string;
    institucion?: string;
    instituto?: string;
    centro_id?: string;
    centro?: Centro;
    rol?: 'docente' | RolAdministrativoRaw;
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
    tareaId?: string;
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
    observaciones?: string; puntajeTotal?: number; plantillaId?: number | null;
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
    userId?: string;
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
    esTutor?: boolean;
    asignatura: string;
    diasSemana?: string[];
    createdAt?: string;
}

export interface AppState {
    cursos: Curso[];
    estudiantes: Estudiante[];
    incidencias: Incidencia[];
    actividades: Actividad[];
    calificaciones: CalificacionActividad[];
    recuperaciones: RecuperacionBC[];
    recuperacionesCotejo: RecuperacionCotejo[];
    secuencias: Secuencia[];
    eventos: EventoCalendario[];
    calendarioMinerd: EventoCalendario[];
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
    tareas: TareaInstitucional[];
    
    suscripcionActual?: Suscripcion;
    centroRolActual?: CentroRol;

    // Catálogo de centros conocidos (para resolver curso.centroId → CENTRO
    // en boletines sin depender del usuario que imprime).
    centros?: Centro[];
}

export interface RegistroAnecdotico {
    id: number;
    cursoId: number;
    profileId: string;
    fecha: string;
    titulo: string;
    descripcion: string;
    activo: boolean;
    createdAt: string;
    updatedAt: string;
}

export interface RegistroImagen {
    id: number;
    registroId: number;
    imagenUrl: string;
    driveFileId?: string;
    driveThumbnailUrl?: string;
    storageProvider: 'supabase_storage' | 'google_drive';
    createdAt: string;
}

export interface FloatingRubricWindow {
    id: string; // Float window ID (e.g. `float-comp-${descId}`)
    descriptorId: string;
    cursoId: number;
    actividadId: number;
    position: { x: number; y: number };
}
