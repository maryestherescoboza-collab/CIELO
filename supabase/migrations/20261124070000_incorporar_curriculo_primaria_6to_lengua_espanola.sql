-- Migración: Incorporación del Nivel Primario en CIELO (6to Grado - Lengua Española)
-- Fecha: 2026-11-24

-- 1. Asegurar columna nivel en curr_indicadores y curr_contenidos
ALTER TABLE public.curr_indicadores 
ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'Secundaria';

ALTER TABLE public.curr_contenidos 
ADD COLUMN IF NOT EXISTS nivel TEXT NOT NULL DEFAULT 'Secundaria';

-- 2. Actualizar constraint UNIQUE de curr_contenidos para aislar por nivel
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'curr_contenidos_grado_asignatura_contenido_key'
    ) THEN
        ALTER TABLE public.curr_contenidos 
        DROP CONSTRAINT curr_contenidos_grado_asignatura_contenido_key;
    END IF;
    
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'uq_curr_contenidos_nivel_grado_asig_cont'
    ) THEN
        ALTER TABLE public.curr_contenidos 
        ADD CONSTRAINT uq_curr_contenidos_nivel_grado_asig_cont 
        UNIQUE (nivel, grado, asignatura, contenido);
    END IF;
END $$;

-- 3. Índices para consultas compuestas por nivel, grado y asignatura
CREATE INDEX IF NOT EXISTS idx_curr_indicadores_nivel_grado_asig 
ON public.curr_indicadores (nivel, grado, asignatura);

CREATE INDEX IF NOT EXISTS idx_curr_contenidos_nivel_grado_asig 
ON public.curr_contenidos (nivel, grado, asignatura);

CREATE INDEX IF NOT EXISTS idx_curr_ce_nivel_grado_asig 
ON public.curr_competencias_especificas (nivel, grado, asignatura);

-- 4. Inserción de Competencias Específicas, Indicadores y Contenidos de 6to de Primaria
DO $$
DECLARE
    v_ce1_id UUID;
    v_ce2_id UUID;
    v_ce3_id UUID;
    v_ind1_id UUID;
    v_ind2_id UUID;
    v_ind3_id UUID;
    v_ind4_id UUID;
    v_ind5_id UUID;
    v_ind6_id UUID;
    v_ind7_id UUID;
    v_ind8_id UUID;
    v_ind9_id UUID;
