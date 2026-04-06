const service = require('./dashboard.service');
const { ok } = require('../../utils/response.util');

const getResumen = async (req, res, next) => {
  try {
    const data = await service.getResumenHoy(req.user.id);
    ok(res, data);
  } catch (err) { next(err); }
};

const getSemana = async (req, res, next) => {
  try {
    const data = await service.getResumenSemana(req.user.id);
    ok(res, data);
  } catch (err) { next(err); }
};

const getRanking = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin, departamento_id } = req.query;
    if (!fecha_inicio || !fecha_fin) {
      return ok(res, [], 'Indica fecha_inicio y fecha_fin');
    }
    const data = await service.getRankingProductividad(fecha_inicio, fecha_fin, departamento_id);
    ok(res, data);
  } catch (err) { next(err); }
};

const getEstado = async (req, res, next) => {
  try {
    const data = await service.getEstadoActual();
    ok(res, data);
  } catch (err) { next(err); }
};

module.exports = { getResumen, getSemana, getRanking, getEstado };
