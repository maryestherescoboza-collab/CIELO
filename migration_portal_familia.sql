-- FASE B: Modelo de Datos

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- 1. Tabla de Configuración Global (portal_configuraciones)
CREATE TABLE IF NOT EXISTS public.portal_configuraciones (
    user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    portal_activo BOOLEAN NOT NULL DEFAULT false,
    mostrar_puntajes BOOLEAN NOT NULL DEFAULT true,
    mostrar_evidencias BOOLEAN NOT NULL DEFAULT true,
    mostrar_recursos BOOLEAN NOT NULL DEFAULT true,
    mostrar_incidencias BOOLEAN NOT NULL DEFAULT false,
    mostrar_recuperacion BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 1b. Tabla de Publicaciones por Asignatura (portal_publicaciones)
CREATE TABLE IF NOT EXISTS public.portal_publicaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    curso_id BIGINT NOT NULL REFERENCES public.cursos(id) ON DELETE CASCADE,
    asignatura TEXT NOT NULL,
    periodo TEXT NOT NULL,
    published_until TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    published_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(curso_id, asignatura, periodo)
);

-- 2. Tabla de Accesos (portal_accesos)
CREATE TABLE IF NOT EXISTS public.portal_accesos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    estudiante_id BIGINT NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,
    centro_id UUID NOT NULL REFERENCES public.centros(id) ON DELETE CASCADE,
    access_token UUID NOT NULL UNIQUE DEFAULT uuid_generate_v4(),
    pin_hash TEXT,
    failed_attempts INT NOT NULL DEFAULT 0,
    locked_until TIMESTAMPTZ,
    active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(estudiante_id)
);

