-- ============================================================
-- Migración 004: Trazabilidad de reactivación de jornadas
-- ============================================================
ALTER TABLE jornadas ADD COLUMN reactivado_por INT UNSIGNED NULL COMMENT 'ID del admin que reactivó la jornada';
ALTER TABLE jornadas ADD COLUMN reactivado_at  DATETIME     NULL COMMENT 'Fecha y hora de la reactivación';
