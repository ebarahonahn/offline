const service = require('./soporte.service');
const { ok, created, notFound, paged } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.user.id, req.user.rol, req.query);
    paged(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const ticket = await service.getById(+req.params.id, req.user.id, req.user.rol);
    ok(res, ticket);
  } catch (err) { next(err); }
};

const crear = async (req, res, next) => {
  try {
    const ticket = await service.crear(req.user.id, req.body);
    created(res, ticket, 'Ticket de soporte creado');
  } catch (err) { next(err); }
};

const responder = async (req, res, next) => {
  try {
    const { mensaje, es_nota_interna } = req.body;
    const ticket = await service.responder(+req.params.id, req.user.id, req.user.rol, mensaje, !!es_nota_interna);
    ok(res, ticket, 'Respuesta enviada');
  } catch (err) { next(err); }
};

const cambiarEstado = async (req, res, next) => {
  try {
    const ticket = await service.cambiarEstado(+req.params.id, req.body.estado, req.user.id, req.user.rol);
    ok(res, ticket, 'Estado actualizado');
  } catch (err) { next(err); }
};

const asignar = async (req, res, next) => {
  try {
    const ticket = await service.asignar(+req.params.id, req.body.asignado_a, req.user.id);
    ok(res, ticket, 'Ticket asignado');
  } catch (err) { next(err); }
};

module.exports = { getAll, getById, crear, responder, cambiarEstado, asignar };
