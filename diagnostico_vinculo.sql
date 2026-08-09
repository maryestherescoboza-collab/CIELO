-- 1. Docentes con perfiles.centro_id NULL pero con cursos:
SELECT 
    p.user_id, 
    p.nombre_docente, 
    p.nombre,
    COUNT(cd.curso_id) as total_cursos,
    STRING_AGG(DISTINCT c.centro_id::text, ', ') as centros_implicados
FROM public.perfiles p
JOIN public.curso_docentes cd ON p.user_id = cd.docente_id
JOIN public.cursos c ON cd.curso_id = c.id
WHERE p.centro_id IS NULL
GROUP BY p.user_id, p.nombre_docente, p.nombre;

-- 2. Docentes cuyo perfiles.centro_id coincide con el centro de sus cursos:
SELECT 
    p.user_id, 
    p.nombre_docente, 
    p.centro_id as perfil_centro_id, 
    c.centro_id as curso_centro_id, 
    COUNT(cd.curso_id) as total_cursos
FROM public.perfiles p
JOIN public.curso_docentes cd ON p.user_id = cd.docente_id
JOIN public.cursos c ON cd.curso_id = c.id
WHERE p.centro_id = c.centro_id
GROUP BY p.user_id, p.nombre_docente, p.centro_id, c.centro_id;

-- 3. Docentes con cursos en múltiples centros:
SELECT 
    cd.docente_id, 
    p.nombre_docente, 
    p.centro_id as perfil_centro_id, 
    COUNT(DISTINCT c.centro_id) as total_centros_distintos,
    STRING_AGG(DISTINCT c.centro_id::text, ', ') as centros_id
FROM public.curso_docentes cd
JOIN public.cursos c ON cd.curso_id = c.id
JOIN public.perfiles p ON cd.docente_id = p.user_id
GROUP BY cd.docente_id, p.nombre_docente, p.centro_id
HAVING COUNT(DISTINCT c.centro_id) > 1;
