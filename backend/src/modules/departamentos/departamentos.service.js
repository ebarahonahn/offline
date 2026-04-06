const { query } = require('../../config/database');

const getAll = async () => {
  const [rows] = await query(
    `SELECT d.id, d.nombre, d.activo, d.deleted_at, d.deleted_by,
            CONCAT(del.nombre, ' ', del.apellido) AS eliminado_por_nombre,
            d.updated_by,
            CONCAT(upd.nombre, ' ', upd.apellido) AS modificado_por_nombre,
            COUNT(u.id) AS total_usuarios
     FROM departamentos d
     LEFT JOIN usuarios u   ON u.departamento_id = d.id AND u.estado = 'activo' AND u.deleted_at IS NULL
     LEFT JOIN usuarios del ON del.id = d.deleted_by
     LEFT JOIN usuarios upd ON upd.id = d.updated_by
     GROUP BY d.id
     ORDER BY d.nombre`
  );
  return rows;
};

const getById = async (id) => {
  const [rows] = await query('SELECT id, nombre, activo, deleted_at, deleted_by, updated_by FROM departamentos WHERE id = ?', [id]);
  return rows[0] || null;
};

const create = async ({ nombre }) => {
  const [dup] = await query('SELECT id FROM departamentos WHERE nombre = ?', [nombre.trim()]);
  if (dup.length) throw Object.assign(new Error('Ya existe un departamento con ese nombre'), { statusCode: 409 });

  const [result] = await query(
    'INSERT INTO departamentos (nombre, activo) VALUES (?, 1)',
    [nombre.trim()]
  );
  return getById(result.insertId);
};

const update = async (id, { nombre }, updatedBy = null) => {
  const dep = await getById(id);
  if (!dep) throw Object.assign(new Error('Departamento no encontrado'), { statusCode: 404 });

  const [dup] = await query(
    'SELECT id FROM departamentos WHERE nombre = ? AND id != ?', [nombre.trim(), id]
  );
  if (dup.length) throw Object.assign(new Error('Ya existe un departamento con ese nombre'), { statusCode: 409 });

  await query(
    'UPDATE departamentos SET nombre = ?, updated_by = ? WHERE id = ?',
    [nombre.trim(), updatedBy, id]
  );
  return getById(id);
};

/**
 * Activa o desactiva un departamento registrando quién realizó el cambio.
 * Al desactivar se marca deleted_at/deleted_by; al reactivar se limpian.
 */
const toggleActivo = async (id, userId = null) => {
  const dep = await getById(id);
  if (!dep) throw Object.assign(new Error('Departamento no encontrado'), { statusCode: 404 });

  const activando = !dep.activo;

  if (activando) {
    await query(
      'UPDATE departamentos SET activo = 1, deleted_at = NULL, deleted_by = NULL, updated_by = ? WHERE id = ?',
      [userId, id]
    );
  } else {
    await query(
      'UPDATE departamentos SET activo = 0, deleted_at = NOW(), deleted_by = ?, updated_by = ? WHERE id = ?',
      [userId, userId, id]
    );
  }

  return getById(id);
};

module.exports = { getAll, getById, create, update, toggleActivo };
