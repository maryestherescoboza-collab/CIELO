-- ============================================================================
--  RUTAS DE APRENDIZAJE — PONDERACIÓN Y REAPROVECHAMIENTO DE ACTIVIDADES
--  Migración: 20260926120400  (se aplica DESPUÉS de 20260926120300)
--
--  Qué resuelve, en el orden que lo pidió el docente:
--
--   1. Cada ETAPA pesa un % de la Ficha. La suma de las etapas es 100.
--   2. Cada ACTIVIDAD pesa un % de su etapa. La suma de actividades de una
--      etapa es 100.
--   3. Una actividad que YA existe en CIELO (public.actividades) se puede
--      vincular a una etapa SIN duplicarla: ruta_actividad.actividad_origen_id
--      apunta a la fila original y el puntaje se refleja en
--      public.calificaciones, que es donde CIELO ya calcula los promedios.
--   4. El veredicto sigue siendo el del motor existente
--      (ruta_evaluar_respuesta). No se reescribe ninguna lógica de evaluación.
--
--  Decisiones que conviene no deshacer sin pensarlo:
--
--  · NO se agregan parámetros a las RPC que ya existen. En Postgres,
--    CREATE OR REPLACE con otra lista de argumentos NO reemplaza: crea una
--    SOBRECARGA, y PostgREST deja de poder resolver la función por nombre
--    ("ambiguous function"). Por eso todo lo nuevo entra como RPC con nombre
--    nuevo, y las que cambian de comportamiento se reemplazan con la MISMA
--    firma.
--
--  · La suma exacta de 100 se valida en el SERVIDOR (ruta_actualizar_pesos).
--    El cliente la muestra, pero no decide: llamar la RPC a mano tampoco deja
--    guardar un 40+30+50.
--
--  · Al crear o eliminar una etapa/actividad los pesos se REPARTEN EN PARTES
--    IGUALES, con el resto entero al último para que la suma sea exactamente
--    100. Así el contenido nuevo nunca nace en un estado inválido.
--
--  · Los pesos de las Rutas que ya existen se calculan al aplicar esta
--    migración: antes no había ponderación y todas las actividades valían lo
--    mismo. Repartir en partes iguales es la traducción fiel de ese hecho.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 1) COLUMNAS DE PONDERACIÓN
--
-- NUMERIC(6,3): 3 decimales alcanzan para repartir 100 entre cientos de
-- elementos sin arrastrar error de coma flotante. El DEFAULT es 100 (no 0)
-- para que una fila insertada por fuera de las RPC no nazca en 0 y reste
-- puntaje a todo lo demás.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ruta_etapa
    ADD COLUMN IF NOT EXISTS peso NUMERIC(6,3) NOT NULL DEFAULT 100;

ALTER TABLE public.ruta_actividad
    ADD COLUMN IF NOT EXISTS peso NUMERIC(6,3) NOT NULL DEFAULT 100;

COMMENT ON COLUMN public.ruta_etapa.peso IS
    'Porcentaje que aporta esta etapa al total de la ruta. La suma de las etapas de una ruta es exactamente 100.';
COMMENT ON COLUMN public.ruta_actividad.peso IS
    'Porcentaje que aporta esta actividad dentro de su etapa. La suma de las actividades de una etapa es exactamente 100.';

-- Los CHECK se agregan en un DO block: Postgres no tiene ADD CONSTRAINT IF NOT
-- EXISTS, y reintentar la migración debe ser inocuo.
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ruta_etapa_peso_rango'
          AND conrelid = 'public.ruta_etapa'::regclass
    ) THEN
        ALTER TABLE public.ruta_etapa
            ADD CONSTRAINT ruta_etapa_peso_rango CHECK (peso >= 0 AND peso <= 100);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'ruta_actividad_peso_rango'
          AND conrelid = 'public.ruta_actividad'::regclass
    ) THEN
        ALTER TABLE public.ruta_actividad
            ADD CONSTRAINT ruta_actividad_peso_rango CHECK (peso >= 0 AND peso <= 100);
    END IF;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 2) VÍNCULO CON LA ACTIVIDAD QUE YA EXISTE
--
-- ON DELETE SET NULL y no CASCADE: borrar la actividad de la ruta jamás puede
-- borrar la actividad de CIELO. El puntero es de la ruta hacia la actividad,
-- nunca al revés.
-- ────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.ruta_actividad
    ADD COLUMN IF NOT EXISTS actividad_origen_id INTEGER
        REFERENCES public.actividades(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.ruta_actividad.actividad_origen_id IS
    'public.actividades.id cuando la actividad se reutilizo de CIELO. NULL si la actividad es propia de la ruta. Nunca se copia la actividad: se apunta a ella.';

CREATE INDEX IF NOT EXISTS idx_ruta_actividad_origen
    ON public.ruta_actividad (actividad_origen_id)
    WHERE actividad_origen_id IS NOT NULL;

-- Una misma actividad de CIELO no puede aparecer dos veces en la MISMA ruta.
-- Es la garantía de "sin duplicar" a nivel de motor, no solo de interfaz.
CREATE UNIQUE INDEX IF NOT EXISTS uq_ruta_actividad_origen_en_ruta
    ON public.ruta_actividad (ruta_id, actividad_origen_id)
    WHERE actividad_origen_id IS NOT NULL;


-- ────────────────────────────────────────────────────────────────────────────
-- 3) BACKFILL — las rutas que ya existen
--
-- Antes de esta migración no había pesos, así que todas las etapas (y todas
-- las actividades de una etapa) pesaban lo mismo. El reparto en partes
-- iguales es exactamente eso, escrito como número.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_rebalancear_etapas(p_ruta_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_n    INT;
    v_base NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_n FROM public.ruta_etapa WHERE ruta_id = p_ruta_id;
    IF v_n = 0 THEN
        RETURN;
    END IF;

    -- 3 decimales: TRUNC (no ROUND) para no exceder 100 al multiplicar.
    v_base := TRUNC(100.0 / v_n::NUMERIC, 3);

    WITH ordenadas AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY orden, creado_en, id) AS rn,
               COUNT(*)     OVER ()                            AS total
        FROM public.ruta_etapa
        WHERE ruta_id = p_ruta_id
    )
    UPDATE public.ruta_etapa e
    SET peso = CASE WHEN o.rn = o.total
                    THEN 100.0 - v_base * (o.total - 1)   -- el resto va al último
                    ELSE v_base
               END
    FROM ordenadas o
    WHERE e.id = o.id;
END;
$$;

COMMENT ON FUNCTION public.ruta_rebalancear_etapas(UUID) IS
    'Reparte 100% en partes iguales entre las etapas de la ruta, con el resto entero al ultimo para que la suma sea exactamente 100.';


