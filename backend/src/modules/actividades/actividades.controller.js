const service = require('./actividades.service');
const { ok, created, notFound, paged } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user.id, req.user.rol, req.query);
    paged(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const act = await service.getById(req.params.id);
    if (!act) return notFound(res);
    ok(res, act);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const act = await service.create(req.user.id, req.body);
    created(res, act, 'Actividad registrada');
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const act = await service.update(req.params.id, req.user.id, req.user.rol, req.body);
    ok(res, act, 'Actividad actualizada');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.id, req.user.rol);
    ok(res, null, 'Actividad eliminada');
  } catch (err) { next(err); }
};

const aprobar = async (req, res, next) => {
  try {
    const act = await service.aprobar(req.params.id, req.user.id);
    ok(res, act, 'Actividad aprobada');
  } catch (err) { next(err); }
};

const getTipos = async (req, res, next) => {
  try {
    const tipos = await service.getTipos(req.user.id);
    ok(res, tipos);
  } catch (err) { next(err); }
};

const getEvidencias = async (req, res, next) => {
  try {
    ok(res, await service.getEvidencias(req.params.id));
  } catch (err) { next(err); }
};

const addEvidencia = async (req, res, next) => {
  try {
    const { imagen, nombre, descripcion } = req.body;
    if (!imagen) return res.status(400).json({ success: false, message: 'imagen requerida' });
    const ev = await service.addEvidencia(req.params.id, req.user.id, req.user.rol, imagen, nombre, descripcion);
    created(res, ev, 'Evidencia agregada');
  } catch (err) { next(err); }
};

const removeEvidencia = async (req, res, next) => {
  try {
    await service.removeEvidencia(req.params.eid, req.user.id, req.user.rol);
    ok(res, null, 'Evidencia eliminada');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, remove, aprobar, getTipos, getEvidencias, addEvidencia, removeEvidencia };
