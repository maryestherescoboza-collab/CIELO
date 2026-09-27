-- ============================================================================
--  RUTAS DE APRENDIZAJE — ESTRUCTURA
--  Migración: 20260926120000
--
--  Contexto verificado antes de escribir:
--   - Una "Ficha" en CIELO es una fila de public.pc_notas (UUID, contenido_json).
--   - La visibilidad de una ficha en el Portal se rige por public.ficha_cursos
--     (nota_id, curso_id) — se REUTILIZA, no se duplica.
--   - El estudiante del Portal NO tiene sesión auth.users: entra por
--     portal_accesos.access_token -> portal_sesiones.session_token.
--     Por eso el progreso NO puede apoyarse en auth.uid(): vive detrás de RPC
--     SECURITY DEFINER que validan p_session_token (mismo patrón que las 13
--     RPC portal_* existentes en 20260926050000_fichas_compartidas_portal.sql).
--   - No se tocan actividades.indicador (TEXT) ni las competencias BC1..BC4
--     (constantes TS). No se duplica información curricular.
--
--  Principios de seguridad aplicados:
--   1. RLS habilitada en las 8 tablas.
--   2. Contenido autoral (ruta/etapa/actividad/pregunta/opcion): solo el docente
--      dueño de la ficha, verificado contra pc_notas.usuario_id = auth.uid().
--   3. Evidencia del estudiante (intento/intento_espacio/progreso): SIN política
--      para `authenticated`. No es un descuido: son el dato más sensible del
--      sistema y solo escriben/leen las RPC que validan la sesión del Portal.
--      Esto es estrictamente mas fuerte que una politica USING (true).
--   4. Lectura docente del progreso: permitida solo si la ruta pertenece a una
--      ficha suya Y esa ficha está compartida con el curso del estudiante.
-- ============================================================================


-- ────────────────────────────────────────────────────────────────────────────
-- 0) Índice de apoyo para las políticas de ownership
--    (las políticas de ficha_cursos ya hacen EXISTS(...) sobre pc_notas
--     por fila; sin índice es un seq scan por registro evaluado)
-- ────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_pc_notas_usuario_id
    ON public.pc_notas (usuario_id);


-- ────────────────────────────────────────────────────────────────────────────
-- 1) Helpers de autorización
-- ────────────────────────────────────────────────────────────────────────────

