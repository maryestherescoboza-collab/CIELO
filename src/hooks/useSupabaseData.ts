import { useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { Plantilla, Post, UserProfile, Curso, Estudiante, Actividad, CalificacionActividad, RecuperacionBC, Secuencia, EventoCalendario, Docente, EvaluacionRubrica, EvaluacionCotejo, CriterioCotejo, DescriptorRubrica, NivelPuntaje, CursoDetalleEvaluacion, Notification, BCScore, BCKey, Nivel, CursoDocente, Grupo, Incidencia, RegistroAnecdotico, RegistroImagen, TareaInstitucional, TareaDocente, Centro } from '../types';
import { useAppStore } from '../store/appStore';
import { esRolAdministrador } from '../utils/autorizacion';

const parseObservaciones = (val: any): string[] => {
    if (!val) return [];
    if (Array.isArray(val)) return val.map(String).filter(Boolean);
    if (typeof val === 'string') {
        const trimmed = val.trim();
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
            } catch (e) {
                // Fallback to text split or single string
            }
        }
        return trimmed ? [trimmed] : [];
    }
    return [];
};

const sanitizeNivelesPuntaje = (fetchedNiveles: any[] | null | undefined): NivelPuntaje[] => {
    const defaults: Record<number, { puntaje: number; nombre: string; color: string; description: string }> = {
        4: { puntaje: 100, nombre: 'Estratégico', color: '#5F9563', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
        3: { puntaje: 85, nombre: 'Autónomo', color: '#79C599', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
        2: { puntaje: 70, nombre: 'Resolutivo', color: '#D68253', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
        1: { puntaje: 55, nombre: 'Receptivo', color: '#C63D3D', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' }
    };

    const result: NivelPuntaje[] = [];
    const rawList = fetchedNiveles || [];

    for (let nivel = 1; nivel <= 4; nivel++) {
        const found = rawList.find(n => Number(n.nivel) === nivel);
        const defaultVal = defaults[nivel];
        if (found) {
            const currentPuntaje = found.puntaje !== null && found.puntaje !== undefined ? Number(found.puntaje) : 0;
            result.push({
                nivel: nivel as 1 | 2 | 3 | 4,
                nombre: found.nombre || defaultVal.nombre,
                puntaje: (!currentPuntaje || currentPuntaje === 0) ? defaultVal.puntaje : currentPuntaje,
                color: found.color || defaultVal.color,
                description: found.descripcion || found.description || defaultVal.description
            });
        } else {
            result.push({
                nivel: nivel as 1 | 2 | 3 | 4,
                nombre: defaultVal.nombre,
                puntaje: defaultVal.puntaje,
                color: defaultVal.color,
                description: defaultVal.description
            });
        }
    }

    return result.sort((a, b) => b.nivel - a.nivel);
};

export function useSupabaseData() {
    const { state, setAppState: setState, loading, setLoading, session, setSession } = useAppStore();

    useEffect(() => {
        supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
            setSession(currentSession);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
            setSession(currentSession);
        });

        return () => subscription.unsubscribe();
    }, []);

    const fetchData = useCallback(async (isSilent = false) => {
        if (!session?.user?.id) return;
        if (!isSilent) setLoading(true);
        try {
            const results = await Promise.all([
                supabase.from('perfiles').select('*, centros!perfiles_centro_id_fkey(*)'),
                supabase.from('cursos').select('*'),
                supabase.from('estudiantes').select('*').eq('activo', true),
                supabase.from('actividades').select('*').eq('activo', true),
                supabase.from('calificaciones').select('*').eq('activo', true),
                supabase.from('recuperaciones').select('*').eq('activo', true),
                supabase.from('secuencias').select('*').eq('activo', true),
                supabase.from('incidencias').select('*').eq('activo', true),
                supabase.from('eventos').select('*'),
                supabase.from('posts').select('*, profiles:perfiles(nombre_docente, avatar_url, bio)').order('id', { ascending: false }),
                supabase.from('docentes').select('*'),
                supabase.from('evaluaciones_rubrica').select('*'),
                supabase.from('evaluaciones_cotejo').select('*'),
                supabase.from('criterios_cotejo').select('*'),
                supabase.from('descriptores_rubrica').select('*'),
                supabase.from('niveles_puntaje').select('*'),
                supabase.from('plantillas').select('*').eq('archivado', false).order('created_at', { ascending: false }),
                supabase.from('curso_detalle').select('*'),
                supabase.from('notificaciones').select('*').eq('leida', false).order('created_at', { ascending: false }),

                supabase.from('curso_docentes').select('*').eq('activo', true),
                supabase.from('grupos').select('*'),
                supabase.from('registros_anecdoticos').select('*').eq('activo', true).order('fecha', { ascending: false }),
                supabase.from('registro_imagenes').select('*'),
                supabase.from('historial_colaboradores').select('*'),
                supabase.from('suscripciones').select('*'),
                supabase.from('centro_roles').select('*'),
                supabase.from('tareas_institucionales').select('*'), // o manejar activo si se añade, sino quitar eq
                supabase.from('tarea_docente').select('*'),
            ]);

            // Nombres de tabla para logging de errores
            const tableNames = [
                'perfiles', 'cursos', 'estudiantes', 'actividades', 'calificaciones',
                'recuperaciones', 'secuencias', 'incidencias', 'eventos', 'posts',
                'docentes', 'evaluaciones_rubrica', 'evaluaciones_cotejo', 'criterios_cotejo',
                'descriptores_rubrica', 'niveles_puntaje', 'plantillas', 'curso_detalle',
                'notificaciones', 'curso_docentes', 'grupos',
                'registros_anecdoticos', 'registro_imagenes', 'historial_colaboradores',
                'suscripciones', 'centro_roles', 'tareas_institucionales', 'tarea_docente'
            ];

            // Detectar y reportar errores de consulta sin silenciarlos
            const queryErrors: string[] = [];
            results.forEach((result, idx) => {
                if (result.error) {
                    queryErrors.push(`[${tableNames[idx]}] ${result.error.message} (code: ${result.error.code})`);
                    console.error(`[Supabase fetchData] Error en tabla "${tableNames[idx]}":`, result.error);
                }
            });
            if (queryErrors.length > 0) {
                console.warn(`[Supabase fetchData] ${queryErrors.length} consulta(s) fallaron. Las tablas afectadas conservarán sus valores previos.`);
            }

            // Extraer data con seguridad: si una consulta falló, su data será null
            const perfiles = results[0].data;
            const cursos = results[1].data;
            const estudiantes = results[2].data;
            const actividades = results[3].data;
            const calificaciones = results[4].error ? null : results[4].data;
            const recuperaciones = results[5].error ? null : results[5].data;
            const secuencias = results[6].data;
            const incidencias = results[7].data;
            const eventos = results[8].data;
            const posts = results[9].data;
            const docentes = results[10].data;
            const evaluacionesRubrica = results[11].data;
            const evaluacionesCotejo = results[12].data;
            const criteriosCotejo = results[13].data;
            const descriptoresRubrica = results[14].data;
            const nivelesPuntaje = results[15].data;
            const plantillas = results[16].data;
            const cursoDetalle = results[17].data;
            const notificaciones = results[18].data;
            const cursoDocentes = results[19].data;
            const grupos = results[20].data;
            const registrosAnecdoticos = results[21].data;
            const registroImagenes = results[22].data;
            const historialColaboradores = results[23].data;
            const suscripciones = results[24].data;
            const centroRoles = results[25].data;
            const tareas = results[26].data;
            const tareaAsignaciones = results[27].data;

            const mappedPerfiles = (perfiles || []).map((p: Record<string, unknown>): UserProfile => {
                const cArray = p.centros;
                const centroObj = (Array.isArray(cArray) ? cArray[0] : cArray) as Record<string, unknown> | undefined;
                const resolvedCentro = centroObj ? {
                    id: centroObj.id as string,
                    nombre: centroObj.nombre as string,
                    codigoCentro: centroObj.codigo_centro as string || '',
                    tanda: centroObj.tanda as string || 'Jornada Extendida',
                    telefono: centroObj.telefono as string || '',
                    distritoEducativo: centroObj.distrito_educativo as string || '',
                    regionalEducacion: centroObj.regional_educacion as string || '',
                    provincia: centroObj.provincia as string || '',
                    municipio: centroObj.municipio as string || '',
                    createdBy: centroObj.created_by as string,
                    createdAt: centroObj.created_at as string,
                    updatedAt: centroObj.updated_at as string,
                    estado: (centroObj.estado as Centro['estado']) || 'activo',
                    afiliado: centroObj.afiliado as boolean || false
                } : undefined;

                const hist = (historialColaboradores || []).find((h: Record<string, unknown>) => h.usuario_id === p.user_id);

                return {
                    userId: p.user_id as string,
                    nombreDocente: p.nombre_docente as string || p.nombre as string || '',
                    bio: p.bio as string || '',
                    avatarUrl: p.avatar_url as string || '',
                    avatarColor: p.avatar_color as string || '',
                    asignatura: Array.isArray(p.asignaturas) ? p.asignaturas[0] : (p.asignatura as string || ''),
                    institucion: resolvedCentro?.nombre || '',
                    instituto: resolvedCentro?.nombre || '',
                    centro_id: p.centro_id as string || undefined,
                    centro: resolvedCentro,
                    rol: (p.rol as UserProfile['rol']) || undefined,
                    lastSeen: p.last_seen as string,
                    currentModule: p.current_module as string,
                    publicacionesRealizadas: hist ? (hist.publicaciones_realizadas as number) : 0
                };
            });

            // Compute current subscription and role
            const currentUserProfile = mappedPerfiles.find(p => p.userId === session.user.id);
            const userCentroId = currentUserProfile?.centro_id;

            let resolvedSuscripcionActual = undefined;
            if (suscripciones && suscripciones.length > 0) {
                const institucionales = suscripciones.filter(s => s.centro_id === userCentroId && s.tipo === 'institucional' && s.estado === 'activa');
                const individuales = suscripciones.filter(s => s.user_id === session.user.id && s.tipo === 'individual' && s.estado === 'activa');
                const promocionales = suscripciones.filter(s => s.user_id === session.user.id && s.tipo === 'promocional' && s.estado === 'activa');
                
                if (institucionales.length > 0) {
                    resolvedSuscripcionActual = institucionales[0];
                } else if (individuales.length > 0) {
                    resolvedSuscripcionActual = individuales[0];
                } else if (promocionales.length > 0) {
                    resolvedSuscripcionActual = promocionales[0];
                }
            }
            
            // La ÚNICA fuente de verdad es perfiles.rol. 'administrador' => gestión
            // de Centro. Cualquiera de los roles administrativos (incluidos los
            // 4 del modelo: administrador, administrador_centro, administrador_global y
            // el heredado director) habilita el rol del centro activo; los demás
            // valores (docente, NULL, desconocidos) no son administrativos y se
            // resuelven mediante el flujo normal de docente.
            const resolvedCentroRolActual = (() => {
                if (!esRolAdministrador(currentUserProfile?.rol)) return undefined;
                const userCentroRoles = (centroRoles || []).filter((cr: any) => cr.user_id === session.user.id);
                const rolDelCentroActual = userCentroRoles.find((cr: any) => cr.centro_id === userCentroId);
                return {
                    id: rolDelCentroActual?.id || (currentUserProfile?.userId || '') || '',
                    centro_id: userCentroId || rolDelCentroActual?.centro_id || (userCentroRoles[0]?.centro_id ?? '') || '',
                    user_id: session.user.id,
                    rol: 'administrador' as const,
                };
            })();

            setState(prev => {
                const mappedPosts = (posts || []).map((p: Record<string, unknown>): Post => {
                    const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Record<string, unknown> | undefined;
                    
                    let resolvedRecursoDatos = p.recurso_datos as Record<string, unknown> | undefined;
                    if (!resolvedRecursoDatos && p.recurso_id && p.tipo) {
                        if (p.tipo === 'secuencia') {
                            resolvedRecursoDatos = (secuencias || []).find((s: Record<string, unknown>) => s.id === p.recurso_id) as Record<string, unknown> | undefined;
                        } else if (p.tipo === 'rubrica' || p.tipo === 'cotejo') {
                            resolvedRecursoDatos = (plantillas || []).find((pl: Record<string, unknown>) => pl.id === p.recurso_id) as Record<string, unknown> | undefined;
                        }
                    }

                    return {
                        id: p.id as number,
                        autor: prof?.nombre_docente as string || p.autor as string,
                        cargo: p.cargo as string,
                        avatarUrl: prof?.avatar_url as string || '',
                        contenido: p.contenido as string,
                        tiempo: p.tiempo as string || 'Hace un momento',
                        fechaPublicacion: p.fecha_publicacion as string,
                        tipo: p.tipo as 'rubrica' | 'secuencia' | 'general' | 'cotejo',
                        asignatura: p.asignatura as string,
                        userId: p.user_id as string,
                        userBio: prof?.bio as string || '',
                        expiresAt: p.expires_at as string,
                        recursoDatos: resolvedRecursoDatos || {},
                        recursoId: p.recurso_id as number,
                    };
                });

                const optimisticPosts = prev.posts.filter(p => 
                    p.isOptimistic && !mappedPosts.some(mp => mp.id === p.id)
                );

                return {
                ...prev,
                perfiles: mappedPerfiles,
                cursos: (cursos || []).map((c: Record<string, unknown>): Curso | null => {
                    const myLink = (cursoDocentes || []).find((cd: any) => cd.curso_id === c.id && String(cd.docente_id) === session.user.id);
                    const isCreator = String(c.user_id) === session.user.id;
                    const isCentroAdmin = !!resolvedCentroRolActual &&
                        resolvedCentroRolActual.rol === 'administrador' &&
                        !!c.centro_id && c.centro_id === resolvedCentroRolActual.centro_id;
                    // Aislamiento entre centros: un curso creado por el docente en
                    // OTRO centro (diferente al que está vinculado ahora) no debe
                    // seguir apareciendo en su entorno tras un cambio de centro.
                    if (isCreator && !isCentroAdmin && userCentroId && c.centro_id && c.centro_id !== userCentroId) return null;
                    if (!myLink && !isCreator && !isCentroAdmin) return null;
                    return {
                        id: c.id as number,
                        nombre: c.nombre as string,
                        asignatura: myLink ? (myLink.asignatura as string) : (c.asignatura as string),
                        grado: c.grado as string,
                        seccion: c.seccion as string,
                        periodo: c.periodo as string,
                        diasSemana: myLink ? (myLink.dias_semana as string[] || []) : [],
                        color: c.color as string,
                        isTutorOficial: c.is_tutor_oficial as boolean,
                        userId: c.user_id as string,
                        grupoId: c.grupo_id as number,
                        sharedCourseId: (c.shared_course_id as string) || (c.grupo_id ? `group_${c.grupo_id}` : String(c.id)),
                        centroId: c.centro_id as string,
                        configuracionEvaluacion: c.configuracion_evaluacion as Record<string, unknown> || {},
                        createdAt: c.created_at as string
                    };
                }).filter((x): x is Curso => x !== null),
                estudiantes: (estudiantes || []).map((e: Record<string, unknown>): Estudiante => ({
                    id: e.id as number,
                    nombre: e.nombre as string,
                    apellido: e.apellido as string,
                    avatarColor: e.avatar_color as string,
                    cursoId: e.curso_id as number,
                    grupoId: e.grupo_id as number,
                    userId: e.docente_id as string,
                    sharedCourseId: (e.shared_course_id as string) || (e.grupo_id ? `group_${e.grupo_id}` : String(e.curso_id)),
                    nivel: e.nivel as 1 | 2 | 3 | 4,
                    puntaje: e.puntaje as number,
                    bc1: e.bc1 as BCScore || { nivel: 1, puntaje: 0 },
                    bc2: e.bc2 as BCScore || { nivel: 1, puntaje: 0 },
                    bc3: e.bc3 as BCScore || { nivel: 1, puntaje: 0 },
                    bc4: e.bc4 as BCScore || { nivel: 1, puntaje: 0 },
                    actividadesRecientes: e.actividades_recientes as number,
                    enRiesgo: e.en_riesgo as boolean,
                    numeroLista: e.numero_lista as number
                })),
                actividades: (actividades || []).map((a: Record<string, unknown>): Actividad => ({
                    id: a.id as number,
                    nombre: a.nombre as string,
                    cursoId: a.curso_id as number,
                    fecha: a.fecha as string,
                    periodo: a.periodo as string,
                    bcAsignados: (a.bc_asignados && (a.bc_asignados as BCKey[]).length > 0)
                        ? a.bc_asignados as BCKey[]
                        : ['BC1'] as BCKey[],
                    secuenciaId: a.secuencia_id as number,
                    isRec: a.is_rec as boolean,
                    userId: a.user_id as string,
                    asignatura: a.asignatura as string,
                    sharedCourseId: a.shared_course_id as string || (cursos?.find(cur => cur.id === a.curso_id)?.grupo_id ? `group_${cursos.find(cur => cur.id === a.curso_id)?.grupo_id}` : String(a.curso_id))
                })),
                // Si la consulta de calificaciones falló (RLS/permisos), conservar estado previo
                calificaciones: calificaciones === null ? prev.calificaciones : calificaciones.map((c: Record<string, unknown>): CalificacionActividad => ({
                    id: c.id as number,
                    cursoId: c.curso_id as number,
                    estudianteId: c.estudiante_id as number,
                    actividadId: c.actividad_id as number,
                    userId: c.user_id as string || '',
                    asignatura: c.asignatura as string || '',
                    periodo: c.periodo as string,
                    competencias: c.competencias as BCKey[] || [],
                    descriptores: c.descriptores as string[] || [],
                    puntaje: c.puntaje as number,
                    recuperacion: c.recuperacion as number,
                    sharedCourseId: (c.shared_course_id as string) || (cursos?.find(cur => cur.id === c.curso_id)?.grupo_id ? `group_${cursos.find(cur => cur.id === c.curso_id)?.grupo_id}` : String(c.curso_id))
                })),
                // Si la consulta de recuperaciones falló (RLS/permisos), conservar estado previo
                recuperaciones: recuperaciones === null ? prev.recuperaciones : recuperaciones.map((r: Record<string, unknown>): RecuperacionBC => ({
                    estudianteId: r.estudiante_id as number,
                    cursoId: r.curso_id as number,
                    bc: Number(r.bc) as 1 | 2 | 3 | 4,
                    puntaje: r.puntaje as number,
                    periodo: r.periodo as string,
                    sharedCourseId: (r.shared_course_id as string) || (cursos?.find(cur => cur.id === r.curso_id)?.grupo_id ? `group_${cursos.find(cur => cur.id === r.curso_id)?.grupo_id}` : String(r.curso_id)),
                    userId: r.user_id as string,
                    asignatura: r.asignatura as string,
                    fecha: r.created_at as string
                })),
                secuencias: (secuencias || []).map((s: Record<string, unknown>): Secuencia => ({
                    id: s.id as number,
                    titulo: s.titulo as string,
                    cursoId: s.curso_id as number,
                    fechaInicio: s.fecha_inicio as string,
                    contenidoHtml: s.contenido_html as string,
                    estado: s.estado as 'Pendiente' | 'En progreso' | 'Completada',
                    archivoUrl: s.archivo_url as string | undefined,
                    archivoNombre: s.archivo_nombre as string | undefined,
                    archivoSize: s.archivo_size as number | undefined,
                    archivoTipo: s.archivo_tipo as string | undefined,
                    archivoFechaCarga: s.archivo_fecha_carga as string | undefined
                })),
                                incidencias: (incidencias || []).map((i: Record<string, unknown>): Incidencia => ({
                    id: i.id as number,
                    estudianteId: i.estudiante_id as number,
                    categoria: i.categoria as 'Conducta' | 'Académico' | 'Salud' | 'Otro',
                    descripcion: i.descripcion as string,
                    accionesTomadas: i.acciones_tomadas as string[] || [],
                    acuerdos: i.acuerdos as string,
                    fecha: i.fecha as string,
                    gravedad: i.gravedad as 'leve' | 'moderada' | 'grave',
                    userId: i.user_id as string,
                    sharedCourseId: (i.shared_course_id as string) || (estudiantes?.find(e => e.id === i.estudiante_id)?.shared_course_id as string) || (estudiantes?.find(e => e.id === i.estudiante_id)?.curso_id ? String(estudiantes?.find(e => e.id === i.estudiante_id)?.curso_id) : '')
                })),
                eventos: (eventos || []).map((ev: Record<string, unknown>): EventoCalendario => ({
                    id: ev.id as number,
                    titulo: ev.titulo as string,
                    fecha: ev.fecha as string,
                    tipo: ev.tipo as 'evaluacion' | 'reunion' | 'actividad' | 'otro'
                })),
                posts: [...optimisticPosts, ...mappedPosts],
                docentes: Array.from(new Map<string, Docente>([
                    ...(docentes || []).map((d: Record<string, unknown>): [string, Docente] => [d.nombre as string || '', {
                        id: d.id as string | number,
                        userId: d.user_id as string,
                        nombre: d.nombre as string || 'Colega',
                        asignatura: d.asignatura as string || '',
                        avatarColor: d.avatar_color as string || '#3b82f6'
                    }]),
                    ...(perfiles || []).map((p: Record<string, unknown>): [string, Docente] => [p.nombre_docente as string || p.nombre as string, {
                        id: p.user_id as string,
                        userId: p.user_id as string,
                        nombre: (p.nombre_docente as string || p.nombre as string || ''),
                        asignatura: Array.isArray(p.asignaturas) ? p.asignaturas[0] : (p.asignatura as string || ''),
                        avatarColor: p.avatar_color as string || '#3b82f6'
                    }])
                ]).values()),
                evaluacionesRubrica: (evaluacionesRubrica || []).map((er: Record<string, unknown>): EvaluacionRubrica => ({
                    id: er.id as number,
                    estudianteId: er.estudiante_id as number,
                    actividadId: er.actividad_id as number,
                    cursoId: er.curso_id as number,
                    fecha: er.fecha as string,
                    selecciones: er.selecciones as Partial<Record<BCKey, Nivel>>,
                    observaciones: er.observaciones as string,
                    puntajeTotal: er.puntaje_total as number,
                    sharedCourseId: er.shared_course_id as string || String(er.curso_id)
                })),
                evaluacionesCotejo: (evaluacionesCotejo || []).map((ec: Record<string, unknown>): EvaluacionCotejo => ({
                    id: ec.id as number,
                    estudianteId: ec.estudiante_id as number,
                    actividadId: ec.actividad_id as number,
                    cursoId: ec.curso_id as number,
                    fecha: ec.fecha as string,
                    respuestas: ec.respuestas as Record<number, number | null>,
                    comentarios: ec.comentarios as string,
                    puntaje: ec.puntaje as number,
                    sharedCourseId: ec.shared_course_id as string || String(ec.curso_id)
                })),
                criteriosCotejo: (criteriosCotejo || []).map((cc: Record<string, unknown>): CriterioCotejo => ({
                    id: cc.id as number,
                    titulo: cc.titulo as string,
                    descripcion: cc.descripcion as string,
                })),
                descriptoresRubrica: (descriptoresRubrica || []).map((dr: Record<string, unknown>): DescriptorRubrica => ({
                    id: String(dr.id),
                    bc: dr.bc as BCKey,
                    indicador: dr.indicador as string,
                    estrategico: dr.estrategico as string,
                    autonomo: dr.autonomo as string,
                    resolutivo: dr.resolutivo as string,
                    receptivo: dr.receptivo as string,
                    plantillaId: dr.plantilla_id ? Number(dr.plantilla_id) : null
                })),
                nivelesPuntaje: sanitizeNivelesPuntaje(nivelesPuntaje),
                plantillas: (plantillas || []).map((p): Plantilla => ({
                    id: p.id,
                    tipo: p.tipo,
                    nombre: p.nombre,
                    datos: p.datos || {},
                    createdAt: p.created_at,
                })),
                cursoDetalle: (cursoDetalle || []).map((cd: Record<string, unknown>): CursoDetalleEvaluacion => ({
                    id: cd.id as number,
                    cursoId: cd.curso_id as number,
                    actividadId: cd.actividad_id as number,
                    estudianteId: cd.estudiante_id as number,
                    rubricaData: cd.rubrica_data as Record<string, unknown> || {},
                    cotejoData: cd.cotejo_data as Record<string, unknown> || {},
                    puntajeTotal: cd.puntaje_total as number,
                    observaciones: parseObservaciones(cd.observaciones),
                    plantillaId: cd.plantilla_id as number,
                    descriptores: [], 
                    createdAt: cd.created_at as string,
                    sharedCourseId: cd.shared_course_id as string || String(cd.curso_id)
                })),
                notificaciones: (notificaciones || []).map((n: Record<string, unknown>): Notification => ({
                    id: n.id as number,
                    userId: n.user_id as string,
                    actorId: n.actor_id as string,
                    titulo: n.titulo as string,
                    mensaje: n.mensaje as string,
                    leida: n.leida as boolean,
                    tipo: n.tipo as string,
                    postId: n.post_id as number,
                    tareaId: n.tarea_institucional_id as string,
                    grado: n.grado as string,
                    seccion: n.seccion as string,
                    estado: n.estado as 'pendiente' | 'resuelto',
                    createdAt: n.created_at as string,
                    fechaLectura: n.fecha_lectura as string
                })),

                cursoDocentes: (cursoDocentes || []).map((cd: Record<string, unknown>): CursoDocente => ({
                    id: cd.id as number,
                    cursoId: cd.curso_id as number,
                    userId: String(cd.docente_id),
                    rol: cd.rol as 'tutor' | 'co-docente',
                    esTutor: cd.es_tutor as boolean,
                    asignatura: cd.asignatura as string,
                    diasSemana: cd.dias_semana as string[] || [],
                    createdAt: cd.created_at as string
                })),
                grupos: (grupos || []).map((g: Record<string, unknown>): Grupo => ({
                    id: g.id as number,
                    nombre: g.nombre as string,
                    grado: g.grado as string,
                    seccion: g.seccion as string,
                    createdAt: g.created_at as string
                })),
                                registrosAnecdoticos: (registrosAnecdoticos || []).map((ra: Record<string, unknown>): RegistroAnecdotico => ({
                    id: ra.id as number,
                    cursoId: ra.curso_id as number,
                    profileId: ra.profile_id as string,
                    fecha: ra.fecha as string,
                    titulo: ra.titulo as string,
                    descripcion: ra.descripcion as string,
                    createdAt: ra.created_at as string,
                    updatedAt: ra.updated_at as string
                })),
                registroImagenes: (registroImagenes || []).map((ri: Record<string, unknown>): RegistroImagen => ({
                    id: ri.id as number,
                    registroId: ri.registro_id as number,
                    imagenUrl: ri.imagen_url as string,
                    createdAt: ri.created_at as string
                })),

                tareas: (tareas || []).map((t: Record<string, unknown>): TareaInstitucional => ({
                    id: t.id as string,
                    centroId: t.centro_id as string,
                    titulo: t.titulo as string,
                    descripcion: (t.descripcion as string) || '',
                    fechaLimite: (t.fecha_limite as string) || '',
                    prioridad: (t.prioridad as string) || 'normal',
                    createdBy: t.created_by as string,
                    createdAt: t.created_at as string,
                    asignaciones: (tareaAsignaciones || [])
                        .filter((ta: Record<string, unknown>) => ta.tarea_id === t.id)
                        .map((ta: Record<string, unknown>): TareaDocente => ({
                            id: ta.id as string,
                            tareaId: ta.tarea_id as string,
                            docenteId: ta.docente_id as string,
                            estado: ta.estado as 'pendiente' | 'en_progreso' | 'completada' | 'vencida',
                            fechaEntrega: ta.fecha_entrega as string,
                            observaciones: ta.observaciones as string,
                            archivosEntrega: ta.archivos_entrega as string,
                            createdAt: ta.created_at as string
                        }))
                })),
                
                suscripcionActual: resolvedSuscripcionActual,
                centroRolActual: resolvedCentroRolActual
            };});
        } catch (error) {
            console.error('Error fetching data from Supabase:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [session]);

    useEffect(() => {
        if (session) {
            fetchData();
            // Intervalo silencioso de respaldo más largo
            const interval = setInterval(() => fetchData(true), 120000);

            // Realtime para evitar recargas constantes pero mantener sincronización
            const channel = supabase.channel(`db-changes-${session.user.id}-${Date.now()}`)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'posts' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'historial_colaboradores' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${session.user.id}` }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'curso_detalle' }, () => fetchData(true))

                .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperaciones' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'curso_docentes' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'cursos' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'estudiantes' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'actividades' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'grupos' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_anecdoticos', filter: `profile_id=eq.${session.user.id}` }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'registro_imagenes' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tareas_institucionales' }, () => fetchData(true))
                .on('postgres_changes', { event: '*', schema: 'public', table: 'tarea_docente' }, () => fetchData(true))
                .subscribe();

            return () => {
                clearInterval(interval);
                supabase.removeChannel(channel);
            };
        } else {
            setLoading(false);
        }
    }, [session, fetchData]);


    const syncUpsert = useCallback(async (table: string, data: Record<string, unknown> | Record<string, unknown>[]) => {
        if (!session?.user?.id) return;

        const toSnakeCase = (obj: Record<string, unknown>) => {
            const snakeObj: Record<string, unknown> = {};
            for (const key in obj) {
                const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                snakeObj[snakeKey] = obj[key];
            }
            return snakeObj;
        };

        const dbData = Array.isArray(data)
            ? (data as Record<string, unknown>[]).map(toSnakeCase)
            : toSnakeCase(data as Record<string, unknown>);

        if (Array.isArray(dbData)) {
            dbData.forEach(item => (item as Record<string, unknown>).user_id = session.user.id);
        } else {
            (dbData as Record<string, unknown>).user_id = session.user.id;
        }

        const { error } = await supabase.from(table).upsert(dbData);
        if (error) console.error('Error syncing upsert to ' + table + ':', error);
    }, [session]);

    const syncDelete = useCallback(async (table: string, idOrFilter: number | string | Record<string, unknown>) => {
        if (!session?.user?.id) return;

        // Logical soft-delete: set activo = false instead of physical DELETE
        let query = supabase.from(table).update({ activo: false });

        if (typeof idOrFilter === 'object' && idOrFilter !== null) {
            const toSnakeCase = (obj: Record<string, unknown>) => {
                const snakeObj: Record<string, unknown> = {};
                for (const key in obj) {
                    const snakeKey = key.replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`);
                    snakeObj[snakeKey] = obj[key];
                }
                return snakeObj;
            };
            const snakeFilter = toSnakeCase(idOrFilter as Record<string, unknown>);
            query = query.match(snakeFilter);
        } else {
            query = query.eq('id', idOrFilter);
        }

        const { error } = await query;
        if (error) console.error('Error syncing soft-delete to ' + table + ':', error);
    }, [session]);

    return {
        state,
        setState,
        loading,
        session,
        syncUpsert,
        syncDelete,
        refresh: fetchData
    };
}
