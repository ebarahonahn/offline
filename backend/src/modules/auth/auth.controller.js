const authService     = require('./auth.service');
const usuariosService = require('../usuarios/usuarios.service');
const { ok, fail }    = require('../../utils/response.util');

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const ip = req.ip;
    const userAgent = req.headers['user-agent'];
    const result = await authService.login(email, password, ip, userAgent);
    ok(res, result, 'Inicio de sesión exitoso');
  } catch (err) {
    next(err);
  }
};

const logout = async (req, res, next) => {
  try {
    await authService.logout(req.user.sessionId);
    ok(res, null, 'Sesión cerrada correctamente');
  } catch (err) {
    next(err);
  }
};

const refresh = async (req, res, next) => {
  try {
    const token = req.body.refreshToken;
    if (!token) return fail(res, 'refreshToken requerido');
    const result = await authService.refreshToken(token);
    ok(res, result, 'Token renovado');
  } catch (err) {
    next(err);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await authService.getMe(req.user.id);
    ok(res, user);
  } catch (err) {
    next(err);
  }
};

const cambiarPassword = async (req, res, next) => {
  try {
    const { password_nuevo } = req.body;
    if (!password_nuevo || password_nuevo.length < 6) {
      return fail(res, 'La contraseña debe tener al menos 6 caracteres', 400);
    }
    await authService.cambiarPassword(req.user.id, password_nuevo);
    ok(res, null, 'Contraseña actualizada correctamente');
  } catch (err) {
    next(err);
  }
};

const recuperarPassword = async (req, res, next) => {
  try {
    await authService.recuperarPassword(req.body.email);
    // Respuesta siempre exitosa para no exponer si el correo existe
    ok(res, null, 'Si el correo está registrado, recibirás una contraseña provisional');
  } catch (err) {
    next(err);
  }
};

const updateMe = async (req, res, next) => {
  try {
    const { nombre, apellido } = req.body;
    if (!nombre?.trim() || !apellido?.trim()) {
      return fail(res, 'Nombre y apellido son requeridos', 400);
    }
    const result = await authService.actualizarPerfil(req.user.id, req.user.sessionId, { nombre, apellido });
    ok(res, result, 'Perfil actualizado');
  } catch (err) { next(err); }
};

const uploadMeAvatar = async (req, res, next) => {
  try {
    const { imagen } = req.body;
    if (!imagen) return fail(res, 'imagen requerida', 400);
    const url = await usuariosService.setAvatar(req.user.id, imagen);
    ok(res, { url }, 'Avatar actualizado');
  } catch (err) { next(err); }
};

const deleteMeAvatar = async (req, res, next) => {
  try {
    await usuariosService.deleteAvatar(req.user.id);
    ok(res, null, 'Avatar eliminado');
  } catch (err) { next(err); }
};

module.exports = { login, logout, refresh, getMe, updateMe, uploadMeAvatar, deleteMeAvatar, recuperarPassword, cambiarPassword };
