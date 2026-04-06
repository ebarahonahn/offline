const path = require('path');
const fs   = require('fs');
const bcrypt = require('bcryptjs');
const { query } = require('../../config/database');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');
const { parseAndValidateImage }                = require('../../utils/image.util');
const { sendMail } = require('../../config/mailer');
const env = require('../../config/env');

const AVATARS_DIR = path.join(__dirname, '../../../../uploads/avatars');

const BASE_SELECT = `
  SELECT u.id, u.nombre, u.apellido, u.email, u.avatar_url, u.estado,
         u.departamento_id, u.supervisor_id, u.ultimo_acceso, u.created_at,
         r.nombre AS rol, r.id AS rol_id,
         d.nombre AS departamento,
         CONCAT(s.nombre, ' ', s.apellido) AS supervisor_nombre,
         u.deleted_at, u.deleted_by,
         CONCAT(del.nombre, ' ', del.apellido) AS eliminado_por_nombre,
         u.updated_by,
         CONCAT(upd.nombre, ' ', upd.apellido) AS modificado_por_nombre
  FROM usuarios u
  JOIN roles r ON r.id = u.rol_id
  LEFT JOIN departamentos d ON d.id = u.departamento_id
  LEFT JOIN usuarios s   ON s.id = u.supervisor_id
  LEFT JOIN usuarios del ON del.id = u.deleted_by
  LEFT JOIN usuarios upd ON upd.id = u.updated_by
`;