-- ¿El usuario autenticado actual es dueño de esta ficha?
CREATE OR REPLACE FUNCTION public.ruta_es_dueno_ficha(p_nota_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.pc_notas pn
        WHERE pn.id = p_nota_id
          AND pn.usuario_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.ruta_es_dueno_ficha(UUID) IS
    'Owner check for Rutas de Aprendizaje. El dueño de la ruta es el dueño de la Ficha (pc_notas.usuario_id).';

-- ¿La ficha está compartida con el curso al que pertenece este estudiante?
--
-- Réplica exacta de la regla de portal_get_ficha_detalle
-- (20260926050000_fichas_compartidas_portal.sql): la ficha puede estar
-- compartida con el curso propio del estudiante O con un curso que comparte el
-- mismo shared_course_id.
--
-- OJO con el JOIN: si se encadena "ficha_cursos.curso_id = estudiante.curso_id"
-- el filtro se vuelve obligatorio y la rama de shared_course_id nunca puede
-- cumplirse, que es justo el caso que existe para los cursos espejo. Por eso
-- la regla se escribe como un OR sobre una sola fila de estudiante.
CREATE OR REPLACE FUNCTION public.ruta_ficha_compartida_con_estudiante(
    p_nota_id UUID,
    p_estudiante_id BIGINT
)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    WITH estudiante AS (
        SELECT e.curso_id, e.shared_course_id
        FROM public.estudiantes e
        WHERE e.id = p_estudiante_id
    )
    SELECT EXISTS (
        SELECT 1
        FROM public.ficha_cursos fc
        JOIN public.cursos c ON c.id = fc.curso_id
        CROSS JOIN estudiante est
        WHERE fc.nota_id = p_nota_id
          AND (
                fc.curso_id = est.curso_id
             OR (est.shared_course_id IS NOT NULL
                 AND c.shared_course_id IS NOT NULL
                 AND c.shared_course_id = est.shared_course_id)
          )
    );
$$;

COMMENT ON FUNCTION public.ruta_ficha_compartida_con_estudiante(UUID, BIGINT) IS
    'Reusa la misma regla de comparticion que portal_get_ficha_detalle (ficha_cursos + shared_course_id).';


-- ────────────────────────────────────────────────────────────────────────────
-- 2) RUTA — pertenece a una Ficha
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_aprendizaje (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nota_id             UUID NOT NULL REFERENCES public.pc_notas(id) ON DELETE CASCADE,
    usuario_id          UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

    titulo              TEXT NOT NULL,
    descripcion         TEXT,

    -- 'borrador' | 'publicada' | 'archivada'
    estado              TEXT NOT NULL DEFAULT 'borrador'
                        CHECK (estado IN ('borrador', 'publicada', 'archivada')),

    -- v1: {"modo":"secuencial"}.
    -- Arquitectura lista para: {"modo":"secuencial"|"abierta"|"porcentaje",
    --   "porcentaje":70, "requisitos":{"actividadIds":[...]}}
    regla_desbloqueo    JSONB NOT NULL DEFAULT '{"modo":"secuencial"}'::JSONB,

    creado_en           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    actualizado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruta_aprendizaje_nota_id
    ON public.ruta_aprendizaje (nota_id);
CREATE INDEX IF NOT EXISTS idx_ruta_aprendizaje_usuario_id
    ON public.ruta_aprendizaje (usuario_id);
CREATE INDEX IF NOT EXISTS idx_ruta_aprendizaje_nota_estado
    ON public.ruta_aprendizaje (nota_id, estado);

COMMENT ON TABLE public.ruta_aprendizaje IS
    'Ruta de aprendizaje interactiva asociada a una Ficha (pc_notas). Reemplaza a "estado" como fuente de verdad del contenido de la ruta.';


-- ────────────────────────────────────────────────────────────────────────────
-- 3) ETAPA — ordenada; el orden define la progresión de desbloqueo
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_etapa (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ruta_id     UUID NOT NULL REFERENCES public.ruta_aprendizaje(id) ON DELETE CASCADE,
    titulo      TEXT NOT NULL,
    descripcion TEXT,
    orden       INTEGER NOT NULL DEFAULT 0,
    creado_en   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruta_etapa_ruta_orden
    ON public.ruta_etapa (ruta_id, orden);

COMMENT ON TABLE public.ruta_etapa IS
    'Etapa de la ruta. El desbloqueo secuencial usa (ruta_id, orden).';


-- ────────────────────────────────────────────────────────────────────────────
-- 4) ACTIVIDAD INTERACTIVA
--    ruta_id se denormaliza a proposito: permite validar ownership y consultar
--    progreso con un solo indice, sin recorrer etapa->ruta en cada fila.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_actividad (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    etapa_id       UUID NOT NULL REFERENCES public.ruta_etapa(id) ON DELETE CASCADE,
    ruta_id        UUID NOT NULL REFERENCES public.ruta_aprendizaje(id) ON DELETE CASCADE,

    -- Catalogo abierto: agregar un tipo nuevo NO requiere ALTER TABLE.
    tipo           TEXT NOT NULL CHECK (tipo IN (
                       'opcion_multiple',
                       'verdadero_falso',
                       'completar',
                       'respuesta_numerica',
                       'respuesta_escrita',
                       'ordenar_pasos',
                       'relacionar',
                       'procedimiento_matematico'
                   )),

    titulo             TEXT,
    instrucciones      TEXT,
    orden              INTEGER NOT NULL DEFAULT 0,

    -- Configuracion especifica del tipo de actividad.
    -- Procedimiento matematico: {"datos":["b = 2","c = 3"],
    --                            "toleranciaAbs":0.001,"toleranciaRel":0.001}
    -- Respuesta numerica:    {"toleranciaAbs":0.01,"toleranciaRel":0.01,"unidad":"cm"}
    config           JSONB NOT NULL DEFAULT '{}'::JSONB,

    -- Preparado para requisitos por porcentaje / actividades obligatorias.
    obligatorio      BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruta_actividad_etapa_orden
    ON public.ruta_actividad (etapa_id, orden);
CREATE INDEX IF NOT EXISTS idx_ruta_actividad_ruta
    ON public.ruta_actividad (ruta_id);

COMMENT ON COLUMN public.ruta_actividad.config IS
    'JSONB porque es configuracion heterogenea por tipo. La entidad sigue siendo relacional y consultable.';


-- ────────────────────────────────────────────────────────────────────────────
-- 5) PREGUNTA
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_pregunta (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actividad_id   UUID NOT NULL REFERENCES public.ruta_actividad(id) ON DELETE CASCADE,
    orden          INTEGER NOT NULL DEFAULT 0,
    enunciado      TEXT NOT NULL,

    -- Dominio de la RESPUESTA, separado del dominio del TEXTO (§5 del diseño).
    tipo_respuesta TEXT NOT NULL CHECK (tipo_respuesta IN (
                       'textual',
                       'numerica',
                       'expresion',
                       'booleana',
                       'ordenada'
                   )),

    -- config: JSONB porque la forma depende del dominio y del tipo de
    -- actividad. Es la ÚNICA parte del modelo que no es relacional, y es
    -- deliberado: son parámetros, no entidades.
    --
    --   respuestaEsperada     TEXT   respuesta principal
    --   respuestasAceptadas  TEXT[] alternativas declaradas por el docente
    --   toleranciaAbs         NUM    respuesta numérica: 5 == 5.0 == 5,00
    --   toleranciaRel         NUM    tolerancia proporcional al valor esperado
    --
    --   ── Solo en procedimiento_matematico ──
    --   pasos: [
    --     { "texto": "a^2 = [ ]^2 - [ ]^2",
    --       "espacios": [ {"respuesta":"3"}, {"respuesta":"2"} ] },
    --     { "texto": "a^2 = [ ] - [ ]",
    --       "espacios": [ {"respuesta":"9"}, {"respuesta":"4"} ] }
    --   ]
    --   El estudiante envía {espacios:[{paso,espacio,valor}]}. El motor resuelve
    --   cada esperado desde config.pasos con ruta_esperado_espacio(): el cliente
    --   nunca dice cuál es la respuesta correcta.
    --
    --   ── Generador de variantes (§6), preparado, no implementado ──
    --   variables: [ {"clave":"b","valor":2,"min":2,"max":20,"paso":1} ]
    --   instancia:  [ {"clave":"b","valor":5} ]   (la que se concretó en el intento)
    config         JSONB NOT NULL DEFAULT '{}'::JSONB,

    pista               TEXT,
    retroalimentacion_ok    TEXT,
    retroalimentacion_error TEXT,

    peso           NUMERIC(6,3) NOT NULL DEFAULT 1.0,

    -- Soft delete. Cuando el docente edita el contenido de una actividad NO se
    -- borran fisicamente las preguntas: se desactivan las que se quitaron y se
    -- reutilizan las que siguen en la misma posicion. Motivo: ruta_intento y
    -- ruta_intento_espacio apuntan aqui, y son evidencia pedagogica que un
    -- simple ajuste de redaccion no debe destruir.
    activo         BOOLEAN NOT NULL DEFAULT TRUE,

    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruta_pregunta_actividad_orden
    ON public.ruta_pregunta (actividad_id, orden) WHERE activo = TRUE;


-- ────────────────────────────────────────────────────────────────────────────
-- 6) OPCION
--    Sirve para: opcion_multiple (es_correcta), verdadero_falso (booleana),
--    ordenar_pasos (valor = posicion esperada), relacionar (clave/valor).
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_opcion (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pregunta_id UUID NOT NULL REFERENCES public.ruta_pregunta(id) ON DELETE CASCADE,
    texto       TEXT NOT NULL,
    orden       INTEGER NOT NULL DEFAULT 0,
    es_correcta BOOLEAN NOT NULL DEFAULT FALSE,
    -- Para ordenar_pasos / relacionar
    clave       TEXT,
    valor       TEXT
);

