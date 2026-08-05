import type { AppState } from '../types';

export const COMPETENCIAS = [
    { codigo: 'BC1', nombre: 'BC1', color: '#f97316', bgColor: 'bg-orange-50', textColor: 'text-orange-600', borderColor: 'border-orange-200' },
    { codigo: 'BC2', nombre: 'BC2', color: '#eab308', bgColor: 'bg-yellow-50', textColor: 'text-yellow-600', borderColor: 'border-yellow-200' },
    { codigo: 'BC3', nombre: 'BC3', color: '#14b8a6', bgColor: 'bg-teal-50', textColor: 'text-teal-600', borderColor: 'border-teal-200' },
    { codigo: 'BC4', nombre: 'BC4', color: '#f43f5e', bgColor: 'bg-rose-50', textColor: 'text-rose-600', borderColor: 'border-rose-200' },
];

export const NIVELES_BASE = [
    {
        nivel: 4, nombre: 'Estratégico', color: '#22c55e', bg: 'bg-green-500', text: 'text-green-700', lightBg: 'bg-green-100',
        descripcion: 'Lidera procesos, propone soluciones innovadoras...'
    },
    {
        nivel: 3, nombre: 'Autónomo', color: '#eab308', bg: 'bg-yellow-400', text: 'text-yellow-700', lightBg: 'bg-yellow-100',
        descripcion: 'Realiza las tareas por sí solo, cumpliendo objetivos...'
    },
    {
        nivel: 2, nombre: 'Resolutivo', color: '#f97316', bg: 'bg-orange-500', text: 'text-orange-700', lightBg: 'bg-orange-100',
        descripcion: 'Identifica el problema y aplica procedimientos básicos...'
    },
    {
        nivel: 1, nombre: 'Receptivo', color: '#94a3b8', bg: 'bg-slate-400', text: 'text-slate-600', lightBg: 'bg-slate-100',
        descripcion: 'Requiere apoyo continuo para comprender tareas...'
    },
];

export const NIVELES = NIVELES_BASE;

