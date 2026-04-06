const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { query, transaction } = require('../../config/database');
const { signAccessToken, signRefreshToken, verifyToken } = require('../../config/jwt');
const { toMySQLDatetime, getTodayDate } = require('../../utils/date.util');
const { sendMail } = require('../../config/mailer');
const { esDiaLaboral } = require('../jornadas/jornadas.service');

const login = async (email, password, ip, userAgent) => {
  const [users] = await query(
    `SELECT u.id, u.nombre, u.apellido, u.email, u.password_hash, u.rol_id,
            u.departamento_id, u.estado, u.debe_cambiar_password, r.nombre AS rol
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     WHERE u.email = ?`,
    [email]
  );

  if (!users.length) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });
  const user = users[0];

  if (user.estado !== 'activo') {
    throw Object.assign(new Error('Cuenta inactiva o suspendida'), { statusCode: 403 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) throw Object.assign(new Error('Credenciales inválidas'), { statusCode: 401 });

  const sessionId = uuidv4();
  const expiresAt = new Date(Date.now() + 8 * 60 * 60 * 1000); // 8 horas

  const payload = { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre, apellido: user.apellido, departamento_id: user.departamento_id ?? null, debe_cambiar_password: user.debe_cambiar_password, sessionId };
  const accessToken  = signAccessToken(payload);
  const refreshToken = signRefreshToken({ id: user.id, sessionId });

  await transaction(async (conn) => {
    await conn.execute(
      `INSERT INTO sesiones (id, usuario_id, token_hash, ip, user_agent, expires_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [sessionId, user.id, refreshToken.slice(-20), ip, userAgent?.slice(0, 500), toMySQLDatetime(expiresAt)]
    );
    await conn.execute(
      'UPDATE usuarios SET ultimo_acceso = NOW() WHERE id = ?',
      [user.id]
    );
  });

  // Iniciar jornada automáticamente si no existe una para hoy y es día laboral
  let jornada = null;
  try {
    const hoy = getTodayDate();
    const diaLaboral = await esDiaLaboral(new Date().getDay());
    const [existing] = await query(
      'SELECT id, estado FROM jornadas WHERE usuario_id = ? AND fecha = ?',
      [user.id, hoy]
    );
    if (!existing.length && diaLaboral) {
      const [result] = await query(
        'INSERT INTO jornadas (usuario_id, fecha, hora_inicio, estado, ip_inicio) VALUES (?, ?, NOW(), "activa", ?)',
        [user.id, hoy, ip]
      );
      const [rows] = await query('SELECT * FROM jornadas WHERE id = ?', [result.insertId]);
      jornada = rows[0] || null;
    } else {
      jornada = existing[0] || null;
    }
  } catch (err) {
    console.error('[Auth] No se pudo iniciar jornada automáticamente:', err.message);
  }

  const { password_hash, ...userData } = user;
  return { accessToken, refreshToken, user: userData, jornada };
};

const logout = async (sessionId) => {
  await query('UPDATE sesiones SET activa = 0 WHERE id = ?', [sessionId]);
};

const refreshToken = async (token) => {
  const decoded = verifyToken(token, true);
  const [sessions] = await query(
    'SELECT id FROM sesiones WHERE id = ? AND activa = 1 AND expires_at > NOW()',
    [decoded.sessionId]
  );
  if (!sessions.length) throw Object.assign(new Error('Sesión expirada'), { statusCode: 401 });

  const [users] = await query(
    `SELECT u.id, u.email, u.nombre, u.apellido, u.departamento_id, u.debe_cambiar_password, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id
     WHERE u.id = ? AND u.estado = 'activo'`,
    [decoded.id]
  );
  if (!users.length) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 401 });

  const u = users[0];
  const payload = { id: u.id, email: u.email, rol: u.rol, nombre: u.nombre, apellido: u.apellido, departamento_id: u.departamento_id ?? null, debe_cambiar_password: u.debe_cambiar_password, sessionId: decoded.sessionId };
  const newAccessToken = signAccessToken(payload);
  return { accessToken: newAccessToken };
};

const actualizarPerfil = async (userId, sessionId, { nombre, apellido }) => {
  await query(
    'UPDATE usuarios SET nombre = ?, apellido = ? WHERE id = ?',
    [nombre.trim(), apellido.trim(), userId]
  );
  const [users] = await query(
    `SELECT u.id, u.email, u.nombre, u.apellido, u.departamento_id, u.debe_cambiar_password, r.nombre AS rol
     FROM usuarios u JOIN roles r ON r.id = u.rol_id WHERE u.id = ?`,
    [userId]
  );
  const u = users[0];
  const payload = { id: u.id, email: u.email, rol: u.rol, nombre: u.nombre, apellido: u.apellido, departamento_id: u.departamento_id ?? null, debe_cambiar_password: u.debe_cambiar_password, sessionId };
  return { accessToken: signAccessToken(payload) };
};

const getMe = async (userId) => {
  const [rows] = await query(
    `SELECT u.id, u.nombre, u.apellido, u.email, u.avatar_url, u.estado,
            u.departamento_id, r.nombre AS rol, d.nombre AS departamento
     FROM usuarios u
     JOIN roles r ON r.id = u.rol_id
     LEFT JOIN departamentos d ON d.id = u.departamento_id
     WHERE u.id = ?`,
    [userId]
  );
  return rows[0] || null;
};

const cambiarPassword = async (usuarioId, passwordNuevo) => {
  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const hash = await bcrypt.hash(passwordNuevo, rounds);
  await transaction(async (conn) => {
    await conn.execute(
      'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 0 WHERE id = ?',
      [hash, usuarioId]
    );
    await conn.execute(
      'UPDATE sesiones SET activa = 0 WHERE usuario_id = ?',
      [usuarioId]
    );
  });
};

const recuperarPassword = async (email) => {
  const [users] = await query(
    `SELECT u.id, u.nombre, u.apellido, u.email, u.estado
     FROM usuarios u WHERE u.email = ?`,
    [email]
  );

  // Respuesta genérica para no revelar si el correo existe
  if (!users.length || users[0].estado !== 'activo') return;

  const user = users[0];

  // Generar contraseña provisional legible con CSPRNG
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
  const bytes = require('crypto').randomBytes(10);
  const provisional = Array.from(bytes, (b) => chars[b % chars.length]).join('');

  const rounds = Number(process.env.BCRYPT_ROUNDS) || 12;
  const hash = await bcrypt.hash(provisional, rounds);

  await query(
    'UPDATE usuarios SET password_hash = ?, debe_cambiar_password = 1 WHERE id = ?',
    [hash, user.id]
  );

  await sendMail({
    to:      user.email,
    subject: 'Contraseña provisional — Sistema Teletrabajo',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <div style="display:inline-flex;align-items:center;justify-content:center;width:56px;height:56px;background:#2563eb;border-radius:12px">
            <span style="font-size:28px">🔑</span>
          </div>
        </div>
        <h2 style="margin:0 0 8px;font-size:20px;color:#111827">Hola, ${user.nombre}</h2>
        <p style="margin:0 0 20px;color:#6b7280;font-size:14px">
          Recibimos una solicitud para restablecer tu contraseña en el Sistema Teletrabajo.
        </p>
        <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;text-align:center;margin-bottom:20px">
          <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase;letter-spacing:.05em">Tu contraseña provisional</p>
          <p style="margin:0;font-size:28px;font-weight:700;letter-spacing:.15em;color:#111827;font-family:monospace">${provisional}</p>
        </div>
        <p style="margin:0 0 20px;color:#6b7280;font-size:13px">
          Usa esta contraseña para ingresar al sistema. Por seguridad, te recomendamos cambiarla una vez que hayas iniciado sesión.
        </p>
        <p style="margin:0;color:#d1d5db;font-size:11px;text-align:center">
          Si no solicitaste este cambio, ignora este correo. Tu contraseña anterior seguirá siendo válida solo si no usas esta.
        </p>
      </div>
    `,
  });
};

module.exports = { login, logout, refreshToken, getMe, actualizarPerfil, recuperarPassword, cambiarPassword };
