/**
 * Generador de Informe de Auditoría de Seguridad — PDF
 * Ejecutar: node generar-auditoria-pdf.js
 */
'use strict';
const PDFDocument = require('./backend/node_modules/pdfkit');
const fs          = require('fs');
const path        = require('path');

const OUTPUT = path.join(__dirname, 'Auditoria_Seguridad_Teletrabajo.pdf');

const C = {
  negro:        '#111827',
  gris:         '#6b7280',
  grisClarito:  '#f3f4f6',
  grisBorde:    '#d1d5db',
  azul:         '#1d4ed8',
  azulOscuro:   '#1e3a8a',
  azulClaro:    '#dbeafe',
  rojo:         '#dc2626',
  rojoClaro:    '#fee2e2',
  naranja:      '#b45309',
  naranjaClaro: '#fef3c7',
  verde:        '#15803d',
  verdeClaro:   '#dcfce7',
  blanco:       '#ffffff',
};

const doc = new PDFDocument({
  size:        'A4',
  margins:     { top: 50, bottom: 60, left: 50, right: 50 },
  bufferPages: true,
  info: {
    Title:   'Auditoría de Seguridad — Sistema Teletrabajo',
    Author:  'Claude Code',
    Subject: 'Informe de seguridad pre-producción 2026',
  },
});

const stream = fs.createWriteStream(OUTPUT);
doc.pipe(stream);

const ML   = doc.page.margins.left;
const MR   = doc.page.margins.right;
const MT   = doc.page.margins.top;
const MB   = doc.page.margins.bottom;
const PW   = doc.page.width  - ML - MR;
const PH   = doc.page.height;
const PBOT = PH - MB;

// ─────────────────────────────────────────────────────────────────────────────
// UTILIDADES BÁSICAS
// ─────────────────────────────────────────────────────────────────────────────

function Y()        { return doc.y; }
function setY(v)    { doc.y = v; }

function addPage() {
  doc.addPage();
}

function needPage(h) {
  if (Y() + h > PBOT - 10) addPage();
}

function fill(x, y, w, h, color) {
  doc.save().rect(x, y, w, h).fill(color).restore();
}

function hline(y, color) {
  doc.save()
    .moveTo(ML, y).lineTo(ML + PW, y)
    .lineWidth(0.4).strokeColor(color || C.grisBorde).stroke()
    .restore();
}

function gap(n) { doc.moveDown(n || 0.5); }

