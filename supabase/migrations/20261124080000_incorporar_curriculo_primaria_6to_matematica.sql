-- Migración: Incorporación del Nivel Primario en CIELO (6to Grado - Matemática)
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
    -- 1. Competencias Específicas (3 bloques oficiales de Primaria para Matemática 6to)
    INSERT INTO public.curr_competencias_especificas 
        (nivel, grado, asignatura, bloque, competencia_fundamental, codigo, descriptor)
    VALUES 
        ('Primaria', '6to', 'matematica', 'BC1', 'Comunicativa', 'CE-MAT1', 
         'Interpreta textos, leyendo, escribiendo y discutiendo en forma comprensiva sus ideas matemáticas para resolver problemas de su contexto.')
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
        ('Primaria', '6to', 'matematica', 'BC2', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'CE-MAT2', 
         'Aplica sus conocimientos matemáticos a la resolución de problemas abiertos y tareas ampliadas de resolución de problemas apoyándose en las tecnologías digitales.')
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
        ('Primaria', '6to', 'matematica', 'BC3', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'CE-MAT3', 
         'Modela posibles soluciones a situaciones del contexto social y el medio ambiente a partir de sus conocimientos matemáticos.')
    ON CONFLICT (nivel, grado, asignatura, competencia_fundamental) 
    DO UPDATE SET 
        codigo = EXCLUDED.codigo,
        descriptor = EXCLUDED.descriptor,
        bloque = EXCLUDED.bloque,
        updated_at = NOW()
    RETURNING id INTO v_ce3_id;

    -- 2. Limpieza previa para idempotencia en indicadores de Matemática 6to Primaria
    DELETE FROM public.curr_indicadores 
    WHERE nivel = 'Primaria' AND grado = '6to' AND asignatura = 'matematica';

    -- Indicadores Bloque 1 (Comunicativa)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Comunicativa', 'IL-1', 'Explica con precisión ideas matemáticas referidas a la comparación, redondeo y orden con números enteros, fracciones y decimales hasta la millonésima y los vincula con situaciones de su contexto familiar y escolar que demanden operaciones con enteros y cálculos de potencias de base diez en su notación desarrollada.', true)
    RETURNING id INTO v_ind1_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Comunicativa', 'IL-2', 'Interpreta con juicios críticos precisos el sentido de la radicación y la identifica como operación inversa de la potencia para resolver problemas diversos en la que se aplica la factorización numérica como forma de obtener el MCD y MCM.', true)
    RETURNING id INTO v_ind2_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Comunicativa', 'IL-3', 'Comunica de manera coherente ideas y procesos matemáticos a situaciones del contexto vinculando los conocimientos de patrones numéricos y valor posicional hasta la cienmilésima y los aplica en situaciones de la vida diaria que ameriten cálculos financieros a partir de los conceptos de razón, proporción, porcentaje y tanto por ciento.', true)
    RETURNING id INTO v_ind3_id;

    -- Indicadores Bloque 2 (Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-4', 'Aplica el razonamiento lógico para identificar y diferenciar problemas en la que se apliquen los conocimientos sobre figuras semejantes y congruentes, así como polígonos (regulares e irregulares, inscritos y circunscritos) y en situaciones de la vida cotidiana en la que se requiera tomar decisiones sobre el cálculo de diagonales del polígono.', true)
    RETURNING id INTO v_ind4_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-5', 'Emplea el sentido lógico sobre ideas matemáticas relacionadas con los cuadriláteros y sus tipos asociados a situaciones de la vida diaria en la que se aplique el teorema de Pitágoras y su vinculación con las transformaciones geométricas (rotación, reflexión y traslación) como forma de detectar regularidades en las figuras.', true)
    RETURNING id INTO v_ind5_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Pensamiento Lógico, Creativo y Crítico; Resolución de Problemas; Tecnológica y Científica', 'IL-6', 'Interpreta y plantea soluciones sobre situaciones del contexto comunitario en la que se pongan de manifiesto sus conocimientos sobre las unidades del sistema métrico decimal (kilómetro, hectómetro, decámetro, metro, decímetro, centímetro y milímetro) y las unidades del sistema inglés (pulgada, pie, yarda y milla) asociadas a cálculos de longitud de una circunferencia, perímetro, área de polígonos, volumen del prisma y la pirámide, unidades de capacidad (litro y mililitro) y unidades de temperatura (Celsius y Fahrenheit).', true)
    RETURNING id INTO v_ind6_id;

    -- Indicadores Bloque 3 (Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud)
    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-7', 'Aplica de forma responsable conceptos relacionados con las medidas de tendencia central y de probabilidad para eventos simples asociados al espacio muestral, y las ideas matemáticas sobre los gráficos lineales para el análisis de situaciones del contexto social y la preservación del medio ambiente y la salud.', true)
    RETURNING id INTO v_ind7_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-8', 'Utiliza herramientas tecnológicas para modelar y resolver problemas diversos vinculados a los conceptos de numeración, geometría, medición y estadística para datos no agrupados, y comparte de forma colaborativa los resultados.', true)
    RETURNING id INTO v_ind8_id;

    INSERT INTO public.curr_indicadores (nivel, grado, asignatura, competencia, codigo, descripcion, is_active)
    VALUES ('Primaria', '6to', 'matematica', 'Ética y Ciudadana; Desarrollo Personal y Espiritual; Ambiental y de la Salud', 'IL-9', 'Valora el papel de las matemáticas en la toma de decisiones ciudadanas éticas, el cuidado del entorno escolar y comunitario, y el desarrollo de actitudes de perseverancia y rigor en el trabajo científico y personal.', true)
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

    -- 4. Contenidos Curriculares por Ejes (Numeración, Geometría, Medición, Estadística y Probabilidad)
    INSERT INTO public.curr_contenidos (nivel, grado, asignatura, contenido, contenido_json)
    VALUES 
        ('Primaria', '6to', 'matematica', 'Numeración: Enteros, Fracciones, Decimales y Potencias', 
         jsonb_build_object(
             'eje', 'Numeración',
             'conceptos', jsonb_build_array(
                 'Números naturales: concepto y notación desarrollada.',
                 'Números enteros, fracciones y decimales: concepto, valor posicional, comparación y operaciones.',
                 'Potencia de números naturales y sus propiedades.',
                 'Factorización y criterios de divisibilidad.',
                 'MCD y MCM de números naturales.',
                 'Patrones numéricos y valor posicional hasta la cienmilésima.',
                 'Concepto de razón y proporción.',
                 'Interés simple: concepto y elementos.',
                 'Cálculo de impuestos, porcentaje y tanto por ciento.'
             ),
             'procedimientos', jsonb_build_array(
                 'Comparación, ordenamiento y redondeo de enteros, fracciones y decimales hasta la millonésima.',
                 'Cálculo de potencias de base diez en notación desarrollada.',
                 'Identificación de la radicación como operación inversa de la potenciación.',
                 'Descomposición factorial para obtención de MCD y MCM en problemas del entorno.',
                 'Resolución de problemas financieros contextualizados (razón, proporción, porcentaje e impuestos).'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Rigurosidad y precisión en el cálculo numérico.',
                 'Interés por resolver situaciones financieras y cotidianas mediante el razonamiento matemático.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-1', 'IL-2', 'IL-3')
         )),
        ('Primaria', '6to', 'matematica', 'Geometría: Polígonos, Cuadriláteros y Transformaciones', 
         jsonb_build_object(
             'eje', 'Geometría',
             'conceptos', jsonb_build_array(
                 'Figuras semejantes y congruentes.',
                 'Polígonos regulares e irregulares (inscritos y circunscritos).',
                 'Diagonales de un polígono.',
                 'Cuadriláteros y sus clasificaciones.',
                 'Ángulos internos y externos.',
                 'Teorema de Pitágoras y sus elementos fundamentales.',
                 'Ángulos: tipos, notación, medida y construcción.',
                 'Transformaciones geométricas: rotación, reflexión y traslación.'
             ),
             'procedimientos', jsonb_build_array(
                 'Diferenciación y trazado de figuras semejantes y congruentes.',
                 'Cálculo de diagonales de un polígono y toma de decisiones en situaciones prácticas.',
                 'Aplicación del teorema de Pitágoras en triángulos rectángulos y figuras compuestas.',
                 'Detección de regularidades y patrones visuales mediante rotaciones, reflexiones y traslaciones.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Aprecio por las formas y la armonía geométrica en la naturaleza y la arquitectura.',
                 'Perseverancia en el razonamiento deductivo y deductivo espacial.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-4', 'IL-5')
         )),
        ('Primaria', '6to', 'matematica', 'Medición: Longitud, Perímetro, Área, Volumen y Temperatura', 
         jsonb_build_object(
             'eje', 'Medición',
             'conceptos', jsonb_build_array(
                 'Unidades del sistema métrico decimal: km, hm, dam, m, dm, cm, mm.',
                 'Unidades del sistema inglés: pulgada, pie, yarda y milla.',
                 'Longitud de la circunferencia y número Pi.',
                 'Perímetro y área de polígonos.',
                 'Volumen del prisma y la pirámide.',
                 'Unidades de capacidad: litro y mililitro.',
                 'Unidades de temperatura: escalas Celsius y Fahrenheit.'
             ),
             'procedimientos', jsonb_build_array(
                 'Conversión y estimación entre unidades del sistema métrico decimal e inglés.',
                 'Cálculo de la longitud de circunferencias, perímetros y áreas de polígonos del entorno escolar.',
                 'Cálculo del volumen de cuerpos geométricos (prismas y pirámides) y capacidad de recipientes.',
                 'Interpretación y equivalencias entre temperaturas en grados Celsius y Fahrenheit.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Precisión y cuidado en el uso de instrumentos de medición.',
                 'Responsabilidad en el uso de recursos hídricos y energéticos vinculados a la medición.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-6')
         )),
        ('Primaria', '6to', 'matematica', 'Estadística y Probabilidad: Tendencia Central y Gráficos', 
         jsonb_build_object(
             'eje', 'Estadística y Probabilidad',
             'conceptos', jsonb_build_array(
                 'Medidas de tendencia central: media, mediana y moda para datos no agrupados.',
                 'Probabilidad: eventos simples y espacio muestral.',
                 'Gráficos estadísticos lineales y de barras.',
                 'Herramientas tecnológicas aplicadas a la recopilación y análisis de datos.'
             ),
             'procedimientos', jsonb_build_array(
                 'Cálculo e interpretación de la media, mediana y moda en encuestas comunitarias y de salud.',
                 'Determinación de probabilidades en situaciones de juego o experimentos aleatorios simples.',
                 'Construcción y lectura crítica de gráficos lineales en situaciones ambientales y sociales.',
                 'Uso de hojas de cálculo o software educativo para modelar datos matemáticos.'
             ),
             'actitudes_valores', jsonb_build_array(
                 'Honestidad, objetividad y ética en la recolección y comunicación de información estadística.',
                 'Sensibilidad social y compromiso medioambiental ante los datos analizados.'
             ),
             'indicadores_relacionados', jsonb_build_array('IL-7', 'IL-8', 'IL-9')
         ))
    ON CONFLICT (nivel, grado, asignatura, contenido)
    DO UPDATE SET 
        contenido_json = EXCLUDED.contenido_json,
        updated_at = NOW();

END $$;