-- 3. Tabla de Sesiones (portal_sesiones)
CREATE TABLE IF NOT EXISTS public.portal_sesiones (
    session_token UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    acceso_id UUID NOT NULL REFERENCES public.portal_accesos(id) ON DELETE CASCADE,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_active_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- FASE C: RLS y Seguridad

ALTER TABLE public.portal_configuraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_configuraciones;
CREATE POLICY "Lectura y escritura para autenticados" ON public.portal_configuraciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_publicaciones;
CREATE POLICY "Lectura y escritura para autenticados" ON public.portal_publicaciones FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_accesos;
CREATE POLICY "Lectura y escritura para autenticados" ON public.portal_accesos FOR ALL TO authenticated USING (true) WITH CHECK (true);
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_sesiones;
CREATE POLICY "Lectura y escritura para autenticados" ON public.portal_sesiones FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- Funciones RPC (SECURITY DEFINER) para acceso desde el Portal

CREATE OR REPLACE FUNCTION public.portal_verify_token(p_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_acceso RECORD;
    v_estudiante RECORD;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false, 'error', 'Token inválido o inactivo'); END IF;
    SELECT nombre, apellido INTO v_estudiante FROM public.estudiantes WHERE id = v_acceso.estudiante_id;
    RETURN jsonb_build_object('valid', true, 'requires_pin_setup', v_acceso.pin_hash IS NULL, 'estudiante_nombre', v_estudiante.nombre, 'estudiante_apellido', v_estudiante.apellido);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_setup_pin(p_token UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_acceso RECORD;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Token inválido'); END IF;
    IF v_acceso.pin_hash IS NOT NULL THEN RETURN jsonb_build_object('success', false, 'error', 'El PIN ya está configurado'); END IF;
    UPDATE public.portal_accesos SET pin_hash = crypt(p_pin, gen_salt('bf')), updated_at = NOW() WHERE id = v_acceso.id;
    RETURN jsonb_build_object('success', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_login(p_token UUID, p_pin TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_acceso RECORD;
    v_session_token UUID;
BEGIN
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE access_token = p_token AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('success', false, 'error', 'Acceso denegado'); END IF;
    IF v_acceso.locked_until > NOW() THEN RETURN jsonb_build_object('success', false, 'error', 'Cuenta bloqueada temporalmente'); END IF;
    
    IF v_acceso.pin_hash IS NULL OR v_acceso.pin_hash != crypt(p_pin, v_acceso.pin_hash) THEN
        UPDATE public.portal_accesos SET failed_attempts = failed_attempts + 1, locked_until = CASE WHEN failed_attempts + 1 >= 5 THEN NOW() + INTERVAL '15 minutes' ELSE locked_until END WHERE id = v_acceso.id;
        RETURN jsonb_build_object('success', false, 'error', 'PIN incorrecto');
    END IF;

    UPDATE public.portal_accesos SET failed_attempts = 0, locked_until = NULL, updated_at = NOW() WHERE id = v_acceso.id;
    INSERT INTO public.portal_sesiones (acceso_id, expires_at) VALUES (v_acceso.id, NOW() + INTERVAL '24 hours') RETURNING session_token INTO v_session_token;
    RETURN jsonb_build_object('success', true, 'session_token', v_session_token);
END;
$$;

CREATE OR REPLACE FUNCTION public.portal_get_context(p_session_token UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_curso RECORD;
    v_centro RECORD;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
    UPDATE public.portal_sesiones SET last_active_at = NOW() WHERE session_token = p_session_token;
    
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    IF NOT FOUND THEN RETURN jsonb_build_object('valid', false); END IF;
    
    SELECT * INTO v_estudiante FROM public.estudiantes WHERE id = v_acceso.estudiante_id;
    SELECT * INTO v_curso FROM public.cursos WHERE id = v_estudiante.curso_id;
    SELECT * INTO v_centro FROM public.centros WHERE id = v_acceso.centro_id;

    RETURN jsonb_build_object(
        'valid', true,
        'estudiante_id', v_estudiante.id,
        'curso_id', v_curso.id,
        'centro_id', v_centro.id,
        'estudiante_nombre', v_estudiante.nombre,
        'estudiante_apellido', v_estudiante.apellido,
        'curso_grado', v_curso.grado,
        'curso_seccion', v_curso.seccion,
        'centro_nombre', v_centro.nombre
    );
END;
$$;

-- Obtener asignaturas publicadas y configuraciones para el estudiante
CREATE OR REPLACE FUNCTION public.portal_get_asignaturas(p_session_token UUID, p_periodo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    WITH student_acts AS (
        SELECT 
            COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura) as asignatura
        FROM public.actividades a
        JOIN public.cursos c_act ON c_act.id = a.curso_id
        WHERE a.periodo = p_periodo
          AND (a.curso_id = v_curso.id OR a.shared_course_id = v_curso.shared_course_id)
        GROUP BY COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura)
    ),
    published_subjects AS (
        SELECT 
            sa.asignatura,
            COALESCE(pc.mostrar_puntajes, true) as mostrar_puntajes,
            COALESCE(pc.mostrar_evidencias, true) as mostrar_evidencias,
            COALESCE(pc.mostrar_recursos, true) as mostrar_recursos,
            COALESCE(pc.mostrar_incidencias, false) as mostrar_incidencias,
            COALESCE(pc.mostrar_recuperacion, true) as mostrar_recuperacion,
            pp.published_until,
            COALESCE(pc.portal_activo, true) as portal_activo
        FROM student_acts sa
        LEFT JOIN public.portal_publicaciones pp ON 
            pp.asignatura = sa.asignatura AND pp.periodo = p_periodo AND 
            (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
        LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'asignatura', ps.asignatura,
            'mostrar_puntajes', ps.mostrar_puntajes,
            'mostrar_evidencias', ps.mostrar_evidencias,
            'mostrar_recursos', ps.mostrar_recursos,
            'mostrar_incidencias', ps.mostrar_incidencias,
            'mostrar_recuperacion', ps.mostrar_recuperacion,
            'published_until', ps.published_until
        )
    ) INTO v_resultado
    FROM published_subjects ps
    WHERE ps.portal_activo = true;

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- Obtener evidencias seguras
CREATE OR REPLACE FUNCTION public.portal_get_evidencias(p_session_token UUID, p_periodo TEXT, p_asignatura TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_evidencias BOOLEAN;
    v_mostrar_puntajes BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    -- Obtener configuracion
    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_evidencias, true), COALESCE(pc.mostrar_puntajes, true)
    INTO v_published_until, v_portal_activo, v_mostrar_evidencias, v_mostrar_puntajes
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE pp.asignatura = p_asignatura AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    -- Si no existe configuracion, asumimos defaults activos
    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_evidencias := true;
        v_mostrar_puntajes := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_evidencias = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', a.id, 'nombre', a.nombre, 'fecha', a.fecha, 'indicador', a.indicador, 'bcAsignados', a.bc_asignados,
            'puntaje', CASE WHEN v_mostrar_puntajes THEN c.puntaje ELSE NULL END,
            'descriptores', CASE WHEN v_mostrar_puntajes THEN c.descriptores ELSE NULL END
        )
    ) INTO v_resultado
    FROM public.actividades a
    JOIN public.cursos c_act ON c_act.id = a.curso_id
    LEFT JOIN public.calificaciones c ON c.actividad_id = a.id AND c.estudiante_id = v_acceso.estudiante_id
    WHERE a.periodo = p_periodo 
      AND COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura) = p_asignatura
      AND (a.curso_id = v_curso.id OR a.shared_course_id = v_curso.shared_course_id)
      AND (v_published_until IS NULL OR a.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- Obtener incidencias académicas
CREATE OR REPLACE FUNCTION public.portal_get_incidencias(p_session_token UUID, p_periodo TEXT, p_asignatura TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_incidencias BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;
    
    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_incidencias, false)
    INTO v_published_until, v_portal_activo, v_mostrar_incidencias
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE pp.asignatura = p_asignatura AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_incidencias := false;
    END IF;

    IF v_portal_activo = false OR v_mostrar_incidencias = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(jsonb_build_object('id', i.id, 'fecha', i.fecha, 'categoria', i.categoria, 'descripcion', i.descripcion))
    INTO v_resultado
    FROM public.incidencias i
    WHERE i.estudiante_id = v_acceso.estudiante_id 
      AND i.categoria = 'Rendimiento académico'
      AND (v_published_until IS NULL OR i.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

-- Obtener el dashboard (Resumen general con promedios)
CREATE OR REPLACE FUNCTION public.portal_get_dashboard(p_session_token UUID, p_periodo TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_estudiante_promedio NUMERIC;
    v_ranking INT;
    v_total_estudiantes INT;
    v_asignaturas JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    WITH student_acts AS (
        SELECT 
            COALESCE(NULLIF(a.asignatura, ''), c_act.asignatura) as asignatura,
            a.bc_asignados,
            cal.puntaje,
            a.created_at
        FROM public.actividades a
        JOIN public.cursos c_act ON c_act.id = a.curso_id
        JOIN public.calificaciones cal ON cal.actividad_id = a.id AND cal.estudiante_id = v_acceso.estudiante_id
        WHERE a.periodo = p_periodo
          AND (a.curso_id = v_curso.id OR a.shared_course_id = v_curso.shared_course_id)
    ),
    published_subjects AS (
        SELECT 
            sa.asignatura,
            COALESCE(pc.mostrar_puntajes, true) as mostrar_puntajes,
            pp.published_until,
            COALESCE(pc.portal_activo, true) as portal_activo
        FROM (SELECT asignatura FROM student_acts GROUP BY asignatura) sa
        LEFT JOIN public.portal_publicaciones pp ON 
            pp.asignatura = sa.asignatura AND pp.periodo = p_periodo AND 
            (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
        LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    ),
    actividades_filtradas AS (
        SELECT 
            sa.asignatura,
            sa.puntaje,
            sa.bc_asignados,
            ps.mostrar_puntajes
        FROM student_acts sa
        JOIN published_subjects ps ON ps.asignatura = sa.asignatura
        WHERE ps.portal_activo = true
          AND (ps.published_until IS NULL OR sa.created_at <= ps.published_until)
    )
    SELECT jsonb_agg(
        jsonb_build_object(
            'asignatura', sub.asignatura,
            'mostrar_puntajes', sub.mostrar_puntajes,
            'promedio', CASE 
                WHEN sub.mostrar_puntajes = false THEN NULL 
                WHEN sub.total_bc > 0 THEN ROUND((sub.suma_puntaje / (sub.total_bc * 100.0)) * 100) 
                ELSE NULL END
        )
    ) INTO v_asignaturas
    FROM (
        SELECT 
            af.asignatura,
            af.mostrar_puntajes,
            SUM(af.puntaje) as suma_puntaje,
            COUNT(af.puntaje) as total_bc
        FROM actividades_filtradas af
        GROUP BY af.asignatura, af.mostrar_puntajes
    ) sub;

    WITH student_averages AS (
        SELECT 
            e.id as estudiante_id,
            COALESCE(SUM(c.puntaje), 0) as suma_puntaje,
            COUNT(c.puntaje) as total_actividades
        FROM public.estudiantes e
        JOIN public.actividades a ON (a.curso_id = e.curso_id OR a.shared_course_id = e.shared_course_id)
        JOIN public.calificaciones c ON c.actividad_id = a.id AND c.estudiante_id = e.id
        WHERE (e.curso_id = v_curso.id OR e.shared_course_id = v_curso.shared_course_id)
          AND a.periodo = p_periodo
          -- Emulamos la misma lógica: Si es visible para este estudiante lo será para los demás en el ranking del curso
        GROUP BY e.id
    ),
    ranked_students AS (
        SELECT 
            estudiante_id,
            CASE WHEN total_actividades > 0 THEN (suma_puntaje / (total_actividades * 100.0)) * 100 ELSE 0 END as promedio,
            RANK() OVER (ORDER BY CASE WHEN total_actividades > 0 THEN (suma_puntaje / (total_actividades * 100.0)) * 100 ELSE 0 END DESC) as ranking
        FROM student_averages
    )
    SELECT 
        promedio,
        ranking,
        (SELECT COUNT(*) FROM public.estudiantes WHERE curso_id = v_curso.id OR shared_course_id = v_curso.shared_course_id)
    INTO 
        v_estudiante_promedio, v_ranking, v_total_estudiantes
    FROM ranked_students
    WHERE estudiante_id = v_acceso.estudiante_id;

    RETURN jsonb_build_object(
        'promedio_general', ROUND(COALESCE(v_estudiante_promedio, 0)),
        'ranking', COALESCE(v_ranking, 0),
        'total_estudiantes', COALESCE(v_total_estudiantes, 0),
        'asignaturas', COALESCE(v_asignaturas, '[]'::jsonb)
    );
END;
$$;

-- Obtener recuperaciones seguras
CREATE OR REPLACE FUNCTION public.portal_get_recuperaciones(p_session_token UUID, p_periodo TEXT, p_asignatura TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_curso RECORD;
    v_published_until TIMESTAMPTZ;
    v_portal_activo BOOLEAN;
    v_mostrar_recuperacion BOOLEAN;
    v_mostrar_puntajes BOOLEAN;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;
    SELECT c.* INTO v_curso FROM public.estudiantes e JOIN public.cursos c ON c.id = e.curso_id WHERE e.id = v_acceso.estudiante_id;

    SELECT pp.published_until, COALESCE(pc.portal_activo, true), COALESCE(pc.mostrar_recuperacion, true), COALESCE(pc.mostrar_puntajes, true)
    INTO v_published_until, v_portal_activo, v_mostrar_recuperacion, v_mostrar_puntajes
    FROM public.portal_publicaciones pp
    LEFT JOIN public.portal_configuraciones pc ON pc.user_id = pp.published_by
    WHERE pp.asignatura = p_asignatura AND pp.periodo = p_periodo 
      AND (pp.curso_id = v_curso.id OR pp.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id))
    LIMIT 1;

    IF NOT FOUND THEN
        v_published_until := NULL;
        v_portal_activo := true;
        v_mostrar_recuperacion := true;
        v_mostrar_puntajes := true;
    END IF;

    IF v_portal_activo = false OR v_mostrar_recuperacion = false THEN RETURN '[]'::jsonb; END IF;

    SELECT jsonb_agg(
        jsonb_build_object('bc', r.bc, 'puntaje', CASE WHEN v_mostrar_puntajes THEN r.puntaje ELSE NULL END, 'fecha', TO_CHAR(r.created_at, 'DD/MM/YYYY'))
    ) INTO v_resultado
    FROM public.recuperaciones r
    JOIN public.cursos c_act ON c_act.id = r.curso_id
    WHERE r.estudiante_id = v_acceso.estudiante_id 
      AND r.periodo = p_periodo 
      AND COALESCE(NULLIF(r.asignatura, ''), c_act.asignatura) = p_asignatura
      AND (r.curso_id = v_curso.id OR r.shared_course_id = v_curso.shared_course_id)
      AND (v_published_until IS NULL OR r.created_at <= v_published_until);

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;
