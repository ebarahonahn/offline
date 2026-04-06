const service = require('./configuraciones.service');
const { ok } = require('../../utils/response.util');

const getAll = async (req, res, next) => {
  try {
    ok(res, await service.getAll());
  } catch (err) { next(err); }
};

const getByGrupo = async (req, res, next) => {
  try {
    ok(res, await service.getByGrupo(req.params.grupo));
  } catch (err) { next(err); }
};

const updateBulk = async (req, res, next) => {
  try {
    await service.setBulk(req.body, req.user.id, req.ip, req.headers['user-agent']);
    ok(res, null, 'Configuraciones actualizadas');
  } catch (err) { next(err); }
};

const updateOne = async (req, res, next) => {
  try {
    await service.set(req.params.clave, req.body.valor, req.user.id, req.ip, req.headers['user-agent']);
    ok(res, null, 'Configuración actualizada');
  } catch (err) { next(err); }
};

const uploadLogo = async (req, res, next) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return res.status(400).json({ success: false, message: 'imagen requerida' });
    const url = await service.setLogo(imagen, req.user.id, req.ip, req.headers['user-agent']);
    ok(res, { url }, 'Logo actualizado');
  } catch (err) { next(err); }
};

const getPublico = async (req, res, next) => {
  try {
    ok(res, await service.getPublico());
  } catch (err) { next(err); }
};

module.exports = { getAll, getByGrupo, getPublico, updateBulk, updateOne, uploadLogo };
