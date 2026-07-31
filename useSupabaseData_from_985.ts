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