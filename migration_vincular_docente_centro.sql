-- ==============================================================================
-- Migración: Vinculación Docente a Centro Principal (Auto-curación vía Trigger)
-- ==============================================================================
-- Esta migración resuelve inconsistencias donde un docente puede tener asignado
-- un curso en curso_docentes, pero su perfiles.centro_id permanece en NULL,
-- dejándolo "Sin centro vinculado" en la interfaz principal.
--
-- REGLAS APLICADAS:
-- 1. Si perfiles.centro_id es NULL y el docente queda asociado a un único centro
--    en toda la plataforma, se actualiza perfiles.centro_id con ese centro.
-- 2. Si perfiles.centro_id ya tiene un valor válido, NO se sobrescribe.
-- 3. Si el docente pertenece a varios centros (por estar en cursos de distintos centros)
--    y perfiles.centro_id es NULL, se mantiene en NULL para no elegir uno arbitrariamente.
-- ==============================================================================

CREATE OR REPLACE FUNCTION public.tr_update_perfil_centro_from_curso()
RETURNS TRIGGER AS $$
DECLARE
    v_perfil_centro_id UUID;
    v_curso_centro_id UUID;
    v_total_centros_vinculados INT;
BEGIN
    -- 1. Obtenemos el centro_id actual del perfil (Fuente principal)
    SELECT centro_id INTO v_perfil_centro_id 
    FROM public.perfiles 
    WHERE user_id = NEW.docente_id 
    LIMIT 1;

    -- 2. Si el perfil ya tiene un centro válido, NO sobrescribimos (Regla: Mantener fuente)
    IF v_perfil_centro_id IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- 3. Si el perfil tiene centro_id NULL, obtenemos a qué centro pertenece el curso insertado
    SELECT centro_id INTO v_curso_centro_id 
    FROM public.cursos 
    WHERE id = NEW.curso_id 
    LIMIT 1;

    -- 4. Contamos en cuántos centros distintos está/estará este docente (Regla: Evitar ambigüedad)
    SELECT COUNT(DISTINCT c.centro_id) INTO v_total_centros_vinculados
    FROM (
        -- Todos los cursos a los que ya pertenece actualmente
        SELECT curso_id FROM public.curso_docentes WHERE docente_id = NEW.docente_id
        UNION
        -- Y el nuevo curso al que se está uniendo en este momento
        SELECT NEW.curso_id
    ) as user_cursos
    JOIN public.cursos c ON c.id = user_cursos.curso_id;

    -- 5. Solo actualizamos si queda asociado a un ÚNICO centro
    -- Si v_total_centros_vinculados > 1, no hace nada y mantiene NULL.
    IF v_total_centros_vinculados = 1 AND v_curso_centro_id IS NOT NULL THEN
        UPDATE public.perfiles 
        SET centro_id = v_curso_centro_id 
        WHERE user_id = NEW.docente_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminamos el trigger si ya existe para asegurar idempotencia
DROP TRIGGER IF EXISTS on_curso_docente_inserted ON public.curso_docentes;

-- Creamos el trigger sobre la tabla curso_docentes
CREATE TRIGGER on_curso_docente_inserted
AFTER INSERT OR UPDATE OF curso_id ON public.curso_docentes
FOR EACH ROW
EXECUTE FUNCTION public.tr_update_perfil_centro_from_curso();


-- ==============================================================================
-- ACTUALIZACIÓN RETROACTIVA DE PERFILES EXISTENTES
-- ==============================================================================
-- Aplica la misma regla para reparar perfiles que ya estaban en este estado nulo:
-- Solo actualiza a los docentes que tienen perfiles.centro_id = NULL y
-- que están vinculados a cursos pertenecientes a EXACTAMENTE 1 centro.

UPDATE public.perfiles p
SET centro_id = v.unico_centro_id
FROM (
    SELECT 
        cd.docente_id, 
        (array_agg(c.centro_id))[1] as unico_centro_id
    FROM public.curso_docentes cd
    JOIN public.cursos c ON cd.curso_id = c.id
    GROUP BY cd.docente_id
    HAVING COUNT(DISTINCT c.centro_id) = 1
) v
WHERE p.user_id = v.docente_id
  AND p.centro_id IS NULL;
