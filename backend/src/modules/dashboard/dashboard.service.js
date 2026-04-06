const { query } = require('../../config/database');
const { getTodayDate } = require('../../utils/date.util');

const getResumenHoy = async (usuarioId) => {
  const hoy = getTodayDate();

  const [jornada] = await query(
    `SELECT j.id, j.estado, j.hora_inicio, j.hora_fin,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
            (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id) AS total_pausas_min,
            (SELECT COUNT(*) FROM actividades a WHERE a.jornada_id = j.id AND a.deleted_at IS NULL) AS total_actividades
     FROM jornadas j
     WHERE j.usuario_id = ? AND j.fecha = ?`,
    [usuarioId, hoy]
  );

  const [inact] = await query(
    'SELECT COALESCE(SUM(tiempo_min), 0) AS total_inactividad_min FROM inactividad WHERE usuario_id = ? AND fecha = ?',
    [usuarioId, hoy]
  );

  return {
    jornada: jornada[0] || null,
    total_inactividad_min: inact[0]?.total_inactividad_min || 0,
  };
};

const getResumenSemana = async (usuarioId) => {
  const [rows] = await query(
    `SELECT
       j.fecha,
       TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS trabajado_min,
       (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id) AS pausas_min,
       (SELECT COALESCE(SUM(i.tiempo_min), 0) FROM inactividad i WHERE i.usuario_id = j.usuario_id AND i.fecha = j.fecha) AS inactividad_min,
       (SELECT COUNT(*) FROM actividades a WHERE a.jornada_id = j.id AND a.deleted_at IS NULL) AS actividades
     FROM jornadas j
     WHERE j.usuario_id = ?
       AND j.fecha >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
       AND j.estado != 'anulada'
     ORDER BY j.fecha ASC`,
    [usuarioId]
  );
  return rows;
};

const getRankingProductividad = async (fechaInicio, fechaFin, departamentoId = null) => {
  let where = 'WHERE j.fecha BETWEEN ? AND ? AND j.estado = "finalizada"';
  const params = [fechaInicio, fechaFin];

  if (departamentoId) {
    where += ' AND u.departamento_id = ?';
    params.push(departamentoId);
  }

  const [rows] = await query(
    `SELECT
       u.id, u.nombre, u.apellido, u.avatar_url, d.nombre AS departamento,
       COUNT(DISTINCT j.id) AS total_jornadas,
       COALESCE(SUM(TIMESTAMPDIFF(MINUTE, j.hora_inicio, j.hora_fin)), 0) AS total_trabajado_min,
       COALESCE(SUM((SELECT SUM(p.duracion_min) FROM pausas p WHERE p.jornada_id = j.id)), 0) AS total_pausas_min,
       COALESCE((SELECT SUM(i.tiempo_min) FROM inactividad i WHERE i.usuario_id = u.id AND i.fecha BETWEEN ? AND ?), 0) AS total_inactividad_min,
       COUNT(DISTINCT a.id) AS total_actividades
     FROM usuarios u
     JOIN jornadas j ON j.usuario_id = u.id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     LEFT JOIN actividades a ON a.jornada_id = j.id AND a.deleted_at IS NULL
     ${where}
     GROUP BY u.id
     ORDER BY total_trabajado_min DESC
     LIMIT 20`,
    [...params, fechaInicio, fechaFin, ...params]
  );
  return rows;
};

const getEstadoActual = async () => {
  const [rows] = await query(
    `SELECT
       SUM(j.estado = 'activa') AS empleados_activos,
       SUM(j.estado = 'pausada') AS empleados_en_pausa,
       COUNT(j.id) AS total_jornadas_hoy,
       SUM(j.estado = 'finalizada') AS jornadas_finalizadas
     FROM jornadas j
     WHERE j.fecha = CURDATE()`
  );
  return rows[0];
};

module.exports = { getResumenHoy, getResumenSemana, getRankingProductividad, getEstadoActual };