BEGIN
    -- Competencias Específicas (3 bloques oficiales de Primaria)
    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'lengua_espanola', 'BC1', 'Comunicativa', 'CE-LE1', 
         'Manifiesta sus ideas, pensamientos y sentimientos con fluidez, mediante un modelo textual conveniente de forma oral o escrita, en variadas situaciones y contextos, con el fin de demostrar conocimiento y uso adecuado de su lengua, a través de diferentes medios y recursos.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce1_id;

    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'lengua_espanola', 'BC2', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'CE-LE2', 
         'Elabora textos orales y escritos con creatividad y criticidad según las conclusiones de los problemas abordados en investigaciones, y las publica a través de medios variados.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce2_id;

    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'lengua_espanola', 'BC3', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'CE-LE3', 
         'Caracteriza problemas sociales a través de textos orales y escritos, con la finalidad de solucionarlos, canalizando emociones, sentimientos, relaciones humanas, así como la preservación de la salud y el ambiente, mediante el uso de recursos diversos.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce3_id;

    -- Limpieza previa para idempotencia en indicadores de este curso
    DELETE FROM public.curr_indicadores 
    WHERE nivel = 'Primaria' AND grado = '6to' AND asignatura = 'lengua_espanola';

    -- Indicadores Bloque 1
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Comunicativa', 'IL-1', 'Expresa sus ideas, pensamientos, sentimientos, motivaciones, a través de textos orales y escritos, abordando temas sociales en contextos variados.', true)
    RETURNING id INTO v_ind1_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Comunicativa', 'IL-2', 'Redacta textos funcionales y literarios relacionados con temáticas sociales de su entorno local, nacional, mundial.', true)
    RETURNING id INTO v_ind2_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Comunicativa', 'IL-3', 'Publica sus ideas sobre temas diversos, a través de un tipo de texto apropiado, y el uso de herramientas tecnológicas.', true)
    RETURNING id INTO v_ind3_id;

    -- Indicadores Bloque 2
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-4', 'Expone sus opiniones de forma crítica, a través de textos adecuados, de forma oral y escrita, respetando las ideas de los demás.', true)
    RETURNING id INTO v_ind4_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-5', 'Plantea, de forma oral y escrita, posibles soluciones a problemas sociales, a través de textos diversos y utilizando medios y recursos pertinentes.', true)
    RETURNING id INTO v_ind5_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-6', 'Utiliza recursos tecnológicos en investigaciones científicas que realiza y publica los resultados mediante textos variados en actos de intercomunicación.', true)
    RETURNING id INTO v_ind6_id;

    -- Indicadores Bloque 3
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-7', 'Fortalece los valores humanos mediante comprensión y producciones orales y escritas, en reconocimiento de la identidad ciudadana, haciendo uso de recursos de las TIC y de otros tipos.', true)
    RETURNING id INTO v_ind7_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-8', 'Resalta sentimientos, emociones y relaciones de sí mismo y de los demás, mediante textos orales y escritos que produce.', true)
    RETURNING id INTO v_ind8_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'lengua_espanola', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-9', 'Promueve temas sobre la preservación de la salud y el medio ambiente, a través de producciones textuales, funcionales y literarios.', true)
    RETURNING id INTO v_ind9_id;

    -- Puente CE ↔ Indicadores
    DELETE FROM public.curr_ce_indicadores 
    WHERE ce_id IN (v_ce1_id, v_ce2_id, v_ce3_id);

    INSERT INTO public.curr_ce_indicadores (ce_id, indicador_id) VALUES
        (v_ce1_id, v_ind1_id),
        (v_ce1_id, v_ind2_id),
        (v_ce1_id, v_ind3_id),
        (v_ce2_id, v_ind4_id),
        (v_ce2_id, v_ind5_id),
        (v_ce2_id, v_ind6_id),
        (v_ce3_id, v_ind7_id),
        (v_ce3_id, v_ind8_id),
        (v_ce3_id, v_ind9_id);

    -- Contenidos Curriculares
    INSERT INTO public.curr_contenidos (nivel, grado, asignatura, contenido, contenido_json)
    VALUES 
        ('Primaria', '6to', 'lengua_espanola', 'La carta de agradecimiento', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Función y estructura de la carta de agradecimiento (lugar y fecha, destinatario, saludo, cuerpo, despedida, firma).', 'Fórmulas de cortesía y agradecimiento.', 'Conectores de causa y consecuencia.', 'Tiempos verbales del modo indicativo.'),
             'procedimientos', jsonb_build_array('Escucha atenta y lectura comprensiva de cartas de agradecimiento.', 'Identificación de la intención comunicativa y el contexto del agradecimiento.', 'Planificación, redacción de borradores, revisión y envío de cartas de agradecimiento para fortalecer valores y convivencia.'),
             'actitudes_valores', jsonb_build_array('Valoración de la gratitud como valor humano fundamental.', 'Respeto y consideración hacia las personas e instituciones en la comunicación epistolar.'),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-7', 'IL-8')
         )),
        ('Primaria', '6to', 'lengua_espanola', 'La receta', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Función y estructura de la receta (título, ingredientes/materiales, procedimiento/instrucciones).', 'Verbos en modo imperativo e infinitivo.', 'Conectores de orden y secuencia (primero, luego, finalmente).', 'Unidades de medida y proporciones.'),
             'procedimientos', jsonb_build_array('Lectura comprensiva de recetas saludables y nutritivas.', 'Seguimiento riguroso de instrucciones paso a paso.', 'Elaboración escrita de recetas culinarias que promueven la salud y el aprovechamiento de recursos locales.'),
             'actitudes_valores', jsonb_build_array('Aprecio por la alimentación saludable y la preservación de la salud.', 'Cuidado y seguridad en la manipulación de alimentos y utensilios.'),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-5', 'IL-6', 'IL-9')
         )),
        ('Primaria', '6to', 'lengua_espanola', 'El artículo expositivo', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Función y estructura del artículo expositivo (introducción, desarrollo, conclusión).', 'Uso de definiciones, comparaciones y ejemplos.', 'Conectores explicativos y de orden.', 'Vocabulario temático específico y registro formal.'),
             'procedimientos', jsonb_build_array('Investigación de temas sociales, científicos y ambientales utilizando fuentes confiables y TIC.', 'Organización jerárquica de la información obtenida.', 'Redacción y publicación de artículos expositivos con claridad, objetividad y rigor.'),
             'actitudes_valores', jsonb_build_array('Interés por la indagación y el conocimiento científico.', 'Rigurosidad, honestidad intelectual y respeto por los datos comprobados.'),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3', 'IL-4', 'IL-5', 'IL-6', 'IL-9')
         )),
        ('Primaria', '6to', 'lengua_espanola', 'El comentario', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Función y estructura del comentario (punto de partida/tema, tesis/opinión, argumentos, conclusión).', 'Distinción entre hechos y opiniones.', 'Conectores argumentativos (porque, ya que, por lo tanto).', 'Uso de adjetivos valorativos.'),
             'procedimientos', jsonb_build_array('Análisis crítico de problemáticas sociales, escolares y comunitarias.', 'Formulación y sustentación de opiniones personales fundamentadas.', 'Producción oral y escrita de comentarios respetando los puntos de vista divergentes.'),
             'actitudes_valores', jsonb_build_array('Espíritu crítico, tolerancia y apertura hacia las ideas de los demás.', 'Compromiso ciudadano frente a los problemas del entorno.'),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-3', 'IL-4', 'IL-5', 'IL-7', 'IL-8', 'IL-9')
         )),
        ('Primaria', '6to', 'lengua_espanola', 'El anuncio radial', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Función persuasiva y concientizadora del anuncio radial o cuña de bien público.', 'Componentes: eslogan, mensaje clave, voz, efectos de sonido y música de fondo.', 'Léxico persuasivo y llamada a la acción.'),
             'procedimientos', jsonb_build_array('Escucha analítica de anuncios radiales comunitarios y comerciales.', 'Diseño del guion radiofónico breve enfocado en problemas sociales y ambientales.', 'Grabación y difusión de anuncios radiales mediante herramientas tecnológicas.'),
             'actitudes_valores', jsonb_build_array('Sensibilidad ante causas sociales, ecológicas y de salud colectiva.', 'Creatividad en el uso de los recursos auditivos.'),
             'indicadores_relacionados', jsonb_build_array('IL-3', 'IL-5', 'IL-6', 'IL-7', 'IL-9')
         )),
        ('Primaria', '6to', 'lengua_espanola', 'La oda', 
         jsonb_build_object(
             'conceptos', jsonb_build_array('Naturaleza lírica de la oda: alabanza y exaltación de seres, objetos, valores o la naturaleza.', 'Estructura en estrofas y versos.', 'Recursos poéticos: metáfora, personificación, imágenes sensoriales, ritmo y rima.'),
             'procedimientos', jsonb_build_array('Declamación y lectura expresiva de odas.', 'Identificación de sentimientos, emociones y recursos expresivos en textos líricos.', 'Creación poética de odas inspiradas en personas destacadas, la naturaleza o valores ciudadanos.'),
             'actitudes_valores', jsonb_build_array('Sensibilidad estética y apreciación del lenguaje poético.', 'Canalización armónica de emociones y sentimientos a través del arte.'),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-4', 'IL-7', 'IL-8')
         ))
    ON CONFLICT (nivel, grado, asignatura, contenido)
    DO UPDATE SET 
        contenido_json = EXCLUDED.contenido_json,
        updated_at = NOW();

END $$;