CREATE OR REPLACE FUNCTION public.ruta_rebalancear_actividades(p_etapa_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_n    INT;
    v_base NUMERIC;
BEGIN
    SELECT COUNT(*) INTO v_n FROM public.ruta_actividad WHERE etapa_id = p_etapa_id;
    IF v_n = 0 THEN
        RETURN;
    END IF;

    v_base := TRUNC(100.0 / v_n::NUMERIC, 3);

    WITH ordenadas AS (
        SELECT id,
               ROW_NUMBER() OVER (ORDER BY orden, creado_en, id) AS rn,
               COUNT(*)     OVER ()                            AS total
        FROM public.ruta_actividad
        WHERE etapa_id = p_etapa_id
    )
    UPDATE public.ruta_actividad a
    SET peso = CASE WHEN o.rn = o.total
                    THEN 100.0 - v_base * (o.total - 1)
                    ELSE v_base
               END
    FROM ordenadas o
    WHERE a.id = o.id;
END;
$$;

COMMENT ON FUNCTION public.ruta_rebalancear_actividades(UUID) IS
    'Reparte 100% en partes iguales entre las actividades de la etapa.';


-- Toda ruta y toda etapa existentes quedan validas desde el primer momento.
DO $$
DECLARE v_ruta UUID;
BEGIN
    FOR v_ruta IN SELECT DISTINCT ruta_id FROM public.ruta_etapa LOOP
        PERFORM public.ruta_rebalancear_etapas(v_ruta);
    END LOOP;

    FOR v_ruta IN SELECT DISTINCT ruta_id FROM public.ruta_actividad LOOP
        PERFORM public.ruta_rebalancear_etapas(v_ruta);
    END LOOP;
END;
$$;

DO $$
DECLARE v_etapa UUID;
BEGIN
    FOR v_etapa IN SELECT DISTINCT etapa_id FROM public.ruta_actividad LOOP
        PERFORM public.ruta_rebalancear_actividades(v_etapa);
    END LOOP;
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 4) PUNTAJES PONDERADOS
--
-- ruta_actividad_puntaje: nota 0-100 de UNA actividad = preguntas acertadas
-- ponderadas por ruta_pregunta.peso, sobre el total de peso de la actividad.
--
-- La pregunta que el estudiante no intentó cuenta 0. La suma de intentos
-- puede tener VARIOS aciertos para la misma pregunta, por eso el EXISTS
-- evita contarlos dos veces.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_actividad_puntaje(
    p_actividad_id UUID,
    p_estudiante_id BIGINT
)
RETURNS NUMERIC
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    WITH activas AS (
        SELECT id, peso
        FROM public.ruta_pregunta
        WHERE actividad_id = p_actividad_id
          AND activo = TRUE
    ),
    peso_total AS (
        SELECT COALESCE(SUM(peso), 0) AS total FROM activas
    ),
    -- DISTINCT porque el estudiante puede tener VARIOS intentos correctos de
    -- la misma pregunta: sin esto, acertarla dos veces sumaria su peso doble.
    acertadas AS (
        SELECT DISTINCT i.pregunta_id
        FROM public.ruta_intento i
        JOIN activas a ON a.id = i.pregunta_id
        WHERE i.estudiante_id = p_estudiante_id
          AND i.correcto
    )
    SELECT CASE
        WHEN t.total = 0 THEN 0
        ELSE ROUND(
            COALESCE((
                SELECT SUM(a.peso)
                FROM activas a
                JOIN acertadas ac ON ac.pregunta_id = a.id
            ), 0) / t.total * 100,
            2
        )
    END
    FROM peso_total t;
$$;

COMMENT ON FUNCTION public.ruta_actividad_puntaje(UUID, BIGINT) IS
    'Puntaje 0-100 de una actividad para un estudiante, a partir de los aciertos y el peso de sus preguntas.';


-- Estructura unica de puntajes. La usan el Portal (propio estudiante) y el
-- docente (gradebook). No filtra por estudiante la seguridad: quien llama
-- decide cual student's data pide, y las RPC que lo hacen validan la sesion.
CREATE OR REPLACE FUNCTION public.ruta_puntajes_ruta(
    p_ruta_id UUID,
    p_estudiante_id BIGINT
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE v_resultado JSONB;
BEGIN
    SELECT jsonb_build_object(
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'peso', e.peso,
                    'puntaje', v_etapa_puntaje.puntaje,
                    -- aporte = puntaje de la etapa × peso de la etapa / 100.
                    -- Es la parte de la etapa dentro del 100 de la ruta.
                    'aporte', ROUND(v_etapa_puntaje.puntaje * e.peso / 100, 2),
                    'actividades', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', a.id,
                                'titulo', a.titulo,
                                'peso', a.peso,
                                'puntaje', public.ruta_actividad_puntaje(a.id, p_estudiante_id)
                                -- Sin actividad_origen_id a proposito: esta misma
                                -- estructura se devuelve al estudiante y el
                                -- vinculo con public.actividades es del docente.
                            ) ORDER BY a.orden
                        ), '[]'::jsonb)
                        FROM public.ruta_actividad a
                        WHERE a.etapa_id = e.id
                    )
                ) ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            CROSS JOIN LATERAL (
                SELECT COALESCE(
                    ROUND(SUM(public.ruta_actividad_puntaje(a2.id, p_estudiante_id) * a2.peso / 100), 2),
                    0
                ) AS puntaje
                FROM public.ruta_actividad a2
                WHERE a2.etapa_id = e.id
            ) v_etapa_puntaje
            WHERE e.ruta_id = p_ruta_id
        ),
        'puntaje', (
            SELECT COALESCE(ROUND(SUM(public.ruta_actividad_puntaje(a3.id, p_estudiante_id) * a3.peso / 100 * e3.peso / 100), 2), 0)
            FROM public.ruta_actividad a3
            JOIN public.ruta_etapa e3 ON e3.id = a3.etapa_id
            WHERE a3.ruta_id = p_ruta_id
        )
    ) INTO v_resultado;

    RETURN COALESCE(v_resultado, '{"etapas":[],"puntaje":0}'::JSONB);
END;
$$;

COMMENT ON FUNCTION public.ruta_puntajes_ruta(UUID, BIGINT) IS
    'Puntajes ponderados de una ruta: por etapa, por actividad y total (todos 0-100). E = sum(actividad x pesoActividad), ruta = sum(E x pesoEtapa).';