CREATE INDEX IF NOT EXISTS idx_ruta_opcion_pregunta_orden
    ON public.ruta_opcion (pregunta_id, orden);


-- ────────────────────────────────────────────────────────────────────────────
-- 7) INTENTO — append-only, una fila por (estudiante, pregunta, n° de intento)
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_intento (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id  BIGINT NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,

    -- Desnormalizado a proposito: permite-analizar dificultad por etapa/indicador
    -- sin recorrer 4 joins, y validar pertenencia en una sola consulta.
    ruta_id        UUID NOT NULL REFERENCES public.ruta_aprendizaje(id) ON DELETE CASCADE,
    etapa_id       UUID NOT NULL REFERENCES public.ruta_etapa(id) ON DELETE CASCADE,
    actividad_id   UUID NOT NULL REFERENCES public.ruta_actividad(id) ON DELETE CASCADE,
    pregunta_id    UUID NOT NULL REFERENCES public.ruta_pregunta(id) ON DELETE CASCADE,

    numero_orden   INTEGER NOT NULL,

    correcto       BOOLEAN NOT NULL,
    puntaje        NUMERIC(6,3) NOT NULL DEFAULT 0,

    -- Respuesta cruda enviada por el estudiante (jsonb: heterogenea por tipo).
    respuesta      JSONB,
    -- Valores concretos de las variables de la instancia resuelta (§6).
    instancia      JSONB,

    duracion_segundos INTEGER,
    creado_en      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ruta_intento_estudiante
    ON public.ruta_intento (estudiante_id, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ruta_intento_actividad
    ON public.ruta_intento (actividad_id, estudiante_id);
CREATE INDEX IF NOT EXISTS idx_ruta_intento_pregunta
    ON public.ruta_intento (pregunta_id, correcto);
CREATE INDEX IF NOT EXISTS idx_ruta_intento_ruta_etapa
    ON public.ruta_intento (ruta_id, etapa_id);

COMMENT ON TABLE public.ruta_intento IS
    'Historial append-only de intentos. Nunca se actualiza: permite recalcular metricas a futuro sin perder trazabilidad.';


-- ────────────────────────────────────────────────────────────────────────────
-- 8) RESPUESTA POR ESPACIO — procedimiento matemático (§4 y §10)
--    Permite saber exactamente qué espacio falló, no solo el resultado final.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_intento_espacio (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    intento_id        UUID NOT NULL REFERENCES public.ruta_intento(id) ON DELETE CASCADE,
    pregunta_id       UUID NOT NULL REFERENCES public.ruta_pregunta(id) ON DELETE CASCADE,

    paso              INTEGER NOT NULL,
    espacio           INTEGER NOT NULL,

    valor_ingresado   TEXT,
    valor_esperado    TEXT,
    correcto          BOOLEAN NOT NULL DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_ruta_intento_espacio_intento
    ON public.ruta_intento_espacio (intento_id, paso, espacio);
CREATE INDEX IF NOT EXISTS idx_ruta_intento_espacio_pregunta
    ON public.ruta_intento_espacio (pregunta_id, correcto);

COMMENT ON TABLE public.ruta_intento_espacio IS
    'Diagnostico granular: paso x espacio. Base para "en qué paso se equivoca el estudiante".';


-- ────────────────────────────────────────────────────────────────────────────
-- 9) PROGRESO — 1 fila por (estudiante, actividad)
--    El progreso de etapa y de ruta se DERIVA por agregacion: una sola fuente
--    de verdad, sin riesgo de desincronización.
-- ────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ruta_progreso (
    id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    estudiante_id  BIGINT NOT NULL REFERENCES public.estudiantes(id) ON DELETE CASCADE,

    ruta_id        UUID NOT NULL REFERENCES public.ruta_aprendizaje(id) ON DELETE CASCADE,
    etapa_id       UUID NOT NULL REFERENCES public.ruta_etapa(id) ON DELETE CASCADE,
    actividad_id   UUID NOT NULL REFERENCES public.ruta_actividad(id) ON DELETE CASCADE,

    -- 'no_iniciada' | 'en_curso' | 'completada'
    estado         TEXT NOT NULL DEFAULT 'no_iniciada'
                   CHECK (estado IN ('no_iniciada', 'en_curso', 'completada')),
    intentos       INTEGER NOT NULL DEFAULT 0,
    puntaje        NUMERIC(6,3) NOT NULL DEFAULT 0,

    primer_intento_en TIMESTAMPTZ,
    completado_en     TIMESTAMPTZ,
    actualizado_en    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT ruta_progreso_unico UNIQUE (estudiante_id, actividad_id)
);

CREATE INDEX IF NOT EXISTS idx_ruta_progreso_estudiante_ruta
    ON public.ruta_progreso (estudiante_id, ruta_id);
CREATE INDEX IF NOT EXISTS idx_ruta_progreso_etapa
    ON public.ruta_progreso (etapa_id, estado);


-- ────────────────────────────────────────────────────────────────────────────
-- 10) Helper de ownership POR RUTA (va aquí, no arriba)
--
-- OJO: una función LANGUAGE sql valida sus tablas en el momento del CREATE, no
-- en la primera llamada. Por eso ruta_puede_editar NO puede definirse antes de
-- que exista public.ruta_aprendizaje: el CREATE falla con
-- 42P01 "relation does not exist" y aborta toda la migración.
--
-- Se resuelve en UNA sola funcion (SECURITY DEFINER) para que las politicas de
-- etapa/actividad/pregunta/opcion no tengan que consultar rutas_aprendizaje
-- desde dentro de otra politica: evita depender del RLS de otra tabla y evita
-- que el planificador reevalue la cadena en cada fila.
-- ────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.ruta_puede_editar(p_ruta_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.ruta_aprendizaje r
        JOIN public.pc_notas pn ON pn.id = r.nota_id
        WHERE r.id = p_ruta_id
          AND pn.usuario_id = auth.uid()
    );
