-- ──────────────────────────────────────────────────────────────
-- Migración 007: Event de limpieza de sesiones expiradas
-- Previene degradación progresiva de la tabla sesiones (CWE-400)
-- ──────────────────────────────────────────────────────────────

-- Habilitar el scheduler de eventos de MySQL si no está activo.
-- En producción verificar con: SHOW VARIABLES LIKE 'event_scheduler';
SET GLOBAL event_scheduler = ON;

-- Eliminar si ya existía una versión previa del event
DROP EVENT IF EXISTS limpiar_sesiones_expiradas;

CREATE EVENT limpiar_sesiones_expiradas
  ON SCHEDULE EVERY 1 DAY
  STARTS (CURRENT_TIMESTAMP + INTERVAL 1 HOUR)
  ON COMPLETION PRESERVE
  COMMENT 'Elimina sesiones expiradas hace más de 7 días para evitar crecimiento indefinido de la tabla'
DO
  DELETE FROM sesiones
  WHERE expires_at < NOW() - INTERVAL 7 DAY;
