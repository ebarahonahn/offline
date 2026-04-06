-- ============================================================
-- Migración 002: Trazabilidad de eliminaciones y modificaciones
-- Compatible con MySQL 8.0+
-- ============================================================

-- USUARIOS
ALTER TABLE usuarios ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de eliminación lógica'  AFTER updated_at;
ALTER TABLE usuarios ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que eliminó'   AFTER deleted_at;
ALTER TABLE usuarios ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó'  AFTER deleted_by;

-- DEPARTAMENTOS
ALTER TABLE departamentos ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de desactivación lógica';
ALTER TABLE departamentos ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que desactivó';
ALTER TABLE departamentos ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó';
ALTER TABLE departamentos ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- TIPOS_ACTIVIDAD
ALTER TABLE tipos_actividad ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de desactivación lógica';
ALTER TABLE tipos_actividad ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que desactivó';
ALTER TABLE tipos_actividad ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó';
ALTER TABLE tipos_actividad ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

-- AUDITORIA: índice adicional
ALTER TABLE auditoria ADD INDEX idx_accion (accion);
