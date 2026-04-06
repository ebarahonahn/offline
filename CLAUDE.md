# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Comandos de desarrollo

### Base de datos (MySQL 8+)
```bash
mysql -u root -p < database/schema.sql   # Crear esquema inicial
# Migraciones adicionales en database/migrations/
```

### Backend (Node.js 18+, Express 4)
```bash
cd backend
cp .env.example .env      # Configurar credenciales MySQL y JWT
npm install
npm run seed              # Insertar usuarios iniciales (admin/supervisor/empleado)
npm run dev               # Desarrollo con nodemon en http://localhost:3000
npm start                 # Producción
```

### Frontend (Angular 19)
```bash
cd frontend
npm install
npm start                 # Sirve en http://localhost:4200 con auto-open
npm run build             # Build de desarrollo
npm run build:prod        # Build de producción optimizado
```

## Arquitectura

### Estructura del backend (`backend/src/`)
Organización modular: cada módulo en `src/modules/<nombre>/` contiene `*.routes.js`, `*.controller.js`, `*.service.js` y opcionalmente `*.validators.js`.

- **`config/`** — Inicialización de conexión MySQL (`database.js`), JWT (`jwt.js`), variables de entorno (`env.js`), Socket.io (`socket.js`), mailer (`mailer.js`)
- **`middlewares/`** — `auth.middleware.js` (valida JWT + sesión activa en tabla `sesiones`), `role.middleware.js` (control de acceso por rol), `audit.middleware.js` (registro automático de acciones), `validate.middleware.js` (valida con express-validator), `error.middleware.js` (handler global), `uploads.middleware.js` (sirve archivos protegidos de `/uploads/` con autenticación JWT vía header o query param `?token=`)
- **`utils/`** — `response.util.js` expone helpers unificados: `ok`, `created`, `fail`, `unauthorized`, `forbidden`, `notFound`, `paged`. Todos los controladores deben usar estas funciones. Otros utils: `date.util.js` (conversión a formato MySQL DATETIME), `file.util.js` (validación de tipos/tamaño de documentos hasta 10 MB), `image.util.js` (validación de imágenes hasta 2 MB con magic bytes), `pagination.util.js` (parseo de parámetros de paginación desde query string)
- **`modules/`** — Módulos: `auth`, `usuarios`, `jornadas`, `actividades`, `inactividad`, `dashboard`, `reportes`, `configuraciones`, `tipos-actividad`, `departamentos`, `capturas`, `auditoria`, `soporte`, `notificaciones`

### Autenticación y sesiones
- JWT access token (8h) + refresh token (7d)
- Las sesiones se persisten en la tabla `sesiones` de MySQL. El middleware `authenticate` valida el token **y** que la sesión esté activa en BD (`sesiones.activa = 1 AND expires_at > NOW()`).
- Archivos de captura de pantalla (`/uploads/capturas/`) y evidencias requieren autenticación — no son estáticos públicos.

### Socket.io (tiempo real)
`socket.js` inicializa el servidor con autenticación JWT en el handshake. Los usuarios se unen automáticamente a las salas `user:<id>` y `rol:<nombre>`. Para emitir eventos desde servicios del backend usar `emitToUser(userId, event, data)` o `emitToRole(rol, event, data)`.

### Frontend Angular 19 (`frontend/src/app/`)
- **`core/`** — Guards (`auth.guard`, `role.guard`), interceptors (`auth.interceptor` maneja refresh automático ante 401, `error.interceptor`), servicios y modelos de dominio
- **`features/`** — Componentes lazy-loaded por ruta, uno por módulo de negocio. Todos se cargan con `loadComponent` (standalone components). Features: `actividades`, `admin-jornadas`, `auditoria`, `auth`, `capturas`, `configuracion`, `dashboard`, `departamentos`, `inactividad`, `jornada`, `perfil`, `reportes`, `soporte`, `tipos-actividad`, `usuarios`
- **`shared/`** — Componentes reutilizables: `layout` (MainLayoutComponent con sidebar), `sidebar`, `topbar`, `confirm-dialog`, `data-table`, `empty-state`, `inactividad-overlay`, `loading-spinner`, `status-badge`; también `pipes`

### Guards y control de acceso (frontend)
- `authGuard` — protege todas las rutas autenticadas
- `roleGuard('admin', 'supervisor')` — factory function, acepta lista de roles permitidos. Rutas de admin-only usan `roleGuard('admin')`.

### Convención de respuestas API
Todas las respuestas siguen `{ success: boolean, data?, message, errors?, pagination? }` usando los helpers de `response.util.js`.

## Variables de entorno requeridas (backend)
```
DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD
JWT_SECRET, JWT_EXPIRES_IN, JWT_REFRESH_SECRET, JWT_REFRESH_EXPIRES_IN
PORT, NODE_ENV, FRONTEND_URL, BCRYPT_ROUNDS
```