$$;

COMMENT ON FUNCTION public.ruta_puede_editar(UUID) IS
    'Owner check por ruta. Evita anidar RLS entre tablas de rutas.';


-- ============================================================================
--  ROW LEVEL SECURITY
-- ============================================================================

ALTER TABLE public.ruta_aprendizaje    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_etapa          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_actividad      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_pregunta       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_opcion         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_intento        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_intento_espacio ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ruta_progreso       ENABLE ROW LEVEL SECURITY;


-- ── Contenido autoral: solo el docente dueño de la ficha ────────────────────
-- Misma regla que ficha_cursos y ficha_comentarios, pero reutilizando el helper
-- para no repetir el EXISTS(...) en 5 políticas.

DROP POLICY IF EXISTS "Rutas: docente dueño de la ficha" ON public.ruta_aprendizaje;
CREATE POLICY "Rutas: docente dueño de la ficha"
    ON public.ruta_aprendizaje
    FOR ALL
    TO authenticated
    USING (public.ruta_es_dueno_ficha(nota_id))
    WITH CHECK (public.ruta_es_dueno_ficha(nota_id));

DROP POLICY IF EXISTS "Rutas: etapas del docente" ON public.ruta_etapa;
CREATE POLICY "Rutas: etapas del docente"
    ON public.ruta_etapa
    FOR ALL
    TO authenticated
    USING (public.ruta_puede_editar(ruta_id))
    WITH CHECK (public.ruta_puede_editar(ruta_id));

