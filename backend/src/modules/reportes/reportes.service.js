const { query } = require('../../config/database');
const getJornadas = async (filters) => {
  const { usuario_id, departamento_id } = filters;

  let where = 'WHERE j.fecha BETWEEN ? AND ?';
  const params = [filters.fecha_inicio, filters.fecha_fin];

  if (usuario_id) { where += ' AND j.usuario_id = ?'; params.push(usuario_id); }
  if (departamento_id) { where += ' AND u.departamento_id = ?'; params.push(departamento_id); }

  const [rows] = await query(
    `SELECT
       j.id, j.fecha, j.hora_inicio, j.hora_fin, j.estado,
       TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_min,
       (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id) AS pausas_min,
       (SELECT COUNT(*) FROM actividades a WHERE a.jornada_id = j.id) AS total_actividades,
       CONCAT(u.nombre, ' ', u.apellido) AS empleado,
       u.email, r.nombre AS rol, d.nombre AS departamento
     FROM jornadas j
     JOIN usuarios u ON u.id = j.usuario_id
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     ${where}
     ORDER BY j.fecha DESC, j.hora_inicio DESC`,
    params
  );
  return rows;
};

const getProductividad = async (filters) => {
  const { fecha_inicio, fecha_fin, departamento_id } = filters;
  // Incluye jornadas activas y pausadas (usa NOW() como hora_fin provisional)
  let where = 'WHERE j.fecha BETWEEN ? AND ? AND j.estado != "anulada"';
  const params = [fecha_inicio, fecha_fin];
  if (departamento_id) { where += ' AND u.departamento_id = ?'; params.push(departamento_id); }

  const [rows] = await query(
    `SELECT
       CONCAT(u.nombre, ' ', u.apellido) AS empleado, u.email, r.nombre AS rol,
       d.nombre AS departamento,
       COUNT(DISTINCT j.id) AS jornadas,
       ROUND(AVG(TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW()))), 0) AS promedio_min,
       SUM(TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW()))) AS total_trabajado_min,
       COALESCE((SELECT SUM(i.tiempo_min) FROM inactividad i WHERE i.usuario_id = u.id AND i.fecha BETWEEN ? AND ?), 0) AS inactividad_min,
       COUNT(DISTINCT a.id) AS actividades
     FROM usuarios u
     JOIN jornadas j ON j.usuario_id = u.id
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     LEFT JOIN actividades a ON a.jornada_id = j.id
     ${where}
     GROUP BY u.id ORDER BY total_trabajado_min DESC`,
    [fecha_inicio, fecha_fin, ...params]
  );
  return rows;
};

module.exports = { getJornadas, getProductividad };
