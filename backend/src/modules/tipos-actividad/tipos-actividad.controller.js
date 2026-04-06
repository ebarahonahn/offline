const service = require('./tipos-actividad.service');
const { ok, created, notFound } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try { ok(res, await service.getAll()); }
  catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const tipo = await service.getById(req.params.id);
    if (!tipo) return notFound(res, 'Tipo de actividad no encontrado');
    ok(res, tipo);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try { created(res, await service.create(req.body), 'Tipo de actividad creado'); }
  catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try { ok(res, await service.update(req.params.id, req.body, req.user.id), 'Tipo de actividad actualizado'); }
  catch (err) { next(err); }
};

const toggleActivo = async (req, res, next) => {
  try { ok(res, await service.toggleActivo(req.params.id, req.user.id), 'Estado actualizado'); }
  catch (err) { next(err); }
};

const getDepartamentos = async (req, res, next) => {
  try { ok(res, await service.getDepartamentos(req.params.id)); }
  catch (err) { next(err); }
};

const setDepartamentos = async (req, res, next) => {
  try {
    const ids = Array.isArray(req.body.departamento_ids) ? req.body.departamento_ids : [];
    ok(res, await service.setDepartamentos(req.params.id, ids), 'Departamentos actualizados');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, toggleActivo, getDepartamentos, setDepartamentos };