-- ────────────────────────────────────────────────────────────────────────────
-- 5) RPC DOCENTE — guardar la ponderación completa, validada
--
-- Recibe el arbol entero de una vez. Todo se valida ANTES de escribir nada,
-- asi que un rechazo no deja la ruta a medio guardar.
--
--   { "etapas": [ { "id": "...", "peso": 40,
--                   "actividades": [ { "id": "...", "peso": 60 } ] } ] }
--
-- Devuelve {success:true} o {error, faltan, donde}.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_actualizar_pesos(
    p_ruta_id UUID,
    p_pesos JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_etapa     JSONB;
    v_actividad JSONB;
    v_etapa_id  UUID;
    v_etapa_peso NUMERIC;
    v_suma_etapas NUMERIC := 0;
    v_suma_actividades NUMERIC;
    v_ids UUID[];
    v_actividad_ids UUID[];
    v_faltan INT;
    -- 0.001 es la granularidad real de NUMERIC(6,3). Tolerarlo evita bloquear
    -- por redondeo (33.333 x 3 = 99.999) sin abrir la puerta a un 40+30+50.
    v_tol CONSTANT NUMERIC := 0.005;
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    IF p_pesos IS NULL OR jsonb_typeof(p_pesos->'etapas') IS DISTINCT FROM 'array' THEN
        RETURN jsonb_build_object('error', 'No se recibieron los pesos de la ruta');
    END IF;

    -- Toda etapa existente debe venir exactamente una vez.
    IF (SELECT COUNT(*) FROM public.ruta_etapa WHERE ruta_id = p_ruta_id)
       <> jsonb_array_length(p_pesos->'etapas') THEN
        RETURN jsonb_build_object(
            'error',
            'La lista de etapas no coincide con la ruta. Recarga el constructor.'
        );
    END IF;

    -- `e` es el elemento JSONB entero, no una fila con columna `id`.
    SELECT COALESCE(ARRAY_AGG((e->>'id')::UUID), '{}')
      INTO v_ids
    FROM jsonb_array_elements(p_pesos->'etapas') e;

    IF (SELECT COUNT(DISTINCT u) FROM unnest(v_ids) u) <> COALESCE(array_length(v_ids, 1), 0) THEN
        RETURN jsonb_build_object('error', 'La lista de etapas tiene elementos repetidos');
    END IF;

    IF (SELECT COUNT(*)
          FROM public.ruta_etapa
         WHERE ruta_id = p_ruta_id
           AND NOT (id = ANY(v_ids))) > 0 THEN
        RETURN jsonb_build_object('error', 'La lista contiene una etapa ajena a esta ruta');
    END IF;

    -- ── Validación completa ANTES de escribir ──
    FOR v_etapa IN SELECT * FROM jsonb_array_elements(p_pesos->'etapas') LOOP
        v_etapa_id := (v_etapa->>'id')::UUID;
        v_etapa_peso := (v_etapa->>'peso')::NUMERIC;
        v_suma_etapas := v_suma_etapas + v_etapa_peso;

        IF v_etapa_peso IS NULL OR v_etapa_peso < 0 OR v_etapa_peso > 100 THEN
            RETURN jsonb_build_object(
                'error', 'Un porcentaje de etapa esta fuera del rango 0-100.',
                'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
            );
        END IF;

        v_faltan := (SELECT COUNT(*) FROM public.ruta_actividad WHERE etapa_id = v_etapa_id);
        IF v_faltan = 0 THEN
            CONTINUE;   -- Una etapa vacia no tiene nada que repartir.
        END IF;

        IF jsonb_typeof(v_etapa->'actividades') IS DISTINCT FROM 'array'
           OR jsonb_array_length(v_etapa->'actividades') <> v_faltan THEN
            RETURN jsonb_build_object(
                'error', 'La lista de actividades de la etapa no coincide. Recarga el constructor.',
                'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
            );
        END IF;

        -- Comparar el numero de elementos NO basta: con actividades A, B, C, una
        -- lista [A, A, C] tambien trae tres y todas pertenecen a la etapa, asi
        -- que pasaria el conteo. B se quedaria con su peso viejo y A se
        -- escribiria dos veces, dejando la etapa en 100 sobre el papel y en otra
        -- cosa en la nota real. Se exige cada actividad exactamente una vez.
        SELECT COALESCE(ARRAY_AGG((a->>'id')::UUID), '{}')
          INTO v_actividad_ids
        FROM jsonb_array_elements(v_etapa->'actividades') a;

        IF (SELECT COUNT(DISTINCT u) FROM unnest(v_actividad_ids) u)
           <> COALESCE(array_length(v_actividad_ids, 1), 0) THEN
            RETURN jsonb_build_object(
                'error', 'La lista de actividades de la etapa tiene elementos repetidos.',
                'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
            );
        END IF;

        IF (SELECT COUNT(*)
              FROM public.ruta_actividad
             WHERE etapa_id = v_etapa_id
               AND NOT (id = ANY(v_actividad_ids))) > 0 THEN
            RETURN jsonb_build_object(
                'error', 'Falta alguna actividad de la etapa en la lista. Recarga el constructor.',
                'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
            );
        END IF;

        SELECT COALESCE(SUM((a->>'peso')::NUMERIC), 0)
          INTO v_suma_actividades
          FROM jsonb_array_elements(v_etapa->'actividades') a;

        IF ABS(v_suma_actividades - 100) > v_tol THEN
            RETURN jsonb_build_object(
                'error', 'Los porcentajes de las actividades de la etapa no suman 100.',
                'faltan', ROUND(100 - v_suma_actividades, 3),
                'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
            );
        END IF;

        FOR v_actividad IN SELECT * FROM jsonb_array_elements(v_etapa->'actividades') LOOP
            IF ((v_actividad->>'peso')::NUMERIC) IS NULL
               OR (v_actividad->>'peso')::NUMERIC < 0
               OR (v_actividad->>'peso')::NUMERIC > 100 THEN
                RETURN jsonb_build_object(
                    'error', 'Un porcentaje de actividad esta fuera del rango 0-100.',
                    'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
                );
            END IF;

            IF NOT EXISTS (
                SELECT 1 FROM public.ruta_actividad
                WHERE id = (v_actividad->>'id')::UUID
                  AND etapa_id = v_etapa_id
            ) THEN
                RETURN jsonb_build_object(
                    'error', 'La lista contiene una actividad ajena a esa etapa.',
                    'donde', COALESCE(v_etapa->>'titulo', v_etapa_id::TEXT)
                );
            END IF;
        END LOOP;
    END LOOP;

    IF ABS(v_suma_etapas - 100) > v_tol THEN
        RETURN jsonb_build_object(
            'error', 'Los porcentajes de las etapas no suman 100.',
            'faltan', ROUND(100 - v_suma_etapas, 3)
        );
    END IF;

    -- ── Escritura ──
    FOR v_etapa IN SELECT * FROM jsonb_array_elements(p_pesos->'etapas') LOOP
        UPDATE public.ruta_etapa
        SET peso = (v_etapa->>'peso')::NUMERIC
        WHERE id = (v_etapa->>'id')::UUID;

        FOR v_actividad IN SELECT * FROM jsonb_array_elements(COALESCE(v_etapa->'actividades', '[]'::JSONB)) LOOP
            UPDATE public.ruta_actividad
            SET peso = (v_actividad->>'peso')::NUMERIC
            WHERE id = (v_actividad->>'id')::UUID;
        END LOOP;
    END LOOP;

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 6) RPC DOCENTE — repartir en partes iguales
--
-- Boton "Repartir 100% en partes iguales". Con etapa_id NULL reparte entre
-- las etapas de la ruta; con etapa_id, entre las actividades de esa etapa.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_rebalancear_pesos(
    p_ruta_id UUID,
    p_etapa_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    PERFORM public.ruta_exigir_ownership(p_ruta_id);

    IF p_etapa_id IS NULL THEN
        PERFORM public.ruta_rebalancear_etapas(p_ruta_id);
        RETURN jsonb_build_object('success', true, 'nivel', 'ruta');
    END IF;

    IF NOT EXISTS (SELECT 1 FROM public.ruta_etapa WHERE id = p_etapa_id AND ruta_id = p_ruta_id) THEN
        RETURN jsonb_build_object('error', 'La etapa no pertenece a esta ruta');
    END IF;

    PERFORM public.ruta_rebalancear_actividades(p_etapa_id);
    RETURN jsonb_build_object('success', true, 'nivel', 'etapa');
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 7) RPC DOCENTE — catálogo de actividades que YA existen en CIELO
--
-- Aislamiento: la actividad tiene que ser del docente autenticado Y de un
-- curso con el que la ficha este compartida. Sin las dos condiciones no
-- aparece: asi no se puede reutilizar material de otro curso ni de otro
-- docente aunque se adivine el id.
--
-- p_ruta_id permite excluir lo ya vinculado en ESTA ruta y avisar cuando la
-- misma actividad ya se esta usando en otra.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_actividades_existentes(
    p_ruta_id UUID,
    p_busqueda TEXT DEFAULT NULL,
    p_asignatura TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nota_id UUID;
    v_resultado JSONB;
BEGIN
    SELECT r.nota_id INTO v_nota_id
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id
      AND public.ruta_es_dueno_ficha(r.nota_id);

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'No tienes permiso para ver esta ruta');
    END IF;

    SELECT COALESCE(jsonb_agg(
        jsonb_build_object(
            'id', a.id,
            'nombre', a.nombre,
            'asignatura', a.asignatura,
            'periodo', a.periodo,
            'fecha', a.fecha,
            'indicador', a.indicador,
            'descripcion', a.descripcion,
            'curso_id', a.curso_id,
            'en_esta_ruta', EXISTS (
                SELECT 1 FROM public.ruta_actividad ra
                WHERE ra.actividad_origen_id = a.id
                  AND ra.ruta_id = p_ruta_id
            ),
            -- Informativo: no bloquea, solo evita duplicar trabajo.
            'usada_en', (
                SELECT jsonb_build_object('ruta', r2.titulo, 'etapa', e2.titulo)
                FROM public.ruta_actividad ra2
                JOIN public.ruta_aprendizaje r2 ON r2.id = ra2.ruta_id
                JOIN public.ruta_etapa e2 ON e2.id = ra2.etapa_id
                WHERE ra2.actividad_origen_id = a.id
                  AND ra2.ruta_id <> p_ruta_id
                LIMIT 1
            )
        ) ORDER BY a.periodo DESC, a.fecha DESC, a.id DESC
    ), '[]'::JSONB) INTO v_resultado
    FROM public.actividades a
    WHERE a.user_id = auth.uid()
      AND a.activo IS DISTINCT FROM FALSE
      -- Misma regla de comparticion que portal_get_evidencias y
      -- ruta_ficha_compartida_con_estudiante: la actividad vale si su curso es
      -- uno de los de la ficha, si es un CURSO ESPEJO de uno de ellos
      -- (mismo shared_course_id) o si su propio shared_course_id coincide.
      -- Filtrar solo por ficha_cursos.curso_id dejaría fuera actividades que el
      -- docente sí ve en CIELO, que es justo lo que esta pantalla debe ofrecer.
      AND (
            a.curso_id IN (
                SELECT fc.curso_id
                FROM public.ficha_cursos fc
                WHERE fc.nota_id = v_nota_id
            )
         OR a.curso_id IN (
                SELECT c2.id
                FROM public.ficha_cursos fc
                JOIN public.cursos c1 ON c1.id = fc.curso_id
                JOIN public.cursos c2 ON c2.shared_course_id = c1.shared_course_id
                WHERE fc.nota_id = v_nota_id
                  AND c1.shared_course_id IS NOT NULL
            )
         OR (
                a.shared_course_id IS NOT NULL
            AND a.shared_course_id IN (
                SELECT c1.shared_course_id
                FROM public.ficha_cursos fc
                JOIN public.cursos c1 ON c1.id = fc.curso_id
                WHERE fc.nota_id = v_nota_id
                  AND c1.shared_course_id IS NOT NULL
            )
         )
      )
      AND (p_asignatura IS NULL OR a.asignatura = p_asignatura)
      AND (
            p_busqueda IS NULL
         OR btrim(p_busqueda) = ''
         OR a.nombre ILIKE '%' || p_busqueda || '%'
         OR COALESCE(a.indicador, '') ILIKE '%' || p_busqueda || '%'
      );

    RETURN v_resultado;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 8) RPC DOCENTE — vincular una actividad existente a una etapa
