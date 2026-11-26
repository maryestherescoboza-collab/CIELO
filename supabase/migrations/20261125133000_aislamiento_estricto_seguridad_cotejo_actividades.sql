-- ==============================================================================
-- MIGRACIÓN DE SEGURIDAD CRÍTICA: AISLAMIENTO ESTRICTO ENTRE USUARIOS
-- Resuelve filtración de listas de cotejo, rúbricas y actividades entre docentes
-- ==============================================================================

-- 1. CURSO_DETALLE (Evaluaciones de cotejo y rúbrica por estudiante/actividad)
DROP POLICY IF EXISTS "select_own_curso_detalle" ON public.curso_detalle;
CREATE POLICY "select_own_curso_detalle" ON public.curso_detalle
FOR SELECT TO public
USING (
  (auth.uid() = user_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.cursos cu
      JOIN public.centro_roles cr ON cr.centro_id = cu.centro_id
      WHERE cu.id = curso_detalle.curso_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
  )
);

DROP POLICY IF EXISTS "co_teacher_insert_curso_detalle" ON public.curso_detalle;
CREATE POLICY "co_teacher_insert_curso_detalle" ON public.curso_detalle
FOR INSERT TO public
WITH CHECK (
  (auth.uid() = user_id)
  AND is_course_teacher(curso_id)
);

DROP POLICY IF EXISTS "co_teacher_update_curso_detalle" ON public.curso_detalle;
CREATE POLICY "co_teacher_update_curso_detalle" ON public.curso_detalle
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 2. EVALUACIONES_COTEJO
DROP POLICY IF EXISTS "select_own_evaluaciones_cotejo" ON public.evaluaciones_cotejo;
CREATE POLICY "select_own_evaluaciones_cotejo" ON public.evaluaciones_cotejo
FOR SELECT TO public
USING (
  (auth.uid() = user_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.cursos cu
      JOIN public.centro_roles cr ON cr.centro_id = cu.centro_id
      WHERE cu.id = evaluaciones_cotejo.curso_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
  )
);

DROP POLICY IF EXISTS "update_own_evaluaciones_cotejo" ON public.evaluaciones_cotejo;
CREATE POLICY "update_own_evaluaciones_cotejo" ON public.evaluaciones_cotejo
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- 3. EVALUACIONES_RUBRICA
DROP POLICY IF EXISTS "select_own_evaluaciones_rubrica" ON public.evaluaciones_rubrica;
CREATE POLICY "select_own_evaluaciones_rubrica" ON public.evaluaciones_rubrica
FOR SELECT TO public
USING (
  (auth.uid() = user_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.cursos cu
      JOIN public.centro_roles cr ON cr.centro_id = cu.centro_id
      WHERE cu.id = evaluaciones_rubrica.curso_id
        AND cr.user_id = auth.uid()
        AND cr.rol IN ('director', 'administrador')
    )
  )
);

-- 4. ACTIVIDADES (Aislamiento estricto por docente propietario)
DROP POLICY IF EXISTS "select_own_actividades" ON public.actividades;
CREATE POLICY "select_own_actividades" ON public.actividades
FOR SELECT TO public
USING (
  (auth.uid() = user_id)
  OR (
    EXISTS (
      SELECT 1 FROM public.pc_notas pn
      WHERE pn.id = actividades.plan_ficha_id
        AND pn.usuario_id = auth.uid()
    )
  )
);

DROP POLICY IF EXISTS "co_teacher_update_actividades" ON public.actividades;
CREATE POLICY "co_teacher_update_actividades" ON public.actividades
FOR UPDATE TO public
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "co_teacher_delete_actividades" ON public.actividades;
CREATE POLICY "co_teacher_delete_actividades" ON public.actividades
FOR DELETE TO public
USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "co_teacher_insert_actividades" ON public.actividades;
CREATE POLICY "co_teacher_insert_actividades" ON public.actividades
FOR INSERT TO public
WITH CHECK (
  (auth.uid() = user_id)
  AND is_course_teacher(curso_id)
);
