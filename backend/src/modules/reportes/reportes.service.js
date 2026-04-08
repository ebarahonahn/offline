const { query } = require('../../config/database');
const { get: getConfig } = require('../configuraciones/configuraciones.service');

const getAsistencias = async (filters) => {
  const { fecha_inicio, fecha_fin, usuario_id, departamento_id } = filters;

  let empWhere = "WHERE u.estado = 'activo' AND u.deleted_at IS NULL";
  const empParams = [];
  if (usuario_id)      { empWhere += ' AND u.id = ?';              empParams.push(usuario_id); }
  if (departamento_id) { empWhere += ' AND u.departamento_id = ?'; empParams.push(departamento_id); }

  const [empleados] = await query(
    `SELECT u.id, CONCAT(u.nombre, ' ', u.apellido) AS empleado, u.email,
            d.nombre AS departamento
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     ${empWhere}
     ORDER BY u.apellido, u.nombre`,
    empParams
  );

  if (!empleados.length) return { empleados: [], dias_habiles: 0 };

  const ids = empleados.map(e => e.id);
  const placeholders = ids.map(() => '?').join(',');

  const horaFinJornada = await getConfig('jornada_hora_fin') || '17:00';

  const [jornadas] = await query(
    `SELECT usuario_id,
            DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
            estado, hora_inicio, hora_fin,
            CASE WHEN hora_fin IS NOT NULL
                 THEN TIMESTAMPDIFF(MINUTE, hora_inicio, hora_fin)
                 ELSE NULL
            END AS duracion_min,
            CASE WHEN hora_fin IS NOT NULL
                      AND hora_fin > CONCAT(DATE(hora_fin), ' ', ?)
                 THEN TIMESTAMPDIFF(MINUTE, CONCAT(DATE(hora_fin), ' ', ?), hora_fin)
                 ELSE 0
            END AS tiempo_extra_min
     FROM jornadas
     WHERE usuario_id IN (${placeholders}) AND fecha BETWEEN ? AND ? AND estado != 'anulada'
     ORDER BY fecha`,
    [horaFinJornada, horaFinJornada, ...ids, fecha_inicio, fecha_fin]
  );

  // Calcular días hábiles en el rango según configuración
  const diasLaboralesConfig = await getConfig('jornada_dias_laborales');
  const laborales = Array.isArray(diasLaboralesConfig) ? diasLaboralesConfig : [1, 2, 3, 4, 5];
  let diasHabiles = 0;
  const start = new Date(fecha_inicio + 'T00:00:00');
  const end   = new Date(fecha_fin   + 'T00:00:00');
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    if (laborales.includes(d.getDay())) diasHabiles++;
  }

  const jornadasMap = {};
  for (const j of jornadas) {
    if (!jornadasMap[j.usuario_id]) jornadasMap[j.usuario_id] = [];
    jornadasMap[j.usuario_id].push(j);
  }

  const resultado = empleados.map(emp => {
    const js = jornadasMap[emp.id] || [];
    const dias_presentes  = js.length;
    const dias_ausentes   = Math.max(0, diasHabiles - dias_presentes);
    const total_min       = js.reduce((s, j) => s + (j.duracion_min    || 0), 0);
    const total_extra_min = js.reduce((s, j) => s + (j.tiempo_extra_min || 0), 0);
    return {
      ...emp,
      dias_presentes,
      dias_ausentes,
      dias_habiles: diasHabiles,
      porcentaje:   diasHabiles > 0 ? Math.round((dias_presentes / diasHabiles) * 100) : 0,
      total_min,
      total_extra_min,
      jornadas: js,
    };
  });

  return { empleados: resultado, dias_habiles: diasHabiles };
};

const DIAS_ES   = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
const MESES_ES  = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const getDetalleEmpleado = async (usuario_id, fecha_inicio, fecha_fin) => {
  const [empRows] = await query(
    `SELECT u.id, CONCAT(u.nombre, ' ', u.apellido) AS empleado, u.email,
            d.nombre AS departamento
     FROM usuarios u
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     WHERE u.id = ?`,
    [usuario_id]
  );
  if (!empRows.length) throw Object.assign(new Error('Empleado no encontrado'), { statusCode: 404 });
  const emp = empRows[0];

  const horaFinJornada = await getConfig('jornada_hora_fin') || '17:00';

  const [jornadas] = await query(
    `SELECT DATE_FORMAT(fecha, '%Y-%m-%d') AS fecha,
            estado, hora_inicio, hora_fin,
            CASE WHEN hora_fin IS NOT NULL
                 THEN TIMESTAMPDIFF(MINUTE, hora_inicio, hora_fin)
                 ELSE NULL
            END AS duracion_min,
            CASE WHEN hora_fin IS NOT NULL
                      AND hora_fin > CONCAT(DATE(hora_fin), ' ', ?)
                 THEN TIMESTAMPDIFF(MINUTE, CONCAT(DATE(hora_fin), ' ', ?), hora_fin)
                 ELSE 0
            END AS tiempo_extra_min
     FROM jornadas
     WHERE usuario_id = ? AND fecha BETWEEN ? AND ? AND estado != 'anulada'
     ORDER BY fecha`,
    [horaFinJornada, horaFinJornada, usuario_id, fecha_inicio, fecha_fin]
  );

  const diasLaboralesConfig = await getConfig('jornada_dias_laborales');
  const laborales = Array.isArray(diasLaboralesConfig) ? diasLaboralesConfig : [1, 2, 3, 4, 5];

  const jornadasIdx = {};
  for (const j of jornadas) jornadasIdx[j.fecha] = j;

  const dias = [];
  const start = new Date(fecha_inicio + 'T12:00:00');
  const end   = new Date(fecha_fin   + 'T12:00:00');

  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const yy  = d.getFullYear();
    const mm  = String(d.getMonth() + 1).padStart(2, '0');
    const dd  = String(d.getDate()).padStart(2, '0');
    const key = `${yy}-${mm}-${dd}`;
    const dow = d.getDay();
    const fechaLabel = `${DIAS_ES[dow]} ${dd} ${MESES_ES[d.getMonth()]} ${yy}`;

    if (jornadasIdx[key]) {
      const j = jornadasIdx[key];
      dias.push({ fecha: key, fechaLabel, tipo: 'presente', dow, estado: j.estado, hora_inicio: j.hora_inicio, hora_fin: j.hora_fin, duracion_min: j.duracion_min, tiempo_extra_min: j.tiempo_extra_min || 0 });
    } else if (!laborales.includes(dow)) {
      dias.push({ fecha: key, fechaLabel, tipo: 'finde', dow });
    } else {
      dias.push({ fecha: key, fechaLabel, tipo: 'ausente', dow });
    }
  }

  const presentes       = dias.filter(d => d.tipo === 'presente').length;
  const ausentes        = dias.filter(d => d.tipo === 'ausente').length;
  const total_min       = jornadas.reduce((s, j) => s + (j.duracion_min     || 0), 0);
  const total_extra_min = jornadas.reduce((s, j) => s + (j.tiempo_extra_min || 0), 0);
  const dias_habiles    = dias.filter(d => d.tipo !== 'finde').length;
  const porcentaje      = dias_habiles > 0 ? Math.round((presentes / dias_habiles) * 100) : 0;

  return { emp, dias, presentes, ausentes, dias_habiles, porcentaje, total_min, total_extra_min, fecha_inicio, fecha_fin, hora_fin_jornada: horaFinJornada };
};

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

module.exports = { getAsistencias, getDetalleEmpleado, getJornadas, getProductividad };
