-- ============================================================
-- Sistema de Control de Tiempo Laboral en Teletrabajo
-- Schema MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS teletrabajo_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE teletrabajo_db;

-- ----------------------------------------------------------
-- ROLES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  id         TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre     VARCHAR(50)      NOT NULL UNIQUE,
  created_at DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO roles (nombre) VALUES ('admin'), ('supervisor'), ('empleado'), ('jefe_departamento');

-- ----------------------------------------------------------
-- DEPARTAMENTOS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS departamentos (
  id          INT UNSIGNED  NOT NULL AUTO_INCREMENT,
  nombre      VARCHAR(100)  NOT NULL UNIQUE,
  descripcion VARCHAR(255)  NULL,
  activo      TINYINT(1)    NOT NULL DEFAULT 1,
  created_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO departamentos (nombre) VALUES ('Administración'), ('Tecnología'), ('Recursos Humanos'), ('Finanzas');

-- ----------------------------------------------------------
-- USUARIOS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS usuarios (
  id              INT UNSIGNED     NOT NULL AUTO_INCREMENT,
  nombre          VARCHAR(100)     NOT NULL,
  apellido        VARCHAR(100)     NOT NULL,
  email           VARCHAR(150)     NOT NULL UNIQUE,
  password_hash   VARCHAR(255)     NOT NULL,
  rol_id          TINYINT UNSIGNED NOT NULL,
  departamento_id INT UNSIGNED     NULL,
  supervisor_id   INT UNSIGNED     NULL,
  avatar_url      VARCHAR(500)     NULL,
  estado                 ENUM('activo','inactivo','suspendido') NOT NULL DEFAULT 'activo',
  ultimo_acceso          DATETIME         NULL,
  debe_cambiar_password  TINYINT(1)       NOT NULL DEFAULT 0,
  reset_token            VARCHAR(255)     NULL,
  reset_token_exp        DATETIME         NULL,
  created_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at      DATETIME         NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (rol_id)          REFERENCES roles(id),
  FOREIGN KEY (departamento_id) REFERENCES departamentos(id) ON DELETE SET NULL,
  FOREIGN KEY (supervisor_id)   REFERENCES usuarios(id)      ON DELETE SET NULL,
  INDEX idx_email    (email),
  INDEX idx_rol_id   (rol_id),
  INDEX idx_dept_id  (departamento_id),
  INDEX idx_estado   (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- TIPOS DE ACTIVIDAD
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS tipos_actividad (
  id        INT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre    VARCHAR(100) NOT NULL UNIQUE,
  color_hex VARCHAR(7)   NOT NULL DEFAULT '#6366f1',
  activo    TINYINT(1)   NOT NULL DEFAULT 1,
  PRIMARY KEY (id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO tipos_actividad (nombre, color_hex) VALUES
  ('Reunión',        '#3b82f6'),
  ('Desarrollo',     '#10b981'),
  ('Documentación',  '#f59e0b'),
  ('Soporte',        '#ef4444'),
  ('Capacitación',   '#8b5cf6'),
  ('Otro',           '#6b7280');

-- ----------------------------------------------------------
-- JORNADAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS jornadas (
  id            INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id    INT UNSIGNED NOT NULL,
  fecha         DATE         NOT NULL,
  hora_inicio   DATETIME     NOT NULL,
  hora_fin      DATETIME     NULL,
  estado        ENUM('activa','pausada','finalizada','anulada') NOT NULL DEFAULT 'activa',
  ip_inicio     VARCHAR(45)  NULL,
  ip_fin        VARCHAR(45)  NULL,
  observaciones TEXT         NULL,
  created_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at    DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  UNIQUE KEY uq_usuario_fecha (usuario_id, fecha),
  INDEX idx_fecha      (fecha),
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_estado     (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- PAUSAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS pausas (
  id           INT UNSIGNED NOT NULL AUTO_INCREMENT,
  jornada_id   INT UNSIGNED NOT NULL,
  hora_inicio  DATETIME     NOT NULL,
  hora_fin     DATETIME     NULL,
  tipo         ENUM('manual','inactividad','sistema') NOT NULL DEFAULT 'manual',
  motivo       VARCHAR(255) NULL,
  duracion_min INT UNSIGNED NULL COMMENT 'Calculado al cerrar la pausa',
  PRIMARY KEY (id),
  FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE CASCADE,
  INDEX idx_jornada_id (jornada_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- ACTIVIDADES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS actividades (
  id                INT UNSIGNED NOT NULL AUTO_INCREMENT,
  jornada_id        INT UNSIGNED NOT NULL,
  tipo_actividad_id INT UNSIGNED NULL,
  nombre            VARCHAR(200) NOT NULL,
  descripcion       TEXT         NULL,
  hora_inicio       DATETIME     NOT NULL,
  hora_fin          DATETIME     NULL,
  tiempo_min        INT UNSIGNED NULL COMMENT 'Duración en minutos',
  estado            ENUM('en_progreso','completada','cancelada') NOT NULL DEFAULT 'completada',
  aprobada          TINYINT(1)   NOT NULL DEFAULT 0,
  aprobada_por      INT UNSIGNED NULL,
  created_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (jornada_id)        REFERENCES jornadas(id)       ON DELETE CASCADE,
  FOREIGN KEY (tipo_actividad_id) REFERENCES tipos_actividad(id) ON DELETE SET NULL,
  FOREIGN KEY (aprobada_por)      REFERENCES usuarios(id)        ON DELETE SET NULL,
  INDEX idx_jornada_id (jornada_id),
  INDEX idx_estado     (estado)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- INACTIVIDAD
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS inactividad (
  id          INT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id  INT UNSIGNED NOT NULL,
  jornada_id  INT UNSIGNED NULL,
  fecha       DATE         NOT NULL,
  hora_inicio DATETIME     NOT NULL,
  hora_fin    DATETIME     NULL,
  tiempo_min  INT UNSIGNED NULL,
  origen      ENUM('detector','manual','sistema') NOT NULL DEFAULT 'detector',
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  FOREIGN KEY (jornada_id) REFERENCES jornadas(id) ON DELETE SET NULL,
  INDEX idx_usuario_fecha (usuario_id, fecha)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- CONFIGURACIONES
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS configuraciones (
  clave       VARCHAR(100)  NOT NULL,
  valor       TEXT          NOT NULL,
  tipo        ENUM('string','number','boolean','json') NOT NULL DEFAULT 'string',
  descripcion VARCHAR(255)  NULL,
  grupo       VARCHAR(50)   NOT NULL DEFAULT 'general',
  updated_at  DATETIME      NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (clave)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO configuraciones (clave, valor, tipo, descripcion, grupo) VALUES
  ('inactividad_umbral_min',  '60',            'number',  'Minutos sin interacción para detectar inactividad', 'inactividad'),
  ('inactividad_alerta_min',  '90',            'number',  'Minutos para mostrar alerta previa',                'inactividad'),
  ('jornada_hora_inicio',     '08:00',        'string',  'Hora de inicio de jornada laboral',                 'jornada'),
  ('jornada_hora_fin',        '17:00',        'string',  'Hora de fin de jornada laboral',                    'jornada'),
  ('jornada_dias_laborales',  '[1,2,3,4,5]',  'json',    'Días laborales (0=Dom, 1=Lun...)',                  'jornada'),
  ('empresa_nombre',          'Mi Institución','string', 'Nombre de la institución',                          'general'),
  ('empresa_logo_url',        '',             'string',  'URL del logo de la empresa',                        'general'),
  ('sesion_timeout_min',      '60',           'number',  'Minutos de inactividad para cerrar sesión',         'seguridad'),
  ('capturas_habilitadas',    'false',        'boolean', 'Habilitar captura de pantalla periódica',           'monitoreo'),
  ('capturas_intervalo_min',  '30',           'number',  'Intervalo entre capturas en minutos',               'monitoreo');

-- ----------------------------------------------------------
-- AUDITORIA
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS auditoria (
  id         BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  usuario_id INT UNSIGNED    NULL,
  accion     VARCHAR(100)    NOT NULL,
  entidad    VARCHAR(50)     NULL,
  entidad_id INT UNSIGNED    NULL,
  datos_ant  JSON            NULL COMMENT 'Estado anterior',
  datos_nue  JSON            NULL COMMENT 'Estado nuevo',
  ip         VARCHAR(45)     NULL,
  user_agent VARCHAR(500)    NULL,
  created_at DATETIME        NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_usuario_id (usuario_id),
  INDEX idx_created_at (created_at),
  INDEX idx_entidad    (entidad, entidad_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- MIGRACIONES (ejecutar si la BD ya existe)
-- ----------------------------------------------------------
ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0 AFTER ultimo_acceso;

-- Migración 002: trazabilidad de eliminaciones y modificaciones
ALTER TABLE usuarios ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de eliminación lógica'  AFTER updated_at;
ALTER TABLE usuarios ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que eliminó'   AFTER deleted_at;
ALTER TABLE usuarios ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó'  AFTER deleted_by;

ALTER TABLE departamentos ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de desactivación lógica';
ALTER TABLE departamentos ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que desactivó';
ALTER TABLE departamentos ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó';
ALTER TABLE departamentos ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE tipos_actividad ADD COLUMN deleted_at DATETIME     NULL COMMENT 'Fecha de desactivación lógica';
ALTER TABLE tipos_actividad ADD COLUMN deleted_by INT UNSIGNED NULL COMMENT 'ID del usuario que desactivó';
ALTER TABLE tipos_actividad ADD COLUMN updated_by INT UNSIGNED NULL COMMENT 'ID del usuario que modificó';
ALTER TABLE tipos_actividad ADD COLUMN updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP;

ALTER TABLE auditoria ADD INDEX idx_accion (accion);

-- ----------------------------------------------------------
-- SESIONES ACTIVAS
-- ----------------------------------------------------------
CREATE TABLE IF NOT EXISTS sesiones (
  id         VARCHAR(36)  NOT NULL COMMENT 'UUID',
  usuario_id INT UNSIGNED NOT NULL,
  token_hash VARCHAR(255) NOT NULL,
  ip         VARCHAR(45)  NULL,
  user_agent VARCHAR(500) NULL,
  activa     TINYINT(1)   NOT NULL DEFAULT 1,
  expires_at DATETIME     NOT NULL,
  created_at DATETIME     NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  INDEX idx_usuario_activa (usuario_id, activa),
  INDEX idx_expires        (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------
-- EVENT: limpieza automática de sesiones expiradas
-- Requiere event_scheduler = ON en el servidor MySQL
-- ----------------------------------------------------------
SET GLOBAL event_scheduler = ON;

DROP EVENT IF EXISTS limpiar_sesiones_expiradas;

CREATE EVENT limpiar_sesiones_expiradas
  ON SCHEDULE EVERY 1 DAY
  STARTS (CURRENT_TIMESTAMP + INTERVAL 1 HOUR)
  ON COMPLETION PRESERVE
  COMMENT 'Elimina sesiones expiradas hace más de 7 días para evitar crecimiento indefinido de la tabla'
DO
  DELETE FROM sesiones
  WHERE expires_at < NOW() - INTERVAL 7 DAY;