--
-- No copia la actividad: crea una fila de ruta_actividad que APUNTA a ella y
-- se queda solo con lo que la ruta necesita (preguntas, orden, peso). El
-- titulo y la descripcion se copian como texto de arranque, que es editable:
-- no es la actividad la que se duplica, es la etiqueta que se precarga.
--
-- El tipo de actividad de la ruta (p_tipo) lo elige el docente porque es lo
-- que decide COMO se corrige: es el mismo catalogo que ya usa
-- ruta_evaluar_respuesta.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_vincular_actividad(
    p_etapa_id UUID,
    p_actividad_origen_id INTEGER,
    p_tipo TEXT DEFAULT 'respuesta_escrita'
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id   UUID;
    v_nota_id   UUID;
    v_id        UUID;
    v_orden     INTEGER;
    v_actividad public.actividades%ROWTYPE;
BEGIN
    SELECT ruta_id INTO v_ruta_id
    FROM public.ruta_etapa WHERE id = p_etapa_id;

    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Etapa no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    SELECT nota_id INTO v_nota_id FROM public.ruta_aprendizaje WHERE id = v_ruta_id;

    IF p_tipo IS NULL OR p_tipo NOT IN (
        'opcion_multiple','verdadero_falso','completar','respuesta_numerica',
        'respuesta_escrita','ordenar_pasos','relacionar','procedimiento_matematico'
    ) THEN
        RETURN jsonb_build_object('error', 'Tipo de actividad inválido');
    END IF;

    SELECT * INTO v_actividad
    FROM public.actividades
    WHERE id = p_actividad_origen_id
      AND user_id = auth.uid()
      AND activo IS DISTINCT FROM FALSE
      -- MISMO criterio que ruta_actividades_existentes, a proposito: si el
      -- filtro de la lista fuera mas laxo que este, el docente veria actividades
      -- que al pinchar rebotan con "no disponible" sin explicacion. Ambas copias
      -- deben evolucionar juntas.
      AND (
            curso_id IN (
                SELECT fc.curso_id
                FROM public.ficha_cursos fc
                WHERE fc.nota_id = v_nota_id
            )
         OR curso_id IN (
                SELECT c2.id
                FROM public.ficha_cursos fc
                JOIN public.cursos c1 ON c1.id = fc.curso_id
                JOIN public.cursos c2 ON c2.shared_course_id = c1.shared_course_id
                WHERE fc.nota_id = v_nota_id
                  AND c1.shared_course_id IS NOT NULL
            )
         OR (
                shared_course_id IS NOT NULL
            AND shared_course_id IN (
                SELECT c1.shared_course_id
                FROM public.ficha_cursos fc
                JOIN public.cursos c1 ON c1.id = fc.curso_id
                WHERE fc.nota_id = v_nota_id
                  AND c1.shared_course_id IS NOT NULL
            )
         )
      );

    IF NOT FOUND THEN
        RETURN jsonb_build_object(
            'error',
            'Esa actividad no está disponible. Debe ser tuya y de un curso con el que la ficha esté compartida.'
        );
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.ruta_actividad
        WHERE ruta_id = v_ruta_id
          AND actividad_origen_id = p_actividad_origen_id
    ) THEN
        RETURN jsonb_build_object(
            'error', 'Esa actividad ya está en esta ruta. Agrégala desde la etapa donde está.'
        );
    END IF;

    SELECT COALESCE(MAX(orden), 0) + 1 INTO v_orden
    FROM public.ruta_actividad WHERE etapa_id = p_etapa_id;

    INSERT INTO public.ruta_actividad (
        etapa_id, ruta_id, tipo, titulo, instrucciones, orden, config,
        obligatorio, actividad_origen_id
    )
    VALUES (
        p_etapa_id, v_ruta_id, p_tipo,
        NULLIF(btrim(COALESCE(v_actividad.nombre, '')), ''),
        NULLIF(btrim(COALESCE(v_actividad.descripcion, '')), ''),
        v_orden, '{}'::JSONB, TRUE, p_actividad_origen_id
    )
    RETURNING id INTO v_id;

    -- La etapa sigue sumando 100 con la actividad nueva dentro.
    PERFORM public.ruta_rebalancear_actividades(p_etapa_id);

    RETURN jsonb_build_object(
        'id', v_id,
        'orden', v_orden,
        'titulo', v_actividad.nombre,
        'actividad_origen_id', p_actividad_origen_id
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 9) RPC DOCENTE — gradebook ponderado
--
-- Una fila por estudiante de los cursos con los que la ficha esta compartida
-- (misma regla que ruta_ficha_compartida_con_estudiante, incluidos los cursos
-- espejo por shared_course_id). Un estudiante que no ha empezado aparece con
-- 0: en un cuaderno de notas, faltar es informacion.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_puntajes_docente(p_ruta_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_nota_id UUID;
    v_resultado JSONB;
BEGIN
    SELECT r.nota_id INTO v_nota_id
    FROM public.ruta_aprendizaje r
    WHERE r.id = p_ruta_id
      AND public.ruta_es_dueno_ficha(r.nota_id);

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'No tienes permiso para ver esta ruta');
    END IF;

    SELECT jsonb_build_object(
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object('id', e.id, 'titulo', e.titulo, 'peso', e.peso)
                ORDER BY e.orden
            ), '[]'::jsonb)
            FROM public.ruta_etapa e
            WHERE e.ruta_id = p_ruta_id
        ),
        'estudiantes', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'estudiante_id', est.id,
                    'nombre', btrim(COALESCE(est.nombre, '') || ' ' || COALESCE(est.apellido, '')),
                    'puntaje', ROUND(COALESCE((
                        SELECT SUM(public.ruta_actividad_puntaje(ra.id, est.id) * ra.peso / 100 * e.peso / 100)
                        FROM public.ruta_actividad ra
                        JOIN public.ruta_etapa e ON e.id = ra.etapa_id
                        WHERE ra.ruta_id = p_ruta_id
                    ), 0), 2),
                    'completadas', (
                        SELECT COUNT(*) FROM public.ruta_progreso pr
                        WHERE pr.ruta_id = p_ruta_id
                          AND pr.estudiante_id = est.id
                          AND pr.estado = 'completada'
                    ),
                    'etapas', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', e2.id,
                                'puntaje', ROUND(COALESCE((
                                    SELECT SUM(public.ruta_actividad_puntaje(ra2.id, est.id) * ra2.peso / 100)
                                    FROM public.ruta_actividad ra2
                                    WHERE ra2.etapa_id = e2.id
                                ), 0), 2),
                                'aporte', ROUND(COALESCE((
                                    SELECT SUM(public.ruta_actividad_puntaje(ra2.id, est.id) * ra2.peso / 100 * e2.peso / 100)
                                    FROM public.ruta_actividad ra2
                                    WHERE ra2.etapa_id = e2.id
                                ), 0), 2)
                            ) ORDER BY e2.orden
                        ), '[]'::jsonb)
                        FROM public.ruta_etapa e2
                        WHERE e2.ruta_id = p_ruta_id
                    )
                ) ORDER BY est.nombre, est.apellido
            ), '[]'::JSONB)
            FROM public.estudiantes est
            WHERE est.activo IS DISTINCT FROM FALSE
              AND public.ruta_ficha_compartida_con_estudiante(v_nota_id, est.id)
        )
    ) INTO v_resultado;

    RETURN COALESCE(v_resultado, '{"etapas":[],"estudiantes":[]}'::JSONB);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 10) INTEGRACIÓN CON calificaciones
