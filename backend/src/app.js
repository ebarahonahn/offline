const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const env = require('./config/env');

const app = express();

// ── Seguridad ────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: env.frontendUrl,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
}));

// ── Rate limiting ────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 200,
  message: { success: false, message: 'Demasiadas solicitudes, intenta más tarde' },
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { success: false, message: 'Demasiados intentos de login' },
});

// ── Parsers & utilidades ─────────────────────────────────────
app.use(compression());
app.use(express.json({ limit: '5mb' }));
app.use(express.urlencoded({ extended: true }));
if (env.NODE_ENV === 'development') app.use(morgan('dev'));

// ── Archivos estáticos (solo logos y avatares — no sensibles) ─
const staticOpts = { setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin') };
app.use('/uploads/logos',   express.static(path.join(__dirname, '../../uploads/logos'),   staticOpts));
app.use('/uploads/avatars', express.static(path.join(__dirname, '../../uploads/avatars'), staticOpts));

// ── Capturas — requieren autenticación ────────────────────────
const { serveCapturas, serveEvidencias } = require('./middlewares/uploads.middleware');
app.get('/uploads/capturas/*',   serveCapturas);
app.get('/uploads/evidencias/*', serveEvidencias);

// ── Rutas ────────────────────────────────────────────────────
app.use('/api',                 limiter);
app.use('/api/auth',            authLimiter, require('./modules/auth/auth.routes'));
app.use('/api/usuarios',                     require('./modules/usuarios/usuarios.routes'));
app.use('/api/jornadas',                     require('./modules/jornadas/jornadas.routes'));
app.use('/api/actividades',                  require('./modules/actividades/actividades.routes'));
app.use('/api/inactividad',                  require('./modules/inactividad/inactividad.routes'));
app.use('/api/dashboard',                    require('./modules/dashboard/dashboard.routes'));
app.use('/api/reportes',                     require('./modules/reportes/reportes.routes'));
app.use('/api/configuraciones',              require('./modules/configuraciones/configuraciones.routes'));
app.use('/api/tipos-actividad',              require('./modules/tipos-actividad/tipos-actividad.routes'));
app.use('/api/departamentos',                require('./modules/departamentos/departamentos.routes'));
app.use('/api/capturas',                     require('./modules/capturas/capturas.routes'));
app.use('/api/auditoria',                    require('./modules/auditoria/auditoria.routes'));
app.use('/api/soporte',                      require('./modules/soporte/soporte.routes'));
app.use('/api/notificaciones',               require('./modules/notificaciones/notificaciones.routes'));

// ── Health check ──────────────────────────────────────────────
app.get('/health', (req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// ── 404 ───────────────────────────────────────────────────────
app.use((req, res) => res.status(404).json({ success: false, message: `Ruta no encontrada: ${req.method} ${req.path}` }));

// ── Error handler ─────────────────────────────────────────────
app.use(require('./middlewares/error.middleware'));

module.exports = app;
