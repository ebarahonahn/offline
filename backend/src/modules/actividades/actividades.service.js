const path = require('path');
const fs   = require('fs');
const { query } = require('../../config/database');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');
const { calcDurationMin } = require('../../utils/date.util');
const { parseAndValidateFile } = require('../../utils/file.util');

const EVIDENCIAS_DIR = path.join(__dirname, '../../../../uploads/evidencias');

const getAll = async (usuarioId, rol, queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { jornada_id, estado, fecha_inicio, fecha_fin } = queryParams;

  // Excluir eliminadas lógicamente
  let where = ' WHERE a.deleted_at IS NULL';
  const params = [];

  if (rol === 'empleado') {
    where += ' AND j.usuario_id = ?'; params.push(usuarioId);
  }
  if (jornada_id) { where += ' AND a.jornada_id = ?'; params.push(jornada_id); }
  if (estado)     { where += ' AND a.estado = ?'; params.push(estado); }
  if (fecha_inicio) { where += ' AND j.fecha >= ?'; params.push(fecha_inicio); }
  if (fecha_fin)    { where += ' AND j.fecha <= ?'; params.push(fecha_fin); }

  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM actividades a JOIN jornadas j ON j.id = a.jornada_id ${where}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await query(
    `SELECT a.*, ta.nombre AS tipo_nombre, ta.color_hex,
            j.fecha, j.usuario_id,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido
     FROM actividades a
     JOIN jornadas j ON j.id = a.jornada_id
     JOIN usuarios u ON u.id = j.usuario_id
     LEFT JOIN tipos_actividad ta ON ta.id = a.tipo_actividad_id
     ${where} ORDER BY a.hora_inicio DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await query(
    `SELECT a.*, ta.nombre AS tipo_nombre, ta.color_hex,
            CONCAT(del.nombre, ' ', del.apellido) AS eliminado_por_nombre
     FROM actividades a
     LEFT JOIN tipos_actividad ta ON ta.id = a.tipo_actividad_id
     LEFT JOIN usuarios del ON del.id = a.deleted_by
     WHERE a.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const create = async (usuarioId, data) => {
  const { jornada_id, tipo_actividad_id, nombre, descripcion, hora_inicio, hora_fin } = data;

  // Verificar que la jornada pertenece al usuario
  const [jornadas] = await query('SELECT id FROM jornadas WHERE id = ? AND usuario_id = ?', [jornada_id, usuarioId]);
  if (!jornadas.length) throw Object.assign(new Error('Jornada no encontrada'), { statusCode: 404 });

  const tiempoMin = hora_fin ? calcDurationMin(hora_inicio, hora_fin) : null;
  const estado = hora_fin ? 'completada' : 'en_progreso';

  const [result] = await query(
    `INSERT INTO actividades (jornada_id, tipo_actividad_id, nombre, descripcion, hora_inicio, hora_fin, tiempo_min, estado)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [jornada_id, tipo_actividad_id || null, nombre, descripcion || null,
     hora_inicio, hora_fin || null, tiempoMin, estado]
  );
  return getById(result.insertId);
};

const update = async (id, usuarioId, rol, data) => {
  const existing = await getById(id);
  if (!existing) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });

  // Solo el dueño o admin/supervisor puede editar
  if (rol === 'empleado') {
    const [j] = await query('SELECT usuario_id FROM jornadas WHERE id = ?', [existing.jornada_id]);
    if (!j.length || j[0].usuario_id !== usuarioId) {
      throw Object.assign(new Error('Sin permiso para editar esta actividad'), { statusCode: 403 });
    }
  }

  const allowed = ['tipo_actividad_id', 'nombre', 'descripcion', 'hora_inicio', 'hora_fin', 'estado'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) return existing;

  if (data.hora_inicio && data.hora_fin) {
    data.tiempo_min = calcDurationMin(data.hora_inicio, data.hora_fin);
    fields.push('tiempo_min');
  }

  const sets = fields.map(f => `${f} = ?`).join(', ');
  await query(`UPDATE actividades SET ${sets} WHERE id = ?`, [...fields.map(f => data[f] ?? null), id]);
  return getById(id);
};

const remove = async (id, usuarioId, rol) => {
  const existing = await getById(id);
  if (!existing) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });

  if (existing.deleted_at)
    throw Object.assign(new Error('La actividad ya fue eliminada'), { statusCode: 409 });

  if (existing.estado === 'completada')
    throw Object.assign(new Error('No se puede eliminar una actividad completada'), { statusCode: 409 });

  if (rol === 'empleado') {
    const [j] = await query('SELECT usuario_id FROM jornadas WHERE id = ?', [existing.jornada_id]);
    if (!j.length || j[0].usuario_id !== usuarioId) {
      throw Object.assign(new Error('Sin permiso para eliminar esta actividad'), { statusCode: 403 });
    }
  }

  await query(
    'UPDATE actividades SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
    [usuarioId, id]
  );
};

const aprobar = async (id, supervisorId) => {
  await query('UPDATE actividades SET aprobada = 1, aprobada_por = ? WHERE id = ?', [supervisorId, id]);
  return getById(id);
};

const getTipos = async () => {
  const [rows] = await query('SELECT id, nombre, color_hex FROM tipos_actividad WHERE activo = 1 ORDER BY nombre');
  return rows;
};

const getEvidencias = async (actividadId) => {
  const [rows] = await query(
    'SELECT id, actividad_id, usuario_id, archivo_url, nombre, descripcion, created_at FROM actividad_evidencias WHERE actividad_id = ? ORDER BY created_at ASC',
    [actividadId]
  );
  return rows;
};

const addEvidencia = async (actividadId, usuarioId, rol, base64Data, nombre, descripcion) => {
  const existing = await getById(actividadId);
  if (!existing) throw Object.assign(new Error('Actividad no encontrada'), { statusCode: 404 });

  if (existing.estado === 'completada') {
    throw Object.assign(new Error('No se pueden agregar evidencias a actividades completadas'), { statusCode: 400 });
  }

  if (rol === 'empleado') {
    const [j] = await query('SELECT usuario_id FROM jornadas WHERE id = ?', [existing.jornada_id]);
    if (!j.length || j[0].usuario_id !== usuarioId) {
      throw Object.assign(new Error('Sin permiso para agregar evidencia a esta actividad'), { statusCode: 403 });
    }
  }

  const { ext, buffer } = parseAndValidateFile(base64Data, ['png', 'jpg', 'webp', 'pdf', 'docx', 'xlsx']);

  const dir = path.join(EVIDENCIAS_DIR, String(actividadId));
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  const filename    = `u${usuarioId}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  const archivoUrl = `evidencias/${actividadId}/${filename}`;
  const [result] = await query(
    'INSERT INTO actividad_evidencias (actividad_id, usuario_id, archivo_url, nombre, descripcion) VALUES (?, ?, ?, ?, ?)',
    [actividadId, usuarioId, archivoUrl, nombre?.trim() || filename, descripcion?.trim() || null]
  );

  const [rows] = await query('SELECT * FROM actividad_evidencias WHERE id = ?', [result.insertId]);
  return rows[0];
};

const removeEvidencia = async (evidenciaId, usuarioId, rol) => {
  const [rows] = await query('SELECT * FROM actividad_evidencias WHERE id = ?', [evidenciaId]);
  if (!rows.length) throw Object.assign(new Error('Evidencia no encontrada'), { statusCode: 404 });
  const ev = rows[0];

  if (rol === 'empleado' && ev.usuario_id !== usuarioId) {
    throw Object.assign(new Error('Sin permiso para eliminar esta evidencia'), { statusCode: 403 });
  }

  const filePath = path.join(__dirname, '../../../../uploads', ev.archivo_url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await query('DELETE FROM actividad_evidencias WHERE id = ?', [evidenciaId]);
};

module.exports = { getAll, getById, create, update, remove, aprobar, getTipos, getEvidencias, addEvidencia, removeEvidencia };