--
-- Es el punto donde una ruta deja de ser un juguete y alimenta el promedio de
-- CIELO. Solo cuando la actividad queda COMPLETADA: es decir, cuando el
-- estudiante respondio todo y el motor lo dio por bueno.
--
-- Esa condicion es tambien la que protege la calificacion manual: una
-- respuesta abierta sin respuesta declarada nunca se marca correcta, nunca
-- completa, y por tanto nunca se sobreescribe lo que puso el docente.
--
-- Se escribe con UPDATE + INSERT en vez de ON CONFLICT porque no se puede
-- afirmar que exista un indice unico sobre (estudiante_id, actividad_id):
-- la migracion no debe depender de una suposicion para no fallar en el
-- servidor.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_proyectar_calificacion(
    p_actividad_id UUID,
    p_estudiante_id BIGINT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_origen  public.actividades%ROWTYPE;
    v_puntaje NUMERIC;
    v_actualizadas INT;
BEGIN
    SELECT a.* INTO v_origen
    FROM public.ruta_actividad ra
    JOIN public.actividades a ON a.id = ra.actividad_origen_id
    WHERE ra.id = p_actividad_id;

    IF NOT FOUND THEN
        RETURN;   -- Actividad propia de la ruta: no hay nada que proyectar.
    END IF;

    v_puntaje := public.ruta_actividad_puntaje(p_actividad_id, p_estudiante_id);

    UPDATE public.calificaciones
    SET puntaje = v_puntaje
    WHERE estudiante_id = p_estudiante_id
      AND actividad_id = v_origen.id;

    GET DIAGNOSTICS v_actualizadas = ROW_COUNT;

    IF v_actualizadas = 0 THEN
        INSERT INTO public.calificaciones (
            user_id, estudiante_id, actividad_id, puntaje, curso_id,
            periodo, competencias, descriptores, asignatura,
            shared_course_id, recuperacion, activo
        )
        VALUES (
            v_origen.user_id, p_estudiante_id, v_origen.id, v_puntaje, v_origen.curso_id,
            v_origen.periodo, v_origen.bc_asignados, NULL, v_origen.asignatura,
            v_origen.shared_course_id, NULL, TRUE
        );
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Que la proyección a calificaciones falle NO puede tumbar el registro
        -- del intento: el estudiante ya respondió y su evidencia vale.
        RAISE WARNING 'ruta_proyectar_calificacion: %', SQLERRM;
END;
$$;

COMMENT ON FUNCTION public.ruta_proyectar_calificacion(UUID, BIGINT) IS
    'Refleja en calificaciones el puntaje de una actividad vinculada a public.actividades. Solo si la actividad quedo completada. Reutiliza la fila existente: no duplica notas.';


-- ────────────────────────────────────────────────────────────────────────────
-- 11) RPC EXISTENTES QUE CAMBIAN (MISMA FIRMA, replacement real)
-- ────────────────────────────────────────────────────────────────────────────

