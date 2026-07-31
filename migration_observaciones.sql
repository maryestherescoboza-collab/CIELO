-- MIGRACIÓN DE BASE DE DATOS: OBSERVACIONES MÚLTIPLES
-- Ejecuta este script en el editor SQL de Supabase (Dashboard -> SQL Editor)

-- 1. Alterar la columna observaciones en public.curso_detalle para que sea de tipo text[]
-- Maneja de forma segura cualquier dato existente:
-- - Si es null o vacío, lo convierte en un arreglo vacío.
-- - Si es un JSON array de strings (ej. '["Obs 1", "Obs 2"]'), lo convierte a text[].
-- - Si es texto plano, lo convierte en un arreglo de un único elemento.
ALTER TABLE public.curso_detalle 
  ALTER COLUMN observaciones TYPE text[] 
  USING COALESCE(
    CASE 
      WHEN observaciones IS NULL OR observaciones = '' THEN '{}'::text[]
      WHEN observaciones LIKE '[%' THEN 
        ARRAY(
          SELECT jsonb_array_elements_text(observaciones::jsonb)
        )
      ELSE ARRAY[observaciones]
    END, 
    '{}'::text[]
  );

-- 2. Asegurar que las políticas RLS y privilegios sigan aplicados correctamente sobre la tabla curso_detalle
GRANT ALL ON TABLE public.curso_detalle TO authenticated;
GRANT ALL ON TABLE public.curso_detalle TO service_role;
