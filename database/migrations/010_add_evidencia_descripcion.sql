-- ──────────────────────────────────────────────────────────────
-- Migración 010: Columna descripcion en actividad_evidencias
-- ──────────────────────────────────────────────────────────────

ALTER TABLE actividad_evidencias
  ADD COLUMN descripcion TEXT NULL COMMENT 'Descripción de lo realizado en la evidencia'
  AFTER nombre;