// Texto en posición explícita sin afectar doc.y de forma inesperada
function cell(txt, x, y, w, opts) {
  doc.text(String(txt || ''), x, y, {
    width:     w,
    lineBreak: false,
    ellipsis:  true,
    ...opts,
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTES VISUALES
// ─────────────────────────────────────────────────────────────────────────────

function secHeader(txt, color) {
  color = color || C.azulOscuro;
  needPage(36);
  const y = Y();
  fill(ML, y, PW, 24, color);
  doc.fontSize(11).font('Helvetica-Bold').fillColor(C.blanco)
     .text(txt, ML + 8, y + 7, { width: PW - 16, lineBreak: false });
  setY(y + 30);
}

function subTitle(txt) {
  needPage(30);
  gap(0.3);
  doc.fontSize(9.5).font('Helvetica-Bold').fillColor(C.azul).text(txt, ML, Y());
  gap(0.2);
}

function bodyText(txt, indent) {
  indent = indent || 0;
  needPage(18);
  doc.fontSize(9).font('Helvetica').fillColor(C.negro)
     .text(txt, ML + indent, Y(), { width: PW - indent, align: 'justify' });
  gap(0.25);
}

function bullet(txt, indent) {
  indent = indent || 10;
  needPage(18);
  const y = Y();
  doc.save().circle(ML + indent + 3, y + 4.5, 2).fill(C.azul).restore();
  doc.fontSize(9).font('Helvetica').fillColor(C.negro)
     .text(txt, ML + indent + 10, y, { width: PW - indent - 10, align: 'justify' });
  gap(0.2);
}

// Caja de hallazgo: ID, severidad, título
function hallazgoHeader(id, sev, sevColor, titulo) {
  needPage(80);
  const y = Y();
  fill(ML, y, PW, 22, sevColor === C.rojo ? C.rojoClaro :
                       sevColor === C.naranja ? C.naranjaClaro :
                       sevColor === C.verde   ? C.verdeClaro   : C.azulClaro);
  // borde izquierdo de color
  fill(ML, y, 4, 22, sevColor);
  // badge
  fill(ML + 6, y + 4, 55, 14, sevColor);
  doc.fontSize(7.5).font('Helvetica-Bold').fillColor(C.blanco)
     .text(sev, ML + 6, y + 7, { width: 55, align: 'center', lineBreak: false });
  // ID
  doc.fontSize(9).font('Helvetica-Bold').fillColor(sevColor)
     .text(id, ML + 66, y + 6, { width: 35, lineBreak: false });
  // Título
  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.negro)
     .text(titulo, ML + 104, y + 6, { width: PW - 108, lineBreak: false });
  setY(y + 26);
}

function metaRow(label, val) {
  const y = Y();
  doc.fontSize(8.5).font('Helvetica-Bold').fillColor(C.gris)
     .text(label + ':', ML + 10, y, { width: 130, lineBreak: false });
  doc.fontSize(8.5).font('Helvetica').fillColor(C.negro)
     .text(val, ML + 145, y, { width: PW - 148, lineBreak: false });
  setY(y + 14);
}

// ─────────────────────────────────────────────────────────────────────────────
// TABLA GENÉRICA
// tablas: [{ header, width }, ...], rows: [[...], ...]
// ─────────────────────────────────────────────────────────────────────────────

function tabla(columnas, filas, rowH) {
  rowH = rowH || 18;
  needPage(rowH * 2 + 20);

  // Encabezado
  const hy = Y();
  fill(ML, hy, PW, rowH, C.azulOscuro);
  let cx = ML;
  for (const col of columnas) {
    doc.fontSize(8).font('Helvetica-Bold').fillColor(C.blanco)
       .text(col.header, cx + 4, hy + (rowH - 8) / 2, { width: col.width - 6, lineBreak: false });
    cx += col.width;
  }
  setY(hy + rowH);

  for (let ri = 0; ri < filas.length; ri++) {
    needPage(rowH + 4);
    const ry = Y();
    fill(ML, ry, PW, rowH, ri % 2 === 0 ? C.blanco : C.grisClarito);
    let rx = ML;
    const fila = filas[ri];
    for (let ci = 0; ci < columnas.length; ci++) {
      const col  = columnas[ci];
      const val  = fila[ci] || '';
      const fc   = col.color ? col.color(val) : C.negro;
      const bold = col.bold  ? col.bold(val)  : false;
      doc.fontSize(8).font(bold ? 'Helvetica-Bold' : 'Helvetica').fillColor(fc)
         .text(String(val), rx + 4, ry + (rowH - 8) / 2, { width: col.width - 6, lineBreak: false });
      rx += col.width;
    }
    setY(ry + rowH);
  }
  gap(0.5);
}

// ─────────────────────────────────────────────────────────────────────────────
// DATOS
// ─────────────────────────────────────────────────────────────────────────────

const HALLAZGOS = [
  {
    id:'C-01', sev:'CRÍTICO', color:C.rojo,
    titulo:'Tokens JWT almacenados en localStorage (XSS Token Theft)',
    archivos:'frontend/src/app/core/services/auth.service.ts:40-42',
    cwe:'CWE-922',
    descripcion:
      'localStorage es accesible desde cualquier JavaScript en la página. Un solo XSS (dependencia npm comprometida, ' +
      'innerHTML accidental, etc.) extrae ambos tokens silenciosamente. El refreshToken con 7 días de vigencia ' +
      'mantiene el acceso activo aun después de que el usuario cambie su contraseña.',
    impacto:'Secuestro completo de sesión por hasta 7 días.',
    remediacion:[
      'Mover accessToken a memoria (variable en el service Angular, no persistir).',
      'Mover refreshToken a cookie HttpOnly; Secure; SameSite=Strict (inaccesible desde JS).',
      'Al cambiar contraseña, invalidar TODAS las sesiones activas del usuario en tabla sesiones.',
    ],
  },
  {
    id:'C-02', sev:'CRÍTICO', color:C.rojo,
    titulo:'Contraseñas provisionales generadas con Math.random() (no criptográfico)',
    archivos:'auth.service.js:133, usuarios.service.js:67',
    cwe:'CWE-338',
    descripcion:
      'Math.random() es un PRNG determinístico no apto para criptografía. Su estado interno puede predecirse ' +
      'con suficientes observaciones, lo que permite calcular contraseñas provisionales futuras o pasadas.',
    impacto:'Predicción de credenciales iniciales de cualquier usuario del sistema.',
    remediacion:[
      "Reemplazar con: const bytes = require('crypto').randomBytes(10);",
      'Aplicar en auth.service.js Y usuarios.service.js.',
    ],
  },
  {
    id:'C-03', sev:'CRÍTICO', color:C.rojo,
    titulo:'Sin .gitignore: archivo .env en riesgo de exposición',
    archivos:'Raíz del proyecto — .gitignore NO EXISTE',
    cwe:'CWE-312',
    descripcion:
      'No existe .gitignore en el proyecto. Si se inicializa Git (para backup, CI/CD o colaboración), ' +
      'el archivo backend/.env con credenciales de BD y secretos JWT puede ser commiteado accidentalmente.',
    impacto:'Exposición completa de credenciales de base de datos y secretos JWT.',
    remediacion:[
      'Crear backend/.gitignore con: .env, node_modules/, uploads/, *.log',
      'Inicializar el repositorio DESPUÉS de tener el .gitignore.',
    ],
  },
  {
    id:'A-01', sev:'ALTO', color:C.naranja,
    titulo:'Sin rate limiting en /recuperar-password (Email Flooding)',
    archivos:'backend/src/modules/auth/auth.routes.js:12',
    cwe:'CWE-307',
    descripcion:
      'El endpoint acepta peticiones ilimitadas. Permite: spam masivo de correos a un usuario víctima, ' +
      'agotamiento de cuota SMTP, y saturación de CPU por operaciones bcrypt concurrentes (~300ms c/u).',
    impacto:'Spam de correos, agotamiento de cuota SMTP, DoS parcial por saturación bcrypt.',
    remediacion:["Aplicar el authLimiter ya existente: router.post('/recuperar-password', authLimiter, ...)"],
  },
  {
    id:'A-02', sev:'ALTO', color:C.naranja,
    titulo:'Socket.io no verifica estado activo del usuario en reconexión',
    archivos:'backend/src/config/socket.js:17-27',
    cwe:'CWE-613',
    descripcion:
      'El middleware WebSocket solo verifica la firma del JWT, no consulta la BD para verificar si el usuario ' +
      'fue suspendido o si su sesión fue revocada. Un usuario bloqueado puede mantener conexión WS y recibir eventos.',
    impacto:'Usuario suspendido recibe datos en tiempo real (jornadas, empleados, etc.).',
    remediacion:[
      'Agregar consulta a tabla sesiones en el middleware de socket.io.',
      "Verificar usuarios.estado = 'activo' en el handshake.",
    ],
  },
  {
    id:'A-03', sev:'ALTO', color:C.naranja,
    titulo:'roleCache global sin expiración (Stale Role Authorization)',
    archivos:'backend/src/middlewares/role.middleware.js:4-9',
    cwe:'CWE-269',
    descripcion:
      'Los roles se cachean en memoria sin TTL. Si se degrada el rol de un usuario (admin→empleado), ' +
      'el cache retiene el rol anterior hasta reiniciar el proceso Node.js. El usuario conserva permisos de admin.',
    impacto:'Escalación de privilegios por tiempo indefinido hasta reinicio del servidor.',
    remediacion:['Agregar TTL de 60 segundos al roleCache para forzar revalidación periódica.'],
  },
  {
    id:'A-04', sev:'ALTO', color:C.naranja,
    titulo:'uncaughtException no manejado: proceso puede crashear sin recovery',
    archivos:'backend/server.js',
    cwe:'CWE-390',
    descripcion:
      'Solo existe handler para unhandledRejection (promesas). Un error síncrono no capturado termina ' +
      'el proceso Node.js sin recovery. Sin gestor de procesos configurado, el servidor queda caído indefinidamente.',
    impacto:'Caída total del servidor sin recuperación automática.',
    remediacion:[
      "Agregar: process.on('uncaughtException', (err) => { console.error(err); process.exit(1); })",
      'Configurar PM2 con restart automático: pm2 start server.js --name teletrabajo-api',
    ],
  },
  {
    id:'A-05', sev:'ALTO', color:C.naranja,
    titulo:'Imágenes sin validación de tamaño ni magic bytes (Unrestricted Upload)',
    archivos:'capturas.service.js:23, configuraciones.service.js:105, usuarios.service.js:170',
    cwe:'CWE-434',
    descripcion:
      'El tipo MIME se lee del header del string base64, completamente controlable por el cliente. ' +
      'No se verifican magic bytes. Un atacante puede enviar SVG con scripts, ejecutables u otros archivos ' +
      'maliciosos prefijándolos con data:image/png;base64,...',
    impacto:'Almacenamiento de archivos maliciosos; XSS si se sirven SVG con scripts embebidos.',
    remediacion:[
      'Verificar magic bytes del buffer (PNG: 89 50 4E 47, JPEG: FF D8 FF).',
      'Limitar tamaño a 2MB por imagen.',
      'Eliminar GIF de los formatos permitidos en logos.',
    ],
  },
  {
    id:'A-06', sev:'ALTO', color:C.naranja,
    titulo:'Archivos /uploads accesibles sin autenticación',
    archivos:'backend/src/app.js:41-44',
    cwe:'CWE-284',
    descripcion:
      'express.static sirve todos los archivos en /uploads sin verificación de sesión. Las URLs de ' +
      'capturas siguen el patrón u{userId}_{timestamp}.{ext}, parcialmente predecibles. Las capturas ' +
      'pueden contener información confidencial de la organización.',
    impacto:'Exposición de capturas de pantalla sensibles a usuarios no autenticados.',
    remediacion:[
      'Reemplazar express.static por un endpoint autenticado que valide sesión y permisos.',
      'Verificar que el path esté dentro del directorio UPLOADS_DIR (anti path traversal).',
    ],
  },
  {
    id:'M-01', sev:'MEDIO', color:C.azul,
    titulo:'LIMIT/OFFSET interpolados en SQL (DoS potencial)',
    archivos:'auditoria.service.js:61, capturas.service.js:66',
    cwe:'CWE-89',
    descripcion:
      'capturas.service.js no usa parsePagination, por lo que limit llega sin cota máxima. ' +
      'Una petición con limit=9999999 puede retornar millones de filas saturando BD y memoria.',
    impacto:'DoS parcial; mal patrón de código susceptible a inyección en refactorizaciones futuras.',
    remediacion:['Usar parámetros ? para LIMIT/OFFSET. Aplicar parsePagination() en capturas.service.js.'],
  },
  {
    id:'M-02', sev:'MEDIO', color:C.azul,
    titulo:'Mensaje 403 revela roles internos del sistema',
    archivos:'backend/src/middlewares/role.middleware.js:20',
    cwe:'CWE-200',
    descripcion:'La respuesta 403 incluye: "Acceso restringido a: admin, supervisor". Expone la arquitectura de autorización.',
    impacto:'Facilita la fase de reconocimiento de un ataque dirigido.',
    remediacion:["Cambiar a mensaje genérico: return forbidden(res, 'Acceso denegado');"],
  },
  {
    id:'M-03', sev:'MEDIO', color:C.azul,
    titulo:'Sesiones expiradas no se limpian (degradación progresiva)',
    archivos:'database/schema.sql — sin job de limpieza',
    cwe:'CWE-400',
    descripcion:
      'La tabla sesiones acumula filas indefinidamente. authenticate la consulta en cada request HTTP. ' +
      'Sin limpieza, el rendimiento se degradará progresivamente con el paso del tiempo.',
    impacto:'Degradación del tiempo de respuesta de todos los endpoints autenticados.',
    remediacion:['Crear MySQL Event: DELETE FROM sesiones WHERE expires_at < NOW() - INTERVAL 7 DAY (cada 24h).'],
  },
  {
    id:'M-04', sev:'MEDIO', color:C.azul,
    titulo:'inactividad.iniciar acepta jornadaId de otro usuario',
    archivos:'backend/src/modules/inactividad/inactividad.service.js:5-10',
    cwe:'CWE-639',
    descripcion:
      'El jornadaId se inserta sin verificar que pertenezca al usuarioId del token JWT. Un empleado puede ' +
      'asociar sus registros de inactividad a jornadas ajenas, corrompiendo estadísticas y reportes.',
    impacto:'Manipulación de estadísticas de inactividad de otros empleados.',
    remediacion:['Agregar: SELECT id FROM jornadas WHERE id = ? AND usuario_id = ? antes del INSERT.'],
  },
  {
    id:'M-05', sev:'MEDIO', color:C.azul,
    titulo:'Número de ticket generado con COUNT(*) sin bloqueo (Race Condition)',
    archivos:'backend/src/modules/soporte/soporte.service.js',
    cwe:'CWE-362',
    descripcion:
      'Dos peticiones simultáneas pueden leer el mismo COUNT y generar el mismo número STK-YYYY-NNNN. ' +
      'Uno de los dos INSERT fallará por la restricción UNIQUE, generando error 500 para el usuario.',
    impacto:'Error en creación de tickets bajo carga concurrente.',
    remediacion:['Usar AUTO_INCREMENT con formato calculado al leer, o tabla de secuencia con SELECT FOR UPDATE.'],
  },
  {
    id:'M-06', sev:'MEDIO', color:C.azul,
    titulo:'Morgan logging activo en producción (Information Disclosure)',
    archivos:'backend/src/app.js:38',
    cwe:'CWE-532',
    descripcion:
      "La condición es: if (NODE_ENV !== 'test'), por lo que Morgan está activo en producción. " +
      'Registra URLs completas incluyendo query strings con posibles datos personales.',
    impacto:'Datos personales en query strings pueden quedar en logs del servidor.',
    remediacion:["Cambiar condición a: if (NODE_ENV === 'development') para desactivar en producción."],
  },
  {
    id:'M-07', sev:'MEDIO', color:C.azul,
    titulo:'Configuraciones del sistema accesibles a cualquier rol autenticado',
    archivos:'backend/src/modules/configuraciones/configuraciones.routes.js:8',
    cwe:'CWE-285',
    descripcion:
      'GET /api/configuraciones y GET /api/configuraciones/:grupo no tienen authorize(). ' +
      'Un empleado puede ver umbrales de inactividad, intervalos de capturas y otros parámetros internos.',
    impacto:'Empleados pueden ajustar su comportamiento para evadir controles del sistema.',
    remediacion:[
      "Agregar authorize('admin') al GET /api/configuraciones.",
      'Crear endpoint público limitado GET /api/configuraciones/publico con solo las claves necesarias para el frontend.',
    ],
  },
  {
    id:'L-01', sev:'BAJO', color:C.verde,
    titulo:'bcryptjs sin mantenimiento activo (vida útil de dependencia)',
    archivos:'backend/package.json',
    cwe:'Informativo',
    descripcion:
      'bcryptjs@2.4.3 es la última versión disponible, pero sin actualizaciones desde 2021. ' +
      'OWASP 2024 recomienda argon2 (ganador de la PHC) por ser más resistente a hardware especializado.',
    impacto:'Bajo en la actualidad; riesgo creciente sin mantenimiento activo.',
    remediacion:['npm install argon2 y migrar bcrypt.hash/compare a argon2.hash/verify.'],
  },
  {
    id:'L-02', sev:'BAJO', color:C.verde,
    titulo:'lodash vulnerable en dependencias transitivas (CVSS 8.1)',
    archivos:'backend/node_modules/lodash (transitiva)',
    cwe:'CWE-94 / GHSA-r5fr-rjxr-66jc',
    descripcion:
      'lodash ≤4.17.23 tiene Code Injection via _.template. Es dependencia transitiva de exceljs. ' +
      'No se usa directamente, pero está presente en el árbol de dependencias.',
    impacto:'Bajo — no usado directamente, pero presente en el árbol.',
    remediacion:['Ejecutar: npm audit fix en el directorio backend.'],
  },
  {
    id:'L-03', sev:'BAJO', color:C.verde,
    titulo:'DB_USER=root en el archivo .env (mínimo privilegio violado)',
    archivos:'backend/.env',
    cwe:'CWE-272',
    descripcion:
      'Usar root como usuario de BD viola el principio de mínimo privilegio. En caso de compromiso ' +
      'de la aplicación, el atacante obtiene control total de toda la instancia MySQL del servidor.',
    impacto:'Compromiso total de la BD si la aplicación es vulnerada por otro vector.',
    remediacion:['Crear usuario: GRANT SELECT,INSERT,UPDATE,DELETE ON teletrabajo_db.* TO "app"@"localhost"'],
  },
  {
    id:'L-04', sev:'BAJO', color:C.verde,
    titulo:'Node.js 23 (Non-LTS) en producción',
    archivos:'package.json — engines: >=18.0.0',
    cwe:'Informativo',
    descripcion:
      'Node.js 23 es versión de desarrollo (número impar = non-LTS). No tiene parches de seguridad garantizados a largo plazo.',
    impacto:'Sin parches de seguridad garantizados después del ciclo de desarrollo.',
    remediacion:['Migrar a Node.js 22 LTS (soporte garantizado hasta abril 2027).'],
  },
  {
    id:'L-05', sev:'BAJO', color:C.verde,
    titulo:'Inconsistencia: capturas usa { status } en lugar de { statusCode }',
    archivos:'backend/src/modules/capturas/capturas.service.js',
    cwe:'CWE-390',
    descripcion:
      'capturas.service.js usa { status: 403 } al lanzar errores. El error.middleware.js maneja { statusCode }. ' +
      'Los errores de capturas caen en el catch genérico y devuelven HTTP 500 en lugar del código correcto.',
    impacto:'Respuestas de error incorrectas al cliente; dificulta depuración.',
    remediacion:['Estandarizar todos los throw a { statusCode: N } en capturas.service.js.'],
  },
];

const POSITIVOS = [
  { area:'SQL Injection',        desc:'Todas las queries usan parámetros preparados (?) — sin inyección directa detectable.' },
  { area:'Autenticación',        desc:'authenticate valida sesión en BD en CADA request, no solo firma JWT.' },
  { area:'Autorización',         desc:'authorize obtiene el rol desde la BD (no del JWT payload) — resistente a tokens desactualizados.' },
  { area:'Bcrypt',               desc:'12 rounds — adecuado para 2026 (~300ms por hash en hardware moderno).' },
  { area:'Headers HTTP',         desc:'Helmet activado: X-Powered-By eliminado, XSS-Protection, nosniff, Referrer-Policy.' },
  { area:'CORS',                 desc:'Origin específico configurado, no wildcard *.' },
  { area:'Rate Limiting',        desc:'Aplicado en /login y rutas de auth (20 req/15min).' },
  { area:'Enumeración usuarios', desc:'/recuperar-password retorna respuesta genérica independiente del email.' },
  { area:'Auditoría',            desc:'password_hash, reset_token y reset_token_exp sanitizados antes de guardar en bitácora.' },
  { area:'Soft Delete',          desc:'Implementado con deleted_at y deleted_by en todas las entidades.' },
  { area:'Transacciones BD',     desc:'transaction() usado en operaciones multi-tabla para garantizar consistencia.' },
  { area:'Validación input',     desc:'express-validator con whitelist de campos permitidos en UPDATE.' },
  { area:'Integridad BD',        desc:'12 Foreign Keys, charset utf8mb4, índices en tablas críticas.' },
  { area:'Paginación',           desc:'parsePagination limita el máximo a 100 registros por página.' },
  { area:'Errores',              desc:'Producción devuelve mensaje genérico; desarrollo devuelve detalle.' },
  { area:'Refresh Token',        desc:'Mecanismo implementado con verificación de sessionId en BD.' },
];

// ─────────────────────────────────────────────────────────────────────────────
// PORTADA
// ─────────────────────────────────────────────────────────────────────────────

fill(0, 0, doc.page.width, 180, C.azulOscuro);

doc.fontSize(22).font('Helvetica-Bold').fillColor(C.blanco)
   .text('AUDITORÍA DE SEGURIDAD', ML, 55, { width: PW, align: 'center' });
doc.fontSize(14).font('Helvetica').fillColor('#93c5fd')
   .text('Sistema de Control de Tiempo Laboral — Teletrabajo', ML, 88, { width: PW, align: 'center' });
doc.fontSize(10).font('Helvetica').fillColor('#bfdbfe')
   .text('Evaluación Pre-Producción', ML, 112, { width: PW, align: 'center' });

// Caja meta
const metaY = 195;
fill(ML, metaY, PW, 102, C.grisClarito);
doc.rect(ML, metaY, PW, 102).lineWidth(0.5).strokeColor(C.grisBorde).stroke();

setY(metaY + 10);
metaRow('Fecha del informe',   '2 de abril de 2026');
metaRow('Auditor',             'Claude Code (Análisis estático de código fuente)');
metaRow('Stack analizado',     'Node.js 23 / Express 4.19 / MySQL / Angular 19 / Socket.io 4.7');
metaRow('Metodología',         'OWASP Top 10 (2021) · CWE Top 25 · npm audit · Revisión manual');
metaRow('Clasificación',       'CONFIDENCIAL — Solo para uso interno');
metaRow('Estado del proyecto', 'Sin repositorio Git · Sin CI/CD · Sin tests automatizados');

// Tabla resumen
setY(315);
doc.fontSize(12).font('Helvetica-Bold').fillColor(C.negro)
   .text('RESUMEN DE HALLAZGOS', ML, Y(), { width: PW, align: 'center' });
setY(Y() + 18);

const sevCols = [
  { label:'CRÍTICO',  count:3,  color:C.rojo    },
  { label:'ALTO',     count:6,  color:C.naranja  },
  { label:'MEDIO',    count:7,  color:C.azul     },
  { label:'BAJO',     count:5,  color:C.verde    },
  { label:'TOTAL',    count:21, color:C.azulOscuro},
];
const bW = PW / sevCols.length;
let bX = ML;
const bY = Y();
for (const s of sevCols) {
  fill(bX, bY, bW - 3, 58, s.color);
  doc.fontSize(24).font('Helvetica-Bold').fillColor(C.blanco)
     .text(String(s.count), bX, bY + 8, { width: bW - 3, align: 'center', lineBreak: false });
  doc.fontSize(8).font('Helvetica-Bold').fillColor(C.blanco)
     .text(s.label, bX, bY + 38, { width: bW - 3, align: 'center', lineBreak: false });
  bX += bW;
}
setY(bY + 64);

doc.fontSize(9).font('Helvetica').fillColor(C.negro)
   .text(
     'El sistema tiene una base técnica sólida pero presenta 3 vulnerabilidades críticas que deben resolverse ' +
     'ANTES de cualquier despliegue con datos reales. El mayor riesgo es el almacenamiento de tokens JWT en ' +
     'localStorage, la ausencia de control de versiones (.gitignore) y el uso de un generador de contraseñas ' +
     'no criptográfico (Math.random). Ver Plan de Remediación para la hoja de ruta completa.',
     ML, Y(), { width: PW, align: 'justify' }
   );
gap(0.6);

// Veredicto
const vY = Y();
fill(ML, vY, PW, 32, C.rojoClaro);
doc.rect(ML, vY, PW, 32).lineWidth(1).strokeColor(C.rojo).stroke();
doc.fontSize(10).font('Helvetica-Bold').fillColor(C.rojo)
   .text('⚠  VEREDICTO: El sistema NO está listo para producción en su estado actual.',
     ML + 10, vY + 10, { width: PW - 20, lineBreak: false });

// ─────────────────────────────────────────────────────────────────────────────
// HALLAZGOS DETALLADOS
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('HALLAZGOS DETALLADOS POR SEVERIDAD');
gap(0.4);

for (const h of HALLAZGOS) {
  hallazgoHeader(h.id, h.sev, h.color, h.titulo);

  // Archivos y CWE
  doc.fontSize(8).font('Helvetica').fillColor(C.gris)
     .text('Archivos: ' + h.archivos + '   |   ' + h.cwe, ML + 6, Y(), { width: PW - 10 });
  gap(0.3);

  subTitle('Descripción');
  bodyText(h.descripcion, 4);

  subTitle('Impacto');
  bodyText(h.impacto, 4);

  subTitle('Remediación');
  for (const r of h.remediacion) bullet(r, 8);

  hline(Y() + 3, C.grisBorde);
  gap(0.8);
}

// ─────────────────────────────────────────────────────────────────────────────
// ANÁLISIS SQL
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('ANÁLISIS DE INYECCIÓN SQL — Revisión módulo por módulo');
gap(0.4);
bodyText(
  'Se revisaron manualmente todas las queries del sistema. El uso de mysql2 con parámetros preparados (?) ' +
  'es consistente en el 95% del código base. No se encontraron inyecciones SQL directas o trivialmente explotables.'
);

const sqlRows = [
  ['auth.service.js',           '✓ Correcto',  'Todos los WHERE usan parámetros ? correctamente.'],
  ['usuarios.service.js',       '✓ Correcto',  'Whitelist de campos en UPDATE; parámetros correctos.'],
  ['jornadas.service.js',       '✓ Correcto',  'WHERE dinámico construido con condiciones fijas + parámetros.'],
  ['actividades.service.js',    '△ Revisar',   'SET dinámico desde whitelist — correcto pero complejo de auditar.'],
  ['capturas.service.js',       '✗ Riesgo',    'LIMIT/OFFSET interpolados; sin parsePagination; riesgo DoS.'],
  ['auditoria.service.js',      '✗ Riesgo',    'LIMIT/OFFSET interpolados con ${Number(limit)}; mal patrón.'],
  ['soporte.service.js',        '✓ Correcto',  'WHERE dinámico construido con condiciones fijas + parámetros.'],
  ['dashboard.service.js',      '✓ Correcto',  'Queries estáticas o con parámetros correctos.'],
  ['inactividad.service.js',    '✓ Correcto',  'Parámetros correctos.'],
  ['configuraciones.service.js','✓ Correcto',  'UPDATE usa clave del catálogo, no input del usuario.'],
  ['departamentos.service.js',  '✓ Correcto',  'Parámetros correctos.'],
  ['tipos-actividad.service.js','✓ Correcto',  'Parámetros correctos.'],
];

tabla(
  [
    { header:'Módulo',          width: 160 },
    { header:'Estado',          width: 80,
      color: v => v.startsWith('✓') ? C.verde : v.startsWith('△') ? C.naranja : C.rojo,
      bold:  v => true },
    { header:'Observación',     width: PW - 240 },
  ],
  sqlRows
);

// ─────────────────────────────────────────────────────────────────────────────
// DEPENDENCIAS
// ─────────────────────────────────────────────────────────────────────────────

secHeader('ANÁLISIS DE DEPENDENCIAS Y VIDA ÚTIL');
gap(0.4);

const depsRows = [
  ['express',          '^4.19.2',  'Activo',       'Express 5.x estable desde oct 2024. Planificar migración.'],
  ['bcryptjs',         '^2.4.3',   'Sin mant.',    'Sin actualizaciones desde 2021. Migrar a argon2 (OWASP rec.).'],
  ['jsonwebtoken',     '^9.0.2',   'Actual',       'Versión actual. OK.'],
  ['mysql2',           '^3.9.7',   'Actual',       'Versión actual. OK.'],
  ['socket.io',        '^4.7.5',   'Actual',       '4.8 disponible. Actualizar con npm update.'],
  ['nodemailer',       '^8.0.4',   'Actual',       'Migrado recientemente de v6. OK.'],
  ['helmet',           '^7.1.0',   'Actual',       'Versión actual. OK.'],
  ['lodash (trans.)',  '<=4.17.23','Vulnerable',   'CVSS 8.1 Code Injection. Ejecutar: npm audit fix.'],
  ['Node.js runtime',  'v23.x',    'Non-LTS',      'Versión impar = sin soporte largo plazo. Usar Node.js 22 LTS.'],
  ['Angular',          '19.x',     'Actual',       'Versión actual. OK.'],
];

tabla(
  [
    { header:'Dependencia', width: 120 },
    { header:'Versión',     width: 80  },
    { header:'Estado',      width: 85,
      color: v => v === 'Actual' ? C.verde : v === 'Sin mant.' || v === 'Vulnerable' || v === 'Non-LTS' ? C.rojo : C.naranja,
      bold:  () => true },
    { header:'Observación', width: PW - 295 },
  ],
  depsRows
);

// ─────────────────────────────────────────────────────────────────────────────
// HALLAZGOS POSITIVOS
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('HALLAZGOS POSITIVOS — Áreas bien implementadas', C.verde);
gap(0.4);
bodyText('El siguiente listado representa buenas prácticas detectadas en el código. Deben mantenerse durante el desarrollo futuro.');
gap(0.3);

for (const p of POSITIVOS) {
  needPage(22);
  const y = Y();
  fill(ML, y, 4, 15, C.verde);
  doc.fontSize(9).font('Helvetica-Bold').fillColor(C.verde)
     .text(p.area + ':', ML + 8, y + 2, { width: 150, lineBreak: false });
  doc.fontSize(9).font('Helvetica').fillColor(C.negro)
     .text(p.desc, ML + 162, y + 2, { width: PW - 164, lineBreak: false });
  setY(y + 18);
}

// ─────────────────────────────────────────────────────────────────────────────
// PLAN DE REMEDIACIÓN
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('PLAN DE REMEDIACIÓN PRIORIZADO');
gap(0.4);
bodyText('Las acciones están ordenadas por impacto y urgencia. Las Fase 1 son bloqueantes para producción.');
gap(0.3);

const fases = [
  {
    titulo:'Fase 1 — Antes de salir a producción (BLOQUEANTES)',
    color: C.rojo,
    items:[
      ['C-01', 'Mover tokens JWT a memoria + cookie HttpOnly',       'Alta'  ],
      ['C-02', 'Reemplazar Math.random() con crypto.randomBytes()',   'Baja'  ],
      ['C-03', 'Crear .gitignore e inicializar repositorio Git',      'Mínima'],
      ['A-01', 'Aplicar authLimiter a /recuperar-password',           'Mínima'],
      ['A-03', 'Agregar TTL de 60s al roleCache',                     'Baja'  ],
      ['A-04', 'Agregar handler uncaughtException + configurar PM2',  'Baja'  ],
      ['A-05', 'Validar tamaño (2MB) y magic bytes en uploads',       'Media' ],
      ['A-06', 'Proteger /uploads con endpoint autenticado',          'Media' ],
      ['M-01', 'Reemplazar LIMIT/OFFSET interpolado por ? en SQL',    'Mínima'],
      ['M-02', 'Cambiar mensaje 403 a "Acceso denegado"',             'Mínima'],
      ['L-03', 'Crear usuario BD con privilegios mínimos',            'Baja'  ],
    ],
  },
  {
    titulo:'Fase 2 — Primera semana en producción',
    color: C.naranja,
    items:[
      ['A-02', 'Verificar estado activo en Socket.io handshake',   'Baja'  ],
      ['M-03', 'Crear job de limpieza de sesiones expiradas',       'Baja'  ],
      ['M-04', 'Validar jornadaId en inactividad.iniciar',          'Mínima'],
      ['M-06', 'Ajustar condición de Morgan para producción',       'Mínima'],
      ['M-07', 'Restringir GET /configuraciones a rol admin',       'Baja'  ],
      ['L-05', 'Estandarizar { statusCode } en capturas.service',   'Mínima'],
    ],
  },
  {
    titulo:'Fase 3 — Mejoras de madurez (primer mes)',
    color: C.azul,
    items:[
      ['M-05', 'Refactorizar generación de número de ticket',         'Media'],
      ['L-01', 'Migrar de bcryptjs a argon2',                         'Media'],
      ['L-02', 'npm audit fix — actualizar dependencias vulnerables',  'Baja' ],
      ['L-04', 'Migrar runtime a Node.js 22 LTS',                     'Baja' ],
    ],
  },
];

for (const fase of fases) {
  needPage(50 + fase.items.length * 18);
  gap(0.3);
  const fy = Y();
  fill(ML, fy, PW, 20, fase.color);
  doc.fontSize(10).font('Helvetica-Bold').fillColor(C.blanco)
     .text(fase.titulo, ML + 8, fy + 6, { width: PW - 16, lineBreak: false });
  setY(fy + 22);

  tabla(
    [
      { header:'ID',          width: 50  },
      { header:'Acción',      width: PW - 120 },
      { header:'Dificultad',  width: 70,
        color: v => v === 'Mínima' ? C.verde : v === 'Baja' ? C.azul : v === 'Media' ? C.naranja : C.rojo,
        bold: () => true },
    ],
    fase.items
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// RENDIMIENTO Y ENTROPÍA
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('ANÁLISIS DE RENDIMIENTO, MEMORIA Y ENTROPÍA DEL SOFTWARE');
gap(0.4);

subTitle('Puntos de latencia identificados');
tabla(
  [
    { header:'Componente',   width: 155 },
    { header:'Observación',  width: PW - 245 },
    { header:'Impacto',      width: 90, color: () => C.naranja, bold: () => true },
  ],
  [
    ['authenticate middleware',    '2 queries BD por request (sesión + usuario)',               '~4-8ms por request'],
    ['authorize middleware',        '1 query BD + cache local',                                  '~2ms adicional'   ],
    ['Capturas base64',             'Buffer de hasta 5MB deserializado completo en RAM',         'CPU alta en picos' ],
    ['Tabla auditoria',             'Sin particionado — puede superar 1M filas/año',             'Lentitud a largo p.'],
    ['Tabla sesiones',              'Sin limpieza — authenticate la consulta en cada request',   'Degradación gradual'],
  ]
);

subTitle('Análisis de consumo de memoria');
bullet('roleCache: 3 entradas fijas — despreciable en memoria.');
bullet('configCache: ~20 filas — despreciable, pero se pierde en cada reinicio (thundering herd en arranque).');
bullet('queueLimit MySQL = 0 (ilimitado): bajo carga extrema la cola puede agotar RAM. Cambiar a queueLimit: 50.');
bullet('Imágenes base64: hasta 5MB se deserializan completamente en RAM antes de escribirse a disco (sin streaming).');
bullet('JornadaService setInterval: OnDestroy implementado — sin memory leaks detectados. ✓');

subTitle('Ley de entropía del software — Deuda técnica detectada');
bullet('capturas.service.js maneja paginación manualmente; todos los otros módulos usan parsePagination. Inconsistencia.');
bullet('authenticate y authorize ambos consultan la BD para datos del mismo usuario — duplicación de queries.');
bullet('capturas.service.js usa { status: N } para errores; error.middleware maneja { statusCode: N } — devuelve HTTP 500 incorrectamente.');
bullet('GIF permitido en logos pero no en capturas ni avatares — validación inconsistente entre módulos.');
bullet('Sin tests automatizados: las regresiones y vulnerabilidades de lógica no se detectan automáticamente.');
bullet('Sin CI/CD: no hay análisis estático, tests ni npm audit automático en cada commit.');

// ─────────────────────────────────────────────────────────────────────────────
// PRUEBAS ADICIONALES
// ─────────────────────────────────────────────────────────────────────────────

addPage();
secHeader('PRUEBAS ADICIONALES RECOMENDADAS ANTES DE PRODUCCIÓN');
gap(0.4);
bodyText('Las siguientes pruebas requieren herramientas externas y no pueden realizarse con análisis estático.');
gap(0.3);

tabla(
  [
    { header:'Tipo de prueba',   width: 90  },
    { header:'Herramienta',      width: 130 },
    { header:'Objetivo',         width: PW - 220 },
  ],
  [
    ['DAST',           'OWASP ZAP',             'Escaneo dinámico de vulnerabilidades con la aplicación en ejecución.'],
    ['Pentesting',     'Burp Suite Pro',         'Test manual: bypass de autorización, WebSocket hijacking, IDOR.'],
    ['Carga / DoS',    'k6 / Artillery',         'Verificar comportamiento del pool MySQL bajo 100+ usuarios concurrentes.'],
    ['Fuzzing',        'Radamsa',                'Inputs malformados en endpoints de imágenes base64 y texto libre.'],
    ['Timing attack',  'Script Python/curl',     'Verificar que el login no filtra existencia de usuario por tiempo.'],
    ['Headers HTTP',   'SecurityHeaders.com',    'Verificar CSP, HSTS, X-Frame-Options en producción con HTTPS activo.'],
    ['Secretos en Git','trufflehog / git-secrets','Escanear historial Git en busca de credenciales commiteadas.'],
    ['SAST continuo',  'SonarQube / Semgrep',    'Análisis estático automático integrado en CI/CD (pipeline).'],
  ]
);

gap(0.5);
secHeader('CONCLUSIÓN FINAL');
gap(0.4);

bodyText(
  'El sistema demuestra un nivel de madurez técnica razonable para un proyecto en desarrollo activo. ' +
  'Las prácticas de seguridad base están presentes: bcrypt con rondas adecuadas, validación de entradas, ' +
  'autenticación con doble verificación (JWT + BD), CORS configurado, Helmet activado y auditoría de acciones.'
);
bodyText(
  'Sin embargo, los 3 hallazgos críticos y los 6 de nivel alto representan vectores de ataque reales ' +
  'que un adversario con motivación podría explotar en un entorno de producción. Especialmente el ' +
  'almacenamiento de tokens en localStorage (C-01) que, combinado con cualquier XSS futuro, ' +
  'entrega control total de las sesiones al atacante.'
);
bodyText(
  'La Fase 1 del plan de remediación puede completarse en aproximadamente 2-3 días de trabajo ' +
  'de desarrollo. Ninguna de las acciones bloqueantes requiere cambios arquitectónicos profundos. ' +
  'La inversión en seguridad ahora es considerablemente menor que el costo de responder a un incidente.'
);

gap(0.6);
const finalY = Y();
fill(ML, finalY, PW, 48, C.azulClaro);
doc.rect(ML, finalY, PW, 48).lineWidth(0.5).strokeColor(C.azul).stroke();
doc.fontSize(9).font('Helvetica-Bold').fillColor(C.azulOscuro)
   .text('Pasos inmediatos recomendados:', ML + 12, finalY + 8, { width: PW - 20 });
doc.fontSize(9).font('Helvetica').fillColor(C.negro)
   .text(
     '1. Crear .gitignore  →  2. Reemplazar Math.random() por crypto.randomBytes()  →  ' +
     '3. Aplicar authLimiter a /recuperar-password  →  4. Planificar migración de localStorage a cookies HttpOnly',
     ML + 12, finalY + 24, { width: PW - 20 }
   );

// ─────────────────────────────────────────────────────────────────────────────
// PIE DE PÁGINA EN TODAS LAS PÁGINAS
// ─────────────────────────────────────────────────────────────────────────────

const range = doc.bufferedPageRange();
for (let i = range.start; i < range.start + range.count; i++) {
  doc.switchToPage(i);
  doc.page.margins.bottom = 0;   // evitar que PDFKit agregue página nueva al escribir en área de margen
  const fy = PH - 38;
  hline(fy, C.grisBorde);
  doc.fontSize(7.5).font('Helvetica').fillColor(C.gris)
     .text('Auditoría de Seguridad — Sistema Teletrabajo  |  Confidencial  |  2026-04-02',
       ML, fy + 7, { width: PW - 50, lineBreak: false });
  doc.fontSize(7.5).font('Helvetica').fillColor(C.gris)
     .text('Pág. ' + (i + 1), ML, fy + 7, { width: PW, align: 'right', lineBreak: false });
  doc.page.margins.bottom = MB;  // restaurar margen
}

doc.end();

stream.on('finish', () => {
  const kb = (fs.statSync(OUTPUT).size / 1024).toFixed(1);
  console.log('\n✅  PDF generado correctamente');
  console.log('   Ruta:  ' + OUTPUT);
  console.log('   Tamaño: ' + kb + ' KB\n');
});
stream.on('error', err => console.error('❌ Error:', err.message));
