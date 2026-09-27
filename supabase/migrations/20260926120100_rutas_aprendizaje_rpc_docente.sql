-- ============================================================================
--  RUTAS DE APRENDIZAJE — RPC LADO DOCENTE (autor del contenido)
--  Migración: 20260926120100
--
--  Todas son SECURITY DEFINER y verifican la propiedad de la RUTA, que se
--  hereda de la Ficha (pc_notas.usuario_id = auth.uid()). Ninguna acepta un
--  id de usuario como parámetro: la identidad sale del JWT, nunca del cliente.
--
--  Convención de errores: devuelven JSONB. Si trae 'error', el cliente muestra
--  el mensaje. Esto replica el contrato de las RPC portal_* existentes.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- Auxiliar: extrae el estudiante_id de un session_token del Portal.
-- Lanza excepcion si la sesion no existe o expiro, de modo que TODAS las
-- RPC del Portal compartan exactamente la misma validacion.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_resolver_sesion(p_session_token UUID)
RETURNS BIGINT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
BEGIN
    IF p_session_token IS NULL THEN
        RAISE EXCEPTION 'Sesión inválida';
    END IF;

    SELECT pa.estudiante_id INTO v_estudiante_id
    FROM public.portal_sesiones ps
    JOIN public.portal_accesos pa
      ON pa.id = ps.acceso_id
     AND pa.active = true
    WHERE ps.session_token = p_session_token
      AND ps.expires_at > NOW()
    LIMIT 1;

    IF v_estudiante_id IS NULL THEN
        RAISE EXCEPTION 'Sesión inválida';
    END IF;

    RETURN v_estudiante_id;
END;
$$;

COMMENT ON FUNCTION public.ruta_resolver_sesion(UUID) IS
    'Valida la sesion del Portal y devuelve estudiantes.id. Unico punto de entrada para el lado estudiante.';


-- ────────────────────────────────────────────────────────────────────────────
-- Auxiliar: nombre legible de un tipo de actividad.
-- Mantiene el CHECK de la tabla y el constructor en un solo lugar.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_tipo_actividad_etiqueta(p_tipo TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT CASE p_tipo
        WHEN 'opcion_multiple'          THEN 'Selección múltiple'
        WHEN 'verdadero_falso'          THEN 'Verdadero / Falso'
        WHEN 'completar'                THEN 'Completar espacios'
        WHEN 'respuesta_numerica'       THEN 'Respuesta numérica'
        WHEN 'respuesta_escrita'        THEN 'Respuesta escrita'
        WHEN 'ordenar_pasos'            THEN 'Ordenar pasos'
        WHEN 'relacionar'               THEN 'Relacionar elementos'
        WHEN 'procedimiento_matematico' THEN 'Procedimiento matemático'
        ELSE 'Actividad'
    END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- Auxiliar: EXIGE que el usuario actual sea dueño de la ruta.
-- Lanza excepcion -> la transaccion se revierte. Nunca devuelve "permiso denegado
-- con datos": si no es dueño, no existe salida.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_exigir_ownership(p_ruta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM public.ruta_aprendizaje r
        JOIN public.pc_notas pn ON pn.id = r.nota_id
        WHERE r.id = p_ruta_id
          AND pn.usuario_id = auth.uid()
    ) THEN
        RAISE EXCEPTION 'No tienes permiso para modificar esta ruta';
    END IF;
END;
$$;


