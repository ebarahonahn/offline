-- ============================================================
-- Migración 003: Eliminación lógica en capturas
-- ============================================================
ALTER TABLE capturas ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de eliminación lógica';
ALTER TABLE capturas ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que eliminó';
