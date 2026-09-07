-- ============================================================================
-- RLS: Incidencias del centro visibles por el administrador (por centro_id)
-- ----------------------------------------------------------------------------
-- Centro Panel → Incidencias: un usuario con rol director/administrador debe
-- visualizar todas las incidencias registradas en su centro educativo.
--
-- La tabla `incidencias` guarda `centro_id` (el centro del usuario creador).
-- Esta política permite SELECT a un rol administrativo cuando el centro de la
-- incidencia coincide con el centro del que el usuario es director/administrador.
--
-- Seguridad: el administrador del centro A solo recibe incidencias de centro_id = A.
-- Los docentes conservan su comportamiento (políticas "Gestión propia" y
-- "incidencias_select_centro" existentes NO se modifican ni eliminan).
-- ============================================================================

DROP POLICY IF EXISTS "incidencias_select_admin_por_centro_id" ON public.incidencias;

CREATE POLICY "incidencias_select_admin_por_centro_id"
ON public.incidencias
FOR SELECT TO authenticated
USING (
    incidencias.centro_id IN (
        SELECT cr.centro_id
        FROM public.centro_roles cr
        WHERE cr.user_id = auth.uid()
          AND cr.rol IN ('director', 'administrador', 'administrador_centro', 'administrador_global')
    )
);
