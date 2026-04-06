const { query } = require('../config/database');
const { forbidden } = require('../utils/response.util');

// Cache de nombres de roles
const roleCache = {};

const getRoleName = async (rolId) => {
  if (roleCache[rolId]) return roleCache[rolId];
  const [rows] = await query('SELECT nombre FROM roles WHERE id = ?', [rolId]);
  if (rows.length) roleCache[rolId] = rows[0].nombre;
  return roleCache[rolId];
};

/**
 * Middleware factory: authorize('admin', 'supervisor')
 */
const authorize = (...roles) => async (req, res, next) => {
  try {
    const roleName = await getRoleName(req.user.rol_id);
    if (!roles.includes(roleName)) {
      return forbidden(res, `Acceso restringido a: ${roles.join(', ')}`);
    }
    req.user.rol = roleName;
    next();
  } catch (err) {
    next(err);
  }
};

module.exports = { authorize };
