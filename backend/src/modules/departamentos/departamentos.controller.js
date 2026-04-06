const service = require('./departamentos.service');
const { ok, created, notFound } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try { ok(res, await service.getAll()); }
  catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try { created(res, await service.create(req.body), 'Departamento creado'); }
  catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try { ok(res, await service.update(req.params.id, req.body, req.user.id), 'Departamento actualizado'); }
  catch (err) { next(err); }
};

const toggleActivo = async (req, res, next) => {
  try { ok(res, await service.toggleActivo(req.params.id, req.user.id), 'Estado actualizado'); }
  catch (err) { next(err); }
};

module.exports = { getAll, create, update, toggleActivo };
