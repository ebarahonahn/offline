const { query, transaction } = require('../../config/database');
const { toMySQLDatetime, getTodayDate, calcDurationMin } = require('../../utils/date.util');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');
const { emitToUser, emitToRole } = require('../../config/socket');
const { get: getConfig } = require('../configuraciones/configuraciones.service');
const { crear: crearNotificacion } = require('../notificaciones/notificaciones.service');

/**
 * Devuelve true si el día de semana dado (0=Dom…6=Sáb) está en jornada_dias_laborales.
 * Si la configuración no existe o no es un arreglo, asume semana laboral estándar (L–V).
 */
const esDiaLaboral = async (diaSemana) => {
  const dias = await getConfig('jornada_dias_laborales');
  const laborales = Array.isArray(dias) ? dias : [1, 2, 3, 4, 5];
  return laborales.includes(diaSemana);
};

const getActiva = async (usuarioId) => {
  const [rows] = await query(
    `SELECT j.*,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
            (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL) AS total_pausas_min,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'hora_inicio', p.hora_inicio, 'hora_fin', p.hora_fin, 'tipo', p.tipo, 'motivo', p.motivo, 'duracion_min', p.duracion_min))
             FROM pausas p WHERE p.jornada_id = j.id) AS pausas,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'nombre', a.nombre, 'estado', a.estado, 'tiempo_min', a.tiempo_min))
             FROM actividades a WHERE a.jornada_id = j.id AND a.deleted_at IS NULL) AS actividades
     FROM jornadas j
     WHERE j.usuario_id = ? AND j.fecha = ? AND j.estado IN ('activa','pausada')`,
    [usuarioId, getTodayDate()]
  );
  return rows[0] || null;
};

const iniciar = async (usuarioId, ip) => {
  const hoy = getTodayDate();

  // Validar que hoy sea día laboral
  if (!await esDiaLaboral(new Date().getDay())) {
    throw Object.assign(new Error('Hoy no es un día laboral'), { statusCode: 400 });
  }

  // Validar que no exista jornada activa hoy
  const [existing] = await query(
    'SELECT id, estado FROM jornadas WHERE usuario_id = ? AND fecha = ?',
    [usuarioId, hoy]
  );
  if (existing.length) {
    if (['activa', 'pausada'].includes(existing[0].estado)) {
      throw Object.assign(new Error('Ya tienes una jornada activa hoy'), { statusCode: 409 });
    }
    throw Object.assign(new Error('Ya tienes una jornada registrada para hoy'), { statusCode: 409 });
  }

  const [result] = await query(
    'INSERT INTO jornadas (usuario_id, fecha, hora_inicio, estado, ip_inicio) VALUES (?, ?, NOW(), "activa", ?)',
    [usuarioId, hoy, ip]
  );

  const jornada = await getById(result.insertId);
  emitToUser(usuarioId, 'jornada:update', jornada);
  emitToRole('supervisor', 'empleado:jornada', { usuarioId, jornada });
  emitToRole('admin', 'empleado:jornada', { usuarioId, jornada });
  return jornada;
};

const pausar = async (jornadaId, usuarioId, motivo = null, tipo = 'manual') => {
  const [rows] = await query('SELECT * FROM jornadas WHERE id = ? AND usuario_id = ?', [jornadaId, usuarioId]);
  if (!rows.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });
  if (rows[0].estado !== 'activa') throw Object.assign(new Error('La jornada no está activa'), { statusCode: 400 });

  await transaction(async (conn) => {
    await conn.execute(
      'INSERT INTO pausas (jornada_id, hora_inicio, tipo, motivo) VALUES (?, NOW(), ?, ?)',
      [jornadaId, tipo, motivo]
    );
    await conn.execute('UPDATE jornadas SET estado = "pausada" WHERE id = ?', [jornadaId]);
  });

  const jornada = await getById(jornadaId);
  emitToUser(usuarioId, 'jornada:update', jornada);
  return jornada;
};

