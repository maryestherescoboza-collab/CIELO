-- ============================================================================
--  PROCEDIMIENTO MATEMATICO ESTRUCTURADO — rompecabezas por paso
-- ============================================================================
--
--  QUE CAMBIA Y POR QUE
--  ---------------------
--  El Item "Procedimiento matematico" ya existia y se calificaba hueco por
--  hueco contra la respuesta esperada del docente (`ruta_esperado_espacio` +
--  `ruta_comparar`). Eso NO se toca: sigue siendo la correccion, y es
--  matematica y no de texto (3 = 3,0 = 3,00; con tipo 'expresion', 1/2 = 0,5).
--
--  Lo que se agrega es la capa de ROMPECABEZAS:
--    · el docente elige una plantilla de la biblioteca de formulas y CIELO arma
--      la estructura de los pasos, sin resolverlos;
--    · cada paso declara las PIEZAS controladas que el estudiante puede usar
--      (digitos, operadores, parentesis, potencias, raiz);
--    · el Portal pinta un teclado por hueco en vez de un campo de texto libre.
--
--  `piezas` y `pista` viven DENTRO de `config.pasos` porque son datos del
--  ejercicio, no estructura de base de datos: no entra ninguna tabla ni columna
--  nueva.
--
--  LA RESPUESTA CORRECTA NO SE MUEVE
--  ---------------------------------
--  `ruta_pasos_publicos` proyecta campo por campo. Sigue sin salir `respuesta`:
--  las piezas son los pedazos disponibles, no el valor. Anadir un campo nuevo al
--  config del docente NO lo expone automaticamente, que es justo la garantia que
--  se quiere.
--
--  Los items viejos siguen funcionando: un paso sin `piezas` cae a texto libre,
--  que es exactamente lo queaban viendo sus estudiantes.
-- ============================================================================


-- ----------------------------------------------------------------------------
--  1) VERSION PUBLICA DEL PROCEDIMIENTO
--     Texto, cantidad de huecos, piezas disponibles y pistas. Nunca respuestas.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.ruta_pasos_publicos(p_config JSONB)
RETURNS JSONB
LANGUAGE sql
STABLE
SET search_path = public
AS $$
    SELECT COALESCE(
        (
            SELECT jsonb_agg(
                jsonb_build_object(
                    'texto',    COALESCE(pa.paso->>'texto', ''),
                    'espacios', COALESCE(jsonb_array_length(pa.paso->'espacios'), 0),
                    'piezas',   COALESCE(pa.paso->'piezas', '[]'::JSONB),
                    'espaciosPublicos', COALESCE((
                        SELECT jsonb_agg(
                            jsonb_build_object(
                                'piezas', COALESCE(e.espacio->'piezas', '[]'::JSONB),
                                'pista',  e.espacio->>'pista'
                            )
                            ORDER BY e.ord
                        )
                        FROM jsonb_array_elements(COALESCE(pa.paso->'espacios', '[]'::JSONB))
                             WITH ORDINALITY AS e(espacio, ord)
                    ), '[]'::JSONB)
                )
                ORDER BY pa.ord
            )
            FROM jsonb_array_elements(COALESCE(p_config->'pasos', '[]'::JSONB))
                 WITH ORDINALITY AS pa(paso, ord)
        ),
        '[]'::JSONB
    );
$$;

COMMENT ON FUNCTION public.ruta_pasos_publicos(JSONB) IS
    'Pasos del procedimiento para el Portal: texto, cantidad de huecos, piezas disponibles y pistas. NUNCA incluye `respuesta`.';

-- No es un API: solo la usan las RPC de arriba, que son SECURITY DEFINER.
REVOKE ALL ON FUNCTION public.ruta_pasos_publicos(JSONB) FROM PUBLIC, anon;