export const MOCK_STATE: AppState = {
    instituto: 'Instituto Superior Tecnológico',
    cursos: [],
    cursoDocentes: [],
    estudiantes: [],
    actividades: [],
    calificaciones: [],
    recuperaciones: [],
    secuencias: [],
    incidencias: [],
    eventos: [],
    posts: [],
    descriptoresRubrica: [],
    nivelesPuntaje: [
        { nivel: 4, nombre: 'Estratégico', puntaje: 100, color: '#22c55e', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
        { nivel: 3, nombre: 'Autónomo', puntaje: 85, color: '#eab308', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
        { nivel: 2, nombre: 'Resolutivo', puntaje: 70, color: '#f97316', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
        { nivel: 1, nombre: 'Receptivo', puntaje: 55, color: '#94a3b8', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' },
    ],
    evaluacionesRubrica: [],
    criteriosCotejo: [],
    evaluacionesCotejo: [],
    docentes: [],
    plantillas: [],
    cursoDetalle: [],
    perfilBio: '',
    perfilAvatarUrl: '',
    perfiles: [],
    notificaciones: [],

    grupos: [],
    registrosAnecdoticos: [],
    registroImagenes: [],
    tareas: [],
};

export const initialState: AppState = {
    instituto: 'Instituto Central',
    cursos: [
        { id: 1, nombre: 'Matemáticas', asignatura: 'Matemáticas', grado: '2do', seccion: 'A', periodo: 'P1', diasSemana: ['Lun', 'Mar', 'Mie', 'Jue', 'Vie'], color: '#f97316', grupoId: 1 },
        { id: 2, nombre: 'Matemática', asignatura: 'Matemáticas', grado: '2do', seccion: 'C', periodo: 'P1', diasSemana: ['Lun', 'Mie', 'Vie'], color: '#f97316', grupoId: 2 },
        { id: 3, nombre: 'Lenguaje', asignatura: 'Lenguaje', grado: '3ro', seccion: 'B', periodo: 'P1', diasSemana: ['Mar', 'Jue'], color: '#8b5cf6', grupoId: 3 },
    ],
    estudiantes: [
        {
            id: 1, nombre: 'Ana', apellido: 'Martínez', avatarColor: '#f97316', cursoId: 1, grupoId: 1, nivel: 4, puntaje: 97,
            bc1: { nivel: 4, puntaje: 95 }, bc2: { nivel: 4, puntaje: 100 }, bc3: { nivel: 3, puntaje: 85 }, bc4: { nivel: 4, puntaje: 98 },
            actividadesRecientes: 2, enRiesgo: false, numeroLista: 1
        },
        {
            id: 2, nombre: 'Carlos', apellido: 'Rodríguez', avatarColor: '#3b82f6', cursoId: 1, grupoId: 1, nivel: 3, puntaje: 83,
            bc1: { nivel: 3, puntaje: 80 }, bc2: { nivel: 3, puntaje: 88 }, bc3: { nivel: 2, puntaje: 65 }, bc4: { nivel: 3, puntaje: 87 },
            actividadesRecientes: 2, enRiesgo: false, numeroLista: 2
        },
        {
            id: 3, nombre: 'Elena', apellido: 'Gómez', avatarColor: '#ec4899', cursoId: 1, grupoId: 1, nivel: 2, puntaje: 62,
            bc1: { nivel: 2, puntaje: 60 }, bc2: { nivel: 2, puntaje: 70 }, bc3: { nivel: 2, puntaje: 55 }, bc4: { nivel: 1, puntaje: 45 },
            actividadesRecientes: 1, enRiesgo: true, numeroLista: 3
        },
        {
            id: 4, nombre: 'Marco', apellido: 'López', avatarColor: '#10b981', cursoId: 2, grupoId: 2, nivel: 3, puntaje: 88,
            bc1: { nivel: 3, puntaje: 90 }, bc2: { nivel: 4, puntaje: 95 }, bc3: { nivel: 3, puntaje: 82 }, bc4: { nivel: 3, puntaje: 84 },
            actividadesRecientes: 2, enRiesgo: false, numeroLista: 1
        },
        {
            id: 5, nombre: 'Sofía', apellido: 'Herrera', avatarColor: '#8b5cf6', cursoId: 2, grupoId: 2, nivel: 1, puntaje: 42,
            bc1: { nivel: 1, puntaje: 35 }, bc2: { nivel: 1, puntaje: 42 }, bc3: { nivel: 1, puntaje: 38 }, bc4: { nivel: 2, puntaje: 55 },
            actividadesRecientes: 0, enRiesgo: true, numeroLista: 2
        },
        {
            id: 6, nombre: 'Pedro', apellido: 'Vega', avatarColor: '#f43f5e', cursoId: 3, grupoId: 3, nivel: 4, puntaje: 96,
            bc1: { nivel: 4, puntaje: 98 }, bc2: { nivel: 4, puntaje: 94 }, bc3: { nivel: 4, puntaje: 97 }, bc4: { nivel: 4, puntaje: 95 },
            actividadesRecientes: 2, enRiesgo: false, numeroLista: 1
        },
    ],
    actividades: [
        { id: 1, nombre: 'Expresión escrita', cursoId: 1, fecha: '2026-03-08', periodo: 'P1', bcAsignados: ['BC1'] as const, secuenciaId: 1, userId: '0000', asignatura: 'Matemáticas' },
        { id: 2, nombre: 'Resolución de problemas', cursoId: 1, fecha: '2026-03-05', periodo: 'P1', bcAsignados: ['BC2'] as const, secuenciaId: 1, userId: '0000', asignatura: 'Matemáticas' },
        { id: 3, nombre: 'Lab. de ciencias', cursoId: 2, fecha: '2026-03-08', periodo: 'P1', bcAsignados: ['BC3'] as const, userId: '0000', asignatura: 'Ciencias' },
        { id: 4, nombre: 'Análisis literario', cursoId: 3, fecha: '2026-03-06', periodo: 'P1', bcAsignados: ['BC1'] as const, secuenciaId: 2, userId: '0000', asignatura: 'Lengua Española' },
    ],
    calificaciones: [
        { cursoId: 1, estudianteId: 1, actividadId: 1, periodo: 'P1', competencias: ['BC1'], puntaje: 95, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 1, estudianteId: 1, actividadId: 2, periodo: 'P1', competencias: ['BC2'], puntaje: 100, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 1, estudianteId: 2, actividadId: 1, periodo: 'P1', competencias: ['BC1'], puntaje: 80, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 1, estudianteId: 2, actividadId: 2, periodo: 'P1', competencias: ['BC2'], puntaje: 88, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 1, estudianteId: 3, actividadId: 1, periodo: 'P1', competencias: ['BC1'], puntaje: 60, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 1, estudianteId: 3, actividadId: 2, periodo: 'P1', competencias: ['BC2'], puntaje: 55, descriptores: [], userId: '0000', asignatura: 'Matemáticas', recuperacion: null },
        { cursoId: 2, estudianteId: 4, actividadId: 3, periodo: 'P1', competencias: ['BC3'], puntaje: 90, descriptores: [], userId: '0000', asignatura: 'Ciencias', recuperacion: null },
        { cursoId: 2, estudianteId: 5, actividadId: 3, periodo: 'P1', competencias: ['BC3'], puntaje: 38, descriptores: [], userId: '0000', asignatura: 'Ciencias', recuperacion: null },
        { cursoId: 3, estudianteId: 6, actividadId: 4, periodo: 'P1', competencias: ['BC1'], puntaje: 98, descriptores: [], userId: '0000', asignatura: 'Lengua Española', recuperacion: null },
    ],
    recuperaciones: [
        { estudianteId: 3, cursoId: 1, bc: 1, puntaje: 68, periodo: 'P1' },
        { estudianteId: 5, cursoId: 2, bc: 1, puntaje: null, periodo: 'P1' },
    ],
    secuencias: [
        {
            id: 1, titulo: 'Unidad 1: Números y Operaciones', cursoId: 1, fechaInicio: '2026-03-01',
            contenidoHtml: '<h2>Unidad 1</h2><p>Esta unidad cubre números naturales, operaciones básicas y resolución de problemas contextualizados.</p><ul><li>Semana 1: Introducción</li><li>Semana 2: Operaciones</li></ul>', estado: 'En progreso'
        },
        {
            id: 2, titulo: 'Análisis de textos narrativos', cursoId: 3, fechaInicio: '2026-03-02',
            contenidoHtml: '<h2>Textos Narrativos</h2><p>Análisis estructural y semántico de cuentos y novelas cortas.</p>', estado: 'Pendiente'
        },
    ],
    incidencias: [
        {
            id: 1, estudianteId: 3, categoria: 'Académico',
            descripcion: 'Falta entrega de proyecto final. No presentó el trabajo asignado sin justificación.',
            accionesTomadas: ['Llamado de atención verbal', 'Notificación a padres'],
            acuerdos: 'Entrega pendiente para el viernes con aval del apoderado.', fecha: '2026-03-05',
            gravedad: 'grave'
        },
        {
            id: 2, estudianteId: 5, categoria: 'Conducta',
            descripcion: 'Comportamiento disruptivo durante la clase de Matemáticas.',
            accionesTomadas: ['Llamado de atención verbal', 'Citación a orientador'],
            acuerdos: 'Compromiso de mejora de comportamiento firmado.', fecha: '2026-03-06',
            gravedad: 'moderada'
        },
    ],
    eventos: [
        { id: 1, titulo: 'Junta de profesores', fecha: '2026-03-08', tipo: 'reunion' },
        { id: 2, titulo: 'Evaluación Trimestral', fecha: '2026-03-09', tipo: 'evaluacion' },
        { id: 3, titulo: 'Taller para padres', fecha: '2026-03-14', tipo: 'actividad' },
        { id: 4, titulo: 'Entrega de notas P1', fecha: '2026-03-20', tipo: 'evaluacion' },
    ],
    posts: [
        {
            id: 1, autor: 'Dr. Aris', cargo: 'Matemáticas', avatarColor: '#3b82f6',
            contenido: 'He diseñado esta rúbrica para evaluar el pensamiento crítico en proyectos de investigación. Incluye criterios sobre análisis de fuentes y síntesis de información.',
            tiempo: 'Hace 5 min', fechaPublicacion: '2026-03-08', likes: 42, likedByMe: false,
            tipo: 'rubrica', asignatura: 'Matemática'
        },
        {
            id: 2, autor: 'Prof. Elena', cargo: 'Pedagogía', avatarColor: '#ec4899',
            contenido: 'He subido una guía completa sobre Aprendizaje Basado en Proyectos (ABP) aplicada a entornos rurales con pocos recursos tecnológicos. Espero les sea de utilidad.',
            tiempo: 'Hace 20 min', fechaPublicacion: '2026-03-08', likes: 38, likedByMe: true,
            tipo: 'secuencia', asignatura: 'Español'
        },
        {
            id: 3, autor: 'Prof. García', cargo: 'Ciencias', avatarColor: '#10b981',
            contenido: '¿Alguien tiene experiencia con rúbricas de evaluación para escritura creativa en secundaria? Estoy diseñando una nueva y me vendría bien orientación.',
            tiempo: 'Hace 2h', fechaPublicacion: '2026-03-07', likes: 12, likedByMe: false,
            tipo: 'general', asignatura: 'Ciencias'
        },
    ],
    descriptoresRubrica: [
        {
            id: 'd1',
            bc: 'BC1', indicador: 'Expresión oral y escrita efectiva',
            estrategico: 'Demuestra dominio excepcional del lenguaje, adapta el discurso al contexto y utiliza recursos retóricos.',
            autonomo: 'Comunica ideas con claridad, coherencia y corrección gramatical en diversos formatos.',
            resolutivo: 'Logra transmitir el mensaje básico de forma comprensible pero con errores menores.',
            receptivo: 'Requiere apoyo para estructurar ideas y presenta dificultades significativas en la expresión.'
        },
        {
            id: 'd2',
            bc: 'BC2', indicador: 'Resolución de problemas críticos',
            estrategico: 'Analiza situaciones complejas, propone soluciones innovadoras y evalúa múltiples variables.',
            autonomo: 'Identifica problemas y aplica métodos lógicos para encontrar soluciones efectivas.',
            resolutivo: 'Resuelve problemas estándar siguiendo procedimientos aprendidos previamente.',
            receptivo: 'Identifica elementos del problema pero no logra articular una vía de solución clara.'
        },
        {
            id: 'd3',
            bc: 'BC3', indicador: 'Uso de tecnología y ambiente',
            estrategico: 'Integra herramientas tecnológicas avanzadas para investigar y mitigar impactos ambientales.',
            autonomo: 'Utiliza tecnología de forma responsable y comprende conceptos básicos de sostenibilidad.',
            resolutivo: 'Opera herramientas digitales básicas bajo supervisión y conoce acciones ecológicas.',
            receptivo: 'Reconoce la importancia del ambiente pero tiene un uso limitado de recursos técnicos.'
        },
        {
            id: 'd4',
            bc: 'BC4', indicador: 'Desarrollo Personal y Ciudadano',
            estrategico: 'Lidera iniciativas comunitarias con alta responsabilidad ética and conciencia social profunda.',
            autonomo: 'Participa activamente en la convivencia escolar respetando normas y valores éticos.',
            resolutivo: 'Muestra actitudes de respeto y cumple con sus deberes básicos como estudiante.',
            receptivo: 'Asume conductas receptivas frente a la norma pero le cuesta la autorregulación.'
        },
    ],
    nivelesPuntaje: [
        { nivel: 4, nombre: 'Estratégico', puntaje: 100, color: '#22c55e', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
        { nivel: 3, nombre: 'Autónomo', puntaje: 85, color: '#eab308', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
        { nivel: 2, nombre: 'Resolutivo', puntaje: 70, color: '#f97316', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
        { nivel: 1, nombre: 'Receptivo', puntaje: 55, color: '#94a3b8', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' },
    ],
    evaluacionesRubrica: [],
    criteriosCotejo: [
        { id: 1, titulo: 'Identificación de variables', descripcion: 'Define correctamente las incógnitas del problema planteado.' },
        { id: 2, titulo: 'Procedimiento Lógico', descripcion: 'Sigue una secuencia coherente en los pasos de resolución.' },
        { id: 3, titulo: 'Precisión del Resultado', descripcion: 'Llega a la solución numérica exacta con unidades correctas.' },
        { id: 4, titulo: 'Justificación Teórica', descripcion: 'Explica las leyes o principios físicos aplicados.' },
    ],
    evaluacionesCotejo: [],
    docentes: [
        { id: 1, nombre: 'Aris', asignatura: 'Matemática', avatarColor: '#3b82f6' },
        { id: 2, nombre: 'Elena', asignatura: 'Lengua Española', avatarColor: '#ec4899' },
        { id: 3, nombre: 'García', asignatura: 'Ciencias de la Naturaleza', avatarColor: '#10b981' },
        { id: 4, nombre: 'Mendoza', asignatura: 'Ciencias Sociales', avatarColor: '#f97316' },
        { id: 5, nombre: 'Pérez', asignatura: 'Educación Física', avatarColor: '#8b5cf6' },
        { id: 6, nombre: 'Gómez', asignatura: 'Educación Artística', avatarColor: '#eab308' },
        { id: 7, nombre: 'Smith', asignatura: 'Lenguas Extranjeras (Inglés)', avatarColor: '#f43f5e' }
    ],
    plantillas: [],
    cursoDetalle: [],
    perfilBio: '',
    perfilAvatarUrl: '',
    perfiles: [],
    notificaciones: [],

    cursoDocentes: [],
    grupos: [
        { id: 1, nombre: '2do A', grado: '2do', seccion: 'A' },
        { id: 2, nombre: '2do C', grado: '2do', seccion: 'C' },
        { id: 3, nombre: '3ro B', grado: '3ro', seccion: 'B' },
    ],
    registrosAnecdoticos: [],
    registroImagenes: [],
    tareas: [],
};
