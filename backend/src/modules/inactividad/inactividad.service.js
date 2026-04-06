const { query } = require('../../config/database');
const { getTodayDate, calcDurationMin } = require('../../utils/date.util');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');

const iniciar = async (usuarioId, jornadaId = null) => {
  if (jornadaId) {
    const [rows] = await query(
      'SELECT id FROM jornadas WHERE id = ? AND usuario_id = ?',
      [jornadaId, usuarioId]
    );
    if (!rows.length) throw Object.assign(new Error('La jornada no pertenece al usuario'), { statusCode: 403 });
  }

  const [result] = await query(
    'INSERT INTO inactividad (usuario_id, jornada_id, fecha, hora_inicio, origen) VALUES (?, ?, ?, NOW(), "detector")',
    [usuarioId, jornadaId || null, getTodayDate()]
  );
  return { id: result.insertId };
};

const cerrar = async (id, usuarioId) => {
  const [rows] = await query('SELECT * FROM inactividad WHERE id = ? AND usuario_id = ?', [id, usuarioId]);
  if (!rows.length) throw Object.assign(new Error('Registro no encontrado'), { statusCode: 404 });
  if (rows[0].hora_fin) throw Object.assign(new Error('Ya fue cerrado'), { statusCode: 400 });

  const duracion = calcDurationMin(rows[0].hora_inicio, new Date());
  await query(
    'UPDATE inactividad SET hora_fin = NOW(), tiempo_min = ? WHERE id = ?',
    [duracion, id]
  );
  return { id, tiempo_min: duracion };
};

const getAll = async (usuarioId, rol, queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { fecha_inicio, fecha_fin, uid } = queryParams;

  let where = ' WHERE 1=1';
  const params = [];

  if (rol === 'empleado') { where += ' AND i.usuario_id = ?'; params.push(usuarioId); }
  else if (uid) { where += ' AND i.usuario_id = ?'; params.push(uid); }

  if (fecha_inicio) { where += ' AND i.fecha >= ?'; params.push(fecha_inicio); }
  if (fecha_fin)    { where += ' AND i.fecha <= ?'; params.push(fecha_fin); }

  const [countRows] = await query(`SELECT COUNT(*) AS total FROM inactividad i ${where}`, params);
  const total = countRows[0].total;

  const [rows] = await query(
    `SELECT i.*, u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM inactividad i JOIN usuarios u ON u.id = i.usuario_id
     ${where} ORDER BY i.hora_inicio DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getResumen = async (usuarioId, fecha) => {
  const [rows] = await query(
    'SELECT COALESCE(SUM(tiempo_min), 0) AS total_min, COUNT(*) AS eventos FROM inactividad WHERE usuario_id = ? AND fecha = ? AND hora_fin IS NOT NULL',
    [usuarioId, fecha]
  );
  return rows[0];
};

module.exports = { iniciar, cerrar, getAll, getResumen };
