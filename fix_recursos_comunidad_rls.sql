-- ============================================================================
-- fix_recursos_comunidad_rls.sql
-- ============================================================================
-- Corrección definitiva del sistema de recursos compartidos en Comunidad.
--
-- REGLA DE NEGOCIO:
--   user_id en las tablas de recursos = CREADOR del recurso (no propietario
--   exclusivo). Un recurso publicado en Comunidad debe poder ser LEÍDO por
--   cualquier docente autenticado y COPIADO para el usuario actual.
--
-- PERMISOS ESPERADOS:
--   INSERT  -> solo el creador (user_id = auth.uid()).
--   SELECT  -> el creador, o cualquier autenticado si el recurso está
--              asociado a un post público vigente de Comunidad.
--   UPDATE  -> solo el creador.
--   DELETE  -> solo el creador.
--
-- Con esto se elimina el bloqueo causado por políticas que usaban
-- `auth.uid() = user_id` como condición general de lectura.
--
-- EJECUTAR EN: Supabase Dashboard -> SQL Editor
-- ============================================================================


-- ============================================================================
-- RAMPA DE AUDITORÍA: estado previo de las políticas (para referencia)
-- ============================================================================
-- observación <- output del editor:
-- * public.plantillas           : "Gestión propia de plantillas"     (FOR ALL owner)  <- BLOQUEABA lectura de cotejos compartidos
--                                 "Lectura pública plantillas compartidas" (SELECT solo rúbricas en posts)
-- * public.descriptores_rubrica : "Gestión propia descriptores_rubrica" (FOR ALL owner)
-- * public.criterios_cotejo     : "Gestión propia criterios_cotejo"   (FOR ALL owner)  <- BLOQUEABA lectura compartida
-- * public.secuencias           : "Gestión propia de secuencias"      (FOR ALL owner)  <- BLOQUEABA planificaciones compartidas
-- * public.niveles_puntaje      : "Gestión propia niveles_puntaje"    (FOR ALL owner)
-- * public.posts                : "Los_public_posts" (SELECT true)   <- OK (lectura pública)


-- ----------------------------------------------------------------------------
-- 1) PLANTILLAS (rúbricas y cotejos)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura pública plantillas compartidas" ON public.plantillas;
DROP POLICY IF EXISTS "Lectura plantillas select" ON public.plantillas;
DROP POLICY IF EXISTS "Gestión propia plantillas" ON public.plantillas;
DROP POLICY IF EXISTS "select_own_plantillas" ON public.plantillas;
DROP POLICY IF EXISTS "insert_own_plantillas" ON public.plantillas;
DROP POLICY IF EXISTS "update_own_plantillas" ON public.plantillas;
DROP POLICY IF EXISTS "delete_own_plantillas" ON public.plantillas;
DROP POLICY IF EXISTS "plantillas_select" ON public.plantillas;
DROP POLICY IF EXISTS "plantillas_insert" ON public.plantillas;
DROP POLICY IF EXISTS "plantillas_update" ON public.plantillas;
DROP POLICY IF EXISTS "plantillas_delete" ON public.plantillas;

CREATE POLICY "plantillas_lectura_comunidad"
  ON public.plantillas
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recurso_id = public.plantillas.id
        AND p.tipo IN ('rubrica', 'cotejo')
        AND (p.expires_at IS NULL OR p.expires_at > now())
    )
  );

CREATE POLICY "plantillas_crear"
  ON public.plantillas
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plantillas_modificar_propias"
  ON public.plantillas
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "plantillas_eliminar_propias"
  ON public.plantillas
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 2) public.descriptores_rubrica
--    Se permite lectura si su plantilla (plantilla_id) está en un post vigente.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Lectura pública descriptores compartidos" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "Gestión propia descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "select_own_descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "insert_own_descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "update_own_descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "delete_own_descriptores_rubrica" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "descriptores_rubrica_select" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "descriptores_rubrica_insert" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "descriptores_rubrica_update" ON public.descriptores_rubrica;
DROP POLICY IF EXISTS "descriptores_rubrica_delete" ON public.descriptores_rubrica;

CREATE POLICY "descriptores_lectura_comunidad"
  ON public.descriptores_rubrica
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recurso_id = public.descriptores_rubrica.plantilla_id
        AND p.tipo = 'rubrica'
        AND (p.expires_at IS NULL OR p.expires_at > now())
    )
  );