-- ruta_crear_etapa: ademas de crear, reparte el 100% entre las etapas.
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

    SELECT COALESCE(MAX(orden), 0) + 1 INTO v_orden
    FROM public.ruta_etapa WHERE ruta_id = p_ruta_id;

    INSERT INTO public.ruta_etapa (ruta_id, titulo, descripcion, orden)
    VALUES (p_ruta_id, btrim(p_titulo), NULLIF(btrim(COALESCE(p_descripcion, '')), ''), COALESCE(p_orden, v_orden))
    RETURNING id INTO v_id;

    -- Una etapa nueva entra con el 100% repartido: el contenido recien creado
    -- nunca nace invalido.
    PERFORM public.ruta_rebalancear_etapas(p_ruta_id);

    RETURN jsonb_build_object('id', v_id, 'orden', COALESCE(p_orden, v_orden));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ruta_eliminar_etapa: al quitar una etapa, el resto se reparte.
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

    PERFORM public.ruta_rebalancear_etapas(v_ruta_id);

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ruta_crear_actividad: reparte el 100% de la etapa entre sus actividades.
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

    PERFORM public.ruta_rebalancear_actividades(p_etapa_id);

    RETURN jsonb_build_object('id', v_id, 'orden', COALESCE(p_orden, v_orden));
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ruta_eliminar_actividad: al quitar una actividad, el resto se reparte.
-- El puntero actividad_origen_id va en la fila que se borra, asi que la
-- actividad de CIELO queda intacta: reusable en otra ruta o en su curso.
CREATE OR REPLACE FUNCTION public.ruta_eliminar_actividad(p_actividad_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_ruta_id UUID;
    v_etapa_id UUID;
BEGIN
    SELECT ruta_id, etapa_id INTO v_ruta_id, v_etapa_id
    FROM public.ruta_actividad WHERE id = p_actividad_id;

    IF v_ruta_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Actividad no encontrada');
    END IF;

    PERFORM public.ruta_exigir_ownership(v_ruta_id);

    DELETE FROM public.ruta_actividad WHERE id = p_actividad_id;

    PERFORM public.ruta_rebalancear_actividades(v_etapa_id);

    RETURN jsonb_build_object('success', true);
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ruta_obtener: el constructor necesita los pesos y saber que actividades
-- vienen de CIELO.
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
                    'peso', e.peso,
                    'actividades', (
                        SELECT COALESCE(jsonb_agg(
                            jsonb_build_object(
                                'id', act.id,
                                'tipo', act.tipo,
                                'tipo_etiqueta', public.ruta_tipo_actividad_etiqueta(act.tipo),
                                'titulo', act.titulo,
                                'instrucciones', act.instrucciones,
                                'orden', act.orden,
                                'peso', act.peso,
                                'config', act.config,
                                'obligatorio', act.obligatorio,
                                'actividad_origen_id', act.actividad_origen_id,
                                'actividad_origen', (
                                    SELECT jsonb_build_object(
                                        'id', a.id,
                                        'nombre', a.nombre,
                                        'asignatura', a.asignatura,
                                        'periodo', a.periodo,
                                        'indicador', a.indicador
                                    )
                                    FROM public.actividades a
                                    WHERE a.id = act.actividad_origen_id
                                ),
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


-- ────────────────────────────────────────────────────────────────────────────
-- 12) RPC DEL PORTAL — pesos visibles y puntaje ponderado
-- ────────────────────────────────────────────────────────────────────────────

-- portal_ruta_obtener: el estudiante ve cuanto aporta cada etapa y cada
-- actividad, y cuanto lleva. Nunca ve de donde viene la actividad ni las
-- respuestas correctas.
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
    v_puntajes JSONB;
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

    v_puntajes := public.ruta_puntajes_ruta(p_ruta_id, v_estudiante_id);

    SELECT jsonb_build_object(
        'id', r.id,
        'titulo', r.titulo,
        'descripcion', r.descripcion,
        'regla_desbloqueo', v_regla,
        'porcentaje_requerido', v_porcentaje,
        'puntaje', v_puntajes->'puntaje',
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'descripcion', e.descripcion,
                    'orden', e.orden,
                    'peso', e.peso,
                    'puntaje', v_pe.puntaje_etapa,
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
                                'peso', a.peso,
                                'puntaje', public.ruta_actividad_puntaje(a.id, v_estudiante_id),
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
            CROSS JOIN LATERAL (
                SELECT COALESCE(
                    (SELECT pa->>'puntaje'
                     FROM jsonb_array_elements(COALESCE(v_puntajes->'etapas', '[]'::JSONB)) pa
                     WHERE pa->>'id' = e.id::TEXT),
                    '0'
                ) AS puntaje_etapa
            ) v_pe
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


-- portal_ruta_registrar_intento: al completar una actividad vinculada, su
-- puntaje pasa a calificaciones. Es la unica escritura de calificaciones que
-- hace el Portal, y solo para actividades que el docente eligio vincular.
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
    v_origen_id INT;
    v_completada BOOLEAN := FALSE;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT pr.* INTO v_pregunta
    FROM public.ruta_pregunta pr
    WHERE pr.id = p_pregunta_id
      AND pr.activo = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pregunta no encontrada');
    END IF;

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

    IF NOT public.ruta_etapa_desbloqueada(v_ruta_id, v_etapa_id, v_estudiante_id, v_regla) THEN
        RETURN jsonb_build_object('error', 'Todavía no puedes resolver esta etapa');
    END IF;

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

    IF v_evaluacion ? 'detalle' THEN
        FOR v_esp IN SELECT * FROM jsonb_array_elements(v_evaluacion->'detalle') LOOP
            v_esperado_esp := public.ruta_esperado_espacio(
                COALESCE(v_pregunta.config, '{}'::JSONB),
                (v_esp->>'paso')::INT,
                (v_esp->>'espacio')::INT
            );

            CONTINUE WHEN v_esperado_esp IS NULL;

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

    SELECT COUNT(*) INTO v_faltantes
    FROM public.ruta_pregunta pr
    WHERE pr.actividad_id = v_actividad_id
      AND pr.activo = TRUE
      AND NOT EXISTS (
          SELECT 1 FROM public.ruta_intento i
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

        v_completada := TRUE;
    END IF;

    -- ── Integración con CIELO ──
    -- Solo si la actividad quedó completa Y viene de una actividad de CIELO.
    -- `v_completada` y no "tiene actividad_origen_id": una respuesta abierta
    -- sin declarado nunca completa, y así la calificación que puso el docente
    -- nunca se pisa.
    IF v_completada THEN
        SELECT actividad_origen_id INTO v_origen_id
        FROM public.ruta_actividad
        WHERE id = v_actividad_id;

        IF v_origen_id IS NOT NULL THEN
            PERFORM public.ruta_proyectar_calificacion(v_actividad_id, v_estudiante_id);
        END IF;
    END IF;

    v_detalle := v_evaluacion->'detalle';

    RETURN jsonb_build_object(
        'correcto', v_correcto,
        'numeroIntento', v_numero_orden,
        'parciales', v_evaluacion->'parciales',
        'totalEspacios', v_evaluacion->'totalEspacios',
        'detalleEspacios', v_detalle,
        'pista', v_pregunta.pista,
        'puntaje_actividad', ROUND(public.ruta_actividad_puntaje(v_actividad_id, v_estudiante_id), 2),
        'actividad_completada', v_completada,
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


-- portal_ruta_progreso: el 'puntaje' pasa a ser el ponderado de la ruta. Antes
-- sumaba puntos crudos de preguntas, que no era comparable entre rutas con
-- distinta cantidad de preguntas ni con distinto peso por etapa.
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
    v_regla JSONB;
    v_puntajes JSONB;
    v_resultado JSONB;
BEGIN
    v_estudiante_id := public.ruta_resolver_sesion(p_session_token);

    SELECT nota_id, COALESCE(regla_desbloqueo, '{"modo":"secuencial"}'::JSONB)
      INTO v_nota_id, v_regla
    FROM public.ruta_aprendizaje
    WHERE id = p_ruta_id AND estado = 'publicada';

    IF v_nota_id IS NULL THEN
        RETURN jsonb_build_object('error', 'Ruta no encontrada');
    END IF;

    IF NOT public.ruta_ficha_compartida_con_estudiante(v_nota_id, v_estudiante_id) THEN
        RETURN jsonb_build_object('error', 'Esta ruta no está disponible para tu curso');
    END IF;

    v_puntajes := public.ruta_puntajes_ruta(p_ruta_id, v_estudiante_id);

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
        'puntaje', COALESCE((v_puntajes->>'puntaje')::NUMERIC, 0),
        'etapas', (
            SELECT COALESCE(jsonb_agg(
                jsonb_build_object(
                    'id', e.id,
                    'titulo', e.titulo,
                    'peso', e.peso,
                    'puntaje', COALESCE((
                        SELECT pe->>'puntaje'
                        FROM jsonb_array_elements(COALESCE(v_puntajes->'etapas', '[]'::JSONB)) pe
                        WHERE pe->>'id' = e.id::TEXT
                    ), '0'),
                    'completada', public.ruta_etapa_completada(e.id, v_estudiante_id),
                    'desbloqueada', public.ruta_etapa_desbloqueada(p_ruta_id, e.id, v_estudiante_id, v_regla)
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


-- El puntaje ponderado del estudiante, para el resumen de la ruta.
CREATE OR REPLACE FUNCTION public.portal_ruta_puntaje(
    p_session_token UUID,
    p_ruta_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_estudiante_id BIGINT;
    v_nota_id UUID;
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

    RETURN public.ruta_puntajes_ruta(p_ruta_id, v_estudiante_id);
EXCEPTION
    WHEN OTHERS THEN
        IF SQLERRM = 'Sesión inválida' THEN
            RETURN jsonb_build_object('error', 'Sesión inválida');
        END IF;
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ────────────────────────────────────────────────────────────────────────────
-- 13) PERMISOS
--
-- Los helpers de calculo no son API: los invocan las RPC de arriba, que ya
-- son SECURITY DEFINER. Se les quita EXECUTE al anon para no exponer la
-- aritmetica de puntajes a cualquier visitante.
--
-- Fix_db_permissions.sql dejo GRANT ALL a anon sobre todo public; se revoca
-- explicitamente, igual que en las migraciones anteriores de Rutas.
-- ────────────────────────────────────────────────────────────────────────────
REVOKE ALL ON FUNCTION public.ruta_rebalancear_etapas(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_rebalancear_actividades(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_actividad_puntaje(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_puntajes_ruta(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_proyectar_calificacion(UUID, BIGINT) FROM PUBLIC, anon;

REVOKE ALL ON FUNCTION public.ruta_actualizar_pesos(UUID, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_rebalancear_pesos(UUID, UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_actividades_existentes(UUID, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_vincular_actividad(UUID, INTEGER, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_puntajes_docente(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ruta_actualizar_pesos(UUID, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_rebalancear_pesos(UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_actividades_existentes(UUID, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_vincular_actividad(UUID, INTEGER, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_puntajes_docente(UUID) TO authenticated;

-- Helpers: el docente puede llamarlos desde el cliente, el anon no.
GRANT EXECUTE ON FUNCTION public.ruta_actividad_puntaje(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_puntajes_ruta(UUID, BIGINT) TO authenticated;

-- Portal: el estudiante es el rol anon, y la seguridad esta en validar
-- p_session_token, igual que en las demas RPC portal_*.
REVOKE ALL ON FUNCTION public.portal_ruta_puntaje(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.portal_ruta_puntaje(UUID, UUID) TO anon, authenticated;

-- Las funciones reemplazadas conservan sus permisos, pero se repiten para que
-- esta migracion sea idempotente por si se aplica sobre una base donde todavia
-- no se habian recreado.
REVOKE ALL ON FUNCTION public.ruta_crear_etapa(UUID, TEXT, TEXT, INTEGER) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_eliminar_etapa(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_crear_actividad(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB, BOOLEAN) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_eliminar_actividad(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_obtener(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ruta_crear_etapa(UUID, TEXT, TEXT, INTEGER) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_eliminar_etapa(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_crear_actividad(UUID, TEXT, TEXT, TEXT, INTEGER, JSONB, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_eliminar_actividad(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_obtener(UUID) TO authenticated;

REVOKE ALL ON FUNCTION public.portal_ruta_obtener(UUID, UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_ruta_registrar_intento(UUID, UUID, JSONB, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.portal_ruta_progreso(UUID, UUID) FROM PUBLIC;

GRANT EXECUTE ON FUNCTION public.portal_ruta_obtener(UUID, UUID) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_ruta_registrar_intento(UUID, UUID, JSONB, INTEGER) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.portal_ruta_progreso(UUID, UUID) TO anon, authenticated;


-- ============================================================================
--  VERDADERO / FALSO — la opción correcta se DERIVA, no se configura
-- ============================================================================
-- En una item de tipo `verdadero_falso` la única respuesta correcta es
-- "Verdadero". No es una preferencia del docente ni un dato que pueda
-- cargarse equivocado: se deduce del texto de la opción.
--
-- Por qué esto vive en la base y no solo en el formulario:
--   · `ruta_evaluar_respuesta` (CASO B) decide con `ruta_opcion.es_correcta`.
--     Si el flag queda mal, la pregunta se corrige mal y el estudiante pierde
--     el punto sin que nada falle de forma visible.
--   · "Que solo Verdadero sea correcto, siempre" no se puede garantizar desde
--     la UI: la RPC docente, un UPDATE hecho a mano en el panel o un import
--     futuro volverían a marcar "Falso" como correcta.
--
-- El trigger es el punto más barato que cierra esa puerta: se aplica en cada
-- escritura de `ruta_opcion` y solo reescribe `NEW.es_correcta` cuando la
-- pregunta pertenece a una actividad de ese tipo. No duplica la definición de
-- `ruta_guardar_actividad` ni toca la lógica de corrección, y para el resto de
-- tipos (opción múltiple, ordenar, relacionar...) es un paso a través.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_fijar_correcta_verdadero_falso()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_es_verdadero_falso BOOLEAN;
BEGIN
    -- SECURITY DEFINER solo para que la lectura no dependa de las policies del
    -- rol que escribe (la RPC docente es SECURITY DEFINER y el trigger se
    -- dispara dentro de ella). No hace nada mas que un SELECT.
    SELECT (a.tipo = 'verdadero_falso')
      INTO v_es_verdadero_falso
    FROM public.ruta_pregunta p
    JOIN public.ruta_actividad a ON a.id = p.actividad_id
    WHERE p.id = NEW.pregunta_id;

    -- Pregunta de otro tipo (o ya borrada): no se toca nada.
    IF NOT COALESCE(v_es_verdadero_falso, FALSE) THEN
        RETURN NEW;
    END IF;

    -- "Verdadero" es correcta; cualquier otra, "Falso" incluido, no.
    -- La comparación usa ruta_normalizar_texto —la misma base que el motor
    -- emplea para comparar texto— así que "verdadero", "Verdadero." y
    -- "Verdadero " se reconocen igual.
    NEW.es_correcta := (public.ruta_normalizar_texto(NEW.texto) = 'verdadero');

    RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.ruta_fijar_correcta_verdadero_falso() IS
    'BEFORE INSERT/UPDATE en ruta_opcion: en una item verdadero_falso solo la opción "Verdadero" puede quedar correcta.';

DROP TRIGGER IF EXISTS trg_ruta_opcion_verdadero_falso ON public.ruta_opcion;
CREATE TRIGGER trg_ruta_opcion_verdadero_falso
    BEFORE INSERT OR UPDATE ON public.ruta_opcion
    FOR EACH ROW
    EXECUTE FUNCTION public.ruta_fijar_correcta_verdadero_falso();

-- Las funciones de trigger no se invocan directamente, pero se revoca igual
-- para que el superficie no crezca por costumbre.
REVOKE ALL ON FUNCTION public.ruta_fijar_correcta_verdadero_falso() FROM PUBLIC;


-- ── Reparación de lo que YA está escrito ───────────────────────────────────
-- El trigger cubre las escrituras futuras. Las preguntas que ya existen
-- quedaron como quedaron, y hasta que el docente vuelva a guardar el item el
-- flag seguiría en como se guardó: "Falso" marcado como correcta hace que la
-- pregunta se corrija al revés. Este bloque es la otra mitad, la que arregla el
-- presente. Es idempotente: aplicarlo dos veces no cambia nada.
DO $$
DECLARE
    v_id UUID;
    v_ultimo_orden INTEGER;
BEGIN
    FOR v_id, v_ultimo_orden IN
        SELECT p.id, COALESCE(MAX(o.orden), 0)
        FROM public.ruta_pregunta p
        JOIN public.ruta_actividad a ON a.id = p.actividad_id
        LEFT JOIN public.ruta_opcion o ON o.pregunta_id = p.id
        WHERE a.tipo = 'verdadero_falso'
          AND p.activo
        GROUP BY p.id
    LOOP
        -- 1) La correcta se deriva del texto. Pasa por el trigger, pero se
        --    escribe explícito para que la reparación se entienda sola y no
        --    dependa de que el trigger siga puesto.
        UPDATE public.ruta_opcion
        SET es_correcta = (public.ruta_normalizar_texto(texto) = 'verdadero')
        WHERE pregunta_id = v_id;

        -- 2) Si ninguna opción quedó correcta —opciones heredadas que no se
        --    llaman ni "Verdadero" ni "Falso", o una pregunta sin opciones—
        --    la pregunta quedaría imposible de acertar y el estudiante vería
        --    un fallo sin explicación. Se agrega la correcta.
        IF NOT EXISTS (
            SELECT 1 FROM public.ruta_opcion
            WHERE pregunta_id = v_id AND es_correcta
        ) THEN
            INSERT INTO public.ruta_opcion (pregunta_id, texto, orden, es_correcta)
            VALUES (v_id, 'Verdadero', v_ultimo_orden + 1, TRUE);
        END IF;

        -- 3) Y la que falte de las dos, para que el estudiante siempre tenga
        --    las dos opciones que espera. No se borran las demás: si había
        --    más de dos, se conservan tal cual.
        IF NOT EXISTS (
            SELECT 1 FROM public.ruta_opcion
            WHERE pregunta_id = v_id
              AND public.ruta_normalizar_texto(texto) = 'falso'
        ) THEN
            INSERT INTO public.ruta_opcion (pregunta_id, texto, orden, es_correcta)
            VALUES (v_id, 'Falso', v_ultimo_orden + 2, FALSE);
        END IF;
    END LOOP;
END;
$$;
