const { verifyToken } = require('../config/jwt');
const { query } = require('../config/database');
const { unauthorized } = require('../utils/response.util');

const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return unauthorized(res, 'Token de acceso requerido');
    }

    const token = authHeader.slice(7);
    const decoded = verifyToken(token);

    // Verificar que la sesión esté activa en DB
    const [rows] = await query(
      'SELECT id FROM sesiones WHERE id = ? AND activa = 1 AND expires_at > NOW()',
      [decoded.sessionId]
    );
    if (!rows.length) return unauthorized(res, 'Sesión expirada o inválida');

    // Verificar que el usuario siga activo (incluye nombre del rol para disponibilidad universal)
    const [users] = await query(
      `SELECT u.id, u.nombre, u.apellido, u.email, u.rol_id, u.departamento_id, u.estado, r.nombre AS rol
       FROM usuarios u
       JOIN roles r ON r.id = u.rol_id
       WHERE u.id = ? AND u.estado = 'activo'`,
      [decoded.id]
    );
    if (!users.length) return unauthorized(res, 'Usuario no encontrado o inactivo');

    req.user = { ...users[0], sessionId: decoded.sessionId };
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authenticate };