CREATE POLICY "descriptores_crear"
  ON public.descriptores_rubrica
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "descriptores_modificar_propios"
  ON public.descriptores_rubrica
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "descriptores_eliminar_propios"
  ON public.descriptores_rubrica
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 3) public.criterios_cotejo
--    Los criterios de un cotejo se publican a través de la plantilla del cotejo
--    (tipo = 'cotejo'), cuyos datos referencian los ids de estos criterios.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gestión propia criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "select_own_criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "insert_own_criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "update_own_criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "delete_own_criterios_cotejo" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "criterios_cotejo_select" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "criterios_cotejo_insert" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "criterios_cotejo_update" ON public.criterios_cotejo;
DROP POLICY IF EXISTS "criterios_cotejo_delete" ON public.criterios_cotejo;

CREATE POLICY "criterios_cotejo_lectura_comunidad"
  ON public.criterios_cotejo
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1
      FROM public.posts p
      JOIN public.plantillas pl ON pl.id = p.recurso_id
      WHERE p.tipo = 'cotejo'
        AND (p.expires_at IS NULL OR p.expires_at > now())
        AND pl.datos->'criterios' @> jsonb_build_array(
              jsonb_build_object('id', public.criterios_cotejo.id)
            )
    )
  );

CREATE POLICY "criterios_cotejo_crear"
  ON public.criterios_cotejo
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "criterios_cotejo_modificar_propios"
  ON public.criterios_cotejo
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "criterios_cotejo_eliminar_propios"
  ON public.criterios_cotejo
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 4) public.secuencias  (planificaciones / secuencias didácticas)
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Users can manage their own secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "Gestión propia de secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "select_own_secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "insert_own_secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "update_own_secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "delete_own_secuencias" ON public.secuencias;
DROP POLICY IF EXISTS "secuencias_select" ON public.secuencias;
DROP POLICY IF EXISTS "secuencias_insert" ON public.secuencias;
DROP POLICY IF EXISTS "secuencias_update" ON public.secuencias;
DROP POLICY IF EXISTS "secuencias_delete" ON public.secuencias;

CREATE POLICY "secuencias_lectura_comunidad"
  ON public.secuencias
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.posts p
      WHERE p.recurso_id = public.secuencias.id
        AND p.tipo = 'secuencia'
        AND (p.expires_at IS NULL OR p.expires_at > now())
    )
  );

CREATE POLICY "secuencias_crear"
  ON public.secuencias
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secuencias_modificar_propias"
  ON public.secuencias
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "secuencias_eliminar_propias"
  ON public.secuencias
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- 5) public.niveles_puntaje
--    Configuración de niveles (Estratégico/Autónomo/Resolutivo/Receptivo).
--    Es configuración de referencia, sin datos sensibles; lectura pública para
--    autenticados. Escritura solo para quién la gestiona.
-- ----------------------------------------------------------------------------
DROP POLICY IF EXISTS "Gestión propia niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "Public read for authenticated users" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "select_own_niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "insert_own_niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "update_own_niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "delete_own_niveles_puntaje" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "niveles_puntaje_select" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "niveles_puntaje_insert" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "niveles_puntaje_update" ON public.niveles_puntaje;
DROP POLICY IF EXISTS "niveles_puntaje_delete" ON public.niveles_puntaje;

CREATE POLICY "niveles_puntaje_lectura_comunidad"
  ON public.niveles_puntaje
  FOR SELECT TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Gestión propia niveles_puntaje_nuevo" ON public.niveles_puntaje;
CREATE POLICY "niveles_puntaje_crear"
  ON public.niveles_puntaje
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "niveles_puntaje_modificar_propios"
  ON public.niveles_puntaje
  FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "niveles_puntaje_eliminar_propios"
  ON public.niveles_puntaje
  FOR DELETE TO authenticated
  USING (auth.uid() = user_id);


-- ----------------------------------------------------------------------------
-- FIN. Resumen de permisos resultantes (matriz):
--   Tabla                 | SELECT compartido | INSERT | UPDATE | DELETE
--   plantillas            | dueño O en post   | dueño  | dueño  | dueño
--   descriptores_rubrica  | dueño O en post   | dueño  | dueño  | dueño
--   criterios_cotejo      | dueño O en post   | dueño  | dueño  | dueño
--   secuencias            | dueño O en post   | dueño  | dueño  | dueño
--   niveles_puntaje       | público(autent.)  | dueño  | dueño  | dueño
-- ----------------------------------------------------------------------------