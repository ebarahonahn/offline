-- Migración: Tabla de capturas de pantalla
-- Ejecutar: mysql -u root -p teletrabajo_db < 001_add_capturas.sql

CREATE TABLE IF NOT EXISTS capturas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  usuario_id    INT          NOT NULL,
  jornada_id    INT          NOT NULL,
  ruta_archivo  VARCHAR(500) NOT NULL,
  capturado_en  DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at    DATETIME     DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_cap_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_cap_jornada  FOREIGN KEY (jornada_id)  REFERENCES jornadas(id) ON DELETE CASCADE,
  INDEX idx_cap_usuario_fecha (usuario_id, capturado_en),
  INDEX idx_cap_jornada       (jornada_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