-- ============================================================================
--  CRUD DE RUTA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ruta_crear(
    p_nota_id UUID,
    p_titulo TEXT,
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
BEGIN
    IF NOT public.ruta_es_dueno_ficha(p_nota_id) THEN
        RETURN jsonb_build_object('error', 'La ficha no te pertenece');
    END IF;

    IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
        RETURN jsonb_build_object('error', 'El título es obligatorio');
    END IF;

    INSERT INTO public.ruta_aprendizaje (nota_id, usuario_id, titulo, descripcion, estado)
    VALUES (p_nota_id, auth.uid(), btrim(p_titulo), NULLIF(btrim(COALESCE(p_descripcion, '')), ''), 'borrador')
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'estado', 'borrador');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_actualizar(
    p_ruta_id UUID,
    p_titulo TEXT DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL,
    p_estado TEXT DEFAULT NULL,
    p_regla_desbloqueo JSONB DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    IF p_estado IS NOT NULL AND p_estado NOT IN ('borrador', 'publicada', 'archivada') THEN
        RETURN jsonb_build_object('error', 'Estado inválido');
    END IF;

    -- Publicar exige al menos una etapa con una actividad: una ruta publicada
    -- vacia es un callejon sin salida para el estudiante.
    IF p_estado = 'publicada' AND NOT EXISTS (
        SELECT 1
        FROM public.ruta_etapa e
        JOIN public.ruta_actividad a ON a.etapa_id = e.id
        WHERE e.ruta_id = p_ruta_id
    ) THEN
        RETURN jsonb_build_object(
            'error',
            'No puedes publicar una ruta sin actividades. Agrega al menos una etapa con una actividad.'
        );
    END IF;

    UPDATE public.ruta_aprendizaje
    SET titulo         = COALESCE(NULLIF(btrim(p_titulo), ''), titulo),
        descripcion    = CASE WHEN p_descripcion IS NULL THEN descripcion
                              ELSE NULLIF(btrim(p_descripcion), '') END,
        estado         = COALESCE(p_estado, estado),
        regla_desbloqueo = COALESCE(p_regla_desbloqueo, regla_desbloqueo),
        actualizado_en = NOW()
    WHERE id = p_ruta_id;

    RETURN jsonb_build_object('success', true, 'id', p_ruta_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_eliminar(p_ruta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    -- CASCADE: al borrar la ruta se van sus etapas, actividades, preguntas y el
    -- progreso asociado. Es coherente con el resto del modelo (borrar una
    -- pc_nota arrastra ficha_cursos y ficha_comentarios). Editar el CONTENIDO de
    -- una actividad, en cambio, nunca borra evidencia: eso se resuelve con
    -- ruta_pregunta.activo.
    DELETE FROM public.ruta_aprendizaje WHERE id = p_ruta_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  LECTURA COMPLETA PARA EL CONSTRUCTOR
--  Incluye las respuestas correctas: es contenido autoral del docente, y la
--  RPC exige ownership. El Portal usa otra RPC que NUNCA las expone.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_obtener(p_ruta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    IF NOT public.ruta_puede_editar(p_ruta_id) THEN
        RETURN jsonb_build_object('error', 'No tienes permiso para ver esta ruta');
    END IF;

    SELECT jsonb_build_object(
        'id', r.id,
        'nota_id', r.nota_id,
        'titulo', r.titulo,
        'descripcion', r.descripcion,
        'estado', r.estado,
        'regla_desbloqueo', r.regla_desbloqueo,
        'creado_en', r.creado_en,
        'actualizado_en', r.actualizado_en,
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'descripcion', e.descripcion,
                    'orden', e.orden,
                    'actividades', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', act.id,
                                'tipo', act.tipo,
                                'tipo_etiqueta', public.ruta_tipo_actividad_etiqueta(act.tipo),
                                'titulo', act.titulo,
                                'instrucciones', act.instrucciones,
                                'orden', act.orden,
                                'config', act.config,
                                'obligatorio', act.obligatorio,
                                'preguntas', (
                                    SELECT COALESCE(jsonb_agg(
                                        jsonb_build_object(
                                            'id', pr.id,
                                            'orden', pr.orden,
                                            'enunciado', pr.enunciado,
                                            'tipo_respuesta', pr.tipo_respuesta,
                                            'config', pr.config,
                                            'pista', pr.pista,
                                            'retroalimentacion_ok', pr.retroalimentacion_ok,
                                            'retroalimentacion_error', pr.retroalimentacion_error,
                                            'peso', pr.peso,
                                            'opciones', (
                                                SELECT COALESCE(jsonb_agg(
                                                    jsonb_build_object(
                                                        'id', o.id,
                                                        'texto', o.texto,
                                                        'orden', o.orden,
                                                        'es_correcta', o.es_correcta,
                                                        'clave', o.clave,
                                                        'valor', o.valor
                                                    ) ORDER BY o.orden
                                                ), '[]'::jsonb)
                                                FROM public.ruta_opcion o
                                                WHERE o.pregunta_id = pr.id
                                            )
                                        ) ORDER BY pr.orden
                                    ), '[]'::jsonb)
                                    FROM public.ruta_pregunta pr
                                    WHERE pr.actividad_id = act.id
                                      AND pr.activo = TRUE
                                )
                            ) ORDER BY act.orden
                        ), '[]'::jsonb)
                        FROM public.ruta_actividad act
                        WHERE act.etapa_id = e.id
                    )
                ) ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            WHERE e.ruta_id = r.id
        )
    ) INTO v_resultado
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ruta no encontrada'));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- Lista compacta: todas las rutas de una ficha (para el menu "Crear ruta").
CREATE OR REPLACE FUNCTION public.ruta_listar_por_ficha(p_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    IF NOT public.ruta_es_dueno_ficha(p_nota_id) THEN
        RETURN jsonb_build_object('error', 'La ficha no te pertenece');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'titulo', r.titulo,
            'estado', r.estado,
            'descripcion', r.descripcion,
            'actualizado_en', r.actualizado_en,
            'total_etapas', (SELECT COUNT(*) FROM public.ruta_etapa e WHERE e.ruta_id = r.id),
            'total_actividades', (SELECT COUNT(*) FROM public.ruta_actividad a WHERE a.ruta_id = r.id)
        ) ORDER BY r.actualizado_en DESC
    ), '[]'::jsonb) INTO v_resultado
    FROM public.ruta_aprendizaje r
    WHERE r.nota_id = p_nota_id;

    RETURN v_resultado;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  CRUD DE ETAPA
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ruta_crear_etapa(
    p_ruta_id UUID,
    p_titulo TEXT,
    p_descripcion TEXT DEFAULT NULL,
    p_orden INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_id UUID;
    v_orden INTEGER;
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    IF p_titulo IS NULL OR btrim(p_titulo) = '' THEN
        RETURN jsonb_build_object('error', 'El título de la etapa es obligatorio');
    END IF;

    -- Si no se indica orden, se coloca al final.
    SELECT COALESCE(MAX(orden), 0) + 1 INTO v_orden
    FROM public.ruta_etapa WHERE ruta_id = p_ruta_id;

    INSERT INTO public.ruta_etapa (ruta_id, titulo, descripcion, orden)
    VALUES (p_ruta_id, btrim(p_titulo), NULLIF(btrim(COALESCE(p_descripcion, '')), ''), COALESCE(p_orden, v_orden))
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'orden', COALESCE(p_orden, v_orden));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_actualizar_etapa(
    p_etapa_id UUID,
    p_titulo TEXT DEFAULT NULL,
    p_descripcion TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
BEGIN
    SELECT ruta_id INTO v_ruta_id FROM public.ruta_etapa WHERE id = p_etapa_id;
    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Etapa no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    UPDATE public.ruta_etapa
    SET titulo      = COALESCE(NULLIF(btrim(p_titulo), ''), titulo),
        descripcion = CASE WHEN p_descripcion IS NULL THEN descripcion
                           ELSE NULLIF(btrim(p_descripcion), '') END
    WHERE id = p_etapa_id;

    RETURN jsonb_build_object('success', true, 'id', p_etapa_id);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_eliminar_etapa(p_etapa_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
BEGIN
    SELECT ruta_id INTO v_ruta_id FROM public.ruta_etapa WHERE id = p_etapa_id;
    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Etapa no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    DELETE FROM public.ruta_etapa WHERE id = p_etapa_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- Reordenar: recibe el array de ids en el orden final desired.
-- El array es la fuente de verdad, no un delta, para que el cliente no tenga
-- que conocer la logica de reindexado.
CREATE OR REPLACE FUNCTION public.ruta_reordenar_etapas(
    p_ruta_id UUID,
    p_etapa_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_idx INTEGER;
    v_id UUID;
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    -- Toda etapa existente debe aparecer exactamente una vez en el array.
    IF (SELECT COUNT(*) FROM public.ruta_etapa WHERE ruta_id = p_ruta_id)
       <> COALESCE(array_length(p_etapa_ids, 1), 0) THEN
        RETURN jsonb_build_object('error', 'La lista de etapas no coincide con la ruta');
    END IF;

    FOR v_idx IN 1 .. COALESCE(array_length(p_etapa_ids, 1), 0) LOOP
        v_id := p_etapa_ids[v_idx];
        IF NOT EXISTS (SELECT 1 FROM public.ruta_etapa WHERE id = v_id AND ruta_id = p_ruta_id) THEN
            RETURN jsonb_build_object('error', 'La lista de etapas contiene una etapa ajena a esta ruta');
        END IF;
    END LOOP;

    -- Repetir un id con el conteo correcto (A, A, B) dejaria una etapa sin
    -- mover: el conteo no lo detecta, la unicidad si.
    IF (SELECT COUNT(DISTINCT u.id) FROM unnest(p_etapa_ids) u(id))
       <> COALESCE(array_length(p_etapa_ids, 1), 0) THEN
        RETURN jsonb_build_object('error', 'La lista de etapas tiene elementos repetidos');
    END IF;

    FOR v_idx IN 1 .. COALESCE(array_length(p_etapa_ids, 1), 0) LOOP
        UPDATE public.ruta_etapa SET orden = v_idx WHERE id = p_etapa_ids[v_idx];
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  CRUD DE ACTIVIDAD
-- ============================================================================

CREATE OR REPLACE FUNCTION public.ruta_crear_actividad(
    p_etapa_id UUID,
    p_tipo TEXT,
    p_titulo TEXT DEFAULT NULL,
    p_instrucciones TEXT DEFAULT NULL,
    p_orden INTEGER DEFAULT NULL,
    p_config JSONB DEFAULT '{}'::JSONB,
    p_obligatorio BOOLEAN DEFAULT TRUE
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
    v_id UUID;
    v_orden INTEGER;
BEGIN
    SELECT ruta_id INTO v_ruta_id FROM public.ruta_etapa WHERE id = p_etapa_id;
    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Etapa no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    IF p_tipo IS NULL OR p_tipo NOT IN (
        'opcion_multiple','verdadero_falso','completar','respuesta_numerica',
        'respuesta_escrita','ordenar_pasos','relacionar','procedimiento_matematico'
    ) THEN
        RETURN jsonb_build_object('error', 'Tipo de actividad inválido');
    END IF;

    SELECT COALESCE(MAX(orden), 0) + 1 INTO v_orden
    FROM public.ruta_actividad WHERE etapa_id = p_etapa_id;

    INSERT INTO public.ruta_actividad (etapa_id, ruta_id, tipo, titulo, instrucciones, orden, config, obligatorio)
    VALUES (
        p_etapa_id, v_ruta_id, p_tipo,
        NULLIF(btrim(COALESCE(p_titulo, '')), ''),
        NULLIF(btrim(COALESCE(p_instrucciones, '')), ''),
        COALESCE(p_orden, v_orden),
        COALESCE(p_config, '{}'::JSONB),
        COALESCE(p_obligatorio, TRUE)
    )
    RETURNING id INTO v_id;

    RETURN jsonb_build_object('id', v_id, 'orden', COALESCE(p_orden, v_orden));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_eliminar_actividad(p_actividad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
BEGIN
    SELECT ruta_id INTO v_ruta_id FROM public.ruta_actividad WHERE id = p_actividad_id;
    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Actividad no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    DELETE FROM public.ruta_actividad WHERE id = p_actividad_id;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


CREATE OR REPLACE FUNCTION public.ruta_reordenar_actividades(
    p_etapa_id UUID,
    p_actividad_ids UUID[]
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
    v_idx INTEGER;
    v_id UUID;
BEGIN
    SELECT ruta_id INTO v_ruta_id FROM public.ruta_etapa WHERE id = p_etapa_id;
    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Etapa no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    IF (SELECT COUNT(*) FROM public.ruta_actividad WHERE etapa_id = p_etapa_id)
       <> COALESCE(array_length(p_actividad_ids, 1), 0) THEN
        RETURN jsonb_build_object('error', 'La lista de actividades no coincide con la etapa');
    END IF;

    FOR v_idx IN 1 .. COALESCE(array_length(p_actividad_ids, 1), 0) LOOP
        v_id := p_actividad_ids[v_idx];
        IF NOT EXISTS (SELECT 1 FROM public.ruta_actividad WHERE id = v_id AND etapa_id = p_etapa_id) THEN
            RETURN jsonb_build_object('error', 'La lista contiene una actividad ajena a esta etapa');
        END IF;
    END LOOP;

    -- Un id repetido con el conteo correcto dejaria una actividad sin mover.
    IF (SELECT COUNT(DISTINCT u.id) FROM unnest(p_actividad_ids) u(id))
       <> COALESCE(array_length(p_actividad_ids, 1), 0) THEN
        RETURN jsonb_build_object('error', 'La lista de actividades tiene elementos repetidos');
    END IF;

    FOR v_idx IN 1 .. COALESCE(array_length(p_actividad_ids, 1), 0) LOOP
        UPDATE public.ruta_actividad SET orden = v_idx WHERE id = p_actividad_ids[v_idx];
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  GUARDAR EL CONTENIDO DE UNA ACTIVIDAD (preguntas + opciones) en UNA Tx
--  Reemplaza por completo el conjunto de preguntas de la actividad.
--  Es la operacion que usa el constructor: el docente edita un formulario
--  completo y guarda, en vez de una llamada por cada tecla.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_guardar_actividad(
    p_actividad_id UUID,
    p_datos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
    v_etapa_id UUID;
    v_tipo TEXT;
    v_pregunta JSONB;
    v_opcion JSONB;
    v_pregunta_id UUID;
    v_idx INTEGER;
    v_o_idx INTEGER;
    v_respuestas TEXT[];
BEGIN
    SELECT ruta_id, etapa_id, tipo
      INTO v_ruta_id, v_etapa_id, v_tipo
    FROM public.ruta_actividad WHERE id = p_actividad_id;

    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Actividad no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    IF v_tipo NOT IN (
        'opcion_multiple','verdadero_falso','completar','respuesta_numerica',
        'respuesta_escrita','ordenar_pasos','relacionar','procedimiento_matematico'
    ) THEN
        RETURN jsonb_build_object('error', 'Tipo de actividad inválido');
    END IF;

    IF p_datos IS NULL THEN
        RETURN jsonb_build_object('error', 'No se recibieron datos');
    END IF;

    -- ── Campos escalares de la actividad ──
    UPDATE public.ruta_actividad
    SET titulo        = COALESCE(NULLIF(btrim(p_datos->>'titulo'), ''), titulo),
        instrucciones = CASE WHEN p_datos ? 'instrucciones'
                             THEN NULLIF(btrim(p_datos->>'instrucciones'), '')
                             ELSE instrucciones END,
        config        = COALESCE(p_datos->'config', config),
        obligatorio   = COALESCE((p_datos->>'obligatorio')::BOOLEAN, obligatorio)
    WHERE id = p_actividad_id;

    -- ── Preguntas: se RECONSTRUYEN sin perder evidencia ──
    -- Las preguntas que siguen en la misma posicion se ACTUALIZAN (conservan sus
    -- intentos). Las que sobran se desactivan (activo = false) en vez de
    -- borrarse, porque ruta_intento y ruta_intento_espacio las referencian.
    v_idx := 0;
    FOR v_pregunta IN SELECT * FROM jsonb_array_elements(COALESCE(p_datos->'preguntas', '[]'::JSONB)) LOOP
        v_idx := v_idx + 1;

        v_respuestas := ARRAY(
            SELECT COALESCE(t::text, '')
            FROM jsonb_array_elements_text(COALESCE(v_pregunta->'respuestasAceptadas', '[]'::JSONB)) t
        );

        -- Reutiliza la pregunta activa que ocupa esta posicion, si existe.
        SELECT id INTO v_pregunta_id
        FROM public.ruta_pregunta
        WHERE actividad_id = p_actividad_id AND activo = TRUE
        ORDER BY orden, creado_en
        OFFSET (v_idx - 1) LIMIT 1;

        IF v_pregunta_id IS NULL THEN
            INSERT INTO public.ruta_pregunta (
                actividad_id, orden, enunciado, tipo_respuesta, config,
                pista, retroalimentacion_ok, retroalimentacion_error, peso, activo
            )
            VALUES (
                p_actividad_id,
                COALESCE((v_pregunta->>'orden')::INTEGER, v_idx),
                COALESCE(NULLIF(btrim(v_pregunta->>'enunciado'), ''), 'Sin enunciado'),
                COALESCE(NULLIF(v_pregunta->>'tipoRespuesta', ''), 'textual'),
                COALESCE(v_pregunta->'config', '{}'::JSONB)
                    || CASE
                         WHEN COALESCE(array_length(v_respuestas, 1), 0) > 0
                         THEN jsonb_build_object('respuestasAceptadas', to_jsonb(v_respuestas))
                         ELSE '{}'::JSONB
                       END,
                NULLIF(btrim(COALESCE(v_pregunta->>'pista', '')), ''),
                NULLIF(btrim(COALESCE(v_pregunta->>'retroalimentacionOk', '')), ''),
                NULLIF(btrim(COALESCE(v_pregunta->>'retroalimentacionError', '')), ''),
                COALESCE((v_pregunta->>'peso')::NUMERIC, 1.0),
                TRUE
            )
            RETURNING id INTO v_pregunta_id;
        ELSE
            UPDATE public.ruta_pregunta
            SET orden     = COALESCE((v_pregunta->>'orden')::INTEGER, v_idx),
                enunciado = COALESCE(NULLIF(btrim(v_pregunta->>'enunciado'), ''), 'Sin enunciado'),
                tipo_respuesta = COALESCE(NULLIF(v_pregunta->>'tipoRespuesta', ''), 'textual'),
                config = COALESCE(v_pregunta->'config', '{}'::JSONB)
                    || CASE
                         WHEN COALESCE(array_length(v_respuestas, 1), 0) > 0
                         THEN jsonb_build_object('respuestasAceptadas', to_jsonb(v_respuestas))
                         ELSE '{}'::JSONB
                       END,
                pista  = NULLIF(btrim(COALESCE(v_pregunta->>'pista', '')), ''),
                retroalimentacion_ok    = NULLIF(btrim(COALESCE(v_pregunta->>'retroalimentacionOk', '')), ''),
                retroalimentacion_error = NULLIF(btrim(COALESCE(v_pregunta->>'retroalimentacionError', '')), ''),
                peso   = COALESCE((v_pregunta->>'peso')::NUMERIC, 1.0)
            WHERE id = v_pregunta_id;
        END IF;

        -- Opciones de esta pregunta: se reemplazan (no tienen historial).
        DELETE FROM public.ruta_opcion WHERE pregunta_id = v_pregunta_id;

        v_o_idx := 0;
        FOR v_opcion IN SELECT * FROM jsonb_array_elements(COALESCE(v_pregunta->'opciones', '[]'::JSONB)) LOOP
            v_o_idx := v_o_idx + 1;

            INSERT INTO public.ruta_opcion (pregunta_id, texto, orden, es_correcta, clave, valor)
            VALUES (
                v_pregunta_id,
                COALESCE(NULLIF(btrim(v_opcion->>'texto'), ''), '(sin texto)'),
                COALESCE((v_opcion->>'orden')::INTEGER, v_o_idx),
                COALESCE((v_opcion->>'esCorrecta')::BOOLEAN, FALSE),
                NULLIF(btrim(COALESCE(v_opcion->>'clave', '')), ''),
                NULLIF(btrim(COALESCE(v_opcion->>'valor', '')), '')
            );
        END LOOP;
    END LOOP;

    -- Las preguntas que quedaron sin posicion se desactivan (no se borran).
    UPDATE public.ruta_pregunta
    SET activo = FALSE
    WHERE actividad_id = p_actividad_id
      AND activo = TRUE
      AND id NOT IN (
          SELECT id FROM public.ruta_pregunta
          WHERE actividad_id = p_actividad_id AND activo = TRUE
          ORDER BY orden, creado_en
          LIMIT v_idx
      );

    RETURN jsonb_build_object('success', true, 'id', p_actividad_id, 'total_preguntas', v_idx);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- La RPC ruta_previsualizar_respuesta NO vive aquí: depende de
-- ruta_evaluar_respuesta(), que se crea en 20260926120200_rutas_aprendizaje_motor.sql
-- (archivo posterior). Queda junto al motor para no crear una referencia colgante.


-- ============================================================================
--  Permisos EXECUTE (lado docente)
--  fix_db_permissions.sql dejo GRANT ALL a anon sobre todo public; se revoca
--  explicitamente para que estas RPC de escritura no sean invocables por anon.
--  ruta_evaluar_expresion, ruta_comparar y ruta_evaluar_respuesta quedan sin
--  EXECUTE para anon: son la clave de correccion y no tienen por qué ser
--  alcanzables desde el cliente.
--
--  Cada RPC verifica la duena de la ficha (ruta_exigir_ownership) con
--  auth.uid(). Para el rol anon, auth.uid() es NULL, asi que fallarian igual;
--  revocar EXECUTE no es lo unico que protege, es la primera linea de defensa
--  y evita exponer el superficie a cualquier cliente anon.
-- ============================================================================
REVOKE ALL ON FUNCTION public.ruta_resolver_sesion(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ruta_resolver_sesion(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.ruta_tipo_actividad_etiqueta(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ruta_tipo_actividad_etiqueta(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION public.ruta_exigir_ownership(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.ruta_exigir_ownership(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.ruta_crear(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_actualizar(UUID, TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_eliminar(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_obtener(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_listar_por_ficha(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_crear_etapa(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_actualizar_etapa(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_eliminar_etapa(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_reordenar_etapas(UUID, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_crear_actividad(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_eliminar_actividad(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_reordenar_actividades(UUID, UUID[]) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_guardar_actividad(UUID, JSONB) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ruta_crear(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_actualizar(UUID, TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_eliminar(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_obtener(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_listar_por_ficha(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_crear_etapa(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_actualizar_etapa(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_eliminar_etapa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_reordenar_etapas(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_crear_actividad(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_eliminar_actividad(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_reordenar_actividades(UUID, UUID[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_guardar_actividad(UUID, JSONB) TO authenticated;
