# Sistema de Control de Tiempo Laboral - Teletrabajo

Sistema web institucional para monitoreo de jornada laboral, actividades e inactividad de empleados en teletrabajo.

## Stack Tecnológico

| Capa | Tecnología |
|------|-----------|
| Frontend | Angular 19 + Tailwind CSS 3 |
| Backend | Node.js + Express 4 |
| Base de datos | MySQL 8+ |
| Autenticación | JWT (access + refresh tokens) |
| Tiempo real | Socket.io 4 |
| Reportes | ExcelJS + PDFKit |

## Estructura del Proyecto

```
offline/
├── backend/          # API REST Node.js
├── frontend/         # SPA Angular
└── database/
    └── schema.sql    # DDL completo MySQL
```

## Instalación y Configuración

### 1. Base de Datos MySQL

```sql
-- Ejecutar el schema completo:
mysql -u root -p < database/schema.sql
```

### 2. Backend

```bash
cd backend
cp .env.example .env
# Editar .env con tus credenciales MySQL

npm install
npm run seed        # Crea usuarios iniciales
npm run dev         # Desarrollo con nodemon
# npm start         # Producción
```

El servidor arranca en `http://localhost:3000`

### 3. Frontend

```bash
cd frontend
npm install
npm start           # Arranca en http://localhost:4200
```

## Credenciales Iniciales (seed)

| Rol | Email | Contraseña |
|-----|-------|-----------|
| Administrador | admin@teletrabajo.com | Admin@123 |
| Supervisor | supervisor@teletrabajo.com | Supervisor@123 |
| Empleado | empleado@teletrabajo.com | Empleado@123 |

## API Endpoints Principales

```
POST   /api/auth/login
POST   /api/auth/logout
POST   /api/auth/refresh
GET    /api/auth/me

GET    /api/usuarios
POST   /api/usuarios
PUT    /api/usuarios/:id
PATCH  /api/usuarios/:id/estado

POST   /api/jornadas/iniciar
GET    /api/jornadas/activa
POST   /api/jornadas/:id/pausar
POST   /api/jornadas/:id/reanudar
POST   /api/jornadas/:id/finalizar
GET    /api/jornadas

GET    /api/actividades
POST   /api/actividades
PUT    /api/actividades/:id
DELETE /api/actividades/:id

POST   /api/inactividad/iniciar
POST   /api/inactividad/:id/cerrar

GET    /api/dashboard/resumen
GET    /api/dashboard/semana
GET    /api/dashboard/ranking
GET    /api/dashboard/estado

GET    /api/reportes/jornadas
GET    /api/reportes/productividad
GET    /api/reportes/export/excel
GET    /api/reportes/export/pdf

GET    /api/configuraciones
PUT    /api/configuraciones
```

## Módulos del Sistema

### Para Empleados
- **Mi Jornada**: Iniciar, pausar, reanudar y finalizar jornada con timer en tiempo real
- **Actividades**: Registrar actividades con tipo, descripción y duración
- **Dashboard**: Vista de métricas propias (tiempo trabajado, pausas, inactividad)

### Para Supervisores
- Todo lo de empleados
- **Reportes**: Ver y exportar reportes de su equipo
- **Dashboard ampliado**: Estado en tiempo real de empleados

### Para Administradores
- Todo lo anterior
- **Usuarios**: CRUD completo de usuarios
- **Configuración**: Parámetros del sistema (umbrales de inactividad, horarios, etc.)

## Detección de Inactividad

El sistema detecta inactividad mediante eventos del DOM (mouse, teclado, touch, scroll):
1. Después del umbral de alerta (configurable, default 3min), muestra un overlay de advertencia con contador
2. Si no hay respuesta antes del umbral de inactividad (configurable, default 5min), registra la inactividad automáticamente
3. Al retomar actividad, cierra el registro de inactividad

## Variables de Entorno (.env)

```env
NODE_ENV=development
PORT=3000
DB_HOST=localhost
DB_PORT=3306
DB_NAME=teletrabajo_db
DB_USER=root
DB_PASSWORD=
JWT_SECRET=secreto_largo_y_seguro
JWT_EXPIRES_IN=8h
JWT_REFRESH_SECRET=otro_secreto_diferente
JWT_REFRESH_EXPIRES_IN=7d
FRONTEND_URL=http://localhost:4200
BCRYPT_ROUNDS=12
```
