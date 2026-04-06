const svc = require('./capturas.service');
const { ok, created, fail } = require('../../utils/response.util');

// POST /api/capturas  — empleado sube su propia captura
const subirCaptura = async (req, res, next) => {
  try {
    const { imagen, jornada_id } = req.body;
    if (!imagen)     return fail(res, 'El campo imagen es requerido');
    if (!jornada_id) return fail(res, 'El campo jornada_id es requerido');

    const result = await svc.guardar(req.user.id, jornada_id, imagen);
    return created(res, result, 'Captura guardada');
  } catch (err) { next(err); }
};

// GET /api/capturas — admin/supervisor
const listar = async (req, res, next) => {
  try {
    const { usuario_id, jornada_id, fecha, page, limit } = req.query;
    const data = await svc.listar({ usuarioId: usuario_id, jornadaId: jornada_id, fecha, page, limit });
    return res.json({ success: true, ...data });
  } catch (err) { next(err); }
};

// DELETE /api/capturas/:id — admin
const eliminar = async (req, res, next) => {
  try {
    await svc.eliminar(req.params.id, req.user.id);
    return ok(res, null, 'Captura eliminada');
  } catch (err) { next(err); }
};

// GET /api/capturas/config — cualquier usuario autenticado
const getConfig = async (req, res, next) => {
  try {
    const config = await svc.getConfig();
    return ok(res, config);
  } catch (err) { next(err); }
};

module.exports = { subirCaptura, listar, eliminar, getConfig };
