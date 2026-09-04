ALTER TABLE pc_secuencias
ADD COLUMN curso_id int8 REFERENCES cursos(id) ON DELETE SET NULL,
ADD COLUMN grado text;
