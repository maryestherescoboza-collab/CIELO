-- ============================================================================
--  RUTAS DE APRENDIZAJE — MOTOR DE VALIDACIÓN
--  Migración: 20260926120200
--
--  REGLA DE ORO DE ESTE ARCHIVO:
--  La respuesta correcta NUNCA sale de la base de datos hacia el Portal.
--  El veredicto (`correcto`) lo decide esta capa, en servidor. Un estudiante
--  que use las herramientas de desarrollo de Supabase ve exactamente el mismo
--  JSONB que veria en la UI: sin claves de correccion.
--
--  Este archivo no habla con `p_session_token`: es matematica pura. Quien
--  decide si un intento vale y quien lo persiste son 20260926120300; la
--  previsualizacion del docente es la unica excepcion.
--
--  ARQUITECTURA DEL MOTOR (3 piezas, cada una con una responsabilidad):
--    1. ruta_comparar()      → la ESTRATEGIA. Compara un valor contra uno
--                              esperado segun el dominio. Reutilizable.
--    2. ruta_evaluar_respuesta() → la ORQUESTACIÓN. Decide que comparar segun
--                              la forma de la respuesta (opciones / espacios /
--                              escalar) y devuelve el veredicto.
--    3. portal_ruta_registrar_intento() → la PERSISTENCIA.
--  Agregar un tipo de pregunta es agregar una rama en (2), no tocar (3).
-- ============================================================================


-- ============================================================================
--  1) NORMALIZACIÓN
-- ============================================================================

