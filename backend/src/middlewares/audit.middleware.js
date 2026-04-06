const { query } = require('../config/database');

// Campos sensibles que nunca deben guardarse en auditoría
const CAMPOS_SENSIBLES = ['password_hash', 'reset_token', 'reset_token_exp'];

const sanitizar = (obj) => {
  if (!obj) return null;
  const copia = { ...obj };
  CAMPOS_SENSIBLES.forEach(f => delete copia[f]);
  return copia;
};

/**
 * Factory de middleware de auditoría
 * @param {string} accion  - Ej: 'LOGIN', 'CREATE_USUARIO', 'UPDATE_USUARIO', 'DELETE_USUARIO'
 * @param {string} entidad - Nombre lógico de la entidad: 'usuarios', 'departamentos', etc.
 * @param {string} tabla   - Nombre real de la tabla MySQL para capturar estado anterior (UPDATE/DELETE).
 *                           Si es null, no se captura estado anterior (útil en CREATE/LOGIN).
 */
const auditLog = (accion, entidad = null, tabla = null) => async (req, res, next) => {
  // Capturar estado anterior ANTES de que el controlador ejecute la acción
  let datosAnt = null;
  if (tabla && req.params?.id) {
    try {
      const [rows] = await query(`SELECT * FROM \`${tabla}\` WHERE id = ?`, [req.params.id]);
      datosAnt = sanitizar(rows[0] || null);
    } catch (err) {
      console.error('[Audit] Error al capturar estado anterior:', err.message);
    }
  }

  const originalJson = res.json.bind(res);

  res.json = function (body) {
    // Auditar toda operación que haya sido exitosa
    if (body?.success) {
      const entidadId = body.data?.id
        || (req.params?.id ? parseInt(req.params.id) : null)
        || null;

      query(
        `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_ant, datos_nue, ip, user_agent)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          req.user?.id || null,
          accion,
          entidad,
          entidadId,
          datosAnt ? JSON.stringify(datosAnt) : null,
          body.data ? JSON.stringify(body.data) : null,
          req.ip,
          req.headers['user-agent']?.slice(0, 500) || null,
        ]
      ).catch(err => console.error('[Audit] Error al registrar:', err.message));
    }
    return originalJson(body);
  };

  next();
};

module.exports = { auditLog };
