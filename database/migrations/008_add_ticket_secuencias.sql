-- ──────────────────────────────────────────────────────────────
-- Migración 008: Tabla de secuencia atómica para tickets (CWE-362)
-- Reemplaza el COUNT(*) sin bloqueo en soporte.service.js
-- ──────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ticket_secuencias (
  anio       SMALLINT UNSIGNED NOT NULL,
  ultimo_seq INT UNSIGNED      NOT NULL DEFAULT 0,
  PRIMARY KEY (anio)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  COMMENT='Secuencia atómica por año para números de ticket STK-YYYY-NNNN';

-- Inicializar con los conteos reales de tickets existentes
INSERT INTO ticket_secuencias (anio, ultimo_seq)
SELECT YEAR(created_at) AS anio, COUNT(*) AS ultimo_seq
FROM tickets
GROUP BY YEAR(created_at)
ON DUPLICATE KEY UPDATE ultimo_seq = VALUES(ultimo_seq);