-- Minusculas, sin acentos, sin puntuacion. Conserva los operadores
-- matematicos porque se usa tanto para texto como para expresiones.
--
-- OJO: en translate() el origen y el destino deben medir EXACTAMENTE lo mismo.
-- Si el destino es mas largo, PostgreScript deja de traducir y borra el
-- caracter. Por eso la lista de arriba y la de abajo son espejo.
CREATE OR REPLACE FUNCTION public.ruta_normalizar_texto(p_texto TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    -- lower() ANTES de translate(): translate solo sustituye, no baja de caso,
    -- asi que sin esta linea "Griego" no coincidiria con "griego" y el
    -- estudiante veria su respuesta escrita como incorrecta.
    SELECT btrim(
        regexp_replace(
            translate(
                lower(COALESCE(p_texto, '')),
                'áàäâãéèëêíìïîóòöôõúùüûñç',
                'aaaaaeeeeiiiiooooouuuunncc'
            ),
            '[^a-z0-9+\-*/^(). ]+', ' ', 'g'
        )
    );
$$;

COMMENT ON FUNCTION public.ruta_normalizar_texto(TEXT) IS
    'Minusculas, sin acentos, sin puntuacion (conserva operadores matematicos). Base de la comparacion textual.';


-- Parseo tolerante de numeros: "5", "5.0", "5,00", " 5 ", "+5", "5 cm" -> 5
CREATE OR REPLACE FUNCTION public.ruta_parsear_numero(p_texto TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_limpio TEXT;
BEGIN
    v_limpio := regexp_replace(
        COALESCE(p_texto, ''),
        '\s|°|º|%|cm2|cm²|cm3|cm³|m2|m²|km|kg|ml|cm|mm|gr|g|mt|m|ud|unidades?|metros?|cuadrados?|cúbicos?', '',
        'gi'
    );

    -- La coma decimal solo se acepta si NO hay punto: evita confundir "1,234.56".
    IF v_limpio !~ '\.' AND v_limpio ~ ',' THEN
        v_limpio := replace(v_limpio, ',', '.');
    ELSE
        v_limpio := replace(v_limpio, ',', '');
    END IF;

    IF v_limpio !~ '^-?[0-9]*\.?[0-9]+$' THEN
        RETURN NULL;
    END IF;

    RETURN v_limpio::NUMERIC;
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.ruta_parsear_numero(TEXT) IS
    'Parseo tolerante de respuestas numericas: "5", "5.0", "5,00", "5 cm", " 5 " -> 5. NULL si no es numerico.';


-- Tolerancia efectiva: max(absoluta, relativa * |esperado|)
CREATE OR REPLACE FUNCTION public.ruta_tolerancia_efectiva(
    p_esperado NUMERIC,
    p_config JSONB
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT GREATEST(
        COALESCE((p_config->>'toleranciaAbs')::NUMERIC, 0),
        COALESCE((p_config->>'toleranciaRel')::NUMERIC, 0) * ABS(COALESCE(p_esperado, 0))
    );
$$;


-- Equivalencia numerica con tolerancia: 5 == 5.0 == 5,00 == "5 cm"
CREATE OR REPLACE FUNCTION public.ruta_numeros_equivalentes(
    p_esperado NUMERIC,
    p_recibido NUMERIC,
    p_config JSONB
)
RETURNS BOOLEAN
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
    SELECT p_esperado IS NOT NULL
       AND p_recibido IS NOT NULL
       AND ABS(p_recibido - p_esperado)
           <= public.ruta_tolerancia_efectiva(p_esperado, COALESCE(p_config, '{}'::JSONB));
$$;


-- ============================================================================
--  2) EVALUADOR ARITMETICO
--  Shunting-yard minimo: + - * / ^ y parentesis.
--  NO es un motor algebraico ni pretende serlo. Existe para que, cuando el
--  tipo de respuesta sea 'expresion', "2+3" sea aceptada como "5" sin
--  depender de una libreria de CAS. Ampliar el dominio (raiz, funciones) es
--  agregar operadores a este bloque, sin tocar el resto del motor.
--
--  Devuelve NULL si el texto no es una expresion aritmetica valida; quien
--  llama cae entonces a la comparacion textual.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_evaluar_expresion(p_texto TEXT)
RETURNS NUMERIC
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_txt      TEXT;
    v_pos      INT := 1;
    v_largo    INT;
    v_car      CHAR;
    v_num      NUMERIC;

    v_nums     NUMERIC[] := ARRAY[]::NUMERIC[];
    v_ops      TEXT[]    := ARRAY[]::TEXT[];

    v_a NUMERIC;
    v_b NUMERIC;
    v_op TEXT;

    v_ultimo   CHAR := ' ';   -- 'n' numero, 'o' operador, '(' , ')'
    v_pendiente_unario BOOLEAN;
    v_unario   BOOLEAN := FALSE;  -- el '-' que aun no encontro su operando

    v_prio_top   INT;
    v_prio_op    INT;
BEGIN
    IF p_texto IS NULL THEN
        RETURN NULL;
    END IF;

    -- Sin operador no hay expresion que evaluar: es un numero o un texto.
    IF p_texto !~ '[\+\-\*/^()]' THEN
        RETURN NULL;
    END IF;

    v_txt   := public.ruta_normalizar_texto(p_texto);
    v_largo := length(v_txt);
    IF v_largo = 0 THEN
        RETURN NULL;
    END IF;

    WHILE v_pos <= v_largo LOOP
        v_car := substr(v_txt, v_pos, 1);

        IF v_car = ' ' THEN
            v_pos := v_pos + 1;

        -- ── Numero ──
        ELSIF v_car ~ '[0-9.]' THEN
            v_num := public.ruta_parsear_numero(substr(v_txt, v_pos));
            IF v_num IS NULL THEN
                RETURN NULL;
            END IF;

            v_nums := v_nums || v_num;
            v_ultimo := 'n';

            -- El signo unario pendiente se aplica al numero recien leido, en vez
            -- de empujar un 0: asi "5 * -3" da -15 y no queda como leftover.
            IF v_unario THEN
                v_nums[array_length(v_nums, 1)] := -v_nums[array_length(v_nums, 1)];
                v_unario := FALSE;
            END IF;

            WHILE v_pos <= v_largo AND substr(v_txt, v_pos, 1) ~ '[0-9.]' LOOP
                v_pos := v_pos + 1;
            END LOOP;

        -- ── Operador ──
        ELSIF v_car IN ('+', '-', '*', '/', '^') THEN
            -- Signo unario: primer token (v_ultimo = ' '), o justo despues de
            -- '(' u otro operador. Sin el caso ' ', "-5" se leeria como una
            -- resta sin operando izquierdo.
            v_pendiente_unario := (v_ultimo IN ('o', '(', ' ')) AND v_car IN ('+', '-');

            IF v_pendiente_unario THEN
                -- El '-' queda pendiente: se aplica al proximo operando, sea un
                -- numero ("-5") o un grupo completo ("-(3+2)").
                v_unario := (v_car = '-');
            ELSE
                v_unario := FALSE;
                v_prio_op := CASE v_car
                    WHEN '^' THEN 4 WHEN '*' THEN 3 WHEN '/' THEN 3 ELSE 2 END;

                -- '^' es asociativo por derecha: solo descarga si tiene MAYOR
                -- prioridad. El resto es asociativo por izquierda.
                WHILE coalesce(array_length(v_ops, 1), 0) > 0
                      AND v_ops[array_length(v_ops, 1)] <> '(' LOOP
                    v_prio_top := CASE v_ops[array_length(v_ops, 1)]
                        WHEN '^' THEN 4 WHEN '*' THEN 3 WHEN '/' THEN 3 ELSE 2 END;

                    EXIT WHEN v_prio_top < v_prio_op
                       OR (v_prio_top = v_prio_op AND v_car = '^');

                    v_b   := v_nums[array_length(v_nums, 1)];
                    v_nums := v_nums[1:array_length(v_nums, 1) - 1];
                    v_a   := v_nums[array_length(v_nums, 1)];
                    v_nums := v_nums[1:array_length(v_nums, 1) - 1];
                    v_op  := v_ops[array_length(v_ops, 1)];
                    v_ops := v_ops[1:array_length(v_ops, 1) - 1];

                    IF v_op = '+' THEN v_nums := v_nums || (v_a + v_b);
                    ELSIF v_op = '-' THEN v_nums := v_nums || (v_a - v_b);
                    ELSIF v_op = '*' THEN v_nums := v_nums || (v_a * v_b);
                    ELSIF v_op = '/' THEN
                        IF v_b = 0 THEN RETURN NULL; END IF;
                        v_nums := v_nums || (v_a / v_b);
                    ELSIF v_op = '^' THEN v_nums := v_nums || power(v_a, v_b);
                    END IF;
                END LOOP;

                v_ops := v_ops || v_car;
            END IF;

            v_ultimo := 'o';
            v_pos := v_pos + 1;

        -- ── Parentesis que abre ──
        ELSIF v_car = '(' THEN
            v_ops := v_ops || '(';
            v_ultimo := '(';
            v_pos := v_pos + 1;

        -- ── Parentesis que cierra ──
        ELSE
            WHILE coalesce(array_length(v_ops, 1), 0) > 0
                  AND v_ops[array_length(v_ops, 1)] <> '(' LOOP
                v_b   := v_nums[array_length(v_nums, 1)];
                v_nums := v_nums[1:array_length(v_nums, 1) - 1];
                v_a   := v_nums[array_length(v_nums, 1)];
                v_nums := v_nums[1:array_length(v_nums, 1) - 1];
                v_op  := v_ops[array_length(v_ops, 1)];
                v_ops := v_ops[1:array_length(v_ops, 1) - 1];

                IF v_op = '+' THEN v_nums := v_nums || (v_a + v_b);
                ELSIF v_op = '-' THEN v_nums := v_nums || (v_a - v_b);
                ELSIF v_op = '*' THEN v_nums := v_nums || (v_a * v_b);
                ELSIF v_op = '/' THEN
                    IF v_b = 0 THEN RETURN NULL; END IF;
                    v_nums := v_nums || (v_a / v_b);
                ELSIF v_op = '^' THEN v_nums := v_nums || power(v_a, v_b);
                END IF;
            END LOOP;

            -- Sin '(' correspondiente: la expresion esta mal formada.
            IF coalesce(array_length(v_ops, 1), 0) = 0 THEN
                RETURN NULL;
            END IF;

            v_ops := v_ops[1:array_length(v_ops, 1) - 1];
            v_ultimo := 'n';

            -- "-(3+2)": el grupo recien cerrado es el operando del signo.
            IF v_unario THEN
                v_nums[array_length(v_nums, 1)] := -v_nums[array_length(v_nums, 1)];
                v_unario := FALSE;
            END IF;

            v_pos := v_pos + 1;
        END IF;
    END LOOP;

    -- Pila de operadores pendiente. Un '(' sin cerrar es un error.
    WHILE coalesce(array_length(v_ops, 1), 0) > 0 LOOP
        v_op := v_ops[array_length(v_ops, 1)];
        IF v_op = '(' THEN
            RETURN NULL;
        END IF;
        v_ops := v_ops[1:array_length(v_ops, 1) - 1];

        v_b   := v_nums[array_length(v_nums, 1)];
        v_nums := v_nums[1:array_length(v_nums, 1) - 1];
        v_a   := v_nums[array_length(v_nums, 1)];
        v_nums := v_nums[1:array_length(v_nums, 1) - 1];

        IF v_op = '+' THEN v_nums := v_nums || (v_a + v_b);
        ELSIF v_op = '-' THEN v_nums := v_nums || (v_a - v_b);
        ELSIF v_op = '*' THEN v_nums := v_nums || (v_a * v_b);
        ELSIF v_op = '/' THEN
            IF v_b = 0 THEN RETURN NULL; END IF;
            v_nums := v_nums || (v_a / v_b);
        ELSIF v_op = '^' THEN v_nums := v_nums || power(v_a, v_b);
        END IF;
    END LOOP;

    IF array_length(v_nums, 1) <> 1 THEN
        RETURN NULL;
    END IF;

    RETURN v_nums[1];
EXCEPTION
    WHEN OTHERS THEN
        RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.ruta_evaluar_expresion(TEXT) IS
    'Shunting-yard minimo (+ - * / ^ parentesis). NULL si no es expresion aritmetica valida. NO es un motor algebraico.';


-- ============================================================================
--  3) LA ESTRATEGIA: comparar un valor contra un valor esperado
--  Esta función es la UNICA que decide si dos textos son equivalentes.
--  La usan tanto la respuesta escalar como cada espacio de un procedimiento,
--  de modo que no puede haber dos reglas de correccion divergentes.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_comparar(
    p_esperado TEXT,
    p_recibido TEXT,
    p_tipo_respuesta TEXT,
    p_config JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
SET search_path = public
AS $$
DECLARE
    v_cfg JSONB := COALESCE(p_config, '{}'::JSONB);
    v_ne NUMERIC;
    v_nr NUMERIC;
    v_e  TEXT;
    v_r  TEXT;
BEGIN
    IF p_recibido IS NULL OR btrim(p_recibido) = '' THEN
        RETURN FALSE;
    END IF;
    IF p_esperado IS NULL THEN
        RETURN FALSE;
    END IF;

    CASE p_tipo_respuesta
        WHEN 'numerica' THEN
            v_ne := public.ruta_parsear_numero(p_esperado);
            v_nr := public.ruta_parsear_numero(p_recibido);
            RETURN public.ruta_numeros_equivalentes(v_ne, v_nr, v_cfg);

        WHEN 'expresion' THEN
            -- La equivalencia cae de forma natural: se evaluan ambos lados.
            v_ne := public.ruta_evaluar_expresion(p_esperado);
            IF v_ne IS NULL THEN
                v_ne := public.ruta_parsear_numero(p_esperado);
            END IF;
            v_nr := public.ruta_evaluar_expresion(p_recibido);
            IF v_nr IS NULL THEN
                v_nr := public.ruta_parsear_numero(p_recibido);
            END IF;
            RETURN public.ruta_numeros_equivalentes(v_ne, v_nr, v_cfg);

        WHEN 'booleana' THEN
            v_r := public.ruta_normalizar_texto(p_recibido);
            v_e := public.ruta_normalizar_texto(p_esperado);
            IF v_e IN ('verdadero', 'true', 'v', 'si', '1') THEN
                RETURN v_r IN ('verdadero', 'true', 'v', 'si', '1');
            ELSIF v_e IN ('falso', 'false', 'f', 'no', '0') THEN
                RETURN v_r IN ('falso', 'false', 'f', 'no', '0');
            END IF;
            RETURN v_e = v_r;

        ELSE  -- textual (incluye 'ordenada', que llega ya aplanada)
            v_r := public.ruta_normalizar_texto(p_recibido);
            v_e := public.ruta_normalizar_texto(p_esperado);
            RETURN v_e = v_r;
    END CASE;
EXCEPTION
    WHEN OTHERS THEN
        RETURN FALSE;
END;
$$;

COMMENT ON FUNCTION public.ruta_comparar(TEXT, TEXT, TEXT, JSONB) IS
    'Estrategia unica de equivalencia. La usan el camino escalar y cada espacio del procedimiento matematico.';


-- Valores aceptados por una pregunta: respuesta principal + alternas del docente.
CREATE OR REPLACE FUNCTION public.ruta_valores_esperados(p_pregunta public.ruta_pregunta)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_lista TEXT[] := ARRAY[]::TEXT[];
    v_item TEXT;
    v_principal TEXT;
BEGIN
    v_principal := btrim(COALESCE(p_pregunta.config->>'respuestaEsperada', ''));
    IF v_principal <> '' THEN
        v_lista := v_lista || v_principal;
    END IF;

    FOR v_item IN
        SELECT btrim(value::text)
        FROM jsonb_array_elements_text(
            COALESCE(p_pregunta.config->'respuestasAceptadas', '[]'::JSONB)
        ) value
    LOOP
        IF v_item <> '' AND NOT (v_item = ANY(v_lista)) THEN
            v_lista := v_lista || v_item;
        END IF;
    END LOOP;

    RETURN to_jsonb(v_lista);
END;
$$;


-- Valor esperado de UN espacio de un procedimiento matematico.
-- Busca en config.pasos[paso].espacios[espacio].respuesta.
-- La verdad vive en la base de datos: el cliente solo dice "escribi X aqui".
CREATE OR REPLACE FUNCTION public.ruta_esperado_espacio(
    p_config JSONB,
    p_paso INT,
    p_espacio INT
)
RETURNS TEXT
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT (
        SELECT ea.espacio->>'respuesta'
        FROM jsonb_array_elements(COALESCE(p_config->'pasos', '[]'::JSONB)) WITH ORDINALITY AS pa(paso, ord)
        JOIN LATERAL jsonb_array_elements(COALESCE(pa.paso->'espacios', '[]'::JSONB))
                        WITH ORDINALITY AS ea(espacio, ord_e) ON TRUE
        WHERE pa.ord = p_paso AND ea.ord_e = p_espacio
        LIMIT 1
    );
$$;

COMMENT ON FUNCTION public.ruta_esperado_espacio(JSONB, INT, INT) IS
    'Resuelve la respuesta esperada de un espacio desde config.pasos. El cliente no puede influencear este valor.';


-- Version SEGURA de config.pasos para el Portal: el texto del paso y cuantos
-- huecos tiene, NUNCA la respuesta esperada de cada espacio.
--
-- Sin esto el Portal no podria dibujar los inputs (necesita el texto) y la
-- unica alternativa seria no enviar los pasos, que es peor: el estudiante
-- veria "Calcula a^2 = b^2 - c^2" sin ningun recuadro donde escribir.
CREATE OR REPLACE FUNCTION public.ruta_pasos_publicos(p_config JSONB)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'texto',    COALESCE(pa.paso->>'texto', ''),
                    'espacios', COALESCE(jsonb_array_length(pa.paso->'espacios'), 0)
                )
                ORDER BY pa.ord
            )
            FROM jsonb_array_elements(COALESCE(p_config->'pasos', '[]'::JSONB))
                 WITH ORDINALITY AS pa(paso, ord)
        ),
        '[]'::JSONB
    );