DROP POLICY IF EXISTS "Rutas: actividades del docente" ON public.ruta_actividad;
CREATE POLICY "Rutas: actividades del docente"
    ON public.ruta_actividad
    FOR ALL
    TO authenticated
    USING (public.ruta_puede_editar(ruta_id))
    WITH CHECK (public.ruta_puede_editar(ruta_id));

DROP POLICY IF EXISTS "Rutas: preguntas del docente" ON public.ruta_pregunta;
CREATE POLICY "Rutas: preguntas del docente"
    ON public.ruta_pregunta
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1 FROM public.ruta_actividad a
        WHERE a.id = ruta_pregunta.actividad_id
          AND public.ruta_puede_editar(a.ruta_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1 FROM public.ruta_actividad a
        WHERE a.id = ruta_pregunta.actividad_id
          AND public.ruta_puede_editar(a.ruta_id)
    ));

DROP POLICY IF EXISTS "Rutas: opciones del docente" ON public.ruta_opcion;
CREATE POLICY "Rutas: opciones del docente"
    ON public.ruta_opcion
    FOR ALL
    TO authenticated
    USING (EXISTS (
        SELECT 1
        FROM public.ruta_pregunta p
        JOIN public.ruta_actividad a ON a.id = p.actividad_id
        WHERE p.id = ruta_opcion.pregunta_id
          AND public.ruta_puede_editar(a.ruta_id)
    ))
    WITH CHECK (EXISTS (
        SELECT 1
        FROM public.ruta_pregunta p
        JOIN public.ruta_actividad a ON a.id = p.actividad_id
        WHERE p.id = ruta_opcion.pregunta_id
          AND public.ruta_puede_editar(a.ruta_id)
    ));


