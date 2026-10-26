-- Harden RLS for portal tables: prevent direct access by authenticated users
-- SECURITY DEFINER functions will still work

ALTER TABLE public.portal_configuraciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_accesos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portal_sesiones ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_configuraciones;
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_publicaciones;
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_accesos;
DROP POLICY IF EXISTS "Lectura y escritura para autenticados" ON public.portal_sesiones;

-- Deny all direct access to authenticated users; service_role bypasses RLS
CREATE POLICY "Deny direct access to authenticated" ON public.portal_configuraciones FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct access to authenticated" ON public.portal_publicaciones FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct access to authenticated" ON public.portal_accesos FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "Deny direct access to authenticated" ON public.portal_sesiones FOR ALL TO authenticated USING (false) WITH CHECK (false);
