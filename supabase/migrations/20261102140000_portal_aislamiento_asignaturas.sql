-- Migración: Aislamiento Total y Matemático de Asignaturas en Portal CIELO
-- 1. Corrige portal_asignaturas_coinciden para evitar colisión entre 'Lengua Española' y 'Lenguas Extranjeras (Inglés)'.
-- 2. Asegura aislamiento en portal_listar_actividades_para_evidencia con p_asignatura opcional.
-- 3. Asegura aislamiento en portal_listar_evidencias con p_asignatura opcional.
-- 4. Valida consistencia de asignatura en portal_crear_evidencia impidiendo asociar actividades de otra materia.
-- 5. Asegura aislamiento en portal_get_fichas_compartidas con p_asignatura opcional.

-- Función canónica de equivalencia de asignatura
CREATE OR REPLACE FUNCTION public.portal_asignatura_slug(p_text TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_text IS NULL OR trim(p_text) = '' THEN NULL
    WHEN LOWER(trim(p_text)) IN ('lengua_espanola', 'lengua española', 'lengua espanola', 'español', 'espanol') 
         OR ((p_text ILIKE '%lengua%' OR p_text ILIKE '%español%' OR p_text ILIKE '%espanol%') 
             AND NOT (p_text ILIKE '%ingl%' OR p_text ILIKE '%extranjer%' OR p_text ILIKE '%franc%'))
      THEN 'lengua_espanola'
    WHEN LOWER(trim(p_text)) IN ('ingles', 'inglés', 'lenguas extranjeras (inglés)', 'lenguas extranjeras (ingles)') 
         OR p_text ILIKE '%ingl%' 
      THEN 'ingles'
    WHEN LOWER(trim(p_text)) IN ('frances', 'francés', 'lenguas extranjeras (francés)') 
         OR p_text ILIKE '%franc%' 
      THEN 'frances'
    WHEN LOWER(trim(p_text)) IN ('matematica', 'matemática', 'matematicas', 'matemáticas') 
         OR p_text ILIKE '%matem%' 
      THEN 'matematica'
    WHEN LOWER(trim(p_text)) IN ('ciencias_sociales', 'ciencias sociales', 'sociales') 
         OR (p_text ILIKE '%social%' AND NOT (p_text ILIKE '%naturaleza%' OR p_text ILIKE '%natural%')) 
      THEN 'ciencias_sociales'
    WHEN LOWER(trim(p_text)) IN ('ciencias_naturaleza', 'ciencias de la naturaleza', 'ciencias naturales', 'naturales') 
         OR (p_text ILIKE '%naturaleza%' OR p_text ILIKE '%natural%') 
      THEN 'ciencias_naturaleza'
    WHEN LOWER(trim(p_text)) IN ('educacion_fisica', 'educación física', 'educacion fisica') 
         OR (p_text ILIKE '%fisica%' AND NOT (p_text ILIKE '%naturaleza%' OR p_text ILIKE '%natural%')) 
      THEN 'educacion_fisica'
    WHEN LOWER(trim(p_text)) IN ('artistica', 'educación artística', 'educacion artistica') 
         OR p_text ILIKE '%art%stic%' 
      THEN 'artistica'
    WHEN LOWER(trim(p_text)) IN ('formacion_integral', 'formación integral humana y religiosa', 'formacion humana') 
         OR p_text ILIKE '%formaci%n%' 
      THEN 'formacion_integral'
    ELSE LOWER(REPLACE(trim(p_text), ' ', '_'))
  END;
$$;

CREATE OR REPLACE FUNCTION public.portal_asignaturas_coinciden(p_a TEXT, p_b TEXT)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT 
    p_a IS NOT NULL 
    AND p_b IS NOT NULL 
    AND public.portal_asignatura_slug(p_a) IS NOT NULL
    AND public.portal_asignatura_slug(p_b) IS NOT NULL
    AND public.portal_asignatura_slug(p_a) = public.portal_asignatura_slug(p_b);
$$;

-- 1) Listar actividades para evidencia con aislamiento por asignatura
CREATE OR REPLACE FUNCTION public.portal_listar_actividades_para_evidencia(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_est public.estudiantes;
    v_curso public.cursos;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    SELECT * INTO v_curso FROM public.cursos WHERE id = v_est.curso_id;

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'actividad_id',  a.id,
                'actividad',     COALESCE(a.nombre, 'Actividad'),
                'fecha',         a.fecha,
                'periodo',       a.periodo,
                'asignatura',    COALESCE(NULLIF(a.asignatura, ''), c.asignatura),
                'ficha_id',      a.plan_ficha_id,
                'ficha',         f.titulo,
                'evidencias',    (
                                    SELECT COUNT(*)
                                    FROM public.evidencias e
                                    WHERE e.estudiante_id = v_est.id
                                      AND e.actividad_id = a.id
                                )
            )
            ORDER BY COALESCE(a.fecha, a.created_at::date) DESC NULLS LAST, a.id DESC
        )
        FROM public.actividades a
        JOIN public.cursos c ON c.id = a.curso_id
        LEFT JOIN public.pc_notas f ON f.id = a.plan_ficha_id
        WHERE (
            a.curso_id = v_est.curso_id
            OR (v_curso.shared_course_id IS NOT NULL AND (
                a.shared_course_id = v_curso.shared_course_id 
                OR a.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id)
            ))
        )
          AND a.activo IS NOT FALSE
          AND (
            p_asignatura IS NULL
            OR (
                COALESCE(NULLIF(a.asignatura, ''), c.asignatura) IS NOT NULL
                AND public.portal_asignaturas_coinciden(COALESCE(NULLIF(a.asignatura, ''), c.asignatura), p_asignatura)
            )
          )
    ), '[]'::JSONB);
