-- ═══════════════════════════════════════════════════════════════════
-- CIELO (Evaluación por competencias)
-- DETECCIÓN DE SUSCRIPCIÓN INSTITUCIONAL DE UN CENTRO (solo lectura)
--
-- Motivación: en el formulario de registro, cuando el usuario responde
-- "No, continuar como usuario" y usa el buscador de centros, se debe
-- detectar de forma automática si el centro seleccionado posee una
-- suscripción institucional (para entonces solicitar el código de acceso
-- o no) ANTES de que el usuario tenga sesión.
--
-- Alcance: solo lectura. NO se crean tablas ni se tocan flujos
-- existentes. Reutiliza la tabla `suscripciones`.
--
-- Semántica (definida por el producto):
--   • Un centro "posee suscripción institucional" si existe UNA fila
--     activa en `suscripciones` con tipo = 'institucional' y estado = 'activa'
--     para ese centro.
--   • NO se debe usar el campo `centros.afiliado` para esto.
--   • Los códigos de acceso (codigos_acceso_centro) son consecuencia de la
--     suscripción y NO se usan para determinarla.
-- ═══════════════════════════════════════════════════════════════════

-- La función es SECURITY DEFINER para que consulta a `suscripciones` sin
-- volver a aplicar RLS (que actualmente solo expone filas al usuario
-- autenticado / su centro). Se otorga ejecución a anon para poder
-- consultarla durante el registro (aún sin sesión) y a authenticated.
CREATE OR REPLACE FUNCTION public.centro_tiene_suscripcion_institucional(
    p_centro_id uuid
)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.suscripciones
        WHERE centro_id = p_centro_id
          AND tipo  = 'institucional'
          AND estado = 'activa'
    );
$$;

GRANT EXECUTE ON FUNCTION public.centro_tiene_suscripcion_institucional(uuid) TO anon, authenticated;