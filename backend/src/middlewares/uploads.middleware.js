const path = require('path');
const fs   = require('fs');
const { verifyToken } = require('../config/jwt');

const CAPTURAS_DIR  = path.resolve(__dirname, '../../../uploads/capturas');
const EVIDENCIAS_DIR = path.resolve(__dirname, '../../../uploads/evidencias');

/**
 * Fábrica: crea un handler autenticado para servir archivos de un directorio.
 * Acepta JWT en query param ?token= o header Authorization: Bearer.
 * Permiso por defecto: admin/supervisor ven todo; empleado solo sus propios
 * archivos (filename debe empezar con u{id}_).
 */
const serveAuthenticated = (baseDir) => (req, res) => {
  // ── 1. Extraer token ─────────────────────────────────────────
  const authHeader = req.headers.authorization;
  const token =
    req.query.token ||
    (authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null);

  if (!token) {
    return res.status(401).json({ success: false, message: 'Autenticación requerida' });
  }

  let decoded;
  try {
    decoded = verifyToken(token);
  } catch {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }

  // ── 2. Resolver ruta y anti path traversal ───────────────────
  const subpath  = req.params[0];
  const resolved = path.resolve(baseDir, subpath);

  if (!resolved.startsWith(baseDir + path.sep)) {
    return res.status(400).json({ success: false, message: 'Ruta inválida' });
  }

  // ── 3. Verificar existencia ──────────────────────────────────
  if (!fs.existsSync(resolved)) {
    return res.status(404).json({ success: false, message: 'Archivo no encontrado' });
  }

  // ── 4. Control de acceso ─────────────────────────────────────
  // Admin y supervisor ven todo. Empleado solo sus propios archivos
  // (el filename tiene el formato u{id}_...).
  if (decoded.rol !== 'admin' && decoded.rol !== 'supervisor') {
    const filename = path.basename(resolved);
    const match    = filename.match(/^u(\d+)_/);
    const ownerId  = match ? parseInt(match[1], 10) : null;

    if (decoded.id !== ownerId) {
      return res.status(403).json({ success: false, message: 'Sin permiso para acceder a este archivo' });
    }
  }

  res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

  // Documentos Office → forzar descarga; PDF → abrir inline
  const ext = path.extname(resolved).toLowerCase();
  if (ext === '.docx' || ext === '.xlsx') {
    res.setHeader('Content-Disposition', `attachment; filename="${path.basename(resolved)}"`);
  } else if (ext === '.pdf') {
    res.setHeader('Content-Disposition', `inline; filename="${path.basename(resolved)}"`);
  }

  res.sendFile(resolved);
};

const serveCapturas  = serveAuthenticated(CAPTURAS_DIR);
const serveEvidencias = serveAuthenticated(EVIDENCIAS_DIR);

module.exports = { serveCapturas, serveEvidencias };