$$;

COMMENT ON FUNCTION public.ruta_pasos_publicos(JSONB) IS
    'Pasos del procedimiento sin respuestas: solo el texto y la cantidad de huecos. Es lo unico que el Portal puede ver.';


-- ============================================================================
--  4) ORQUESTACIÓN: ¿es correcta esta respuesta?
--  Devuelve {"correcto":bool, ...} segun la FORMA de la respuesta:
--    {espacios:[...]}  → procedimiento matematico (pasa a paso/espacio)
--    {opcionIds:[...]} → seleccion multiple / verdadero-falso
--    {orden:[...]}     → ordenar pasos
--    {texto:"..."}     → escalar
--  Nunca lanza excepcion: un error de validacion produce incorrecto, jamas
--  "correcto". Es la unica fuente de verdad de la correccion: la usan tanto el
--  registro de intento del Portal como la previsualizacion del constructor.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_evaluar_respuesta(
    p_pregunta public.ruta_pregunta,
    p_respuesta JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SET search_path = public
AS $$
DECLARE
    v_cfg       JSONB := COALESCE(p_pregunta.config, '{}'::JSONB);
    v_recibido  TEXT;
    v_esperados TEXT[];
    v_esperado  TEXT;
    v_correcto   BOOLEAN := FALSE;
    v_total_correctas INT;
    v_total      INT;
    v_declarados INT := 0;
    v_unicos     INT := 0;
    v_ajenos     INT := 0;
    v_aciertos   INT := 0;

    -- Camino procedimiento
    v_esp        JSONB;
    v_esperado_esp TEXT;
    v_ok_esp     BOOLEAN;
    v_detalle    JSONB := '[]'::JSONB;

    -- Camino escalar
    v_orden_esperado TEXT;
    v_orden_recibido TEXT;
BEGIN
    IF p_respuesta IS NULL THEN
        RETURN jsonb_build_object('correcto', FALSE, 'sugerencia', 'Sin respuesta');
    END IF;

    -- ══════════════════════════════════════════════════════════════════
    -- CASO A — Procedimiento matemático: un veredicto POR ESPACIO
    --
    -- El envio debe ser COMPLETO. Acertar 2 de 5 espacios no es acertar la
    -- pregunta, y repetir la misma posicion tampoco cuenta como otra: sin
    -- este control, "manda solo el paso 1" pasaria como 100% correcto.
    -- ══════════════════════════════════════════════════════════════════
    IF p_respuesta ? 'espacios' THEN
        -- Cuantos espacios declara el docente en config.pasos.
        SELECT COALESCE(SUM(coalesce(jsonb_array_length(pa.paso->'espacios'), 0)), 0)
        INTO v_declarados
        FROM jsonb_array_elements(COALESCE(v_cfg->'pasos', '[]'::JSONB)) AS pa(paso);

        v_total := 0;
        v_total_correctas := 0;

        FOR v_esp IN SELECT * FROM jsonb_array_elements(p_respuesta->'espacios') LOOP
            v_total := v_total + 1;

            v_esperado_esp := public.ruta_esperado_espacio(
                v_cfg,
                COALESCE((v_esp->>'paso')::INT, 0),
                COALESCE((v_esp->>'espacio')::INT, 0)
            );

            v_ok_esp := public.ruta_comparar(
                v_esperado_esp,
                v_esp->>'valor',
                p_pregunta.tipo_respuesta,
                v_cfg
            );

            IF v_ok_esp THEN
                v_total_correctas := v_total_correctas + 1;
            END IF;

            v_detalle := v_detalle || jsonb_build_array(jsonb_build_object(
                'paso',     COALESCE((v_esp->>'paso')::INT, 0),
                'espacio',  COALESCE((v_esp->>'espacio')::INT, 0),
                'correcto', v_ok_esp
            ));
        END LOOP;

        -- Posiciones distintas enviadas: dos veces el mismo (paso, espacio) es
        -- una sola posicion.
        SELECT COUNT(DISTINCT coalesce(e->>'paso', '0') || ':' || coalesce(e->>'espacio', '0'))
        INTO v_unicos
        FROM jsonb_array_elements(COALESCE(p_respuesta->'espacios', '[]'::JSONB)) AS e;

        RETURN jsonb_build_object(
            'correcto', (
                v_declarados > 0
                AND v_total = v_declarados
                AND v_unicos = v_declarados
                AND v_total_correctas = v_declarados
            ),
            'parciales',   v_total_correctas,
            'totalEspacios', v_declarados,
            'detalle',     v_detalle,
            'sugerencia',  'Espacios correctos: ' || v_total_correctas || ' de ' || v_declarados
        );
    END IF;

    -- ══════════════════════════════════════════════════════════════════
    -- CASO B — Selección múltiple / Verdadero-Falso
    -- El conjunto elegido debe coincidir EXACTAMENTE con el conjunto correcto:
    --   · ningún id ajeno a la pregunta,
    --   · ninguna posición repetida,
    --   · ninguna opción incorrecta marcada.
    -- ══════════════════════════════════════════════════════════════════
    IF p_respuesta ? 'opcionIds' THEN
        SELECT COUNT(*) INTO v_total
        FROM public.ruta_opcion
        WHERE pregunta_id = p_pregunta.id;

        IF v_total = 0 THEN
            RETURN jsonb_build_object('correcto', FALSE, 'sugerencia', 'La pregunta no tiene opciones');
        END IF;

        SELECT COUNT(*) INTO v_total_correctas
        FROM public.ruta_opcion
        WHERE pregunta_id = p_pregunta.id AND es_correcta;

        -- Ids que no pertenecen a esta pregunta.
        SELECT COUNT(*) INTO v_ajenos
        FROM jsonb_array_elements_text(COALESCE(p_respuesta->'opcionIds', '[]'::JSONB)) t(value)
        WHERE NOT EXISTS (
            SELECT 1 FROM public.ruta_opcion o
            WHERE o.id::text = t.value::text
              AND o.pregunta_id = p_pregunta.id
        );

        -- Posiciones distintas enviadas.
        SELECT COUNT(DISTINCT t.value::text) INTO v_unicos
        FROM jsonb_array_elements_text(COALESCE(p_respuesta->'opcionIds', '[]'::JSONB)) t(value);

        -- De las enviadas, cuantas son efectivamente correctas.
        SELECT COUNT(DISTINCT t.value::text) INTO v_aciertos
        FROM jsonb_array_elements_text(COALESCE(p_respuesta->'opcionIds', '[]'::JSONB)) t(value)
        JOIN public.ruta_opcion o
          ON o.id::text = t.value::text
         AND o.pregunta_id = p_pregunta.id
         AND o.es_correcta;

        RETURN jsonb_build_object(
            'correcto', (
                v_total_correctas > 0
                AND v_ajenos = 0
                AND v_unicos = v_total_correctas
                AND v_aciertos = v_total_correctas
            ),
            'sugerencia', 'Selección de opciones'
        );
    END IF;

    -- ══════════════════════════════════════════════════════════════════
    -- CASO C — Ordenar pasos: se compara la SECUENCIA completa
    -- ══════════════════════════════════════════════════════════════════
    IF p_respuesta ? 'orden' THEN
        SELECT string_agg(o.clave, ',' ORDER BY o.orden) INTO v_orden_esperado
        FROM public.ruta_opcion o
        WHERE o.pregunta_id = p_pregunta.id
          AND o.clave IS NOT NULL;

        SELECT string_agg(t.value::text, ',' ORDER BY t.ord) INTO v_orden_recibido
        FROM jsonb_array_elements_text(COALESCE(p_respuesta->'orden', '[]'::JSONB))
             WITH ORDINALITY AS t(value, ord);

        RETURN jsonb_build_object(
            'correcto', (v_orden_esperado = v_orden_recibido),
            'sugerencia', 'Orden de los pasos'
        );
    END IF;

    -- ══════════════════════════════════════════════════════════════════
    -- CASO D — Respuesta escalar: completar, numérica, escrita, T/F
    -- ══════════════════════════════════════════════════════════════════
    v_recibido := COALESCE(
        NULLIF(btrim(p_respuesta->>'texto'), ''),
        NULLIF(btrim(p_respuesta->>'seleccion'), ''),
        NULLIF(btrim(p_respuesta->>'valor'), '')
    );

    IF v_recibido IS NULL THEN
        RETURN jsonb_build_object('correcto', FALSE, 'sugerencia', 'Sin respuesta');
    END IF;

    v_esperados := ARRAY(
        SELECT jsonb_array_elements_text(public.ruta_valores_esperados(p_pregunta))::text
    );

    IF COALESCE(array_length(v_esperados, 1), 0) = 0 THEN
        RETURN jsonb_build_object('correcto', FALSE, 'sugerencia', 'La pregunta no tiene respuesta esperada');
    END IF;

    FOR v_esperado IN SELECT unnest(v_esperados) LOOP
        IF public.ruta_comparar(v_esperado, v_recibido, p_pregunta.tipo_respuesta, v_cfg) THEN
            v_correcto := TRUE;
            EXIT;
        END IF;
    END LOOP;

    RETURN jsonb_build_object(
        'correcto', v_correcto,
        'sugerencia', 'Estrategia: ' || p_pregunta.tipo_respuesta
    );
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('correcto', FALSE, 'sugerencia', 'Error de validación');
END;
$$;

COMMENT ON FUNCTION public.ruta_evaluar_respuesta(public.ruta_pregunta, JSONB) IS
    'Fuente unica de verdad de la correccion. Nunca lanza excepcion: un error de validacion produce incorrecto.';


-- ============================================================================
--  5) PREVISUALIZACIÓN (lado docente)
--  Movida aquí porque depende del motor: si viviera en la migracion 120100 se
--  crearia antes de que exista ruta_evaluar_respuesta.
-- ============================================================================
CREATE OR REPLACE FUNCTION public.ruta_previsualizar_respuesta(
    p_pregunta_id UUID,
    p_respuesta JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
DECLARE
    v_resultado JSONB;
BEGIN
    IF NOT public.ruta_puede_editar(
        (SELECT a.ruta_id FROM public.ruta_pregunta p
         JOIN public.ruta_actividad a ON a.id = p.actividad_id
         WHERE p.id = p_pregunta_id)
    ) THEN
        RETURN jsonb_build_object('error', 'No tienes permiso sobre esta pregunta');
    END IF;

    SELECT public.ruta_evaluar_respuesta(q, p_respuesta) INTO v_resultado
    FROM public.ruta_pregunta q
    WHERE q.id = p_pregunta_id AND q.activo = TRUE;

    IF NOT FOUND THEN
        RETURN jsonb_build_object('error', 'Pregunta no encontrada');
    END IF;

    RETURN v_resultado;
EXCEPTION
    WHEN OTHERS THEN
        RETURN jsonb_build_object('error', SQLERRM);
END;
$$;


-- ============================================================================
--  6) PERMISOS DEL MOTOR
--
--  PostgreSQL da EXECUTE a PUBLIC en TODAS las funciones nuevas. Eso incluye
--  a `anon`, que es el rol con el que habla el Portal. Si estas funciones
--  quedan abiertas, cualquiera puede preguntar a
--  `ruta_previsualizar_respuesta` si una respuesta es correcta y convertir la
--  ruta en un ejercicio de adivinanza.
--
--  Se revoca a PUBLIC y a anon. Las funciones de la RPC (SECURITY DEFINER)
--  siguen pudiéndolas llamar porque lo hacen con los privilegios del dueno de
--  la funcion, no con los del visitante.
-- ============================================================================

REVOKE ALL ON FUNCTION public.ruta_normalizar_texto(TEXT)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_parsear_numero(TEXT)            FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_tolerancia_efectiva(NUMERIC, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_numeros_equivalentes(NUMERIC, NUMERIC, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_evaluar_expresion(TEXT)         FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_comparar(TEXT, TEXT, TEXT, JSONB) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_valores_esperados(public.ruta_pregunta) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_esperado_espacio(JSONB, INT, INT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_pasos_publicos(JSONB)          FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_evaluar_respuesta(public.ruta_pregunta, JSONB) FROM PUBLIC, anon;

-- La previsualizacion es del docente y ademas valida la duena de la ficha.
REVOKE ALL ON FUNCTION public.ruta_previsualizar_respuesta(UUID, JSONB) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.ruta_previsualizar_respuesta(UUID, JSONB) TO authenticated;
