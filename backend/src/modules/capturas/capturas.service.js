const path = require('path');
const fs   = require('fs');
const { query }              = require('../../config/database');
const configSvc              = require('../configuraciones/configuraciones.service');
const { parseAndValidateImage } = require('../../utils/image.util');

const UPLOADS_DIR = path.join(__dirname, '../../../../uploads/capturas');

const ensureDir = (dir) => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
};

// ── Guardar captura ───────────────────────────────────────────────────────────
const guardar = async (usuarioId, jornadaId, base64Data) => {
  const habilitadas = await configSvc.get('capturas_habilitadas');
  if (!habilitadas) throw Object.assign(new Error('Captura de pantalla no habilitada'), { status: 403 });

  const [[jornada]] = await query(
    'SELECT id, estado FROM jornadas WHERE id = ? AND usuario_id = ? AND estado = "activa"',
    [Number(jornadaId), Number(usuarioId)]
  );
  if (!jornada) throw Object.assign(new Error('La jornada no está activa o no pertenece al usuario'), { status: 403 });

  const { ext, buffer } = parseAndValidateImage(base64Data, ['png', 'jpg', 'webp']);

  const fecha = new Date().toISOString().slice(0, 10);
  const dir   = path.join(UPLOADS_DIR, fecha);
  ensureDir(dir);

  const filename     = `u${usuarioId}_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(dir, filename), buffer);

  const rutaRelativa = `capturas/${fecha}/${filename}`;

  const [result] = await query(
    'INSERT INTO capturas (usuario_id, jornada_id, ruta_archivo, capturado_en) VALUES (?, ?, ?, NOW())',
    [Number(usuarioId), Number(jornadaId), String(rutaRelativa)]
  );

  return { id: result.insertId, ruta_archivo: rutaRelativa };
};

// ── Listar capturas (excluye eliminadas lógicamente) ─────────────────────────
const listar = async ({ usuarioId, jornadaId, fecha, page = 1, limit = 24 }) => {
  const conditions = ['c.deleted_at IS NULL'];
  const params     = [];

  if (usuarioId) { conditions.push('c.usuario_id = ?'); params.push(Number(usuarioId)); }
  if (jornadaId) { conditions.push('c.jornada_id = ?'); params.push(Number(jornadaId)); }
  if (fecha)     { conditions.push('DATE(c.capturado_en) = ?'); params.push(String(fecha)); }

  const where  = 'WHERE ' + conditions.join(' AND ');
  const lim    = Number(limit);
  const offset = (Number(page) - 1) * lim;

  const [rows] = await query(
    `SELECT c.id, c.usuario_id, c.jornada_id, c.ruta_archivo, c.capturado_en,
            u.nombre, u.apellido
     FROM capturas c
     JOIN usuarios u ON c.usuario_id = u.id
     ${where}
     ORDER BY c.capturado_en DESC
     LIMIT ${lim} OFFSET ${offset}`,
    params
  );

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total FROM capturas c ${where}`,
    params
  );

  return { rows, pagination: { total, page: Number(page), limit: Number(limit), pages: Math.ceil(total / limit) } };
};

// ── Eliminación lógica ────────────────────────────────────────────────────────
const eliminar = async (id, deletedBy = null) => {
  const [[row]] = await query(
    'SELECT id, ruta_archivo FROM capturas WHERE id = ? AND deleted_at IS NULL',
    [id]
  );
  if (!row) throw Object.assign(new Error('Captura no encontrada'), { status: 404 });

  await query(
    'UPDATE capturas SET deleted_at = NOW(), deleted_by = ? WHERE id = ?',
    [deletedBy, id]
  );
};

// ── Config de capturas ────────────────────────────────────────────────────────
const getConfig = async () => {
  const habilitadas   = await configSvc.get('capturas_habilitadas');
  const intervalo_min = await configSvc.get('capturas_intervalo_min');
  return { habilitadas: !!habilitadas, intervalo_min: Number(intervalo_min) || 30 };
};

module.exports = { guardar, listar, eliminar, getConfig };