const reanudar = async (jornadaId, usuarioId) => {
  const [rows] = await query('SELECT * FROM jornadas WHERE id = ? AND usuario_id = ?', [jornadaId, usuarioId]);
  if (!rows.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });
  if (rows[0].estado !== 'pausada') throw Object.assign(new Error('La jornada no está pausada'), { statusCode: 400 });

  await transaction(async (conn) => {
    // Cerrar pausa abierta
    const [pausas] = await conn.execute(
      'SELECT id, hora_inicio FROM pausas WHERE jornada_id = ? AND hora_fin IS NULL ORDER BY id DESC LIMIT 1',
      [jornadaId]
    );
    if (pausas.length) {
      const duracion = calcDurationMin(pausas[0].hora_inicio, new Date());
      await conn.execute(
        'UPDATE pausas SET hora_fin = NOW(), duracion_min = ? WHERE id = ?',
        [duracion, pausas[0].id]
      );
    }
    await conn.execute('UPDATE jornadas SET estado = "activa" WHERE id = ?', [jornadaId]);
  });

  const jornada = await getById(jornadaId);
  emitToUser(usuarioId, 'jornada:update', jornada);
  return jornada;
};

const reactivar = async (jornadaId, adminId = null) => {
  const [rows] = await query('SELECT * FROM jornadas WHERE id = ?', [jornadaId]);
  if (!rows.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });
  if (rows[0].estado !== 'finalizada') throw Object.assign(new Error('Solo se pueden reactivar jornadas finalizadas'), { statusCode: 400 });

  // Verificar que no exista otra jornada activa/pausada para el mismo usuario en la misma fecha
  const [conflicto] = await query(
    "SELECT id FROM jornadas WHERE usuario_id = ? AND fecha = ? AND estado IN ('activa','pausada') AND id != ?",
    [rows[0].usuario_id, rows[0].fecha, jornadaId]
  );
  if (conflicto.length) throw Object.assign(new Error('El usuario ya tiene una jornada activa ese día'), { statusCode: 409 });

  const horaFinAnterior = rows[0].hora_fin;

  let jornada;
  await transaction(async (conn) => {
    // Cerrar pausa huérfana (sin hora_fin) usando la hora_fin que tenía la jornada al finalizar
    const [pausas] = await conn.execute(
      'SELECT id, hora_inicio FROM pausas WHERE jornada_id = ? AND hora_fin IS NULL ORDER BY id DESC LIMIT 1',
      [jornadaId]
    );
    if (pausas.length) {
      const duracion = calcDurationMin(pausas[0].hora_inicio, horaFinAnterior);
      await conn.execute(
        'UPDATE pausas SET hora_fin = ?, duracion_min = ? WHERE id = ?',
        [toMySQLDatetime(horaFinAnterior), duracion, pausas[0].id]
      );
    }
    await conn.execute(
      'UPDATE jornadas SET estado = "activa", hora_fin = NULL, ip_fin = NULL, reactivado_por = ?, reactivado_at = NOW() WHERE id = ?',
      [adminId, jornadaId]
    );
    // SELECT dentro de la transacción: si falla, hace rollback completo
    const [jornadaRows] = await conn.execute(
      `SELECT j.*,
              u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
              TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
              (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL) AS total_pausas_min,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'hora_inicio', p.hora_inicio, 'hora_fin', p.hora_fin, 'tipo', p.tipo, 'motivo', p.motivo, 'duracion_min', p.duracion_min))
               FROM pausas p WHERE p.jornada_id = j.id) AS pausas,
              (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'nombre', a.nombre, 'estado', a.estado, 'tiempo_min', a.tiempo_min))
               FROM actividades a WHERE a.jornada_id = j.id AND a.deleted_at IS NULL) AS actividades
       FROM jornadas j
       JOIN usuarios u ON u.id = j.usuario_id
       WHERE j.id = ?`,
      [jornadaId]
    );
    jornada = jornadaRows[0];
  });

  // Socket se emite solo tras confirmar el commit exitoso
  emitToUser(rows[0].usuario_id, 'jornada:update', jornada);
  emitToRole('admin', 'empleado:jornada', { usuarioId: rows[0].usuario_id, jornada });

  // Notificar al empleado con mensaje legible (fecha en español)
  const fechaLegible = new Date(rows[0].fecha).toLocaleDateString('es', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  await crearNotificacion(
    rows[0].usuario_id,
    `Tu jornada del ${fechaLegible} fue reactivada por un administrador. Puedes continuar registrando actividad.`
  );

  return jornada;
};

