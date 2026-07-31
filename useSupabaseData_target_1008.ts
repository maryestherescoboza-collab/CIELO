    const fetchData = useCallback(async (isSilent = false) => {
        if (!session?.user?.id) return;
        if (!isSilent) setLoading(true);
        try {
            const [
                { data: perfiles },
                { data: cursos },
                { data: estudiantes },
                { data: actividades },
                { data: calificaciones },
                { data: recuperaciones },
                { data: secuencias },
                { data: incidencias },
                { data: eventos },
                { data: posts },
                { data: docentes },
                { data: evaluacionesRubrica },
                { data: evaluacionesCotejo },
                { data: criteriosCotejo },
                { data: descriptoresRubrica },
                { data: nivelesPuntaje },
                { data: plantillas },
                { data: cursoDetalle },
                { data: postLikes },
                { data: notificaciones },
                { data: badges },
                { data: userBadges },
                { data: cursoDocentes },
                { data: grupos },
            ] = await Promise.all([
                supabase.from('perfiles').select('*'),
                supabase.from('cursos').select('*'),
                supabase.from('estudiantes').select('*'),
                supabase.from('actividades').select('*'),
                supabase.from('calificaciones').select('*'),
                supabase.from('recuperaciones').select('*'),
                supabase.from('secuencias').select('*'),
                supabase.from('incidencias').select('*'),
                supabase.from('eventos').select('*'),
                // Posts: joining with perfiles for real names, avatars and bio
                supabase.from('posts').select('*, profiles:perfiles(nombre_docente, avatar_url, bio)').order('id', { ascending: false }),
                supabase.from('docentes').select('*'),
                supabase.from('evaluaciones_rubrica').select('*'),
                supabase.from('evaluaciones_cotejo').select('*'),
                supabase.from('criterios_cotejo').select('*'),
                supabase.from('descriptores_rubrica').select('*'),
                supabase.from('niveles_puntaje').select('*'),
                supabase.from('plantillas').select('*').order('created_at', { ascending: false }),
                supabase.from('curso_detalle').select('*'),
                supabase.from('post_likes').select('post_id').eq('user_id', session.user.id),
                supabase.from('notificaciones').select('*').order('created_at', { ascending: false }),
                supabase.from('badges').select('*'),
                supabase.from('user_badges').select('*'),
                supabase.from('curso_docentes').select('*'),
                supabase.from('grupos').select('*'),
            ]);

            const userLikedPostIds = new Set((postLikes || []).map((l: Record<string, unknown>) => l.post_id as number));
            const currentProfile = perfiles?.find((p: Record<string, unknown>) => p.user_id === session.user.id);

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
                        likes: p.likes as number,
                        likedByMe: userLikedPostIds.has(p.id as number),
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
                instituto: currentProfile?.instituto || currentProfile?.institucion || 'Mi Instituto',
                perfilBio: currentProfile?.bio || '',
                perfilAvatarUrl: currentProfile?.avatar_url || '',
                nombreDocente: currentProfile?.nombre_docente || '',
                tipoInstitucion: currentProfile?.tipo_institucion as 'publica' | 'privada' || undefined,
                perfilAvatarColor: currentProfile?.avatar_color || '',
                asignaturas: currentProfile?.asignaturas || [],
                perfiles: (perfiles || []).map((p: Record<string, unknown>): UserProfile => ({
                    userId: p.user_id as string,
                    nombreDocente: p.nombre_docente as string || p.nombre as string || '',
                    bio: p.bio as string || '',
                    avatarUrl: p.avatar_url as string || '',
                    avatarColor: p.avatar_color as string || '',
                    asignatura: Array.isArray(p.asignaturas) ? p.asignaturas[0] : (p.asignatura as string || ''),
                    institucion: (p.instituto || p.institucion) as string || '',
                    lastSeen: p.last_seen as string,
                    currentModule: p.current_module as string,
                    totalCorazones: p.total_corazones as number || 0
                })),
                cursos: (cursos || []).map((c: Record<string, unknown>): Curso => ({
                    id: c.id as number,
                    nombre: c.nombre as string,
                    asignatura: c.asignatura as string,
                    grado: c.grado as string,
                    seccion: c.seccion as string,
                    periodo: c.periodo as string,
                    diasSemana: c.dias_semana as string[] || [],
                    color: c.color as string,
                    isTutorOficial: c.is_tutor_oficial as boolean,
                    userId: c.user_id as string,
                    grupoId: c.grupo_id as number,
                    sharedCourseId: (c.shared_course_id as string) || (c.grupo_id ? `group_${c.grupo_id}` : String(c.id)),
                    configuracionEvaluacion: c.configuracion_evaluacion as Record<string, unknown> || {},
                    createdAt: c.created_at as string
                })),
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
                calificaciones: (calificaciones || []).map((c: Record<string, unknown>): CalificacionActividad => ({
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
                recuperaciones: (recuperaciones || []).map((r: Record<string, unknown>): RecuperacionBC => ({
                    estudianteId: r.estudiante_id as number,
                    cursoId: r.curso_id as number,
                    bc: r.bc as 1 | 2 | 3 | 4,
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
                incidencias: (incidencias || []).map((i: Record<string, unknown>): PlaybackTarget => ({
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
                })),
                nivelesPuntaje: nivelesPuntaje as NivelPuntaje[] || [],
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
                    observaciones: cd.observaciones as string,
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
                    grado: n.grado as string,
                    seccion: n.seccion as string,
                    estado: n.estado as 'pendiente' | 'resuelto',
                    createdAt: n.created_at as string
                })),
                badges: (badges || []).map((b: Record<string, unknown>) => ({
                    id: String(b.id),
                    code: b.code as string,
                    nombre: b.nombre as string,
                    descripcion: b.descripcion as string,
                    icono: b.icono as string,
                    condicion: b.condicion as string
                })),
                userBadges: (userBadges || []).map((ub: Record<string, unknown>) => ({
                    id: String(ub.id),
                    userId: String(ub.user_id),
                    badgeId: String(ub.badge_id),
                    fechaObtenida: ub.fecha_obtenida as string
                })),
                cursoDocentes: (cursoDocentes || []).map((cd: Record<string, unknown>): CursoDocente => ({
                    id: cd.id as number,
                    cursoId: cd.curso_id as number,
                    userId: String(cd.docente_id),
                    rol: cd.rol as 'tutor' | 'co-docente',
                    asignatura: cd.asignatura as string,
                    createdAt: cd.created_at as string
                })),
                grupos: (grupos || []).map((g: Record<string, unknown>): Grupo => ({
                    id: g.id as number,
                    nombre: g.nombre as string,
                    grado: g.grado as string,
                    seccion: g.seccion as string,
                    createdAt: g.created_at as string
                })),
            };});
        } catch (error) {
            console.error('Error fetching data from Supabase:', error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    }, [session]);