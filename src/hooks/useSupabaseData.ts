import { useEffect, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import type { AppState, Plantilla, Post, UserProfile, Curso, Estudiante, Actividad, CalificacionActividad, RecuperacionBC, RecuperacionCotejo, Secuencia, EventoCalendario, Docente, NivelPuntaje, CursoDetalleEvaluacion, Notification, BCScore, BCKey, CursoDocente, Grupo, Incidencia, RegistroAnecdotico, RegistroImagen, TareaInstitucional, TareaDocente, Centro } from '../types';
import { useAppStore } from '../store/appStore';
import { esRolAdministrador } from '../utils/autorizacion';
import { getValidCentro, saveCentroCache } from '../cache/centroCache';
import { savePerfilCacheFromRow } from '../cache/perfilCache';
import { getValidCursoCache, saveCursoCache } from '../cache/cursoCache';
import { getValidPlantillaCache, savePlantillaCache } from '../cache/plantillaCache';
import { PERIODOS_ACADEMICOS, NULL_PERIODO_TOKEN, hasValidAcademicSlice, getValidAcademicSlice, saveAcademicSlice, upsertAcademicRow } from '../cache/academicCache';
import { saveSecuencias } from '../cache/secuenciaCache';

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
        4: { puntaje: 100, nombre: 'Estratégico', color: '#F5BC5D', description: 'Lidera procesos, propone soluciones innovadoras y actúa de manera autónoma y creativa.' },
        3: { puntaje: 85, nombre: 'Autónomo', color: '#537BAC', description: 'Realiza las tareas por sí solo, cumpliendo los objetivos con eficiencia.' },
        2: { puntaje: 70, nombre: 'Resolutivo', color: '#689C63', description: 'Identifica el problema y aplica procedimientos básicos para resolverlo.' },
        1: { puntaje: 55, nombre: 'Receptivo', color: '#EB8847', description: 'Requiere apoyo continuo para comprender tareas y alcanzar los objetivos.' }
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

const mapActividad = (a: any, cursos?: any[]): Actividad => ({
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
    sharedCourseId: a.shared_course_id as string || (cursos?.find(cur => cur.id === a.curso_id)?.grupo_id ? `group_${cursos.find(cur => cur.id === a.curso_id)?.grupo_id}` : String(a.curso_id)),
    indicador: a.indicador as string,
    producto: a.producto as string
});

const mapCalificacion = (c: any, cursos?: any[]): CalificacionActividad => ({
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
});

const mapCursoDetalle = (cd: any): CursoDetalleEvaluacion => ({
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
});

const mapEstudiante = (e: any): Estudiante => ({
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
});

const mapRecuperacion = (r: any, cursos?: any[]): RecuperacionBC => ({
    id: r.id as number,
    estudianteId: r.estudiante_id as number,
    cursoId: r.curso_id as number,
    bc: Number(r.bc) as 1 | 2 | 3 | 4,
    puntaje: r.puntaje as number,
    periodo: r.periodo as string,
    sharedCourseId: (r.shared_course_id as string) || (cursos?.find(cur => cur.id === r.curso_id)?.grupo_id ? `group_${cursos.find(cur => cur.id === r.curso_id)?.grupo_id}` : String(r.curso_id)),
    userId: r.user_id as string,
    asignatura: r.asignatura as string,
    fecha: r.created_at as string
});

const mapRecuperacionCotejo = (r: any): RecuperacionCotejo => ({
    id: r.id as number,
    recuperacionId: r.recuperacion_id as number,
    estudianteId: r.estudiante_id as number,
    cursoId: r.curso_id as number,
    bc: Number(r.bc) as 1 | 2 | 3 | 4,
    periodo: r.periodo as string,
    asignatura: r.asignatura as string || '',
    indicador: r.indicador as string,
    actividadId: r.actividad_id,
    sharedCourseId: r.shared_course_id as string,
    userId: r.user_id as string,
    createdAt: r.created_at as string
});

const mapRegistroAnecdotico = (ra: any): RegistroAnecdotico => ({
    id: ra.id as number,
    cursoId: ra.curso_id as number,
    profileId: ra.profile_id as string,
    fecha: ra.fecha as string,
    titulo: ra.titulo as string,
    descripcion: ra.descripcion as string,
    activo: ra.activo !== false,
    createdAt: ra.created_at as string,
    updatedAt: ra.updated_at as string
});

const mapRegistroImagen = (ri: any): RegistroImagen => ({
    id: ri.id as number,
    registroId: ri.registro_id as number,
    imagenUrl: ri.imagen_url as string || '',
    driveFileId: ri.drive_file_id as string || undefined,
    driveThumbnailUrl: ri.drive_thumbnail_url as string || undefined,
    storageProvider: (ri.storage_provider as 'supabase_storage' | 'google_drive') || 'supabase_storage',
    createdAt: ri.created_at as string
});

export const mapRealtimePost = (p: any, perfiles?: UserProfile[], secuencias?: any[], plantillas?: any[]): Post => {
    const prof = perfiles?.find(u => u.userId === p.user_id);
    
    let resolvedRecursoDatos = p.recurso_datos as Record<string, unknown> | undefined;
    if (!resolvedRecursoDatos && p.recurso_id && p.tipo) {
        if (p.tipo === 'secuencia') {
            resolvedRecursoDatos = secuencias?.find(s => s.id === p.recurso_id);
        } else if (p.tipo === 'rubrica' || p.tipo === 'cotejo') {
            resolvedRecursoDatos = plantillas?.find(pl => pl.id === p.recurso_id);
        }
    }

    return {
        id: p.id as number,
        autor: prof?.nombreDocente || p.autor as string || 'Docente',
        cargo: p.cargo as string || 'Docente',
        avatarUrl: prof?.avatarUrl || '',
        contenido: p.contenido as string,
        tiempo: p.tiempo as string || 'Hace un momento',
        fechaPublicacion: p.fecha_publicacion as string,
        tipo: p.tipo as 'rubrica' | 'secuencia' | 'general' | 'cotejo',
        asignatura: p.asignatura as string,
        userId: p.user_id as string,
        userBio: prof?.bio || '',
        expiresAt: p.expires_at as string,
        recursoDatos: resolvedRecursoDatos || {},
        recursoId: p.recurso_id as number,
    };
};

// Generación monotónica de cargas: descarta respuestas de cargas obsoletas
let fetchDataGeneration = 0;

// DIAG (solo lectura): timestamps de carga por curso, para detectar cargas
// concurrentes/duplicadas (hipótesis H1). No afecta flujo, estado ni caché.
const diagCursoInFlight: Record<number, string> = {};

export function useSupabaseData(skipInit = false) {
    const { 
        state, 
        setAppState: setState, 
        loading, 
        setLoading, 
        session, 
        selectedCursoId,
        loadedModules,
        loadedCursos,
        addLoadedModule,
        addLoadedCurso
    } = useAppStore();


    const isFetching = useRef(false);

    const timeQuery = async (name: string, queryPromise: any): Promise<any> => {
        console.log(`[DEBUG LOAD] ${name} INICIO`);
        const start = performance.now();
        try {
            const result = await queryPromise;
            console.log(`[DEBUG LOAD] ${name} FIN: ${Math.round(performance.now() - start)}ms`);
            return result;
        } catch (error) {
            console.log(`[DEBUG LOAD] ${name} ERROR: ${Math.round(performance.now() - start)}ms`, error);
            throw error;
        }
    };

    const fetchData = useCallback(async (isSilent = false) => {
        console.log('[DEBUG LOAD] fetchData INICIO');
        if (!session?.user?.id) {
            console.log('[DEBUG LOAD] RETURN — sesión no disponible');
            return;
        }
        console.log('[DEBUG LOAD] sesión encontrada');
        const antesFetch = useAppStore.getState().state;
        console.log(`[DIAG][FETCH] start user=${session.user.id} ts=${new Date().toISOString()} STATE_BEFORE perfiles=${antesFetch.perfiles.length} cursos=${antesFetch.cursos.length} estudiantes=${antesFetch.estudiantes.length} actividades=${antesFetch.actividades.length} calificaciones=${antesFetch.calificaciones.length} grupos=${antesFetch.grupos.length} secuencias=${antesFetch.secuencias.length}`);

        if (isFetching.current) {
            console.log('[DEBUG LOAD] RETURN — fetchData ignorado: ya hay una carga en progreso');
            console.log(`[DIAG][GUARD] fetchData-concurrente-omitido user=${session.user.id} ts=${new Date().toISOString()}`);
            return;
        }
        isFetching.current = true;
        
        console.log(`[DEBUG LOAD] setLoading(true) - isSilent: ${isSilent}`);
        if (!isSilent) setLoading(true);
        ++fetchDataGeneration;
        console.log('[PLANIFICACION] inicio carga global por contexto (useSupabaseData)');
        try {
            console.log('[DEBUG LOAD] PASO 1: fetch perfil propio (sin JOIN) INICIO');
            const startPerfil = performance.now();
            
            const { data: miPerfil, error: miPerfilError } = await supabase
                .from('perfiles')
                .select('user_id, nombre, nombre_docente, avatar_color, avatar_url, bio, tipo_institucion, asignaturas, centro_id, rol')
                .eq('user_id', session.user.id)
                .single();
            
            console.log(`[DEBUG LOAD] PASO 1: fetch perfil propio FIN: ${Math.round(performance.now() - startPerfil)}ms`, { error: miPerfilError, data: miPerfil });
            
            if (miPerfilError || !miPerfil) {
                console.error('[DEBUG LOAD] RETURN — no se pudo obtener el perfil del usuario:', miPerfilError);
                return;
            }
            
            const userCentroId = (miPerfil as any).centro_id || null;
            console.log('[DEBUG LOAD] userCentroId:', userCentroId);

            // Poblar/renovar el caché persistente del perfil del usuario autenticado
            // con los cinco campos cacheados, tomados de la fuente de verdad (Query 1).
            // Esta consulta NO se omite: es la que resuelve `userCentroId` (aislamiento).
            savePerfilCacheFromRow(session.user.id, miPerfil as Record<string, unknown>);

            console.log('[DEBUG LOAD] consultando mis cursos INICIO');
            const startCursos = performance.now();

            // Caché persistente de cursos: si existe una entrada válida para este
            // usuario en el centro actual, se evita re-consultar `cursos` y
            // `curso_docentes` y se reconstruye el estado desde el caché.
            // El refresco silencioso (isSilent) NO usa el caché: comprueba cambios
            // en Supabase y re-sincroniza Zustand + caché.
            const cachedCursos = !isSilent ? getValidCursoCache(session.user.id, userCentroId) : null;

            console.log(`[DIAG][CACHECURSOS] ${cachedCursos ? 'hit' : 'miss'} user=${session.user.id} centro=${userCentroId ?? 'sin-centro'} isSilent=${isSilent} cursos=${cachedCursos?.cursos.length ?? 0} ts=${new Date().toISOString()}`);

            let misCursosIds: number[] = [];
            if (cachedCursos === null) {
                const misCursosDocenteResult = await supabase.from('curso_docentes').select('curso_id').eq('docente_id', session.user.id).eq('activo', true);
                const misCursosDocente = misCursosDocenteResult.data;
                console.log(`[DEBUG LOAD] consultando mis cursos FIN: ${Math.round(performance.now() - startCursos)}ms`, { error: misCursosDocenteResult.error });
                misCursosIds = (misCursosDocente || []).map(cd => cd.curso_id);
            }

            // 2. Carga Contextual (Paso B)
            let cursosQuery: any = null;
            let cursoDocentesQuery: any = null;
            if (cachedCursos) {
                // Caché válida: no consultar cursos ni relaciones.
                cursosQuery = Promise.resolve({ data: null, error: null });
                cursoDocentesQuery = Promise.resolve({ data: null, error: null });
            } else {
                cursosQuery = misCursosIds.length > 0
                    ? supabase.from('cursos').select('*').or(`user_id.eq.${session.user.id},id.in.(${misCursosIds.join(',')})`)
                    : supabase.from('cursos').select('*').eq('user_id', session.user.id);
                cursoDocentesQuery = supabase.from('curso_docentes').select('*').eq('docente_id', session.user.id).eq('activo', true);
            }

            const suscripcionesQuery = userCentroId
                ? supabase.from('suscripciones').select('*').or(`user_id.eq.${session.user.id},centro_id.eq.${userCentroId}`)
                : supabase.from('suscripciones').select('*').eq('user_id', session.user.id);

            const perfilesQuery = userCentroId
                ? supabase.from('perfiles').select('*').eq('centro_id', userCentroId)
                : supabase.from('perfiles').select('*').eq('user_id', session.user.id);

            // Caché persistente del registro del centro: si existe una entrada válida
            // para el centro actual, se evita la consulta duplicada a la tabla `centros`.
            const cachedCentro = getValidCentro(userCentroId);
            const centrosQuery = (userCentroId && !cachedCentro)
                ? supabase.from('centros').select('*').eq('id', userCentroId)
                : null;

            console.log('[DEBUG LOAD] Phase 1 INICIO');
            const startPhase1 = performance.now();
            const phase1 = await Promise.all([
                timeQuery('perfiles', perfilesQuery),
                timeQuery('centro_roles', supabase.from('centro_roles').select('*').eq('user_id', session.user.id)),
                timeQuery('cursos', cursosQuery),
                timeQuery('curso_docentes', cursoDocentesQuery),
                timeQuery('suscripciones', suscripcionesQuery),
                timeQuery('historial_colaboradores', supabase.from('historial_colaboradores').select('*').eq('usuario_id', session.user.id)),
                timeQuery('centros', centrosQuery)
            ]);
            console.log(`[DEBUG LOAD] Phase 1 FIN: ${Math.round(performance.now() - startPhase1)}ms`);

            const fase1Fallidas = ['perfiles'].filter((_, idx) => !!phase1[idx].error);
            if (fase1Fallidas.length > 0) {
                console.log(`[DEBUG LOAD] RETURN — fase 1 falló (crítico): ${fase1Fallidas.join(', ')}`);
                console.warn(`[Supabase fetchData] Perfiles no disponible (${fase1Fallidas.join(', ')}). Se conserva el estado actual.`);
                return;
            }

            const perfiles = phase1[0].data;
            const centroRoles = phase1[1].data;
            const cursos = phase1[2].data;
            const cursoDocentes = phase1[3].data;
            const suscripciones = phase1[4].data;
            const historialColaboradores = phase1[5].data;

            const centrosMap = new Map<string, Centro>();
            if (cachedCentro) {
                // Caché válida: el objeto del centro ya está en formato de dominio (Centro).
                centrosMap.set(cachedCentro.id, cachedCentro);
            } else {
                // Sin caché: normalizar el registro recién consultado y guardarlo en caché.
                const centrosFetched = phase1[6]?.data;
                const centrosRaw = Array.isArray(centrosFetched) ? centrosFetched : [];
                centrosRaw.forEach((c: any) => {
                    const mapped: Centro = {
                        id: c.id as string,
                        nombre: c.nombre as string,
                        codigoCentro: c.codigo_centro as string || '',
                        tanda: c.tanda as string || 'Jornada Extendida',
                        telefono: c.telefono as string || '',
                        distritoEducativo: c.distrito_educativo as string || '',
                        regionalEducacion: c.regional_educacion as string || '',
                        provincia: c.provincia as string || '',
                        municipio: c.municipio as string || '',
                        createdBy: c.created_by as string,
                        createdAt: c.created_at as string,
                        updatedAt: c.updated_at as string,
                        estado: (c.estado as Centro['estado']) || 'activo',
                        afiliado: c.afiliado as boolean || false
                    };
                    centrosMap.set(c.id, mapped);
                    saveCentroCache(mapped);
                });
            }

            const mappedPerfiles = (perfiles || []).map((p: any): UserProfile => {
                const resolvedCentro = p.centro_id && centrosMap.has(p.centro_id)
                    ? centrosMap.get(p.centro_id)
                    : undefined;

                const hist = (historialColaboradores || []).find((h: any) => h.usuario_id === p.user_id);

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
                    publicacionesRealizadas: hist ? (hist.publicaciones_realizadas as number) : 0
                };
            });

            if (!mappedPerfiles.find((p: UserProfile) => p.userId === session.user.id)) {
                const resolvedCentroMi = userCentroId && centrosMap.has(userCentroId)
                    ? centrosMap.get(userCentroId)
                    : undefined;
                mappedPerfiles.unshift({
                    userId: miPerfil.user_id as string,
                    nombreDocente: (miPerfil as any).nombre_docente as string || (miPerfil as any).nombre as string || '',
                    bio: (miPerfil as any).bio as string || '',
                    avatarUrl: (miPerfil as any).avatar_url as string || '',
                    avatarColor: (miPerfil as any).avatar_color as string || '',
                    asignatura: Array.isArray((miPerfil as any).asignaturas) ? (miPerfil as any).asignaturas[0] : ((miPerfil as any).asignatura as string || ''),
                    institucion: resolvedCentroMi?.nombre || '',
                    instituto: resolvedCentroMi?.nombre || '',
                    centro_id: userCentroId || undefined,
                    centro: resolvedCentroMi,
                    rol: ((miPerfil as any).rol as UserProfile['rol']) || undefined,
                    lastSeen: (miPerfil as any).last_seen as string || new Date().toISOString(),
                    publicacionesRealizadas: 0
                });
            }

            const currentUserProfile = mappedPerfiles.find((p: any) => p.userId === session.user.id);
            let resolvedSuscripcionActual = undefined;
            if (suscripciones && suscripciones.length > 0) {
                const institucionales = suscripciones.filter((s: any) => s.centro_id === userCentroId && s.tipo === 'institucional' && s.estado === 'activa');
                const individuales = suscripciones.filter((s: any) => s.user_id === session.user.id && s.tipo === 'individual' && s.estado === 'activa');
                const promocionales = suscripciones.filter((s: any) => s.user_id === session.user.id && s.tipo === 'promocional' && s.estado === 'activa');
                
                if (institucionales.length > 0) {
                    resolvedSuscripcionActual = institucionales[0];
                } else if (individuales.length > 0) {
                    resolvedSuscripcionActual = individuales[0];
                } else if (promocionales.length > 0) {
                    resolvedSuscripcionActual = promocionales[0];
                }
            }

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

            console.log('[DEBUG LOAD] Actualizando estado global de Zustand (Zustand setState) INICIO');
            const startZustand = performance.now();

            // Phase 1.5: Load registros anecdóticos + imágenes for Dashboard
            const { data: registrosRaw } = await supabase
                .from('registros_anecdoticos')
                .select('*')
                .eq('profile_id', session.user.id)
                .eq('activo', true)
                .order('created_at', { ascending: false });

            const registrosAnecdoticos = (registrosRaw || []).map(mapRegistroAnecdotico);
            const registroIds = registrosAnecdoticos.map(r => r.id);

            let registroImagenes: RegistroImagen[] = [];
            if (registroIds.length > 0) {
                const { data: imagenesRaw } = await supabase
                    .from('registro_imagenes')
                    .select('*')
                    .in('registro_id', registroIds);
                registroImagenes = (imagenesRaw || []).map(mapRegistroImagen);
            }

            setState(prev => {
                const mappedDocentes = Array.from(new Map<string, Docente>([
                    ...(perfiles || []).map((p: Record<string, unknown>): [string, Docente] => [p.nombre_docente as string || p.nombre as string, {
                        id: p.user_id as string,
                        userId: p.user_id as string,
                        nombre: (p.nombre_docente as string || p.nombre as string || ''),
                        asignatura: Array.isArray(p.asignaturas) ? p.asignaturas[0] : (p.asignatura as string || ''),
                        avatarColor: p.avatar_color as string || '#3b82f6'
                    }])
                ]).values());

                return {
                    ...prev,
                    perfiles: mappedPerfiles,
                    docentes: mappedDocentes,
                    cursos: cachedCursos
                        ? cachedCursos.cursos
                        : (cursos || []).map((c: Record<string, unknown>): Curso | null => {
                            const myLink = (cursoDocentes || []).find((cd: any) => cd.curso_id === c.id && String(cd.docente_id) === session.user.id);
                            const isCreator = String(c.user_id) === session.user.id;
                            const isCentroAdmin = !!resolvedCentroRolActual &&
                                resolvedCentroRolActual.rol === 'administrador' &&
                                !!c.centro_id && c.centro_id === resolvedCentroRolActual.centro_id;
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
                        }).filter((x: any): x is Curso => x !== null),
                    cursoDocentes: cachedCursos
                        ? cachedCursos.cursoDocentes
                        : (cursoDocentes || []).map((cd: Record<string, unknown>): CursoDocente => ({
                            id: cd.id as number,
                            cursoId: cd.curso_id as number,
                            userId: String(cd.docente_id),
                            rol: cd.rol as 'tutor' | 'co-docente',
                            esTutor: cd.es_tutor as boolean,
                            asignatura: cd.asignatura as string,
                            diasSemana: cd.dias_semana as string[] || [],
                            createdAt: cd.created_at as string
                        })),
                    suscripcionActual: resolvedSuscripcionActual,
                    centroRolActual: resolvedCentroRolActual,
                    centros: Array.from(centrosMap.values()),
                    registrosAnecdoticos,
                    registroImagenes
                };
            });
            console.log(`[DEBUG LOAD] Actualizando estado global de Zustand (Zustand setState) FIN: ${Math.round(performance.now() - startZustand)}ms`);
            const despuesFetch = useAppStore.getState().state;
            console.log(`[DIAG][FETCH] fin user=${session.user.id} ts=${new Date().toISOString()} STATE_AFTER perfiles=${despuesFetch.perfiles.length} cursos=${despuesFetch.cursos.length} estudiantes=${despuesFetch.estudiantes.length} actividades=${despuesFetch.actividades.length} calificaciones=${despuesFetch.calificaciones.length} grupos=${despuesFetch.grupos.length} secuencias=${despuesFetch.secuencias.length}`);

            // Si fue un MISS (o refresco silencioso), guardar el nuevo conjunto filtrado
            // de cursos en el caché persistente, tomándolo de la fuente de verdad (Zustand).
            if (!cachedCursos) {
                const freshState = useAppStore.getState().state;
                saveCursoCache(session.user.id, userCentroId, {
                    cursos: freshState.cursos,
                    cursoDocentes: freshState.cursoDocentes,
                });
            }
        } catch (error) {
            console.error('[DEBUG LOAD] Error fetching data from Supabase:', error);
            console.error('[PLANIFICACION] error', error);
        } finally {
            console.log('[DEBUG LOAD] FINALLY EJECUTADO');
            isFetching.current = false;
            console.log(`[DEBUG LOAD] setLoading(false) - isSilent: ${isSilent}`);
            if (!isSilent) setLoading(false);
            console.log('[DEBUG LOAD] fetchData TERMINÓ');
        }
    }, [session]);

    const handleCalificacionRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const stateCursos = useAppStore.getState().state.cursos;
        setState(s => {
            let nextList = [...s.calificaciones];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(c => !(c.estudianteId === oldRow.estudiante_id && c.actividadId === oldRow.actividad_id));
            } else {
                const mapped = mapCalificacion(newRow, stateCursos);
                const idx = nextList.findIndex(c => c.estudianteId === mapped.estudianteId && c.actividadId === mapped.actividadId);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, calificaciones: nextList };
        });

        // Paso 7 — write-through de Realtime: actualiza ÚNICAMENTE la slice del
        // curso+período afectado. Nunca invalida ni sobrescribe otros cursos o
        // períodos, y no crea slices nuevas (Realtime no constituye completitud).
        if (eventType === 'DELETE') {
            if (oldRow?.curso_id != null) {
                upsertAcademicRow('calificaciones', { estudianteId: oldRow.estudiante_id, actividadId: oldRow.actividad_id } as CalificacionActividad, oldRow.curso_id as number, oldRow.periodo ?? null, true);
            }
        } else {
            const mapped = mapCalificacion(newRow, stateCursos);
            upsertAcademicRow('calificaciones', mapped, mapped.cursoId, mapped.periodo ?? null, false);
        }
        console.log(`[DIAG][REALTIME] calificaciones eventType=${eventType} cursoId=${newRow?.curso_id ?? oldRow?.curso_id} periodo=${newRow?.periodo ?? oldRow?.periodo ?? '??'} actividadId=${newRow?.actividad_id ?? oldRow?.actividad_id} estudianteId=${newRow?.estudiante_id ?? oldRow?.estudiante_id} calificacionesState=${useAppStore.getState().state.calificaciones.length} ts=${new Date().toISOString()}`);
    }, [setState]);

    const handleCursoDetalleRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        setState(s => {
            let nextList = [...s.cursoDetalle];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(c => !(c.estudianteId === oldRow.estudiante_id && c.actividadId === oldRow.actividad_id));
            } else {
                const mapped = mapCursoDetalle(newRow);
                const idx = nextList.findIndex(c => c.estudianteId === mapped.estudianteId && c.actividadId === mapped.actividadId);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, cursoDetalle: nextList };
        });
    }, [setState]);

    const handleActividadesRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const stateCursos = useAppStore.getState().state.cursos;
        setState(s => {
            let nextList = [...s.actividades];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(a => a.id !== oldRow.id);
            } else {
                const mapped = mapActividad(newRow, stateCursos);
                const idx = nextList.findIndex(a => a.id === mapped.id);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, actividades: nextList };
        });

        // Paso 7 — write-through de Realtime (ver handleCalificacionRealtime).
        if (eventType === 'DELETE') {
            if (oldRow?.curso_id != null) {
                upsertAcademicRow('actividades', { id: oldRow.id } as Actividad, oldRow.curso_id as number, oldRow.periodo ?? null, true);
            }
        } else {
            const mapped = mapActividad(newRow, stateCursos);
            upsertAcademicRow('actividades', mapped, mapped.cursoId, mapped.periodo ?? null, false);
        }
        console.log(`[DIAG][REALTIME] actividades eventType=${eventType} cursoId=${newRow?.curso_id ?? oldRow?.curso_id} periodo=${newRow?.periodo ?? oldRow?.periodo ?? '??'} actividadId=${newRow?.id ?? oldRow?.id} actividadesState=${useAppStore.getState().state.actividades.length} ts=${new Date().toISOString()}`);
    }, [setState]);

    const handleEstudiantesRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        setState(s => {
            let nextList = [...s.estudiantes];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(e => e.id !== oldRow.id);
            } else {
                const mapped = mapEstudiante(newRow);
                const idx = nextList.findIndex(e => e.id === mapped.id);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, estudiantes: nextList };
        });
    }, [setState]);

    const handleRecuperacionRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        const stateCursos = useAppStore.getState().state.cursos;
        setState(s => {
            let nextList = [...s.recuperaciones];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(r => !(r.estudianteId === oldRow.estudiante_id && r.cursoId === oldRow.curso_id && r.bc === oldRow.bc && r.periodo === oldRow.periodo && r.asignatura === oldRow.asignatura));
            } else {
                const mapped = mapRecuperacion(newRow, stateCursos);
                const idx = nextList.findIndex(r => r.estudianteId === mapped.estudianteId && r.cursoId === mapped.cursoId && r.bc === mapped.bc && r.periodo === mapped.periodo && r.asignatura === mapped.asignatura);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, recuperaciones: nextList };
        });
    }, [setState]);

    const handleRecuperacionCotejoRealtime = useCallback((payload: any) => {
        const { eventType, new: newRow, old: oldRow } = payload;
        setState(s => {
            let nextList = [...s.recuperacionesCotejo];
            if (eventType === 'DELETE') {
                nextList = nextList.filter(r => r.id !== oldRow.id);
            } else {
                const mapped = mapRecuperacionCotejo(newRow);
                const idx = nextList.findIndex(r => r.id === mapped.id);
                if (idx !== -1) {
                    if (JSON.stringify(nextList[idx]) !== JSON.stringify(mapped)) {
                        nextList[idx] = mapped;
                    }
                } else {
                    nextList.push(mapped);
                }
            }
            return { ...s, recuperacionesCotejo: nextList };
        });
    }, [setState]);

    useEffect(() => {
        if (skipInit || !session?.user?.id) return;

        // 1. Initial Load of context
        fetchData();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [skipInit, session?.user?.id]); // solo depender de cambios de usuario reales

    useEffect(() => {
        if (skipInit || !session?.user?.id) return;
        
        // 2. Setup standard backup interval (15 minutes)
        const interval = setInterval(() => fetchData(true), 900000);
        return () => clearInterval(interval);
    }, [skipInit, session?.user?.id, fetchData]);

    useEffect(() => {
        if (skipInit || !session?.user?.id) return;

        // 3. Setup selective Realtime subscriptions
        const userChannels: any[] = [];

        // Channel A: User-scoped global events (notifications, anecdóticos, and posts)
        const userGlobalChannelName = `user-global-${session.user.id}`;
        console.log(`[REALTIME] CREATE canal=${userGlobalChannelName}`);
        const userGlobalChannel = supabase.channel(userGlobalChannelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notificaciones', filter: `user_id=eq.${session.user.id}` }, (payload) => {
                const { eventType, new: newRow, old: oldRow } = payload;
                setState(s => {
                    let nextList = [...s.notificaciones];
                    if (eventType === 'DELETE') {
                        nextList = nextList.filter(n => n.id !== oldRow.id);
                    } else {
                        const mapped: Notification = {
                            id: newRow.id,
                            userId: newRow.user_id,
                            actorId: newRow.actor_id,
                            titulo: newRow.titulo,
                            mensaje: newRow.mensaje,
                            leida: newRow.leida,
                            tipo: newRow.tipo,
                            postId: newRow.post_id,
                            tareaId: newRow.tarea_institucional_id,
                            createdAt: newRow.created_at,
                            fechaLectura: newRow.fecha_lectura
                        };
                        const idx = nextList.findIndex(n => n.id === mapped.id);
                        if (idx !== -1) {
                            nextList[idx] = mapped;
                        } else {
                            nextList.unshift(mapped);
                        }
                    }
                    return { ...s, notificaciones: nextList };
                });
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'registros_anecdoticos', filter: `profile_id=eq.${session.user.id}` }, (payload) => {
                const { eventType, new: newRow, old: oldRow } = payload;
                setState(s => {
                    let nextList = [...s.registrosAnecdoticos];
                    if (eventType === 'DELETE') {
                        nextList = nextList.filter(r => r.id !== oldRow.id);
                    } else {
                        const mapped = mapRegistroAnecdotico(newRow);
                        const idx = nextList.findIndex(r => r.id === mapped.id);
                        if (idx !== -1) {
                            nextList[idx] = mapped;
                        } else {
                            nextList.unshift(mapped);
                        }
                    }
                    return { ...s, registrosAnecdoticos: nextList };
                });
            })
            .subscribe();

        userChannels.push(userGlobalChannel);

        // Channel B: Course-specific events (only active if selectedCursoId is set!)
        let courseChannel: any = null;
        if (selectedCursoId) {
            const courseChannelName = `curso-context-${selectedCursoId}`;
            console.log(`[REALTIME] CREATE canal=${courseChannelName} curso=${selectedCursoId}`);
            courseChannel = supabase.channel(courseChannelName)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'calificaciones', filter: `curso_id=eq.${selectedCursoId}` }, handleCalificacionRealtime)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'curso_detalle', filter: `curso_id=eq.${selectedCursoId}` }, handleCursoDetalleRealtime)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'actividades', filter: `curso_id=eq.${selectedCursoId}` }, handleActividadesRealtime)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'estudiantes', filter: `curso_id=eq.${selectedCursoId}` }, handleEstudiantesRealtime)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperaciones', filter: `curso_id=eq.${selectedCursoId}` }, handleRecuperacionRealtime)
                .on('postgres_changes', { event: '*', schema: 'public', table: 'recuperaciones_cotejo', filter: `curso_id=eq.${selectedCursoId}` }, handleRecuperacionCotejoRealtime)
                .subscribe();
                
            userChannels.push(courseChannel);
        }

        return () => {
            userChannels.forEach(ch => {
                console.log(`[REALTIME] REMOVE canal=${ch.topic}`);
                supabase.removeChannel(ch);
            });
        };
    }, [skipInit, session?.user?.id, selectedCursoId, handleCalificacionRealtime, handleCursoDetalleRealtime, handleActividadesRealtime, handleEstudiantesRealtime, handleRecuperacionRealtime, handleRecuperacionCotejoRealtime]);

    const loadDashboardData = useCallback(async () => {
        if (!session?.user?.id) { console.log(`[DIAG][DASH] guard sin-sesion ts=${new Date().toISOString()}`); return; }
        if (loadedModules.includes('dashboard')) { console.log(`[DIAG][DASH] guard ya-cargado ts=${new Date().toISOString()}`); return; }
        console.log('[PLANIFICACION] lazy loading Dashboard data');
        console.log(`[DIAG][DASH] start user=${session.user.id} ts=${new Date().toISOString()}`);
        setLoading(true);
        try {
            const currentProfile = state.perfiles.find(p => p.userId === session.user.id);
            const userCentroId = currentProfile?.centro_id;
            const isCentroAdmin = esRolAdministrador(currentProfile?.rol);

            if (!currentProfile) {
                console.log('[PLANIFICACION] loadDashboardData: perfiles no disponibles aún, omitiendo carga (sin marcar loaded)');
                console.log(`[DIAG][GUARD] dashboard-perfiles-no-disponibles user=${session.user.id} ts=${new Date().toISOString()}`);
                setLoading(false);
                return;
            }
            
            const misCursosTutor = state.cursos
                .filter(c => c.isTutorOficial && String(c.userId) === session.user.id)
                .map(c => c.id);
                
            const misCursosVinculados = state.cursoDocentes
                .filter(cd => cd.userId === session.user.id)
                .map(cd => cd.cursoId);
                
            const cursosActivos = state.cursos.filter(c => 
                isCentroAdmin ? (c.centroId === userCentroId) : (String(c.userId) === session.user.id || misCursosTutor.includes(c.id))
            );
            
            const cursosParticipaIds = Array.from(new Set<number>([
                ...cursosActivos.map(c => c.id),
                ...misCursosVinculados
            ]));

            const activeQuery = (table: string) => supabase.from(table).select('*').eq('activo', true);

            const userFilter = (query: any, userCol = 'user_id') => {
                if (isCentroAdmin && misCursosTutor.length === 0) {
                    return query.in('curso_id', cursosActivos.map(c => c.id));
                } else if (cursosParticipaIds.length > 0) {
                    return query.in('curso_id', cursosParticipaIds);
                }
                return query.eq(userCol, session.user.id);
            };

            const userOrTutorFilter = (query: any) => {
                if (isCentroAdmin) return query;
                if (misCursosTutor.length > 0) {
                    return query.or(`user_id.eq.${session.user.id},curso_id.in.(${misCursosTutor.join(',')})`);
                }
                return query.eq('user_id', session.user.id);
            };
            
            const misSharedCourseIds = Array.from(new Set(
                state.cursos
                    .filter(c => cursosParticipaIds.includes(c.id))
                    .map(c => c.sharedCourseId)
                    .filter(Boolean)
            ));
            
            const incidenciaOrFilter =
                `user_id.eq.${session.user.id}` +
                (misSharedCourseIds.length > 0 ? `,shared_course_id.in.(${misSharedCourseIds.join(',')})` : '');

            console.log(`[PLANIFICACION] Dashboard queries (isCentroAdmin: ${isCentroAdmin}, cursos: ${cursosParticipaIds.length})`);

            const results = await Promise.all([
                supabase.from('estudiantes').select('*').eq('activo', true).in('curso_id', cursosParticipaIds.length > 0 ? cursosParticipaIds : [-1]),
                userFilter(activeQuery('actividades')),
                userOrTutorFilter(activeQuery('calificaciones')),
                supabase.from('incidencias').select('*').eq('activo', true).or(incidenciaOrFilter),
                supabase.from('eventos').select('*'),
                supabase.from('notificaciones').select('*').eq('user_id', session.user.id).eq('leida', false).order('created_at', { ascending: false }),
                supabase.from('grupos').select('*'),
                supabase.from('tareas_institucionales').select('*'),
                supabase.from('tarea_docente').select('*'),
                supabase.from('calendario_minerd').select('*')
            ]);

            const estudiantes = results[0].data || [];
            const actividades = results[1].data || [];
            const calificaciones = results[2].data || [];
            const incidencias = results[3].data || [];
            const eventos = results[4].data || [];
            const notificaciones = results[5].data || [];
            const grupos = results[6].data || [];
            const tareas = results[7].data || [];
            const tareaAsignaciones = results[8].data || [];
            const calendarioMinerd = results[9].data || [];

            const stAntes = useAppStore.getState().state;
            console.log(`[DIAG][DASH] SUPABASE_FETCH user=${session.user.id} isCentroAdmin=${isCentroAdmin} cursosParticipa=${cursosParticipaIds.length} estudiantes=${estudiantes.length} actividades=${actividades.length} calificaciones=${calificaciones.length} incidencias=${incidencias.length} grupos=${grupos.length} ts=${new Date().toISOString()}`);
            console.log(`[DIAG][DASH] STATE_BEFORE estudiantes=${stAntes.estudiantes.length} actividades=${stAntes.actividades.length} calificaciones=${stAntes.calificaciones.length} grupos=${stAntes.grupos.length} ts=${new Date().toISOString()}`);

            setState(prev => {
                const mappedEst = estudiantes.map(e => mapEstudiante(e));
                const mappedAct = actividades.map((a: Record<string, unknown>) => mapActividad(a, prev.cursos));
                const mappedCal = calificaciones.map((c: Record<string, unknown>) => mapCalificacion(c, prev.cursos));
                const mappedIncidencias = incidencias.map((i: Record<string, unknown>): Incidencia => ({
                    id: i.id as number,
                    estudianteId: i.estudiante_id as number,
                    categoria: i.categoria as 'Conducta' | 'Académico' | 'Salud' | 'Otro',
                    descripcion: i.descripcion as string,
                    accionesTomadas: i.acciones_tomadas as string[] || [],
                    acuerdos: i.acuerdos as string,
                    fecha: i.fecha as string,
                    gravedad: i.gravedad as 'leve' | 'moderada' | 'grave',
                    userId: i.user_id as string,
                    sharedCourseId: (i.shared_course_id as string) || ''
                }));

                const mappedEventos = (eventos || []).map((ev: Record<string, unknown>): EventoCalendario => ({
                    id: ev.id as number,
                    titulo: ev.titulo as string,
                    fecha: ev.fecha as string,
                    tipo: ev.tipo as EventoCalendario['tipo'],
                    descripcion: (ev.descripcion as string) || undefined,
                    fechaInicio: (ev.fecha_inicio as string) || undefined,
                    fechaFin: (ev.fecha_fin as string) || undefined,
                    updatedAt: (ev.updated_at as string) || undefined,
                }));

                const mappedCalendarioMinerd = (calendarioMinerd || []).map((ev: Record<string, unknown>): EventoCalendario => ({
                    id: ev.id as number,
                    titulo: ev.titulo as string,
                    fecha: ev.fecha_inicio as string,
                    tipo: ev.tipo as EventoCalendario['tipo'],
                    descripcion: (ev.descripcion as string) || undefined,
                    fechaInicio: (ev.fecha_inicio as string) || undefined,
                    fechaFin: (ev.fecha_fin as string) || undefined,
                    updatedAt: (ev.updated_at as string) || undefined,
                }));

                const mappedTareas = (tareas || []).map((t: Record<string, unknown>): TareaInstitucional => ({
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
                }));

                const mappedNotificaciones = (notificaciones || []).map((n: Record<string, unknown>): Notification => ({
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
                }));

                const mappedGrupos = (grupos || []).map((g: Record<string, unknown>): Grupo => ({
                    id: g.id as number,
                    nombre: g.nombre as string,
                    grado: g.grado as string,
                    seccion: g.seccion as string,
                    createdAt: g.created_at as string
                }));

                return {
                    ...prev,
                    estudiantes: mappedEst,
                    actividades: mappedAct,
                    calificaciones: mappedCal,
                    incidencias: mappedIncidencias,
                    eventos: mappedEventos,
                    calendarioMinerd: mappedCalendarioMinerd,
                    tareas: mappedTareas,
                    notificaciones: mappedNotificaciones,
                    grupos: mappedGrupos
                };
            });
            const st2 = useAppStore.getState().state;
            console.log(`[DIAG][DASH] STATE_AFTER estudiantes=${st2.estudiantes.length} actividades=${st2.actividades.length} calificaciones=${st2.calificaciones.length} grupos=${st2.grupos.length} ts=${new Date().toISOString()}`);
            addLoadedModule('dashboard');
            console.log(`[DIAG][DASH] end ok user=${session.user.id} ts=${new Date().toISOString()}`);

        } catch (error) {
            console.error('Error loading Dashboard data:', error);
        } finally {
            setLoading(false);
        }
    }, [session, loadedModules, addLoadedModule, setState, setLoading, state.perfiles, state.cursos, state.cursoDocentes]);

    const loadCursoData = useCallback(async (cursoId: number) => {
        if (!session?.user?.id || !cursoId) {
            console.log(`[DIAG][CURSO] guard sin-sesion-o-curso cursoId=${cursoId ?? 'sin-curso'} ts=${new Date().toISOString()}`);
            return;
        }
        const stateCursos = useAppStore.getState().state.cursos;
        const curso = stateCursos.find(c => c.id === cursoId);
        const centroId = curso?.centroId ?? null;
        const userId = session.user.id;

        // DIAG H1: detección de cargas concurrentes del mismo curso (no modifica flujo).
        const yaEnVuelo = diagCursoInFlight[cursoId];
        diagCursoInFlight[cursoId] = new Date().toISOString();
        console.log(`[DIAG][CURSO] start cursoId=${cursoId} userId=${userId} centroId=${centroId ?? 'sin-centro'} sharedCourseId=${curso?.sharedCourseId ?? null} periodoCurso=${curso?.periodo ?? null} estado=${yaEnVuelo ? `CONCURRENTE(duplicado) desde=${yaEnVuelo}` : 'normal'} ts=${new Date().toISOString()}`);
        const antesCurso = useAppStore.getState().state;
        console.log(`[DIAG][CURSO] STATE_BEFORE cursoId=${cursoId} actividadesCurso=${antesCurso.actividades.filter(a => a.cursoId === cursoId).length} calificacionesCurso=${antesCurso.calificaciones.filter(c => c.cursoId === cursoId).length} estudiantesCurso=${antesCurso.estudiantes.filter(e => e.cursoId === cursoId).length} ts=${new Date().toISOString()}`);

        // Paso 7 — caché académico en memoria (actividades + calificaciones) por
        // curso + período. Los períodos son conjuntos independientes para efectos de
        // carga: estar P1 en caché NUNCA implica P2/P3/P4.
        // Solo se omite una consulta cuando se puede demostrar que los datos exactos
        // de ese curso y período ya están completos y pertenecen al contexto actual
        // (usuario + centro + curso + período). Ante cualquier duda → MISS → consulta.
        const faltantesCal: string[] = PERIODOS_ACADEMICOS.filter(p => !hasValidAcademicSlice(userId, centroId, cursoId, p));
        const faltaNullActividades = !hasValidAcademicSlice(userId, centroId, cursoId, NULL_PERIODO_TOKEN);
        const faltantesAct: string[] = faltaNullActividades ? [...faltantesCal, NULL_PERIODO_TOKEN] : faltantesCal;

        if (loadedCursos.includes(cursoId)) {
            if (faltantesAct.length === 0 && faltantesCal.length === 0) {
                console.log(`[PLANIFICACION] Curso ${cursoId} completo en caché académico por período (sin consultas de actividades/calificaciones)`);
                console.log(`[DIAG][CURSO] skip-cache-completo cursoId=${cursoId} sin-consultas ts=${new Date().toISOString()}`);
                delete diagCursoInFlight[cursoId];
                return;
            }
            console.log(`[PLANIFICACION] Reconciliación académica del curso ${cursoId} (períodos faltantes: ${faltantesCal.join(',')}${faltaNullActividades ? ' + sin-período' : ''})`);
            console.log(`[DIAG][CURSO] reconciliacion cursoId=${cursoId} faltantesCal=[${faltantesCal.join(',')}] faltaNullActividades=${faltaNullActividades} ts=${new Date().toISOString()}`);
        } else {
            console.log(`[PLANIFICACION] lazy loading Curso data for course ${cursoId}`);
        }
        setLoading(true);
        try {
            const baseQueries: any[] = [
                supabase.from('estudiantes').select('*').eq('activo', true).eq('curso_id', cursoId),
            ];

            if (faltantesAct.length > 0) {
                const pNoNull = faltantesAct.filter(p => p !== NULL_PERIODO_TOKEN);
                let qAct = supabase.from('actividades').select('*').eq('activo', true).eq('curso_id', cursoId);
                if (faltantesAct.includes(NULL_PERIODO_TOKEN) && pNoNull.length > 0) {
                    qAct = qAct.or(`periodo.in.(${pNoNull.join(',')}),periodo.is.null`);
                } else if (faltantesAct.includes(NULL_PERIODO_TOKEN)) {
                    qAct = qAct.is('periodo', null);
                } else {
                    qAct = qAct.in('periodo', pNoNull);
                }
                baseQueries.push(qAct);
            } else {
                baseQueries.push(Promise.resolve({ data: null, error: null }));
            }

            if (faltantesCal.length > 0) {
                baseQueries.push(supabase.from('calificaciones').select('*').eq('curso_id', cursoId).in('periodo', faltantesCal));
            } else {
                baseQueries.push(Promise.resolve({ data: null, error: null }));
            }

            baseQueries.push(
                supabase.from('recuperaciones').select('*').eq('curso_id', cursoId),
                supabase.from('curso_detalle').select('*').eq('curso_id', cursoId),
                supabase.from('recuperaciones_cotejo').select('*').eq('curso_id', cursoId)
            );

            const results = await Promise.all(baseQueries);

            const estudiantes: any[] = results[0].data || [];
            const actividades: any[] = results[1].data || [];
            const calificaciones: any[] = results[2].data || [];
            const recuperaciones: any[] = results[3].data || [];
            const cursoDetalle: any[] = results[4].data || [];
            const recuperacionesCotejo: any[] = results[5].data || [];

            const mappedAct = actividades.map((a: Record<string, unknown>) => mapActividad(a, stateCursos));
            const mappedCal = calificaciones.map((c: Record<string, unknown>) => mapCalificacion(c, stateCursos));

            console.log(`[DIAG][CURSO] SUPABASE_FETCH cursoId=${cursoId} userId=${userId} centroId=${centroId ?? 'sin-centro'} periodosActConsultados=[${faltantesAct.join(',')}] periodosCalConsultados=[${faltantesCal.join(',')}] estudiantesRecibidos=${estudiantes.length} actividadesRecibidas=${actividades.length} calificacionesRecibidas=${calificaciones.length} ts=${new Date().toISOString()}`);
            const antesMerge = useAppStore.getState().state;
            console.log(`[DIAG][CURSO] STATE_BEFORE_MERGE cursoId=${cursoId} actividadesCurso=${antesMerge.actividades.filter(a => a.cursoId === cursoId).length} calificacionesCurso=${antesMerge.calificaciones.filter(c => c.cursoId === cursoId).length} estudiantesCurso=${antesMerge.estudiantes.filter(e => e.cursoId === cursoId).length} ts=${new Date().toISOString()}`);

            setState(prev => {
                const mappedEst = estudiantes.map((e: any) => mapEstudiante(e));
                const mappedRec = recuperaciones.map((r: any) => mapRecuperacion(r, stateCursos));
                const mappedDet = cursoDetalle.map((cd: any) => mapCursoDetalle(cd));
                const mappedRecCotejo = recuperacionesCotejo.map((r: Record<string, unknown>) => mapRecuperacionCotejo(r));

                const mergedEst = [...prev.estudiantes.filter(e => e.cursoId !== cursoId), ...mappedEst];
                const mergedRec = [...prev.recuperaciones.filter(r => r.cursoId !== cursoId), ...mappedRec];
                const mergedDet = [...prev.cursoDetalle.filter(cd => cd.cursoId !== cursoId), ...mappedDet];
                const mergedRecCotejo = [...prev.recuperacionesCotejo.filter(r => r.cursoId !== cursoId), ...mappedRecCotejo];

                const next: AppState = {
                    ...prev,
                    estudiantes: mergedEst,
                    recuperaciones: mergedRec,
                    cursoDetalle: mergedDet,
                    recuperacionesCotejo: mergedRecCotejo
                };

                // Merge por ID dentro de los períodos descargados: NUNCA se reemplaza
                // el estado completo del curso con una respuesta parcial. Los períodos
                // no descargados se conservan intactos.
                if (faltantesAct.length > 0) {
                    const actSet = new Set(faltantesAct);
                    next.actividades = [
                        ...prev.actividades.filter(a => !(a.cursoId === cursoId && (
                            (a.periodo && actSet.has(a.periodo)) || (!a.periodo && actSet.has(NULL_PERIODO_TOKEN))
                        ))),
                        ...mappedAct
                    ];
                }
                if (faltantesCal.length > 0) {
                    const calSet = new Set(faltantesCal);
                    next.calificaciones = [
                        ...prev.calificaciones.filter(c => !(c.cursoId === cursoId && c.periodo && calSet.has(c.periodo))),
                        ...mappedCal
                    ];
                }

                return next;
            });
            addLoadedCurso(cursoId);
            const despuesMerge = useAppStore.getState().state;
            console.log(`[DIAG][CURSO] STATE_AFTER_MERGE cursoId=${cursoId} actividadesCurso=${despuesMerge.actividades.filter(a => a.cursoId === cursoId).length} calificacionesCurso=${despuesMerge.calificaciones.filter(c => c.cursoId === cursoId).length} estudiantesCurso=${despuesMerge.estudiantes.filter(e => e.cursoId === cursoId).length} ts=${new Date().toISOString()}`);

            // Guardar slices por PERÍODO consultado (datos fuente, idénticos a state).
            for (const p of faltantesAct) {
                if (p === NULL_PERIODO_TOKEN) {
                    saveAcademicSlice(userId, centroId, cursoId, NULL_PERIODO_TOKEN, {
                        actividades: mappedAct.filter(a => !a.periodo),
                        calificaciones: [],
                    });
                    continue;
                }
                const actividadesSlice = mappedAct.filter(a => a.periodo === p);
                // "calificaciones" solo se reescribe si ese período fue consultado ahora;
                // de lo contrario se conserva la parte ya válida de la slice existente.
                const calificacionesSlice = faltantesCal.includes(p)
                    ? mappedCal.filter(c => c.periodo === p)
                    : (getValidAcademicSlice(userId, centroId, cursoId, p)?.calificaciones ?? []);
                saveAcademicSlice(userId, centroId, cursoId, p, {
                    actividades: actividadesSlice,
                    calificaciones: calificacionesSlice,
                });
            }
        } catch (error) {
            console.error(`Error loading Curso data for ${cursoId}:`, error);
        } finally {
            setLoading(false);
            delete diagCursoInFlight[cursoId];
            console.log(`[DIAG][CURSO] end cursoId=${cursoId} ts=${new Date().toISOString()}`);
        }
    }, [session, loadedCursos, addLoadedCurso, setState, setLoading, state.perfiles, state.cursoDocentes]);

    const loadComunidadData = useCallback(async () => {
        if (!session?.user?.id) return;
        if (loadedModules.includes('comunidad')) return;
        console.log('[PLANIFICACION] lazy loading Comunidad data');
        setLoading(true);
        try {
            const results = await Promise.all([
                supabase.from('posts').select('*, profiles:perfiles(nombre_docente, avatar_url, bio)').order('id', { ascending: false }).limit(20),
                supabase.from('historial_colaboradores').select('*').eq('usuario_id', session.user.id)
            ]);

            const posts = results[0].data || [];
            
            setState(prev => {
                const mappedPosts = posts.map((p: any): Post => {
                    const prof = (Array.isArray(p.profiles) ? p.profiles[0] : p.profiles) as Record<string, unknown> | undefined;
                    return {
                        id: p.id as number,
                        autor: prof?.nombre_docente as string || p.autor as string || 'Docente',
                        cargo: p.cargo as string || 'Docente',
                        avatarUrl: prof?.avatar_url as string || '',
                        contenido: p.contenido as string,
                        tiempo: p.tiempo as string || 'Hace un momento',
                        fechaPublicacion: p.fecha_publicacion as string,
                        tipo: p.tipo as 'rubrica' | 'secuencia' | 'general' | 'cotejo',
                        asignatura: p.asignatura as string,
                        userId: p.user_id as string,
                        userBio: prof?.bio as string || '',
                        expiresAt: p.expires_at as string,
                        recursoDatos: p.recurso_datos || {},
                        recursoId: p.recurso_id as number,
                    };
                });

                return {
                    ...prev,
                    posts: mappedPosts
                };
            });
            addLoadedModule('comunidad');
        } catch (error) {
            console.error('Error loading Comunidad data:', error);
        } finally {
            setLoading(false);
        }
    }, [session, loadedModules, addLoadedModule, setState, setLoading]);

    const loadPlanificacionData = useCallback(async () => {
        if (!session?.user?.id) return;
        if (loadedModules.includes('planificacion')) return;
        console.log('[PLANIFICACION] lazy loading Planificacion data');
        setLoading(true);
        try {
            const currentProfile = state.perfiles.find(p => p.userId === session.user.id);
            const userCentroId = currentProfile?.centro_id;
            const isCentroAdmin = esRolAdministrador(currentProfile?.rol);

            if (!currentProfile) {
                console.log('[PLANIFICACION] loadPlanificacionData: perfiles no disponibles aún, omitiendo carga (sin marcar loaded)');
                console.log(`[DIAG][GUARD] planificacion-perfiles-no-disponibles user=${session.user.id} ts=${new Date().toISOString()}`);
                setLoading(false);
                return;
            }

            const misCursosTutor = state.cursos
                .filter(c => c.isTutorOficial && String(c.userId) === session.user.id)
                .map(c => c.id);

            const misCursosVinculados = state.cursoDocentes
                .filter(cd => cd.userId === session.user.id)
                .map(cd => cd.cursoId);

            const cursosActivos = state.cursos.filter(c =>
                isCentroAdmin ? (c.centroId === userCentroId) : (String(c.userId) === session.user.id || misCursosTutor.includes(c.id))
            );

            const cursosParticipaIds = Array.from(new Set<number>([
                ...cursosActivos.map(c => c.id),
                ...misCursosVinculados
            ]));

            let secuenciaQuery = supabase.from('secuencias').select('*').eq('activo', true);
            if (isCentroAdmin && misCursosTutor.length === 0) {
                secuenciaQuery = secuenciaQuery.in('curso_id', cursosActivos.map(c => c.id));
            } else if (cursosParticipaIds.length > 0) {
                secuenciaQuery = secuenciaQuery.in('curso_id', cursosParticipaIds);
            } else {
                secuenciaQuery = secuenciaQuery.eq('user_id', session.user.id);
            }

            const { data: secuencias } = await secuenciaQuery;
            
            const mappedSecuencias = (secuencias || []).map((s: Record<string, unknown>): Secuencia => ({
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
                archivoFechaCarga: s.archivo_fecha_carga as string | undefined,
                recursos: Array.isArray(s.recursos) ? s.recursos : (typeof s.recursos === 'string' ? (() => { try { return JSON.parse(s.recursos); } catch(e) { return []; } })() : [])
            }));

            setState(prev => ({
                ...prev,
                secuencias: mappedSecuencias
            }));
            addLoadedModule('planificacion');
            saveSecuencias(session.user.id, mappedSecuencias);
        } catch (error) {
            console.error('Error loading Planificacion data:', error);
        } finally {
            setLoading(false);
        }
    }, [session, loadedModules, addLoadedModule, setState, setLoading, state.perfiles, state.cursos, state.cursoDocentes]);

    const loadRubricaCotejoData = useCallback(async () => {
        if (!session?.user?.id) return;
        if (loadedModules.includes('evaluacion')) return;
        console.log('[PLANIFICACION] lazy loading Evaluacion (Rubricas/Cotejo) data');
        setLoading(true);
        try {
            // Caché persistente de plantillas: si existe una entrada válida para
            // este usuario, se evita la consulta redundante a la tabla `plantillas`
            // y se hidrata Zustand desde el caché.
            const cachedPlantillas = getValidPlantillaCache(session.user.id);

            let rawPlantillas: any[] | null = null;
            if (cachedPlantillas === null) {
                const { data } = await supabase
                    .from('plantillas')
                    .select('*')
                    .eq('user_id', session.user.id)
                    .eq('archivado', false)
                    .order('created_at', { ascending: false });
                rawPlantillas = data;
            }

            setState(prev => {
                // En caché válida se reaprovechan las Plantilla ya normalizadas;
                // en MISS se mapean las filas crudas de Supabase.
                const mappedPlantillas = cachedPlantillas !== null
                    ? cachedPlantillas
                    : (rawPlantillas || []).map((p): Plantilla => ({
                        id: p.id,
                        userId: p.user_id as string,
                        tipo: p.tipo,
                        nombre: p.nombre,
                        datos: p.datos || {},
                        createdAt: p.created_at
                    }));

                return {
                    ...prev,
                    evaluacionesRubrica: [],
                    evaluacionesCotejo: [],
                    criteriosCotejo: [],
                    descriptoresRubrica: [],
                    nivelesPuntaje: sanitizeNivelesPuntaje([]),
                    plantillas: mappedPlantillas
                };
            });

            // Si fue un MISS, guardar las plantillas en el caché persistente,
            // tomándolas de la fuente de verdad (Zustand) tal como se guardan.
            if (cachedPlantillas === null) {
                savePlantillaCache(session.user.id, useAppStore.getState().state.plantillas);
            }

            addLoadedModule('evaluacion');
        } catch (error) {
            console.error('Error loading evaluacion data:', error);
        } finally {
            setLoading(false);
        }
    }, [session, loadedModules, addLoadedModule, setState, setLoading]);

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
        refresh: fetchData,
        loadDashboardData,
        loadCursoData,
        loadComunidadData,
        loadPlanificacionData,
        loadRubricaCotejoData
    };
}
