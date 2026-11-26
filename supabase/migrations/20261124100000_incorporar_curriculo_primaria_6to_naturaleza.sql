-- Migración: Incorporación del Nivel Primario en CIELO (6to Grado - Ciencias de la Naturaleza)
-- Fecha: 2026-11-24
-- Incluye áreas de conocimiento (Ciencias de la Vida, Ciencias Físicas, Ciencias de la Tierra y el Universo)
-- y ejes de contenido conservando su diferenciación unívoca y relaciones pedagógicas.

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
    -- 1. Competencias Específicas (3 bloques oficiales unificados de Primaria)
    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'ciencias_naturaleza', 'BC1', 'Comunicativa', 'CE-CN1', 
         'Ofrece explicaciones científicas y tecnológicas a partir de analizar, evaluar y crear preguntas o hipótesis de observaciones, medición, modelos y experimentación de fenómenos naturales en contexto próximo o experimentado o modelado en ciencias de la vida, físicas, de la tierra y el universo.')
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
        ('Primaria', '6to', 'ciencias_naturaleza', 'BC2', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'CE-CN2', 
         'Aplica organizados, sistemáticos y creativos procedimientos científicos y tecnológicos, que analiza y evalúa mientras explora o experimenta, simula o construye, haciéndose consciente de sus cuestionamientos e inferencia a partir de su observación y medición llevando a cabo de vivencias, experimentos, proyectos, exploraciones y observaciones guiadas.')
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
        ('Primaria', '6to', 'ciencias_naturaleza', 'BC3', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'CE-CN3', 
         'Asume una actitud preventiva, autónoma, autoconsciente, creativa, innovadora, crítica, de apertura, investigadora, colaborativa, solidaria, perseverante, responsable y en armonía integral en sí mismo, con los demás, con su entorno y como parte de los seres vivos, tomando acciones básicas y proactivas en atención a su bienestar y uso sostenible de los recursos.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce3_id;

    -- 2. Limpieza previa para idempotencia en indicadores de Ciencias de la Naturaleza 6to Primaria
    DELETE FROM public.curr_indicadores 
    WHERE nivel = 'Primaria' AND grado = '6to' AND asignatura = 'ciencias_naturaleza';

    -- Indicadores Bloque 1 (Comunicativa)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Comunicativa', 'IL-1', 'Expresa soluciones adecuadas donde intervienen la presión y el empuje en fluidos y la transferencia de energía, y analiza algunos experimentos por medio de registros en tablas y gráficas.', true)
    RETURNING id INTO v_ind1_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Comunicativa', 'IL-2', 'Usa diferentes vías de comunicación haciendo uso del lenguaje científico y tecnológico apropiadamente para explicar o dar soluciones de forma abierta y creativa a su manera de percibir las propiedades y características de la materia tanto inerte como viva, fenómenos naturales asociado con la interacción de nuestro universo y la tierra, energía y radiación, estructuras y mecanismo de máquinas y sensores, respetando las ideas y diferencias con los demás.', true)
    RETURNING id INTO v_ind2_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Comunicativa', 'IL-3', 'Comunica de sus ideas e hipótesis de las observaciones y experimentos, usando y cuidando los sentidos e instrumentos para percibir, recolectar, obtener y organizar datos e información en tablas y gráficas elementales; mostrando y argumentando los resultados de su trabajo de forma objetiva, sistemática y creativa en proyecto individual y colectivo de problemáticas de investigación o innovación escolar y comunitaria en salud, nuestro sistema solar y la tierra, fenómenos naturales geológicos y astronómicos, medioambiente y sostenibilidad.', true)
    RETURNING id INTO v_ind3_id;

    -- Indicadores Bloque 2 (Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-4', 'Infiere, siendo creativo en sus ideas, sobre el efecto de la fuerza gravitacional sobre la Tierra según su localización a más cerca o lejana al Sol, argumentando sobre el impacto que tendría en la vida y en la apariencia del Planeta.', true)
    RETURNING id INTO v_ind4_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-5', 'Diseña con acompañamiento y ejecuta experimentos e indagación en colaboración; observando, describiendo, registrando y utilizando herramientas o equipos y siguiendo características y propiedades observables de células, tejidos y órganos en seres vivos; energía y radiación solar; estados de la materia: la solidificación (fusión), evaporación (ebullición), licuefacción (condensación), sublimación (cristalización) con el cambio en la temperatura.', true)
    RETURNING id INTO v_ind5_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-6', 'Propone y construye modelos sobre el efecto de la Energía Solar en la Tierra y en los seres vivos, en trabajo colaborativo, con recursos diversos y el uso de medios tecnológicos, aplicando diferentes mecanismos de forma lógica y creativa, a fin de contribuir a su preservación.', true)
    RETURNING id INTO v_ind6_id;

    -- Indicadores Bloque 3 (Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-7', 'Propone modelos sobre el efecto de la energía solar en la Tierra y los seres vivos en trabajo colaborativo.', true)
    RETURNING id INTO v_ind7_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-8', 'Analiza, lleva a cabo y evalúa medidas de prevención de algunas enfermedades infectocontagiosas recurrentes en el país producidas en la comunidad a fin de mantener la salud individual y colectiva.', true)
    RETURNING id INTO v_ind8_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'ciencias_naturaleza', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-9', 'Analiza y aplica actitudes y valores proactivos en su desarrollo personal que incentiva como la imaginación, la curiosidad, la colaboración, la perseverancia, la innovación, la objetividad, la responsabilidad, la solidaridad, la creatividad, la adaptabilidad, la observación, interés por profesiones y quehacer científico y tecnológico, aportes de las ciencias experimentales y las tecnologías en nuestra sociedad, y autogestionar sus emociones, preguntas y aprendizaje.', true)
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

    -- 4. Contenidos Curriculares por Área de Conocimiento y Eje de Contenido (10 combinaciones canónicas)
    -- CIENCIAS DE LA VIDA (4 ejes)
    INSERT INTO public.curr_contenidos (nivel, grado, asignatura, contenido, contenido_json)
    VALUES 
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Vida: Materia y sus propiedades', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Vida',
             'eje', 'Materia y sus propiedades',
             'nombre_descriptivo', 'Materia y sus propiedades en los seres vivos (Células, tejidos y órganos)',
             'conceptos', jsonb_build_array(
                 'Propiedades y características de la materia viva.',
                 'Células, tejidos, órganos y sistemas en los seres vivos.',
                 'Organización biológica y niveles de complejidad.',
                 'Diferencias entre materia viva e inerte.'
             ),
             'procedimientos', jsonb_build_array(
                 'Observación microscópica y macroscópica de células y tejidos.',
                 'Descripción y registro ordenado de estructuras biológicas.',
                 'Clasificación de organismos según sus características morfológicas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Respeto y asombro por la complejidad de la vida.',
                 'Cuidado y manipulación responsable de muestras biológicas.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-5', 'IL-8'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-5', 'IL-8'),
                 'observaciones', 'Abarca propiedades de materia viva, estructuras celulares y características biológicas.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Vida: Energía y conservación', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Vida',
             'eje', 'Energía y conservación',
             'nombre_descriptivo', 'Energía, ecosistemas y conservación ambiental en seres vivos',
             'conceptos', jsonb_build_array(
                 'Flujo de energía en los ecosistemas y cadenas tróficas.',
                 'Efectos de la energía solar en los seres vivos (fotosíntesis y ciclos biológicos).',
                 'Medioambiente, biodiversidad y sostenibilidad ecológica.',
                 'Uso racional y preservación de los recursos naturales.'
             ),
             'procedimientos', jsonb_build_array(
                 'Elaboración de modelos y cadenas alimentarias sobre transferencia energética.',
                 'Diseño de experimentos sencillos sobre el impacto de la luz solar en plantas.',
                 'Formulación y desarrollo de proyectos de sostenibilidad escolar y comunitaria.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Compromiso ético con el equilibrio ambiental y el desarrollo sostenible.',
                 'Actitud activa en la preservación de la flora y fauna local.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-3', 'IL-6', 'IL-7'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-3', 'IL-6', 'IL-7'),
                 'observaciones', 'Integra sostenibilidad, efectos de energía solar en seres vivos y conservación.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Vida: Sistema y mecanismo', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Vida',
             'eje', 'Sistema y mecanismo',
             'nombre_descriptivo', 'Estructuras y mecanismos funcionales de los seres vivos',
             'conceptos', jsonb_build_array(
                 'Estructuras y mecanismos anatómicos y fisiológicos en los seres vivos.',
                 'Mecanismos de regulación, nutrición, circulación y excreción.',
                 'Respuestas de los organismos ante estímulos del medio ambiente.',
                 'Aportes del método experimental en el estudio de los sistemas vivos.'
             ),
             'procedimientos', jsonb_build_array(
                 'Construcción de esquemas y modelos funcionales de aparatos y sistemas biológicos.',
                 'Simulación guiada de procesos fisiológicos básicos.',
                 'Registro de datos de observación en tablas y gráficos comparativos.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Curiosidad e interés investigativo por el funcionamiento de los seres vivos.',
                 'Aprecio por el rigor en la recolección de evidencia científica.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3', 'IL-8', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-3', 'IL-8', 'IL-9'),
                 'observaciones', 'Incluye mecanismos corporales, observación de estructuras y autogestión de aprendizajes.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Vida: Salud y ser humano', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Vida',
             'eje', 'Salud y ser humano',
             'nombre_descriptivo', 'Salud humana, prevención epidemiológica y bienestar integral',
             'conceptos', jsonb_build_array(
                 'El cuerpo humano: anatomía, fisiología e higiene.',
                 'Salud integral: factores biológicos, ambientales y sociales.',
                 'Enfermedades infectocontagiosas recurrentes en la comunidad y el país (dengue, cólera, gripe, etc.).',
                 'Medidas preventivas, vacunación y hábitos de vida saludables.'
             ),
             'procedimientos', jsonb_build_array(
                 'Investigación sobre vías de contagio y propagación de virus y bacterias.',
                 'Diseño y ejecución de campañas escolares de prevención sanitaria comunitaria.',
                 'Análisis de datos epidemiológicos básicos sobre incidencia de enfermedades locales.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Responsabilidad individual y colectiva frente a la salud pública.',
                 'Solidaridad y empatía con el cuidado de los miembros más vulnerables de la comunidad.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3', 'IL-5', 'IL-8', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-3', 'IL-8', 'IL-9'),
                 'transversales', jsonb_build_array('IL-5'),
                 'observaciones', 'Asociación clave para prevención de enfermedades infectocontagiosas y salud colectiva.'
             )
         )),

        -- CIENCIAS FÍSICAS (3 ejes)
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias Físicas: Materia y sus propiedades', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias Físicas',
             'eje', 'Materia y sus propiedades',
             'nombre_descriptivo', 'Propiedades de la materia inerte y estados de agregación',
             'conceptos', jsonb_build_array(
                 'Propiedades generales y específicas de la materia inerte (masa, volumen, densidad, dureza).',
                 'Propiedades físicas de los fluidos (líquidos y gases).',
                 'Estados de agregación de la materia: sólido, líquido, gas y plasma.',
                 'Cambios de estado térmicos: fusión/solidificación, ebullición/evaporación, condensación/licuefacción, sublimación/cristalización.'
             ),
             'procedimientos', jsonb_build_array(
                 'Medición de masa, volumen y densidad con balanzas, probetas y recipientes graduados.',
                 'Experimentación con cambios de estado controlando y registrando variaciones de temperatura.',
                 'Registro sistemático de resultados experimentales en tablas y gráficas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Prudencia, orden y seguimiento de normas de seguridad en el laboratorio.',
                 'Precisión y honestidad intelectual en el reporte de mediciones.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-5'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-1', 'IL-2', 'IL-5'),
                 'observaciones', 'Articula fluidos, materia inerte y cambios de estado con variación térmica.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias Físicas: Interacción y movimiento', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias Físicas',
             'eje', 'Interacción y movimiento',
             'nombre_descriptivo', 'Fuerzas, dinámica de fluidos y variación de temperatura',
             'conceptos', jsonb_build_array(
                 'Fuerzas e interacciones: tipos y efectos sobre los cuerpos.',
                 'Presión y principio de Pascal.',
                 'Empuje hidrostático y principio de Arquímedes en fluidos.',
                 'Efectos cinéticos de la temperatura sobre el movimiento molecular.'
             ),
             'procedimientos', jsonb_build_array(
                 'Demostración experimental de flotabilidad y empuje en líquidos con distintos cuerpos.',
                 'Cálculo e inferencia cualitativa de presiones en columnas de fluido.',
                 'Representación gráfica de fuerzas actuantes sobre un objeto sumergido.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Pensamiento crítico y capacidad de deducción lógica a partir de evidencias.',
                 'Disfrute de la experimentación científica y el trabajo cooperativo.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-5'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-1', 'IL-5'),
                 'observaciones', 'Incluye presión y empuje en fluidos y dinámica de variación de temperatura.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias Físicas: Sistema y mecanismo', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias Físicas',
             'eje', 'Sistema y mecanismo',
             'nombre_descriptivo', 'Máquinas, sensores, energía, transferencia y radiación',
             'conceptos', jsonb_build_array(
                 'Sistemas mecánicos y máquinas simples/compuestas.',
                 'Sensores e instrumentos de detección y medición física.',
                 'Energía: formas, fuentes y principio de transferencia de energía térmica y mecánica.',
                 'Radiación electromagnética y calor.'
             ),
             'procedimientos', jsonb_build_array(
                 'Construcción y ensamblaje de prototipos mecánicos sencillos o circuitos con sensores.',
                 'Comprobación empírica de transferencia de energía por conducción, convección y radiación.',
                 'Comunicación oral y escrita de explicaciones científicas apoyadas en modelos funcionales.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Creatividad e innovación tecnológica en la resolución de problemas prácticos.',
                 'Valoración del desarrollo científico en beneficio de la sociedad.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-1', 'IL-2', 'IL-9'),
                 'observaciones', 'Integra transferencia de energía, máquinas, sensores, energía y radiación.'
             )
         )),

        -- CIENCIAS DE LA TIERRA Y EL UNIVERSO (3 ejes)
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Tierra y el Universo: Materia y sus propiedades', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Tierra y el Universo',
             'eje', 'Materia y sus propiedades',
             'nombre_descriptivo', 'Composición, estructura y apariencia del Planeta Tierra',
             'conceptos', jsonb_build_array(
                 'Estructura interna y externa de la Tierra (geosfera, hidrosfera, atmósfera).',
                 'Composición litológica: rocas, minerales y suelos.',
                 'Características fisicoquímicas que hacen posible la vida en el Planeta Tierra.',
                 'Apariencia y modificaciones superficiales del Planeta.'
             ),
             'procedimientos', jsonb_build_array(
                 'Identificación y clasificación de muestras de rocas y minerales del contexto local.',
                 'Análisis de modelos tridimensionales o digitales de las capas terrestres.',
                 'Inferencia sobre la apariencia del planeta según condiciones físicas extremas.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Respeto y cuidado por los recursos geológicos y edáficos.',
                 'Conciencia sobre la fragilidad y singularidad de la biósfera terrestre.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-3', 'IL-4'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-3', 'IL-4'),
                 'observaciones', 'Relaciona las características y apariencia de la Tierra con su composición material.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Tierra y el Universo: Interacción y movimiento', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Tierra y el Universo',
             'eje', 'Interacción y movimiento',
             'nombre_descriptivo', 'Fuerza gravitacional, interacción Sol-Tierra y fenómenos geológicos/astronómicos',
             'conceptos', jsonb_build_array(
                 'Fuerza de gravedad y atracción gravitacional en el Sistema Solar.',
                 'Movimientos terrestres de rotación y traslación y sus consecuencias (estaciones, día y noche).',
                 'Interacción de la radiación y energía solar con la atmósfera y superficie terrestre.',
                 'Fenómenos geológicos (sismos, volcanes, placas tectónicas) y astronómicos (eclipses, mareas, meteoros).'
             ),
             'procedimientos', jsonb_build_array(
                 'Modelado del efecto de la distancia orbital al Sol y la fuerza gravitacional sobre la vida.',
                 'Simulación con maquetas o software astronómico de fenómenos cósmicos y geológicos.',
                 'Recolección, registro y organización de datos sobre actividad sísmica o ciclos solares.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Pensamiento reflexivo e imaginación científica basada en leyes de la física cósmica.',
                 'Cultura de prevención y gestión de riesgos ante fenómenos geológicos naturales.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3', 'IL-4', 'IL-6', 'IL-7'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-3', 'IL-4', 'IL-6', 'IL-7'),
                 'observaciones', 'Asocia gravedad, interacción Tierra-Sol, fenómenos astronómicos y radiación solar.'
             )
         )),
        ('Primaria', '6to', 'ciencias_naturaleza', 'Ciencias de la Tierra y el Universo: Sistema y mecanismo', 
         jsonb_build_object(
             'area_conocimiento', 'Ciencias de la Tierra y el Universo',
             'eje', 'Sistema y mecanismo',
             'nombre_descriptivo', 'El Sistema Solar, dinámica planetaria y mecanismos cósmicos',
             'conceptos', jsonb_build_array(
                 'El Sistema Solar: componentes (Sol, planetas rocosos y gaseosos, satélites, asteroides y cometas).',
                 'Mecanismos orbitales y leyes que rigen el equilibrio del sistema planetario.',
                 'La Tierra como sistema dinámico interactivo (atmósfera, litosfera, hidrosfera y biosfera).',
                 'Aportes de las tecnologías astronómicas (satélites, telescopios, sondas espaciales).'
             ),
             'procedimientos', jsonb_build_array(
                 'Construcción colaborativa de modelos a escala del Sistema Solar.',
                 'Explicación lógica de la relación astronómica Sol-Tierra y su impacto en la habitabilidad.',
                 'Uso de simuladores espaciales digitales para contrastar órbitas y mecanismos celestes.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Apreciación del orden y la vastedad del cosmos.',
                 'Interés vocacional por la exploración espacial, la ciencia y la tecnología.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-2', 'IL-3', 'IL-4', 'IL-6', 'IL-7', 'IL-9'),
             'relaciones_pedagogicas', jsonb_build_object(
                 'directas', jsonb_build_array('IL-2', 'IL-3', 'IL-4', 'IL-6', 'IL-7', 'IL-9'),
                 'observaciones', 'Eje integrador para Sistema Solar, relación Tierra-Sol, preservación planetaria y ciencia espacial.'
             )
         ))
    ON CONFLICT (nivel, grado, asignatura, contenido)
    DO UPDATE SET 
        contenido_json = EXCLUDED.contenido_json,
        updated_at = NOW();

END $$;
