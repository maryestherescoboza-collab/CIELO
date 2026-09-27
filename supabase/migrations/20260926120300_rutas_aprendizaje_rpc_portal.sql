-- ============================================================================
--  RUTAS DE APRENDIZAJE — RPC LADO PORTAL (estudiante)
--  Migración: 20260926120300  (se aplica DESPUÉS de 20260926120200_motor)
--
--  Estas RPC son la ÚNICA vía de lectura del contenido y de escritura del
--  progreso del estudiante:
--   - ruta_intento / ruta_intento_espacio / ruta_progreso NO tienen política de
--     escritura para `authenticated`; con RLS activa y sin policy, PostgREST
--     las rechaza. Aquí se escriben como SECURITY DEFINER.
--   - El contenido de la ruta se lee por RPC y NUNCA se expone la respuesta
--     correcta: el Portal recibe enunciado, pista, retroalimentación y el
--     veredicto, nada más.
--
--  Todas validan p_session_token mediante ruta_resolver_sesion(), que es el
--  mismo control que usan las 13 RPC portal_* de
--  20260926050000_fichas_compartidas_portal.sql.
-- ============================================================================


-- ============================================================================
--  HELPERS DE ETAPA
--
--  `ruta_etapa_completada` reemplaza a la consulta ingenua
--  "existe un progreso con estado completada en esta etapa". Esa lectura
--  estaba mal: las filas de ruta_progreso son POR ACTIVIDAD, asi que
--  contestar una sola actividad de la etapa la daba por terminada.
--
--  La definicion correcta es: no queda ninguna actividad obligatoria de la
--  etapa sin completar.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_etapa_completada(
    p_etapa_id UUID,
    p_estudiante_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT NOT EXISTS (
        SELECT 1
        FROM public.ruta_actividad a
        WHERE a.etapa_id = p_etapa_id
          AND a.obligatorio
          AND NOT EXISTS (
              SELECT 1
              FROM public.ruta_progreso p
              WHERE p.actividad_id = a.id
                AND p.estudiante_id = p_estudiante_id
                AND p.estado = 'completada'
          )
    );
$$;

COMMENT ON FUNCTION public.ruta_etapa_completada(UUID, BIGINT) IS
    'Una etapa esta completa cuando ninguna de sus actividades obligatorias queda pendiente.';


-- El cliente tambien dibuja candados, pero larospection NO es una validacion:
-- sin esta comprobacion en servidor, llamar la RPC de intento directamente
-- permitiria saltarse el orden de la ruta.
CREATE OR REPLACE FUNCTION public.ruta_etapa_desbloqueada(
    p_ruta_id UUID,
    p_etapa_id UUID,
    p_estudiante_id BIGINT,
    p_regla JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_orden INT;
    v_modo TEXT := COALESCE(p_regla->>'modo', 'secuencial');
    v_porcentaje NUMERIC := 0;
    v_pendientes INT := 0;
    v_total INT := 0;
BEGIN
    SELECT e.orden INTO v_orden
    FROM public.ruta_etapa e
    WHERE e.id = p_etapa_id AND e.ruta_id = p_ruta_id;

    IF v_orden IS NULL THEN
        RETURN FALSE;
    END IF;

    IF v_modo = 'abierta' THEN
        RETURN TRUE;
    END IF;

    IF v_modo = 'porcentaje' THEN
        SELECT
            COUNT(*) FILTER (WHERE pr.intentos IS NOT NULL),
            COUNT(*)
        INTO v_pendientes, v_total
        FROM public.ruta_actividad a
        LEFT JOIN public.ruta_progreso pr
               ON pr.actividad_id = a.id
              AND pr.estudiante_id = p_estudiante_id
              AND pr.estado = 'completada'
        WHERE a.ruta_id = p_ruta_id AND a.obligatorio;

        v_porcentaje := COALESCE((p_regla->>'porcentaje')::NUMERIC, 100);

        IF v_total = 0 THEN
            RETURN TRUE;
        END IF;

        -- La primera etapa siempre se abre: si no, el estudiante no tiene por
        -- donde empezar.
        IF v_orden = (SELECT MIN(orden) FROM public.ruta_etapa WHERE ruta_id = p_ruta_id) THEN
            RETURN TRUE;
        END IF;

        RETURN ((v_total - v_pendientes)::NUMERIC / v_total::NUMERIC) * 100 >= v_porcentaje;
    END IF;

    -- Secuencial: todas las etapas anteriores deben estar completas.
    RETURN NOT EXISTS (
        SELECT 1
        FROM public.ruta_etapa e
        WHERE e.ruta_id = p_ruta_id
          AND e.orden < v_orden
          AND NOT public.ruta_etapa_completada(e.id, p_estudiante_id)
    );
END;
$$;

COMMENT ON FUNCTION public.ruta_etapa_desbloqueada(UUID, UUID, BIGINT, JSONB) IS
    'Regla de desbloqueo resuelta en servidor. El cliente solo la refleja.';


-- ────────────────────────────────────────────────────────────────────────────
-- Listar rutas publicadas de una ficha.
-- Alimenta el botón "Ruta de aprendizaje" en la ficha del Portal.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_ruta_listar(
    p_session_token UUID,
    p_nota_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_resultado JSONB;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    IF NOT public.ruta_ficha_compartida_con_estudiante(p_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', r.id,
            'titulo', r.titulo,
            'descripcion', r.descripcion,
            'total_etapas', (SELECT COUNT(*) FROM public.ruta_etapa e WHERE e.ruta_id = r.id),
            'total_actividades', (SELECT COUNT(*) FROM public.ruta_actividad a WHERE a.ruta_id = r.id),
            'completadas', (
                SELECT COUNT(*)
                FROM public.ruta_progreso p
                WHERE p.ruta_id = r.id
                  AND p.estudiante_id = v_estudiante_id
                  AND p.estado = 'completada'
            )
        ) ORDER BY r.creado_en
    ), '[]'::jsonb) INTO v_resultado
    FROM public.ruta_aprendizaje r
    WHERE r.nota_id = p_nota_id
      AND r.estado = 'publicada';

    RETURN v_resultado;
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- Contenido de la ruta + progreso del estudiante.
--
-- NO incluye: config.respuestaEsperada, config.pasos[].espacios[].respuesta,
-- opciones.es_correcta. Del procedimiento solo viaja el texto del paso y
-- cuantos huecos tiene (ruta_pasos_publicos), que es lo que el Portal necesita
-- para dibujar los campos.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_ruta_obtener(
    p_session_token UUID,
    p_ruta_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_nota_id UUID;
    v_regla JSONB;
    v_porcentaje NUMERIC := 100;
    v_resultado JSONB;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT r.nota_id, COALESCE(r.regla_desbloqueo, '{"modo":"secuencial"}'::JSONB)
      INTO v_nota_id, v_regla
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id
      AND r.estado = 'publicada';

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Ruta no encontrada o no publicada');
    END IF;

    IF NOT public.ruta_ficha_compartida_con_estudiante(v_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Esta ruta no está disponible para tu curso');
    END IF;

    IF v_regla->>'modo' = 'porcentaje' THEN
        v_porcentaje := COALESCE((v_regla->>'porcentaje')::NUMERIC, 100);
    END IF;

    SELECT jsonb_build_object(
        'id', r.id,
        'titulo', r.titulo,
        'descripcion', r.descripcion,
        'regla_desbloqueo', v_regla,
        'porcentaje_requerido', v_porcentaje,
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'descripcion', e.descripcion,
                    'orden', e.orden,
                    'completada', public.ruta_etapa_completada(e.id, v_estudiante_id),
                    'desbloqueada', public.ruta_etapa_desbloqueada(
                        r.id, e.id, v_estudiante_id, v_regla
                    ),
                    'actividades', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', a.id,
                                'tipo', a.tipo,
                                'tipo_etiqueta', public.ruta_tipo_actividad_etiqueta(a.tipo),
                                'titulo', a.titulo,
                                'instrucciones', a.instrucciones,
                                'config', a.config,
                                'obligatorio', a.obligatorio,
                                'completada', EXISTS (
                                    SELECT 1 FROM public.ruta_progreso p2
                                    WHERE p2.actividad_id = a.id
                                      AND p2.estudiante_id = v_estudiante_id
                                      AND p2.estado = 'completada'
                                ),
                                'preguntas', (
                                    SELECT COALESCE(jsonb_agg(
                                        jsonb_build_object(
                                            'id', pr.id,
                                            'orden', pr.orden,
                                            'enunciado', pr.enunciado,
                                            'tipo_respuesta', pr.tipo_respuesta,
                                            'pista', pr.pista,
                                            'peso', pr.peso,
                                            'pasos', public.ruta_pasos_publicos(pr.config),
                                            'opciones', (
                                                SELECT COALESCE(jsonb_agg(
                                                    jsonb_build_object(
                                                        'id', o.id,
                                                        'texto', o.texto,
                                                        'clave', o.clave
                                                    ) ORDER BY o.orden
                                                ), '[]'::jsonb)
                                                FROM public.ruta_opcion o
                                                WHERE o.pregunta_id = pr.id
                                            )
                                        ) ORDER BY pr.orden
                                    ), '[]'::jsonb)
                                    FROM public.ruta_pregunta pr
                                    WHERE pr.actividad_id = a.id
                                      AND pr.activo = TRUE
                                )
                            ) ORDER BY a.orden
                        ), '[]'::jsonb)
                        FROM public.ruta_actividad a
                        WHERE a.etapa_id = e.id
                    )
                ) ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            WHERE e.ruta_id = r.id
        ),
        'progreso', jsonb_build_object(
            'total', (SELECT COUNT(*) FROM public.ruta_actividad a
                      WHERE a.ruta_id = r.id),
            'completadas', (
                SELECT COUNT(*) FROM public.ruta_progreso p
                WHERE p.ruta_id = r.id
                  AND p.estudiante_id = v_estudiante_id
                  AND p.estado = 'completada'
            )
        )
    ) INTO v_resultado
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ruta no encontrada'));
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- REGISTRO DE UN INTENTO — la única escritura del progreso.
--
-- El veredicto lo decide ruta_evaluar_respuesta() en servidor. Lo que sale de
-- esta función es el mismo JSON que el cliente ya conocía más el resultado.
--
CREATE OR REPLACE FUNCTION public.portal_ruta_registrar_intento(
    p_session_token UUID,
    p_pregunta_id UUID,
    p_respuesta JSONB,
    p_duracion_segundos INTEGER DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_pregunta public.ruta_pregunta;
    v_actividad_id UUID;
    v_ruta_id UUID;
    v_etapa_id UUID;
    v_nota_id UUID;
    v_regla JSONB;
    v_evaluacion JSONB;
    v_correcto BOOLEAN;
    v_puntaje NUMERIC;
    v_numero_orden INT;
    v_intento_id UUID;
    v_esp JSONB;
    v_detalle JSONB;
    v_valor_ingresado TEXT;
    v_esperado_esp TEXT;
    v_faltantes INT;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT pr.* INTO v_pregunta
    FROM public.ruta_pregunta pr
    WHERE pr.id = p_pregunta_id
      AND pr.activo = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pregunta no encontrada');
    END IF;

    -- La actividad debe pertenecer a una ruta PUBLICADA.
    SELECT a.id, a.ruta_id, a.etapa_id, r.nota_id,
           COALESCE(r.regla_desbloqueo, '{"modo":"secuencial"}'::JSONB)
      INTO v_actividad_id, v_ruta_id, v_etapa_id, v_nota_id, v_regla
    FROM public.ruta_actividad a
    JOIN public.ruta_aprendizaje r ON r.id = a.ruta_id
    WHERE a.id = v_pregunta.actividad_id
      AND r.estado = 'publicada';

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'La actividad no está disponible');
    END IF;

    IF NOT public.ruta_ficha_compartida_con_estudiante(v_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Esta ruta no está disponible para tu curso');
    END IF;

    -- Orden de la ruta, validado en SERVIDOR. La UI esconde los candados, pero
    -- eso es decoracion: sin este chequeo, llamar esta RPC a mano permite
    -- saltarse las etapas anteriores y hacer la ultima primero.
    IF NOT public.ruta_etapa_desbloqueada(v_ruta_id, v_etapa_id, v_estudiante_id, v_regla) THEN
        RETURN jsonb_build_object('error', 'Todavía no puedes resolver esta etapa');
    END IF;

    -- Veredicto (servidor).
    v_evaluacion := public.ruta_evaluar_respuesta(v_pregunta, COALESCE(p_respuesta, '{}'::JSONB));
    v_correcto := COALESCE((v_evaluacion->>'correcto')::BOOLEAN, FALSE);
    v_puntaje := CASE WHEN v_correcto THEN COALESCE(v_pregunta.peso, 1.0) ELSE 0 END;

    SELECT COUNT(*) + 1 INTO v_numero_orden
    FROM public.ruta_intento
    WHERE estudiante_id = v_estudiante_id
      AND pregunta_id = p_pregunta_id;

    INSERT INTO public.ruta_intento (
        estudiante_id, ruta_id, etapa_id, actividad_id, pregunta_id,
        numero_orden, correcto, puntaje, respuesta, duracion_segundos
    )
    VALUES (
        v_estudiante_id, v_ruta_id, v_etapa_id, v_actividad_id, p_pregunta_id,
        v_numero_orden, v_correcto, v_puntaje,
        COALESCE(p_respuesta, '{}'::JSONB), p_duracion_segundos
    )
    RETURNING id INTO v_intento_id;

    -- ── Procedimiento matemático: qué espacio falló (§10) ──
    -- El detalle por espacio lo calculó ruta_evaluar_respuesta con los valores
    -- esperados reales (que nunca salen de la BD). Solo se persiste.
    IF v_evaluacion ? 'detalle' THEN
        FOR v_esp IN SELECT * FROM jsonb_array_elements(v_evaluacion->'detalle') LOOP
            v_esperado_esp := public.ruta_esperado_espacio(
                COALESCE(v_pregunta.config, '{}'::JSONB),
                (v_esp->>'paso')::INT,
                (v_esp->>'espacio')::INT
            );

            -- Una posicion que el docente nunca declaro no es un intento: se
            -- ignora en vez de inventar una fila con esperado NULL.
            CONTINUE WHEN v_esperado_esp IS NULL;

            -- Lo que escribio el estudiante (si no puso nada, queda NULL).
            SELECT btrim(e->>'valor') INTO v_valor_ingresado
            FROM jsonb_array_elements(COALESCE(p_respuesta->'espacios', '[]'::JSONB)) e
            WHERE COALESCE((e->>'paso')::INT, 0)     = (v_esp->>'paso')::INT
              AND COALESCE((e->>'espacio')::INT, 0) = (v_esp->>'espacio')::INT
            LIMIT 1;

            INSERT INTO public.ruta_intento_espacio (
                intento_id, pregunta_id, paso, espacio,
                valor_ingresado, valor_esperado, correcto
            )
            VALUES (
                v_intento_id,
                p_pregunta_id,
                (v_esp->>'paso')::INT,
                (v_esp->>'espacio')::INT,
                v_valor_ingresado,
                v_esperado_esp,
                (v_esp->>'correcto')::BOOLEAN
            );
        END LOOP;
    END IF;

    -- ── Progreso de la actividad ──
    -- Se marca completada cuando TODAS las preguntas activas de la actividad
    -- tienen al menos un intento correcto. Un solo INSERT ... ON CONFLICT:
    -- evita la ventana en la que dos intentos simultáneos crean dos filas.
    INSERT INTO public.ruta_progreso (
        estudiante_id, ruta_id, etapa_id, actividad_id,
        estado, intentos, puntaje, primer_intento_en
    )
    VALUES (
        v_estudiante_id, v_ruta_id, v_etapa_id, v_actividad_id,
        'en_curso', 1, v_puntaje, NOW()
    )
    ON CONFLICT (estudiante_id, actividad_id) DO UPDATE
    SET intentos    = ruta_progreso.intentos + 1,
        puntaje     = GREATEST(ruta_progreso.puntaje, EXCLUDED.puntaje),
        actualizado_en = NOW();

    -- Recalcular 'completada' con una sola consulta de conteo, y en la misma
    -- sentencia para que quede siempre consistente.
    SELECT COUNT(*) INTO v_faltantes
    FROM public.ruta_pregunta pr
    WHERE pr.actividad_id = v_actividad_id
      AND pr.activo = TRUE
      AND NOT EXISTS (
          SELECT 1
          FROM public.ruta_intento i
          WHERE i.estudiante_id = v_estudiante_id
            AND i.pregunta_id = pr.id
            AND i.correcto
      );

    IF v_faltantes = 0 THEN
        UPDATE public.ruta_progreso
        SET estado = 'completada',
            completado_en = COALESCE(completado_en, NOW()),
            actualizado_en = NOW()
        WHERE estudiante_id = v_estudiante_id
          AND actividad_id = v_actividad_id;
    END IF;

    v_detalle := v_evaluacion->'detalle';

    RETURN jsonb_build_object(
        'correcto', v_correcto,
        'numeroIntento', v_numero_orden,
        'parciales', v_evaluacion->'parciales',
        'totalEspacios', v_evaluacion->'totalEspacios',
        'detalleEspacios', v_detalle,
        'pista', v_pregunta.pista,
        'retroalimentacion', CASE
            WHEN v_correcto THEN v_pregunta.retroalimentacion_ok
            ELSE v_pregunta.retroalimentacion_error
        END
    );
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

COMMENT ON FUNCTION public.portal_ruta_registrar_intento(UUID, UUID, JSONB, INTEGER) IS
    'Unica via de escritura del progreso del estudiante. El veredicto lo decide el motor en servidor.';


-- ────────────────────────────────────────────────────────────────────────────
-- Resumen de progreso (para el panel de la ruta y futuras analiticas).
-- Devuelve solo datos del propio estudiante: el token ya lo identifica.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.portal_ruta_progreso(
    p_session_token UUID,
    p_ruta_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_nota_id UUID;
    v_resultado JSONB;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT nota_id INTO v_nota_id
    FROM public.ruta_aprendizaje
    WHERE id = p_ruta_id AND estado = 'publicada';

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Ruta no encontrada');
    END IF;

    IF NOT public.ruta_ficha_compartida_con_estudiante(v_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Esta ruta no está disponible para tu curso');
    END IF;

    SELECT jsonb_build_object(
        'totalActividades', (
            SELECT COUNT(*) FROM public.ruta_actividad WHERE ruta_id = p_ruta_id
        ),
        'completadas', (
            SELECT COUNT(*) FROM public.ruta_progreso
            WHERE ruta_id = p_ruta_id
              AND estudiante_id = v_estudiante_id
              AND estado = 'completada'
        ),
        'puntaje', (
            SELECT COALESCE(SUM(p.puntaje), 0)
            FROM public.ruta_progreso p
            WHERE p.ruta_id = p_ruta_id AND p.estudiante_id = v_estudiante_id
        ),
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'completada', public.ruta_etapa_completada(e.id, v_estudiante_id),
                    'desbloqueada', public.ruta_etapa_desbloqueada(
                        p_ruta_id, e.id, v_estudiante_id,
                        COALESCE((SELECT r.regla_desbloqueo FROM public.ruta_aprendizaje r
                                  WHERE r.id = p_ruta_id), '{"modo":"secuencial"}'::JSONB)
                    )
                ) ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            WHERE e.ruta_id = p_ruta_id
        )
    ) INTO v_resultado;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ruta no encontrada'));
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  Permisos EXECUTE (lado Portal)
--  El estudiante del Portal no tiene sesión auth.users: en términos de rol de
--  Postgres es `anon`. Estas RPC DEBEN ser ejecutables por anon; la seguridad
--  no está en el permiso sino en que cada una valida p_session_token contra
--  portal_sesiones antes de tocar nada.
-- ============================================================================
REVOKE ALL ON FUNCTION public.portal_ruta_listar(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ruta_listar(UUID, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.portal_ruta_obtener(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ruta_obtener(UUID, UUID) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.portal_ruta_registrar_intento(UUID, UUID, JSONB, INTEGER) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ruta_registrar_intento(UUID, UUID, JSONB, INTEGER) TO anon, authenticated;

REVOKE ALL ON FUNCTION public.portal_ruta_progreso(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ruta_progreso(UUID, UUID) TO anon, authenticated;

-- Los helpers de etapa no son un API: solo los usan las RPC de arriba, que ya
-- son SECURITY DEFINER, asi que siguen funcionando sin ser ejecutables por el
-- rol del visitante.
REVOKE ALL ON FUNCTION public.ruta_etapa_completada(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_etapa_desbloqueada(UUID, UUID, BIGINT, JSONB) FROM PUBLIC, anon;
