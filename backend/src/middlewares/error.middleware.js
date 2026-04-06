const { fail, serverError } = require('../utils/response.util');

// eslint-disable-next-line no-unused-vars
const errorMiddleware = (err, req, res, next) => {
  console.error('[Error]', err.message, err.stack?.split('\n')[1]?.trim());

  // Errores JWT
  if (err.name === 'JsonWebTokenError') return fail(res, 'Token inválido', 401);
  if (err.name === 'TokenExpiredError') return fail(res, 'Token expirado', 401);

  // Errores MySQL
  if (err.code === 'ER_DUP_ENTRY') return fail(res, 'El correo electrónico ya está en uso', 409);
  if (err.code === 'ER_NO_REFERENCED_ROW_2') return fail(res, 'El rol o departamento seleccionado no existe', 400);
  if (err.code === 'ER_ROW_IS_REFERENCED_2') return fail(res, 'No se puede eliminar: el usuario tiene registros asociados', 409);
  if (err.code === 'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD' || err.errno === 1366)
    return fail(res, 'Uno de los campos tiene un valor inválido. Verifica el formulario e intenta nuevamente', 400);

  // Error con statusCode propio
  if (err.statusCode) return fail(res, err.message, err.statusCode);

  // Error genérico
  const message = process.env.NODE_ENV === 'production'
    ? 'Error interno del servidor'
    : err.message;

  return serverError(res, message);
};

module.exports = errorMiddleware;
