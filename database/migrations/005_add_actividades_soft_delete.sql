-- ============================================================
-- Migración 005: Eliminación lógica en actividades
-- ============================================================
ALTER TABLE actividades ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de eliminación lógica';
ALTER TABLE actividades ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que eliminó';
