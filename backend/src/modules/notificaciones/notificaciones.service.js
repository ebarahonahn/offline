const { query } = require('../../config/database');
const { emitToUser } = require('../../config/socket');

const crear = async (usuarioId, mensaje) => {
  const [result] = await query(
    'INSERT INTO notificaciones (usuario_id, mensaje) VALUES (?, ?)',
    [usuarioId, mensaje]
  );
  const notif = { id: result.insertId, usuario_id: usuarioId, mensaje, leida: false, created_at: new Date() };
  emitToUser(usuarioId, 'notificacion:nueva', notif);
  return notif;
};

const getPendientes = async (usuarioId) => {
  const [rows] = await query(
    'SELECT id, mensaje, leida, created_at FROM notificaciones WHERE usuario_id = ? AND leida = 0 ORDER BY created_at DESC',
    [usuarioId]
  );
  return rows;
};

const marcarLeida = async (id, usuarioId) => {
  const [result] = await query(
    'UPDATE notificaciones SET leida = 1 WHERE id = ? AND usuario_id = ?',
    [id, usuarioId]
  );
  if (!result.affectedRows) throw Object.assign(new Error('Notificación no encontrada'), { statusCode: 404 });
};

const marcarTodasLeidas = async (usuarioId) => {
  await query('UPDATE notificaciones SET leida = 1 WHERE usuario_id = ? AND leida = 0', [usuarioId]);
};

module.exports = { crear, getPendientes, marcarLeida, marcarTodasLeidas };