-- ── Evidencia del estudiante: SIN políticas de escritura para authenticated ──
-- ruta_intento / ruta_intento_espacio / ruta_progreso se dejan intencionalmente
-- sin INSERT/UPDATE/DELETE por policy. Con RLS activa y sin policy, el acceso
-- directo via PostgREST queda cerrado: la unica via es la RPC del Portal, que
-- valida p_session_token y escribe como SECURITY DEFINER.
--
-- NO es una tabla inaccesible: se leen y escriben desde
-- public.portal_ruta_registrar_intento (ver 20260926120200).


-- ── Lectura docente del progreso: analitica (§10 y §16) ─────────────────────
-- El docente puede ver el progreso e intentos de los estudiantes de los cursos
-- con los que COMPARTIO la ficha. No puede ver progreso de otros estudiantes.

DROP POLICY IF EXISTS "Rutas: docente lee progreso de sus cursos" ON public.ruta_progreso;
CREATE POLICY "Rutas: docente lee progreso de sus cursos"
    ON public.ruta_progreso
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.ruta_aprendizaje r
            WHERE r.id = ruta_progreso.ruta_id
              AND public.ruta_es_dueno_ficha(r.nota_id)
              AND public.ruta_ficha_compartida_con_estudiante(r.nota_id, ruta_progreso.estudiante_id)
        )
    );

DROP POLICY IF EXISTS "Rutas: docente lee intentos de sus cursos" ON public.ruta_intento;
CREATE POLICY "Rutas: docente lee intentos de sus cursos"
    ON public.ruta_intento
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.ruta_aprendizaje r
            WHERE r.id = ruta_intento.ruta_id
              AND public.ruta_es_dueno_ficha(r.nota_id)
              AND public.ruta_ficha_compartida_con_estudiante(r.nota_id, ruta_intento.estudiante_id)
        )
    );

DROP POLICY IF EXISTS "Rutas: docente lee espacios de sus cursos" ON public.ruta_intento_espacio;
CREATE POLICY "Rutas: docente lee espacios de sus cursos"
    ON public.ruta_intento_espacio
    FOR SELECT
    TO authenticated
    USING (
        EXISTS (
            SELECT 1
            FROM public.ruta_intento i
            JOIN public.ruta_aprendizaje r ON r.id = i.ruta_id
            WHERE i.id = ruta_intento_espacio.intento_id
              AND public.ruta_es_dueno_ficha(r.nota_id)
              AND public.ruta_ficha_compartida_con_estudiante(r.nota_id, i.estudiante_id)
        )
    );


-- ── Permisos EXECUTE: solo lo mínimo ────────────────────────────────────────
-- fix_db_permissions.sql hizo GRANT ALL ... TO anon. Estas funciones no deben
-- ser invocables por anon. Se revoca el acceso público y se concede solo a
-- authenticated (docentes). El Portal no necesita EXECUTE en estos helpers.
REVOKE ALL ON FUNCTION public.ruta_es_dueno_ficha(UUID) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_ficha_compartida_con_estudiante(UUID, BIGINT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.ruta_puede_editar(UUID) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.ruta_es_dueno_ficha(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_ficha_compartida_con_estudiante(UUID, BIGINT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ruta_puede_editar(UUID) TO authenticated;
