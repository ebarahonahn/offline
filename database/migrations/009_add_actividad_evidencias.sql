-- ──────────────────────────────────────────────────────────────
-- Migración 009: Tabla de evidencias por actividad
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS actividad_evidencias (
  id           INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  actividad_id INT UNSIGNED  NOT NULL,
  usuario_id   INT UNSIGNED  NOT NULL,
  archivo_url  VARCHAR(500)  NOT NULL,
  nombre       VARCHAR(255)  NOT NULL COMMENT 'Nombre descriptivo de la evidencia',
  created_at   DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (actividad_id) REFERENCES actividades(id) ON DELETE CASCADE,
  FOREIGN KEY (usuario_id)   REFERENCES usuarios(id)    ON DELETE CASCADE,
  INDEX idx_actividad (actividad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Imágenes de evidencia adjuntas a una actividad';
