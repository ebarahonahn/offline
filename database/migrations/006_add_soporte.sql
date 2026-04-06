-- Módulo de Soporte Técnico

CREATE TABLE IF NOT EXISTS tickets (
  id             INT UNSIGNED    NOT NULL AUTO_INCREMENT,
  numero         VARCHAR(20)     NOT NULL,
  usuario_id     INT UNSIGNED    NOT NULL,
  asignado_a     INT UNSIGNED    NULL,
  categoria      ENUM('funcionalidad','error','solicitud','consulta','otro') NOT NULL DEFAULT 'consulta',
  prioridad      ENUM('baja','media','alta','urgente') NOT NULL DEFAULT 'media',
  estado         ENUM('abierto','en_proceso','pendiente_usuario','resuelto','cerrado') NOT NULL DEFAULT 'abierto',
  titulo         VARCHAR(255)    NOT NULL,
  descripcion    TEXT            NOT NULL,
  resuelto_en    DATETIME        NULL,
  created_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_numero (numero),
  CONSTRAINT fk_ticket_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_ticket_asignado FOREIGN KEY (asignado_a)  REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_ticket_estado    (estado),
  INDEX idx_ticket_usuario   (usuario_id),
  INDEX idx_ticket_asignado  (asignado_a),
  INDEX idx_ticket_created   (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS ticket_respuestas (
  id               INT UNSIGNED NOT NULL AUTO_INCREMENT,
  ticket_id        INT UNSIGNED NOT NULL,
  usuario_id       INT UNSIGNED NOT NULL,
  mensaje          TEXT         NOT NULL,
  es_nota_interna  TINYINT(1)   NOT NULL DEFAULT 0,
  created_at       DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  CONSTRAINT fk_resp_ticket  FOREIGN KEY (ticket_id)  REFERENCES tickets(id) ON DELETE CASCADE,
  CONSTRAINT fk_resp_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_resp_ticket  (ticket_id),
  INDEX idx_resp_usuario (usuario_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