const finalizar = async (jornadaId, usuarioId, ip, observaciones = null) => {
  const [rows] = await query('SELECT * FROM jornadas WHERE id = ? AND usuario_id = ?', [jornadaId, usuarioId]);
  if (!rows.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });
  if (rows[0].estado === 'finalizada') throw Object.assign(new Error('La jornada ya fue finalizada'), { statusCode: 400 });

  await transaction(async (conn) => {
    // Cerrar pausa abierta si existe
    const [pausas] = await conn.execute(
      'SELECT id, hora_inicio FROM pausas WHERE jornada_id = ? AND hora_fin IS NULL ORDER BY id DESC LIMIT 1',
      [jornadaId]
    );
    if (pausas.length) {
      const duracion = calcDurationMin(pausas[0].hora_inicio, new Date());
      await conn.execute(
        'UPDATE pausas SET hora_fin = NOW(), duracion_min = ? WHERE id = ?',
        [duracion, pausas[0].id]
      );
    }
    await conn.execute(
      'UPDATE jornadas SET estado = "finalizada", hora_fin = NOW(), ip_fin = ?, observaciones = ? WHERE id = ?',
      [ip, observaciones, jornadaId]
    );
  });

  const jornada = await getById(jornadaId);
  emitToUser(usuarioId, 'jornada:update', jornada);
  emitToRole('supervisor', 'empleado:jornada', { usuarioId, jornada });
  return jornada;
};

const getById = async (id) => {
  const [rows] = await query(
    `SELECT j.*,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
            (SELECT COALESCE(SUM(p.duracion_min), 0) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL) AS total_pausas_min,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', p.id, 'hora_inicio', p.hora_inicio, 'hora_fin', p.hora_fin, 'tipo', p.tipo, 'motivo', p.motivo, 'duracion_min', p.duracion_min))
             FROM pausas p WHERE p.jornada_id = j.id) AS pausas,
            (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', a.id, 'nombre', a.nombre, 'estado', a.estado, 'tiempo_min', a.tiempo_min))
             FROM actividades a WHERE a.jornada_id = j.id AND a.deleted_at IS NULL) AS actividades
     FROM jornadas j
     JOIN usuarios u ON u.id = j.usuario_id
     WHERE j.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const getHistorial = async (usuarioId, rol, queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { fecha_inicio, fecha_fin, estado, usuario_id, departamento_id } = queryParams;

  let where = ' WHERE 1=1';
  const params = [];

  // Empleados solo ven sus propias jornadas; jefe_departamento ve su dpto (forzado por controller)
  if (rol === 'empleado') {
    where += ' AND j.usuario_id = ?'; params.push(usuarioId);
  } else if (usuario_id) {
    where += ' AND j.usuario_id = ?'; params.push(usuario_id);
  }

  if (fecha_inicio)    { where += ' AND j.fecha >= ?';          params.push(fecha_inicio); }
  if (fecha_fin)       { where += ' AND j.fecha <= ?';          params.push(fecha_fin); }
  if (estado)          { where += ' AND j.estado = ?';          params.push(estado); }
  if (departamento_id) { where += ' AND u.departamento_id = ?'; params.push(departamento_id); }

  const joins = ' JOIN usuarios u ON u.id = j.usuario_id LEFT JOIN departamentos d ON d.id = u.departamento_id';
  const [countRows] = await query(`SELECT COUNT(*) AS total FROM jornadas j ${joins} ${where}`, params);
  const total = countRows[0].total;

  const [rows] = await query(
    `SELECT j.id, j.fecha, j.hora_inicio, j.hora_fin, j.estado,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
            COALESCE((SELECT SUM(p.duracion_min) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL), 0) AS pausas_min,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) - COALESCE((SELECT SUM(p.duracion_min) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL), 0) AS duracion_neta_min,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, r.nombre AS usuario_rol,
            d.nombre AS departamento_nombre
     FROM jornadas j
     JOIN usuarios u ON u.id = j.usuario_id
     LEFT JOIN roles r ON r.id = u.rol_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     ${where} ORDER BY j.fecha DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getReporte = async (jornadaId, usuarioId, rol) => {
  // Obtener jornada
  const [jornadas] = await query(
    `SELECT j.*,
            u.nombre, u.apellido,
            TIMESTAMPDIFF(MINUTE, j.hora_inicio, IFNULL(j.hora_fin, NOW())) AS duracion_total_min,
            COALESCE((SELECT SUM(p.duracion_min) FROM pausas p WHERE p.jornada_id = j.id AND p.duracion_min IS NOT NULL), 0) AS total_pausas_min
     FROM jornadas j
     JOIN usuarios u ON u.id = j.usuario_id
     WHERE j.id = ?`,
    [jornadaId]
  );
  if (!jornadas.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });

  const jornada = jornadas[0];

  // Validar permisos: empleados solo ven sus propias jornadas
  if (rol === 'empleado' && jornada.usuario_id !== usuarioId) {
    throw Object.assign(new Error('Sin permiso para ver este reporte'), { statusCode: 403 });
  }

  // Obtener capturas de pantalla
  const [capturas] = await query(
    'SELECT id, ruta_archivo, capturado_en FROM capturas WHERE usuario_id = ? AND DATE(capturado_en) = DATE(?) AND deleted_at IS NULL ORDER BY capturado_en ASC',
    [jornada.usuario_id, jornada.fecha]
  );

  // Obtener actividades con evidencias
  const [actividades] = await query(
    `SELECT
       a.id, a.nombre, a.descripcion, a.estado, a.tipo_actividad_id, a.hora_inicio, a.hora_fin, a.tiempo_min,
       ta.nombre AS tipo_nombre, ta.color_hex,
       (SELECT JSON_ARRAYAGG(JSON_OBJECT('id', ae.id, 'nombre', ae.nombre, 'descripcion', ae.descripcion, 'archivo_url', ae.archivo_url, 'created_at', ae.created_at))
        FROM actividad_evidencias ae WHERE ae.actividad_id = a.id) AS evidencias
     FROM actividades a
     LEFT JOIN tipos_actividad ta ON ta.id = a.tipo_actividad_id
     WHERE a.jornada_id = ? AND a.deleted_at IS NULL
     ORDER BY a.hora_inicio ASC`,
    [jornadaId]
  );

  // Obtener inactividades
  const [inactividades] = await query(
    'SELECT id, hora_inicio, hora_fin, tiempo_min FROM inactividad WHERE usuario_id = ? AND DATE(fecha) = DATE(?) ORDER BY hora_inicio ASC',
    [jornada.usuario_id, jornada.fecha]
  );

  // Obtener pausas
  const [pausas] = await query(
    'SELECT id, hora_inicio, hora_fin, tipo, motivo, duracion_min FROM pausas WHERE jornada_id = ? ORDER BY hora_inicio ASC',
    [jornadaId]
  );

  return {
    jornada,
    capturas,
    actividades: actividades.map(a => ({
      ...a,
      evidencias: a.evidencias ? a.evidencias.filter(e => e.id !== null) : []
    })),
    inactividades,
    pausas
  };
};

