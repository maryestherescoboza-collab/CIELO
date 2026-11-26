-- Migración: Incorporación del Nivel Primario en CIELO (6to Grado - Ciencias Sociales)
-- Fecha: 2026-11-24

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
    -- 1. Competencias Específicas (3 bloques oficiales de Primaria para Ciencias Sociales 6to)
    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'ciencias_sociales', 'BC1', 'Comunicativa', 'CE-CS1', 
         'Comprueba la autoría de informaciones sobre la geografía, su clasificación e importancia, así como los aspectos geográficos e históricos de las civilizaciones antiguas y modernas; con la finalidad de producir valoraciones e informaciones científicas y comunicarlas.')
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
        ('Primaria', '6to', 'ciencias_sociales', 'BC2', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'CE-CS2', 
         'Explica acontecimientos históricos relacionados con las civilizaciones antiguas y modernas, la historia de América durante los siglos XVIII y XIX, situaciones políticas, sociales, económicas y culturales del mundo y de la República Dominicana ocurridos durante la primera y segunda mitad del siglo XIX y el XX; con la finalidad de comprender las causas que dieron origen a estos acontecimientos y expresar su opinión en forma crítica y creativa, usando la tecnología.')
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
        ('Primaria', '6to', 'ciencias_sociales', 'BC3', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'CE-CS3', 
         'Promueve en sus actuaciones, relaciones democráticas, sus deberes y derechos y de los demás, la conservación del patrimonio histórico, natural y cultural dominicano y del mundo; con la finalidad de construir una ciudadanía defensora de un estado de derecho, la interculturalidad y la cultura de paz en diferentes contextos.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce3_id;

    -- 2. Limpieza previa para idempotencia en indicadores de Ciencias Sociales 6to Primaria
    DELETE FROM public.curr_indicadores 
    WHERE nivel = 'Primaria' AND grado = '6to' AND asignatura = 'ciencias_sociales';

    -- Indicadores Bloque 1 (Comunicativa)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Comunicativa', 'IL-1', 'Realiza investigaciones basadas en fuentes confiables sobre la geografía como ciencia y la geografía humana.', true)
    RETURNING id INTO v_ind1_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Comunicativa', 'IL-2', 'Ubica en un mapamundi y otras fuentes, los límites de los continentes, sus accidentes geográficos y sistema de referencia de coordenadas.', true)
    RETURNING id INTO v_ind2_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Comunicativa', 'IL-3', 'Aplica las reglas básicas de respeto a la autoría al utilizar información sobre el relieve, clima, hidrografía, economía, población y cultura de los continentes, tanto en fuentes impresas como digitales.', true)
    RETURNING id INTO v_ind3_id;

    -- Indicadores Bloque 2 (Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-4', 'Utiliza el pensamiento crítico al analizar los acontecimientos históricos de las civilizaciones antiguas y modernas de Europa y América.', true)
    RETURNING id INTO v_ind4_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-5', 'Expresa claramente su punto de vista sobre los acontecimientos que propiciaron la expansión europea durante los periodos estudiados.', true)
    RETURNING id INTO v_ind5_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-6', 'Aplica el pensamiento lógico en el análisis de los hechos históricos, sociales, económicos y culturales de los periodos estudiados en la historia dominicana.', true)
    RETURNING id INTO v_ind6_id;

    -- Indicadores Bloque 3 (Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-7', 'Manifiesta actitudes democráticas y de respeto, al defender sus derechos, el patrimonio histórico, natural y cultural de la República Dominicana y del mundo.', true)
    RETURNING id INTO v_ind7_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-8', 'Reconoce la importancia de los símbolos patrios, asumiendo responsabilidad social, política y económica.', true)
    RETURNING id INTO v_ind8_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_sociales', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-9', 'Participa en la construcción de una cultura de paz y democracia a través de la generación de ideas que promuevan el diálogo y la reflexión colectiva en torno a los problemas sociales.', true)
    RETURNING id INTO v_ind9_id;

    -- 3. Vinculación CE ↔ Indicadores
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

    -- 4. Contenidos Curriculares con clasificación temática (Geografía, Historia, Ciudadanía),
    -- indicadores vinculados principales y relaciones pedagógicas transversales
    INSERT INTO public.curr_contenidos (nivel, grado, asignatura, contenido, contenido_json)
    VALUES 
        -- EJE GEOGRAFÍA
        ('Primaria', '6to', 'ciencias_sociales', 'Geografía General', 
         jsonb_build_object(
             'eje', 'Geografía',
             'conceptos', jsonb_build_array(
                 'La geografía como ciencia y sus ramas principales.',
                 'Geografía física y geografía humana.',
                 'Sistemas de coordenadas geográficas (latitud, longitud, meridianos y paralelos).',
                 'Mapamundi, continentes y límites geográficos mundiales.'
             ),
             'procedimientos', jsonb_build_array(
                 'Investigación rigurosa a partir de fuentes cartográficas y geográficas confiables.',
                 'Localización y lectura de accidentes geográficos en mapamundi físico y político.',
                 'Aplicación de normas éticas de respeto a la autoría al citar fuentes geográficas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Valoración del espacio geográfico y del patrimonio natural mundial.',
                 'Honestidad académica en el uso de fuentes de información geográfica.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-3', 'IL-7'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-1', 'IL-2', 'IL-3'),
                 'transversales', jsonb_build_array('IL-7')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Clima de los continentes', 
         jsonb_build_object(
             'eje', 'Geografía',
             'conceptos', jsonb_build_array(
                 'Zonas climáticas de la Tierra.',
                 'Factores que condicionan el clima en los continentes.',
                 'Relieve e hidrografía y su influencia en las condiciones climáticas.',
                 'Impacto del cambio climático en las regiones continentales.'
             ),
             'procedimientos', jsonb_build_array(
                 'Lectura e interpretación de mapas climáticos y cuadros comparativos.',
                 'Análisis de la distribución de temperaturas, precipitaciones y biomas.',
                 'Manejo respetuoso y ético de la información climática consultada.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Conciencia ecológica y sensibilidad ante los desafíos climáticos del planeta.',
                 'Rigor en el análisis de datos meteorológicos y geográficos.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-3')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Continente Americano', 
         jsonb_build_object(
             'eje', 'Geografía',
             'conceptos', jsonb_build_array(
                 'Ubicación, límites y división política del continente americano.',
                 'Relieve, hidrografía, climas y regiones geográficas de América.',
                 'Población, diversidad cultural y actividades económicas en América.',
                 'Patrimonio natural y reservas biológicas del continente americano.'
             ),
             'procedimientos', jsonb_build_array(
                 'Localización cartográfica de países, capitales, cadenas montañosas y cuencas hidrográficas de América.',
                 'Comparación socioeconómica y cultural entre las regiones de América del Norte, Central, el Caribe y del Sur.',
                 'Elaboración de informes geográficos aplicando normas de autoría y citas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Aprecio por la diversidad geográfica y cultural de los pueblos de América.',
                 'Defensa y cuidado del patrimonio natural continental.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-3', 'IL-7'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-1', 'IL-2', 'IL-3'),
                 'transversales', jsonb_build_array('IL-7')
             )
         )),

        -- EJE HISTORIA
        ('Primaria', '6to', 'ciencias_sociales', 'Historia como ciencia', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'La historia como disciplina científica y su método de investigación.',
                 'Fuentes primarias y secundarias de la historia.',
                 'Periodización y líneas de tiempo como herramientas de comprensión histórica.',
                 'Civilizaciones antiguas y modernas de Europa y América.'
             ),
             'procedimientos', jsonb_build_array(
                 'Indagación y contraste crítico entre fuentes documentales e históricas.',
                 'Construcción y análisis de líneas temporales de acontecimientos históricos relevantes.',
                 'Uso de tecnologías digitales para la investigación y socialización de hallazgos históricos.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Curiosidad científica y valoración de la memoria histórica.',
                 'Pensamiento crítico y rechazo al plagio o manipulación de datos históricos.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-4', 'IL-5'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-4', 'IL-5')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Periodos de la historia de América', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'Etapas de la historia americana: prehispánica, colonial, independencia y contemporánea.',
                 'Grandes culturas precolombinas (mayas, aztecas, incas y taínos).',
                 'Procesos independentistas en el continente durante los siglos XVIII y XIX.',
                 'Transformaciones políticas y sociales en América.'
             ),
             'procedimientos', jsonb_build_array(
                 'Secuenciación cronológica de los periodos de la historia de América.',
                 'Análisis multicausal de las transformaciones sociopolíticas americanas.',
                 'Exposición argumentada de opiniones fundamentadas mediante herramientas digitales.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Respeto por la identidad histórica y la herencia de los pueblos americanos.',
                 'Comprensión crítica del pasado para valorar el presente democrático.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-4', 'IL-5'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-4', 'IL-5')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Historia de América', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'Acontecimientos clave de la historia americana en los siglos XVIII, XIX y XX.',
                 'Movimientos sociales, revoluciones y luchas anticoloniales en América.',
                 'Relaciones geopolíticas, económicas y culturales entre los países del continente.',
                 'Luchas por la paz, los derechos humanos y la autodeterminación en América.'
             ),
             'procedimientos', jsonb_build_array(
                 'Investigación sobre hechos históricos determinantes del continente americano.',
                 'Debate crítico sobre las causas y consecuencias de los procesos revolucionarios.',
                 'Generación de propuestas para fortalecer la solidaridad y la cultura de paz continental.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Solidaridad con los pueblos de América y defensa del estado de derecho.',
                 'Cultura de paz y resolución pacífica de controversias históricas.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-4', 'IL-5', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-4', 'IL-5'),
                 'transversales', jsonb_build_array('IL-9')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Expansión europea en el siglo XV al XVIII en América', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'Factores comerciales, científicos y geopolíticos de la expansión europea.',
                 'Viajes de exploración y llegada europea a América en el siglo XV.',
                 'Régimen colonial, monopolio comercial, encomiendas y trata transatlántica.',
                 'Impacto demográfico, cultural y ecológico del encuentro colonial.'
             ),
             'procedimientos', jsonb_build_array(
                 'Explicación lógica de las causas económicas, políticas y tecnológicas de la expansión.',
                 'Expresión de juicios críticos sobre el impacto de la colonización en las poblaciones originarias.',
                 'Contrastación de perspectivas históricas europeas e indígenas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Sensibilidad y empatía histórica hacia los pueblos originarios y afrodescendientes.',
                 'Espíritu crítico ante visiones eurocéntricas del pasado.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-4', 'IL-5'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-4', 'IL-5')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Periodos de la historia dominicana', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'Periodos fundamentales de la historia dominicana: colonial, ocupación haitiana, Primera República, Anexión y Restauración, Segunda República y siglo XX.',
                 'Línea cronológica de las constituciones y proyectos de nación dominicanos.',
                 'Evolución de las instituciones republicanas y símbolos de la patria.'
             ),
             'procedimientos', jsonb_build_array(
                 'Organización temporal de los hitos y periodos de la historia nacional.',
                 'Análisis lógico de las crisis políticas y avances constitucionales de cada periodo.',
                 'Reconocimiento de los símbolos patrios en su contexto histórico fundacional.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Amor a la patria y respeto por la memoria de los héroes nacionales.',
                 'Compromiso con la estabilidad democrática y republicana.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-6', 'IL-8'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-6'),
                 'transversales', jsonb_build_array('IL-8')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Historia Dominicana', 
         jsonb_build_object(
             'eje', 'Historia',
             'conceptos', jsonb_build_array(
                 'Acontecimientos políticos, económicos, sociales y culturales dominicanos de los siglos XIX y XX.',
                 'Gesta independentista de 1844 y Guerra de la Restauración de 1863.',
                 'Dictaduras, intervenciones extranjeras y luchas democráticas contemporáneas.',
                 'Símbolos patrios: Bandera, Escudo e Himno Nacional, su significado cívico e histórico.'
             ),
             'procedimientos', jsonb_build_array(
                 'Interpretación de fuentes históricas y testimonios de la memoria nacional.',
                 'Explicación lógica de causas y consecuencias de los hechos históricos dominicanos.',
                 'Promoción de acciones cívicas en homenaje a los forjadores de la nacionalidad.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Orgullo de la identidad dominicana, soberanía y convivencia democrática.',
                 'Responsabilidad social y defensa del patrimonio histórico y cultural.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-6', 'IL-7', 'IL-8', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-6'),
                 'transversales', jsonb_build_array('IL-7', 'IL-8', 'IL-9')
             )
         )),

        -- EJE CIUDADANÍA
        ('Primaria', '6to', 'ciencias_sociales', 'Educación ciudadana', 
         jsonb_build_object(
             'eje', 'Ciudadanía',
             'conceptos', jsonb_build_array(
                 'Deberes y derechos fundamentales consagrados en la Constitución dominicana.',
                 'El estado social y democrático de derecho.',
                 'Instituciones republicanas y poderes del Estado.',
                 'Los símbolos patrios y el ejercicio de la responsabilidad cívica y económica.'
             ),
             'procedimientos', jsonb_build_array(
                 'Debate y análisis de situaciones donde se ejercen o vulneran derechos ciudadanos.',
                 'Práctica de actitudes de rendición de cuentas, transparencia y respeto a las leyes.',
                 'Participación activa en actividades escolares de reflexión y promoción ciudadana.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Sentido del deber cívico, patriotismo crítico y lealtad institucional.',
                 'Defensa inclaudicable de la justicia social y la equidad.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-6', 'IL-7', 'IL-8', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-7', 'IL-8', 'IL-9'),
                 'transversales', jsonb_build_array('IL-6')
             )
         )),
        ('Primaria', '6to', 'ciencias_sociales', 'Convivencia humana', 
         jsonb_build_object(
             'eje', 'Ciudadanía',
             'conceptos', jsonb_build_array(
                 'Cultura de paz, no violencia y resolución constructiva de conflictos.',
                 'Interculturalidad, inclusión y respeto a la dignidad humana sin discriminación.',
                 'Normas de convivencia comunitaria, escolar y familiar.',
                 'El diálogo y la deliberación colectiva frente a problemas sociales.'
             ),
             'procedimientos', jsonb_build_array(
                 'Mediación de desacuerdos escolares a través del diálogo empático y asertivo.',
                 'Diseño de proyectos comunitarios que promueven la cohesión social y el bienestar común.',
                 'Análisis reflexivo de situaciones de discriminación o conflicto social.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Tolerancia activa, empatía y aprecio por la pluralidad social y cultural.',
                 'Compromiso inquebrantable con la paz y la concordia ciudadana.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-6', 'IL-7', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-7', 'IL-9'),
                 'transversales', jsonb_build_array('IL-6')
             )
         ))
    ON CONFLICT (nivel, grado, asignatura, contenido)
    DO UPDATE SET 
        contenido_json = EXCLUDED.contenido_json,
        updated_at = NOW();

END $$;
