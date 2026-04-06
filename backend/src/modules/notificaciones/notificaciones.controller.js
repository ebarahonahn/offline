const svc = require('./notificaciones.service');
const { ok, fail } = require('../../utils/response.util');

const getPendientes = async (req, res, next) => {
  try {
    const data = await svc.getPendientes(req.user.id);
    ok(res, data);
  } catch (e) { next(e); }
};

const marcarLeida = async (req, res, next) => {
  try {
    await svc.marcarLeida(Number(req.params.id), req.user.id);
    ok(res, null, 'Notificación marcada como leída');
  } catch (e) { next(e); }
};

const marcarTodasLeidas = async (req, res, next) => {
  try {
    await svc.marcarTodasLeidas(req.user.id);
    ok(res, null, 'Notificaciones marcadas como leídas');
  } catch (e) { next(e); }
};

module.exports = { getPendientes, marcarLeida, marcarTodasLeidas };