/**
 * Cierre automático iniciado por el scheduler (sin validar ownership del usuario).
 */
const finalizarAuto = async (jornadaId, usuarioId) => {
  const [rows] = await query('SELECT * FROM jornadas WHERE id = ?', [jornadaId]);
  if (!rows.length) return;
  if (rows[0].estado === 'finalizada') return;

  await transaction(async (conn) => {
    const [pausas] = await conn.execute(
      'SELECT id, hora_inicio FROM pausas WHERE jornada_id = ? AND hora_fin IS NULL ORDER BY id DESC LIMIT 1',
      [jornadaId]
    );
    if (pausas.length) {
      const duracion = calcDurationMin(pausas[0].hora_inicio, new Date());
      await conn.execute(
        'UPDATE pausas SET hora_fin = NOW(), duracion_min = ? WHERE id = ?',
        [duracion, pausas[0].id]
      );
    }
    await conn.execute(
      'UPDATE jornadas SET estado = "finalizada", hora_fin = NOW(), ip_fin = NULL, observaciones = ? WHERE id = ?',
      ['Jornada finalizada automáticamente por el sistema (límite de tiempo superado)', jornadaId]
    );
  });

  const jornada = await getById(jornadaId);
  emitToUser(usuarioId, 'jornada:update', jornada);
  emitToRole('supervisor', 'empleado:jornada', { usuarioId, jornada });
  emitToRole('admin', 'empleado:jornada', { usuarioId, jornada });
  return jornada;
};

module.exports = { esDiaLaboral, iniciar, pausar, reanudar, finalizar, finalizarAuto, reactivar, getActiva, getById, getHistorial, getReporte };
