-- =============================================================================
-- Fichas -> Actividad -> Producto -> Portal
-- =============================================================================
-- Este archivo NO crea modulos, tablas ni relaciones nuevas. Reutiliza:
--
--   * public.pc_notas        -> la Ficha
--   * public.actividades     -> la Actividad, con la relacion ya existente
--                                actividades.plan_ficha_id -> pc_notas(id)
--   * public.evidencias      -> las entregas del estudiante
--   * public.ficha_cursos    -> el sharing de la ficha con el curso
--
-- Lo unico que anade es una marca booleana en la actividad que dice "de esta
-- actividad el estudiante tiene que entregar un producto". No se crea ninguna
-- fila en evidencias al activar la marca: la evidencia solo nace cuando el
-- estudiante entrega de verdad, a traves de portal_crear_evidencia.
-- =============================================================================

-- 1) Marca de "esta actividad pide producto al estudiante".
--    Es una columna mas de la tabla que ya existe. Nullable-safe: las
--    actividades actuales quedan en FALSE y el Portal no las muestra.
ALTER TABLE public.actividades
    ADD COLUMN IF NOT EXISTS requiere_producto BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON COLUMN public.actividades.requiere_producto IS
    'Docente activo esta marca: el estudiante debe entregar un producto para esta actividad. La entrega se registra en public.evidencias; aqui no se crea ninguna fila.';

-- 2) La Ficha ahora se consulta por su lado: "que actividades tiene esta
--    ficha". La relacion (actividades.plan_ficha_id) ya existia, lo que faltaba
--    era el indice para no recorrer la tabla entera.
CREATE INDEX IF NOT EXISTS idx_actividades_plan_ficha_id
    ON public.actividades(plan_ficha_id)
    WHERE plan_ficha_id IS NOT NULL;

-- 3) El docente necesita leer y escribir actividades que no son suyas pero
--    whose ficha es suya: la ficha se crea en Plan de clases con el usuario
--    autenticado, y la actividad pudo haberla creado un co-docente del curso.
--    La politica existente "Gestion propia de actividades" solo deja pasar
--    filas con user_id = auth.uid(), asi que se anade una segunda politica que
--    se apoya en la MISMA ficha compartida en vez de crear otro mecanismo.
--    DROP primero: CREATE POLICY no tiene IF NOT EXISTS.
DROP POLICY IF EXISTS "actividades_update_por_ficha_propia" ON public.actividades;

CREATE POLICY "actividades_update_por_ficha_propia"
ON public.actividades
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pc_notas pn
        WHERE pn.id = actividades.plan_ficha_id
          AND pn.usuario_id = auth.uid()
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1
        FROM public.pc_notas pn
        WHERE pn.id = actividades.plan_ficha_id
          AND pn.usuario_id = auth.uid()
    )
);

DROP POLICY IF EXISTS "actividades_select_por_ficha_propia" ON public.actividades;

CREATE POLICY "actividades_select_por_ficha_propia"
ON public.actividades
FOR SELECT
TO authenticated
USING (
    EXISTS (
        SELECT 1
        FROM public.pc_notas pn
        WHERE pn.id = actividades.plan_ficha_id
          AND pn.usuario_id = auth.uid()
    )
);

-- 4) portal_get_ficha_detalle ahora devuelve tambien las actividades
--    vinculadas a la ficha que piden producto, y si el estudiante ya lo
--    entrego. Se sobrescribe la funcion completa: la de
--    20260926050000_fichas_compartidas_portal.sql no admite cambios de firma.
--
--    El estudiante NO recibe una notificacion aparte: la peticion vive dentro
--    de la propia Ficha, que es lo que ya lee en el Portal.
CREATE OR REPLACE FUNCTION public.portal_get_ficha_detalle(p_session_token UUID, p_nota_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_est         public.estudiantes;
    v_compartida  BOOLEAN;
    v_resultado   JSONB;
BEGIN
    v_est := public.evidencia_estudiante_del_portal(p_session_token);
    IF v_est IS NULL THEN
        RETURN jsonb_build_object('error', 'Sesión inválida');
    END IF;

    -- Verificar que la ficha está compartida con este curso o con un
    -- shared_course_id compatible. Mismo criterio que la version anterior.
    SELECT EXISTS (
        SELECT 1
        FROM public.ficha_cursos fc
        JOIN public.cursos c ON c.id = fc.curso_id
        WHERE fc.nota_id = p_nota_id
          AND (
                fc.curso_id = v_est.curso_id
                OR (
                    EXISTS (SELECT 1 FROM public.cursos ce WHERE ce.id = v_est.curso_id AND ce.shared_course_id IS NOT NULL)
                    AND c.shared_course_id = (SELECT ce.shared_course_id FROM public.cursos ce WHERE ce.id = v_est.curso_id)
                )
          )
    ) INTO v_compartida;

    IF NOT v_compartida THEN
        RETURN jsonb_build_object('error', 'Ficha no disponible para este curso');
    END IF;

    SELECT jsonb_build_object(
        'id',            pn.id,
        'titulo',        pn.titulo,
        'contenido_json', pn.contenido_json,
        'actualizado_en', pn.actualizado_en,
        -- Actividades de ESTA ficha que piden producto al estudiante.
        -- Se limita al curso propio del estudiante porque
        -- portal_crear_evidencia solo acepta actividades de ese curso: si
        -- listaramos una de otro curso, el boton de entrega fallaria.
        'actividades', COALESCE((
            SELECT jsonb_agg(
                jsonb_build_object(
                    'actividad_id',   a.id,
                    'actividad',      COALESCE(a.nombre, 'Actividad'),
                    'asignatura',     COALESCE(a.asignatura, c.asignatura),
                    'fecha',          a.fecha,
                    'periodo',        a.periodo,
                    'indicador',      a.indicador,
                    'producto',       a.producto,
                    'requiere_producto', TRUE,
                    'entregado',      (
                                        SELECT COUNT(*) > 0
                                        FROM public.evidencias e
                                        WHERE e.estudiante_id = v_est.id
                                          AND e.actividad_id = a.id
                                    ),
                    'entregas',       (
                                        SELECT COALESCE(jsonb_agg(
                                            jsonb_build_object(
                                                'id',         e.id,
                                                'nombre',     e.nombre,
                                                'origen',     e.origen,
                                                'created_at', e.created_at,
                                                'drive_url',  e.drive_url,
                                                'storage_path', e.storage_path
                                            ) ORDER BY e.created_at DESC
                                        ), '[]'::JSONB)
                                        FROM public.evidencias e
                                        WHERE e.estudiante_id = v_est.id
                                          AND e.actividad_id = a.id
                                    )
                )
                ORDER BY COALESCE(a.fecha, a.created_at::date) DESC NULLS LAST, a.id DESC
            )
            FROM public.actividades a
            JOIN public.cursos c ON c.id = a.curso_id
            WHERE a.plan_ficha_id = p_nota_id
              AND a.curso_id = v_est.curso_id
              AND a.activo IS NOT FALSE
              AND a.requiere_producto IS TRUE
        ), '[]'::JSONB)
    ) INTO v_resultado
    FROM public.pc_notas pn
    WHERE pn.id = p_nota_id;

    RETURN COALESCE(v_resultado, jsonb_build_object('error', 'Ficha no encontrada'));
END;
$$;

REVOKE ALL ON FUNCTION public.portal_get_ficha_detalle(UUID, UUID) FROM PUBLIC, anon;