const getAll = async (queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { buscar, rol, departamento_id, estado } = queryParams;

  // Por defecto excluir registros eliminados lógicamente
  let where = ' WHERE u.deleted_at IS NULL';
  const params = [];

  if (buscar) {
    where += ' AND (u.nombre LIKE ? OR u.apellido LIKE ? OR u.email LIKE ?)';
    params.push(`%${buscar}%`, `%${buscar}%`, `%${buscar}%`);
  }
  if (rol) { where += ' AND r.nombre = ?'; params.push(rol); }
  if (departamento_id) { where += ' AND u.departamento_id = ?'; params.push(departamento_id); }
  if (estado) { where += ' AND u.estado = ?'; params.push(estado); }

  const [countRows] = await query(
    `SELECT COUNT(*) AS total FROM usuarios u JOIN roles r ON r.id = u.rol_id ${where}`,
    params
  );
  const total = countRows[0].total;

  const [rows] = await query(
    `${BASE_SELECT} ${where} ORDER BY u.created_at DESC LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );
  return { data: rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id) => {
  const [rows] = await query(`${BASE_SELECT} WHERE u.id = ?`, [id]);
  return rows[0] || null;
};

// Convierte valores de ID opcionales: '' / 'null' / null / undefined → null, de lo contrario número entero
const toIntOrNull = (v) => (v == null || v === '' || v === 'null') ? null : parseInt(v, 10) || null;

const generarPasswordProvisional = () => {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = require('crypto').randomBytes(10);
  return Array.from(bytes, (b) => chars[b % chars.length]).join('');
};

const create = async (data) => {
  const { nombre, apellido, email, rol_id, supervisor_id } = data;
  const departamento_id = toIntOrNull(data.departamento_id);

  const provisional = generarPasswordProvisional();
  const hash = await bcrypt.hash(provisional, env.bcryptRounds);

  const [result] = await query(
    `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, departamento_id, supervisor_id, debe_cambiar_password)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [nombre, apellido, email, hash, rol_id, departamento_id, supervisor_id ? parseInt(supervisor_id, 10) : null]
  );

  const usuario = await getById(result.insertId);

  await sendMail({
    to:      email,
    subject: 'Bienvenido al Sistema Teletrabajo — Tu acceso inicial',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#2563eb;border-radius:12px">
            <span style="font-size:28px">&#128272;</span>
          </div>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Hola, ${nombre}</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px">
          Tu cuenta ha sido creada en el <strong>Sistema Teletrabajo</strong>. A continuaci&oacute;n encontrar&aacute;s tus credenciales de acceso inicial.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:20px">
          <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Usuario</p>
          <p style="margin:0 0 16px;font-size:15px;font-weight:600;color:#111827">${email}</p>
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Contrase&ntilde;a provisional</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:.15em;color:#111827;font-family:monospace">${provisional}</p>
        </div>
        <div style="background:#fefce8;border:1px solid #fde047;border-radius:8px;padding:12px;margin-bottom:20px">
          <p style="margin:0;font-size:13px;color:#713f12">
            <strong>&#9888; Importante:</strong> Esta es una contrase&ntilde;a provisional. Al iniciar sesi&oacute;n por primera vez, el sistema te pedir&aacute; que la cambies.
          </p>
        </div>
        <p style="margin:0;color:#d1d5db;font-size:11px;text-align:center">
          Si no esperabas este correo, contacta al administrador del sistema.
        </p>
      </div>
    `,
  });

  return usuario;
};

const update = async (id, data, updatedBy = null) => {
  const allowed = ['nombre', 'apellido', 'email', 'avatar_url', 'departamento_id', 'supervisor_id', 'rol_id'];
  const fields = Object.keys(data).filter(k => allowed.includes(k));
  if (!fields.length) throw Object.assign(new Error('Sin campos para actualizar'), { statusCode: 400 });

  const sets = fields.map(f => `${f} = ?`).join(', ');
  const values = fields.map(f =>
    ['departamento_id', 'supervisor_id'].includes(f) ? toIntOrNull(data[f]) : (data[f] ?? null)
  );

  await query(
    `UPDATE usuarios SET ${sets}, updated_by = ? WHERE id = ?`,
    [...values, updatedBy, id]
  );
  return getById(id);
};

const updatePassword = async (id, newPassword) => {
  const hash = await bcrypt.hash(newPassword, env.bcryptRounds);
  await query('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, id]);
};

const updateEstado = async (id, estado, updatedBy = null) => {
  await query('UPDATE usuarios SET estado = ?, updated_by = ? WHERE id = ?', [estado, updatedBy, id]);
  return getById(id);
};

/**
 * Eliminación lógica: marca deleted_at y deleted_by, cambia estado a inactivo.
 * El registro deja de aparecer en getAll().
 */
const remove = async (id, deletedBy = null) => {
  await query(
    `UPDATE usuarios SET estado = 'inactivo', deleted_at = NOW(), deleted_by = ? WHERE id = ?`,
    [deletedBy, id]
  );
};

const getRoles = async () => {
  const [rows] = await query('SELECT id, nombre FROM roles ORDER BY id');
  return rows;
};

const getDepartamentos = async () => {
  const [rows] = await query('SELECT id, nombre FROM departamentos WHERE activo = 1 ORDER BY nombre');
  return rows;
};

const deleteAvatar = async (id) => {
  const user = await getById(id);
  if (!user) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  if (!user.avatar_url) return;

  const filePath = path.join(__dirname, '../../../../uploads', user.avatar_url);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  await query('UPDATE usuarios SET avatar_url = NULL WHERE id = ?', [id]);
};

const setAvatar = async (id, base64Data) => {
  const { ext, buffer } = parseAndValidateImage(base64Data, ['png', 'jpg', 'webp']);

  if (!fs.existsSync(AVATARS_DIR)) fs.mkdirSync(AVATARS_DIR, { recursive: true });

  // Eliminar avatar anterior si existe
  const user = await getById(id);
  if (user?.avatar_url) {
    const prev = path.join(__dirname, '../../../../uploads', user.avatar_url);
    if (fs.existsSync(prev)) fs.unlinkSync(prev);
  }

  const filename = `u${id}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(AVATARS_DIR, filename), buffer);

  const urlRelativa = `avatars/${filename}`;
  await query('UPDATE usuarios SET avatar_url = ? WHERE id = ?', [urlRelativa, id]);
  return urlRelativa;
};

module.exports = { getAll, getById, create, update, updatePassword, updateEstado, remove, getRoles, getDepartamentos, setAvatar, deleteAvatar };
