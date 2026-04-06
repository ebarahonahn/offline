const { query } = require('../../config/database');

const getAll = async () => {
  const [rows] = await query(
    `SELECT ta.id, ta.nombre, ta.color_hex, ta.activo, ta.deleted_at, ta.deleted_by,
            CONCAT(del.nombre, ' ', del.apellido) AS eliminado_por_nombre,
            ta.updated_by,
            CONCAT(upd.nombre, ' ', upd.apellido) AS modificado_por_nombre
     FROM tipos_actividad ta
     LEFT JOIN usuarios del ON del.id = ta.deleted_by
     LEFT JOIN usuarios upd ON upd.id = ta.updated_by
     ORDER BY ta.nombre`
  );

  // Adjuntar departamentos asignados a cada tipo
  const [deps] = await query(
    `SELECT dta.tipo_actividad_id, d.id, d.nombre
     FROM departamento_tipos_actividad dta
     JOIN departamentos d ON d.id = dta.departamento_id
     ORDER BY d.nombre`
  );
  const depsByTipo = {};
  for (const r of deps) {
    if (!depsByTipo[r.tipo_actividad_id]) depsByTipo[r.tipo_actividad_id] = [];
    depsByTipo[r.tipo_actividad_id].push({ id: r.id, nombre: r.nombre });
  }
  return rows.map(t => ({ ...t, departamentos: depsByTipo[t.id] || [] }));
};

const getById = async (id) => {
  const [rows] = await query(
    `SELECT ta.id, ta.nombre, ta.color_hex, ta.activo, ta.deleted_at, ta.deleted_by, ta.updated_by
     FROM tipos_actividad ta WHERE ta.id = ?`,
    [id]
  );
  return rows[0] || null;
};

const create = async ({ nombre, color_hex }) => {
  const [existing] = await query(
    'SELECT id FROM tipos_actividad WHERE nombre = ?', [nombre.trim()]
  );
  if (existing.length) throw Object.assign(new Error('Ya existe un tipo con ese nombre'), { statusCode: 409 });

  const [result] = await query(
    'INSERT INTO tipos_actividad (nombre, color_hex, activo) VALUES (?, ?, 1)',
    [nombre.trim(), color_hex || '#6366f1']
  );
  return getById(result.insertId);
};

const update = async (id, { nombre, color_hex }, updatedBy = null) => {
  const tipo = await getById(id);
  if (!tipo) throw Object.assign(new Error('Tipo de actividad no encontrado'), { statusCode: 404 });

  if (nombre) {
    const [dup] = await query(
      'SELECT id FROM tipos_actividad WHERE nombre = ? AND id != ?', [nombre.trim(), id]
    );
    if (dup.length) throw Object.assign(new Error('Ya existe un tipo con ese nombre'), { statusCode: 409 });
  }

  const nuevoNombre = nombre ? nombre.trim() : tipo.nombre;
  const nuevoColor  = color_hex || tipo.color_hex;
  await query(
    'UPDATE tipos_actividad SET nombre = ?, color_hex = ?, updated_by = ? WHERE id = ?',
    [nuevoNombre, nuevoColor, updatedBy, id]
  );
  return getById(id);
};

/**
 * Activa o desactiva un tipo de actividad registrando quién realizó el cambio.
 * Al desactivar se marca deleted_at/deleted_by; al reactivar se limpian.
 */
const toggleActivo = async (id, userId = null) => {
  const tipo = await getById(id);
  if (!tipo) throw Object.assign(new Error('Tipo de actividad no encontrado'), { statusCode: 404 });

  const activando = !tipo.activo;

  if (activando) {
    await query(
      'UPDATE tipos_actividad SET activo = 1, deleted_at = NULL, deleted_by = NULL, updated_by = ? WHERE id = ?',
      [userId, id]
    );
  } else {
    await query(
      'UPDATE tipos_actividad SET activo = 0, deleted_at = NOW(), deleted_by = ?, updated_by = ? WHERE id = ?',
      [userId, userId, id]
    );
  }

  return getById(id);
};

/** Retorna los departamentos asignados a un tipo de actividad */
const getDepartamentos = async (tipoId) => {
  const tipo = await getById(tipoId);
  if (!tipo) throw Object.assign(new Error('Tipo de actividad no encontrado'), { statusCode: 404 });

  const [rows] = await query(
    `SELECT d.id, d.nombre
     FROM departamento_tipos_actividad dta
     JOIN departamentos d ON d.id = dta.departamento_id
     WHERE dta.tipo_actividad_id = ?
     ORDER BY d.nombre`,
    [tipoId]
  );
  return rows;
};

/** Reemplaza la asignación de departamentos de un tipo de actividad */
const setDepartamentos = async (tipoId, departamentoIds = []) => {
  const tipo = await getById(tipoId);
  if (!tipo) throw Object.assign(new Error('Tipo de actividad no encontrado'), { statusCode: 404 });

  await query('DELETE FROM departamento_tipos_actividad WHERE tipo_actividad_id = ?', [tipoId]);

  if (departamentoIds.length) {
    const values = departamentoIds.map(dId => [dId, tipoId]);
    await query(
      'INSERT INTO departamento_tipos_actividad (departamento_id, tipo_actividad_id) VALUES ?',
      [values]
    );
  }

  return getDepartamentos(tipoId);
};

module.exports = { getAll, getById, create, update, toggleActivo, getDepartamentos, setDepartamentos };
