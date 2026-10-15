-- Añadir política de DELETE para permitir a los usuarios eliminar sus propias incidencias
CREATE POLICY "delete_own_incidencias"
ON public.incidencias
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);
