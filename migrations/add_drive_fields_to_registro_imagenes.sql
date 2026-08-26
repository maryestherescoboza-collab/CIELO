-- Migración: Agregar campos de Google Drive a registro_imagenes
-- Ejecutar en Supabase SQL Editor
-- NO elimina datos existentes - los registros actuales en Supabase Storage siguen funcionando

-- Agregar columnas para soporte de Google Drive
ALTER TABLE registro_imagenes
  ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
  ADD COLUMN IF NOT EXISTS drive_thumbnail_url TEXT,
  ADD COLUMN IF NOT EXISTS storage_provider TEXT NOT NULL DEFAULT 'supabase_storage';

-- Agregar índice para consultas por storage_provider
CREATE INDEX IF NOT EXISTS idx_registro_imagenes_storage_provider
  ON registro_imagenes(storage_provider);

-- Comentario de las columnas
COMMENT ON COLUMN registro_imagenes.drive_file_id IS 'ID del archivo en Google Drive (solo para imágenes subidas vía Drive)';
COMMENT ON COLUMN registro_imagenes.drive_thumbnail_url IS 'URL de miniatura de Google Drive';
COMMENT ON COLUMN registro_imagenes.storage_provider IS 'Proveedor de almacenamiento: supabase_storage o google_drive';

-- Verificar que registros_anecdoticos tiene la columna activo (necesaria para soft-delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_anecdoticos' AND column_name = 'activo'
  ) THEN
    ALTER TABLE registros_anecdoticos ADD COLUMN activo BOOLEAN NOT NULL DEFAULT true;
    COMMENT ON COLUMN registros_anecdoticos.activo IS 'Soft-delete: false = archivado';
  END IF;
END $$;