END;
$$;

-- 2) Listar evidencias con aislamiento por asignatura
CREATE OR REPLACE FUNCTION public.portal_listar_evidencias(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_est public.estudiantes;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    RETURN COALESCE((
        SELECT jsonb_agg(
            jsonb_build_object(
                'id',            e.id,
                'nombre',        e.nombre,
                'descripcion',   e.descripcion,
                'estado',        e.estado,
                'sello',         e.sello,
                'created_at',    e.created_at,
                'updated_at',    e.updated_at,
                'origen',        e.origen,
                'storage_path',  e.storage_path,
                'drive_url',     e.drive_url,
                'thumbnail_url', e.thumbnail_url,
                'mime_type',     e.mime_type,
                'tamano_bytes',  e.tamano_bytes,
                'comentario',    e.comentario,
                'revisado_at',   e.revisado_at,
                'actividad_id',  e.actividad_id,
                'actividad',     COALESCE(a.nombre, 'Actividad'),
                'actividad_fecha', a.fecha,
                'periodo',       a.periodo,
                'asignatura',    COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura),
                'ficha_id',      e.ficha_id,
                'ficha',         f.titulo
            )
            ORDER BY e.created_at DESC
        )
        FROM public.evidencias e
        JOIN public.actividades a ON a.id = e.actividad_id
        JOIN public.cursos c ON c.id = a.curso_id
        LEFT JOIN public.pc_notas f ON f.id = e.ficha_id
        WHERE e.estudiante_id = v_est.id
          AND (
            p_asignatura IS NULL
            OR (
                COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura) IS NOT NULL
                AND public.portal_asignaturas_coinciden(COALESCE(NULLIF(e.asignatura, ''), NULLIF(a.asignatura, ''), c.asignatura), p_asignatura)
            )
          )
    ), '[]'::JSONB);
END;
$$;

