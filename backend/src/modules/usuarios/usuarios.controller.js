const service = require('./usuarios.service');
const { ok, created, notFound, paged } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try {
    const queryParams = { ...req.query };
    if (req.user.rol === 'jefe_departamento') {
      queryParams.departamento_id = req.user.departamento_id;
    }
    const result = await service.getAll(queryParams);
    paged(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const user = await service.getById(req.params.id);
    if (!user) return notFound(res, 'Usuario no encontrado');
    ok(res, user);
  } catch (err) { next(err); }
};

const create = async (req, res, next) => {
  try {
    const user = await service.create(req.body);
    created(res, user, 'Usuario creado exitosamente');
  } catch (err) { next(err); }
};

const update = async (req, res, next) => {
  try {
    const user = await service.update(req.params.id, req.body, req.user.id);
    ok(res, user, 'Usuario actualizado');
  } catch (err) { next(err); }
};

const updateEstado = async (req, res, next) => {
  try {
    const user = await service.updateEstado(req.params.id, req.body.estado, req.user.id);
    ok(res, user, 'Estado actualizado');
  } catch (err) { next(err); }
};

const remove = async (req, res, next) => {
  try {
    await service.remove(req.params.id, req.user.id);
    ok(res, null, 'Usuario eliminado');
  } catch (err) { next(err); }
};

const getRoles = async (req, res, next) => {
  try {
    const roles = await service.getRoles();
    ok(res, roles);
  } catch (err) { next(err); }
};

const getDepartamentos = async (req, res, next) => {
  try {
    const deps = await service.getDepartamentos();
    ok(res, deps);
  } catch (err) { next(err); }
};

const uploadAvatar = async (req, res, next) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return res.status(400).json({ success: false, message: 'imagen requerida' });
    const url = await service.setAvatar(req.params.id, imagen);
    ok(res, { url }, 'Avatar actualizado');
  } catch (err) { next(err); }
};

const removeAvatar = async (req, res, next) => {
  try {
    await service.deleteAvatar(req.params.id);
    ok(res, null, 'Avatar eliminado');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, create, update, updateEstado, remove, getRoles, getDepartamentos, uploadAvatar, removeAvatar };
