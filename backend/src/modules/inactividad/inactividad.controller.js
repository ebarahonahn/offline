const service = require('./inactividad.service');
const { ok, created, paged } = require('../../utils/response.util');

const iniciar = async (req, res, next) => {
  try {
    const result = await service.iniciar(req.user.id, req.body.jornada_id);
    created(res, result, 'Inactividad iniciada');
  } catch (err) { next(err); }
};

const cerrar = async (req, res, next) => {
  try {
    const result = await service.cerrar(req.params.id, req.user.id);
    ok(res, result, 'Inactividad cerrada');
  } catch (err) { next(err); }
};

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user.id, req.user.rol, req.query);
    paged(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

module.exports = { iniciar, cerrar, getAll };
