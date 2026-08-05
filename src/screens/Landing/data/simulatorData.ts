import type { AppState, Curso, Estudiante, Actividad, CalificacionActividad } from '../../../types';

const cursoDemo: Curso = {
    id: 999,
    grado: '6to',
    seccion: 'B',
    nombre: 'Lengua Española',
    asignatura: 'Lengua Española',
    periodo: 'P1',
    diasSemana: [],
    color: '#7A8D69',
    grupoId: 1
};

const estudiantesDemo: Estudiante[] = [
    { id: 1001, nombre: 'Isabella', apellido: 'Rosario', avatarColor: '#B87449', cursoId: 999, grupoId: 1, nivel: 1, puntaje: 0, bc1: {nivel: 1, puntaje: 0}, bc2: {nivel: 1, puntaje: 0}, bc3: {nivel: 1, puntaje: 0}, bc4: {nivel: 1, puntaje: 0}, actividadesRecientes: 0, enRiesgo: false, numeroLista: 1 },
    { id: 1002, nombre: 'Mateo', apellido: 'Jiménez', avatarColor: '#7A8D69', cursoId: 999, grupoId: 1, nivel: 1, puntaje: 0, bc1: {nivel: 1, puntaje: 0}, bc2: {nivel: 1, puntaje: 0}, bc3: {nivel: 1, puntaje: 0}, bc4: {nivel: 1, puntaje: 0}, actividadesRecientes: 0, enRiesgo: false, numeroLista: 2 },
    { id: 1003, nombre: 'Valentina', apellido: 'Cruz', avatarColor: '#EB8847', cursoId: 999, grupoId: 1, nivel: 1, puntaje: 0, bc1: {nivel: 1, puntaje: 0}, bc2: {nivel: 1, puntaje: 0}, bc3: {nivel: 1, puntaje: 0}, bc4: {nivel: 1, puntaje: 0}, actividadesRecientes: 0, enRiesgo: false, numeroLista: 3 },
];

const actividadesDemo: Actividad[] = [
    {
        id: 5001,
        cursoId: 999,
        periodo: 'P1',
        nombre: 'Ensayo Analítico',
        fecha: '2026-08-01',
        bcAsignados: ['BC1'],
        userId: 'demo',
        asignatura: 'Lengua Española'
    },
    {
        id: 5002,
        cursoId: 999,
        periodo: 'P1',
        nombre: 'Participación Activa',
        fecha: '2026-08-05',
        bcAsignados: ['BC3', 'BC4'],
        userId: 'demo',
        asignatura: 'Lengua Española'
    }
];

const calificacionesDemo: CalificacionActividad[] = [];
estudiantesDemo.forEach(est => {
    actividadesDemo.forEach(act => {
        calificacionesDemo.push({
            id: Math.random(),
            cursoId: 999,
            estudianteId: est.id,
            actividadId: act.id,
            userId: 'demo',
            asignatura: 'Lengua Española',
            periodo: act.periodo,
            competencias: act.bcAsignados,
            descriptores: [],
            puntaje: Math.floor(Math.random() * 20) + 80,
            recuperacion: null
        });
    });
});

export const simulatorData: AppState = {
    cursos: [cursoDemo],
    cursoDocentes: [{ id: 1, cursoId: 999, userId: 'demo', rol: 'tutor', asignatura: 'Lengua Española' }],
    estudiantes: estudiantesDemo,
    actividades: actividadesDemo,
    calificaciones: calificacionesDemo,
    recuperaciones: [],
    secuencias: [],
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
    perfiles: [],
    notificaciones: [],
    grupos: [],
    registrosAnecdoticos: [],
    registroImagenes: [],
    tareas: [],
    instituto: 'Noether Academia',
    incidencias: [],
};