-- 3) Crear evidencia con validación de asignatura
CREATE OR REPLACE FUNCTION public.portal_crear_evidencia(
    p_session_token    UUID,
    p_actividad_id     BIGINT,
    p_nombre           TEXT,
    p_origen           TEXT    DEFAULT 'storage',
    p_storage_path     TEXT    DEFAULT NULL,
    p_drive_file_id    TEXT    DEFAULT NULL,
    p_drive_url        TEXT    DEFAULT NULL,
    p_mime_type        TEXT    DEFAULT NULL,
    p_tamano_bytes     BIGINT  DEFAULT NULL,
    p_thumbnail_url    TEXT    DEFAULT NULL,
    p_descripcion      TEXT    DEFAULT NULL,
    p_drive_carpeta_id BIGINT  DEFAULT NULL,
    p_asignatura       TEXT    DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_est     public.estudiantes;
    v_act     public.actividades;
    v_curso   public.cursos;
    v_carpeta public.portal_drive_carpeta;
    v_id      BIGINT;
    v_act_asig TEXT;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    IF p_actividad_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Selecciona la actividad o ficha de la evidencia');
    END IF;

    SELECT * INTO v_curso FROM public.cursos WHERE id = v_est.curso_id;

    -- Validar pertenencia de actividad al curso o curso compartido del estudiante
    SELECT a.* INTO v_act
    FROM public.actividades a
    JOIN public.cursos c ON c.id = a.curso_id
    WHERE a.id = p_actividad_id
      AND (
        a.curso_id = v_est.curso_id
        OR (v_curso.shared_course_id IS NOT NULL AND (
            a.shared_course_id = v_curso.shared_course_id
            OR a.curso_id IN (SELECT id FROM public.cursos WHERE shared_course_id = v_curso.shared_course_id)
        ))
      )
      AND a.activo IS NOT FALSE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'La actividad no está disponible');
    END IF;

    -- Determinar asignatura canónica de la actividad
    v_act_asig := COALESCE(
        NULLIF(v_act.asignatura, ''), 
        (SELECT asignatura FROM public.cursos WHERE id = v_act.curso_id),
        v_curso.asignatura
    );

    -- Si se especificó asignatura, validar estrictamente que coincida
    IF p_asignatura IS NOT NULL AND NOT public.portal_asignaturas_coinciden(v_act_asig, p_asignatura) THEN
        RETURN jsonb_build_object('error', 'La actividad seleccionada no pertenece a la asignatura actual');
    END IF;

    IF p_origen NOT IN ('storage', 'drive') THEN
        RETURN jsonb_build_object('error', 'Origen de evidencia no válido');
    END IF;
    IF p_origen = 'storage' AND p_storage_path IS NULL THEN
        RETURN jsonb_build_object('error', 'Falta el archivo subido');
    END IF;
    IF p_origen = 'drive' AND p_drive_file_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Falta la referencia de Google Drive');
    END IF;
    IF p_nombre IS NULL OR btrim(p_nombre) = '' THEN
        RETURN jsonb_build_object('error', 'Ponle un nombre a la evidencia');
    END IF;

    IF p_drive_carpeta_id IS NOT NULL THEN
        SELECT * INTO v_carpeta
        FROM public.portal_drive_carpeta
        WHERE id = p_drive_carpeta_id
          AND estudiante_id = v_est.id;
        IF NOT FOUND THEN
            RETURN jsonb_build_object('error', 'Esa carpeta de Drive no es tuya');
        END IF;
    END IF;

    INSERT INTO public.evidencias (
        estudiante_id, actividad_id, ficha_id, curso_id, asignatura,
        nombre, descripcion, origen, storage_path, drive_file_id, drive_url,
        mime_type, tamano_bytes, thumbnail_url, drive_carpeta_id
    )
    VALUES (
        v_est.id, v_act.id, v_act.plan_ficha_id, v_act.curso_id,
        v_act_asig,
        btrim(p_nombre), NULLIF(btrim(COALESCE(p_descripcion, '')), ''), p_origen,
        p_storage_path, p_drive_file_id, p_drive_url,
        p_mime_type, p_tamano_bytes, p_thumbnail_url, p_drive_carpeta_id
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id);
END;
$$;

-- 4) Listar fichas compartidas con aislamiento por asignatura
CREATE OR REPLACE FUNCTION public.portal_get_fichas_compartidas(
    p_session_token UUID,
    p_asignatura    TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
    v_sesion RECORD;
    v_acceso RECORD;
    v_estudiante RECORD;
    v_resultado JSONB;
BEGIN
    SELECT * INTO v_sesion FROM public.portal_sesiones WHERE session_token = p_session_token AND expires_at > NOW();
    IF NOT FOUND THEN RETURN jsonb_build_object('error', 'Sesión inválida'); END IF;
    SELECT * INTO v_acceso FROM public.portal_accesos WHERE id = v_sesion.acceso_id AND active = true;

    SELECT e.*, c.shared_course_id INTO v_estudiante
    FROM public.estudiantes e
    JOIN public.cursos c ON c.id = e.curso_id
    WHERE e.id = v_acceso.estudiante_id;

    SELECT jsonb_agg(
        jsonb_build_object(
            'id', pn.id,
            'titulo', pn.titulo,
            'fecha', pn.actualizado_en,
            'curso_id', fc.curso_id,
            'asignatura', c.asignatura
        ) ORDER BY pn.actualizado_en DESC
    ) INTO v_resultado
    FROM public.ficha_cursos fc
    JOIN public.pc_notas pn ON pn.id = fc.nota_id
    JOIN public.cursos c ON c.id = fc.curso_id
    WHERE (
        fc.curso_id = v_estudiante.curso_id 
        OR (v_estudiante.shared_course_id IS NOT NULL AND c.shared_course_id = v_estudiante.shared_course_id)
    )
    AND (
        p_asignatura IS NULL
        OR (
            c.asignatura IS NOT NULL
            AND public.portal_asignaturas_coinciden(c.asignatura, p_asignatura)
        )
    );

    RETURN COALESCE(v_resultado, '[]'::jsonb);
END;
$$;

