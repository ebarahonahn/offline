const ok = (res, data = null, message = 'OK', status = 200) =>
  res.status(status).json({ success: true, data, message });

const created = (res, data, message = 'Creado exitosamente') =>
  ok(res, data, message, 201);

const fail = (res, message = 'Error en la solicitud', status = 400, errors = null) =>
  res.status(status).json({ success: false, message, ...(errors && { errors }) });

const unauthorized = (res, message = 'No autorizado') =>
  fail(res, message, 401);

const forbidden = (res, message = 'Acceso denegado') =>
  fail(res, message, 403);

const notFound = (res, message = 'Recurso no encontrado') =>
  fail(res, message, 404);

const serverError = (res, message = 'Error interno del servidor') =>
  fail(res, message, 500);

const paged = (res, data, pagination) =>
  res.json({ success: true, data, pagination });

module.exports = { ok, created, fail, unauthorized, forbidden, notFound, serverError, paged };
