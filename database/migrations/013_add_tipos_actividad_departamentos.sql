-- Migración 013: Asociar tipos de actividad con departamentos
-- Un tipo sin departamentos asignados es global (visible para todos).
-- Un tipo con al menos un departamento asignado solo es visible para usuarios de esos departamentos.

CREATE TABLE IF NOT EXISTS departamento_tipos_actividad (
  departamento_id   INT UNSIGNED NOT NULL,
  tipo_actividad_id INT UNSIGNED NOT NULL,
  PRIMARY KEY (departamento_id, tipo_actividad_id),
  FOREIGN KEY (departamento_id)   REFERENCES departamentos(id)   ON DELETE CASCADE,
  FOREIGN KEY (tipo_actividad_id) REFERENCES tipos_actividad(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
