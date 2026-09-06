-- Migración: Garantizar un único Producto Final por curso + período + asignatura
-- Previene duplicados concurrentes en la creación del Producto Final

CREATE UNIQUE INDEX IF NOT EXISTS idx_unico_producto_final
ON actividades (
    curso_id,
    periodo,
    COALESCE(asignatura, '')
)
WHERE is_producto_final = true;
