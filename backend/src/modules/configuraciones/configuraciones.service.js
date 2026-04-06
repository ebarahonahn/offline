const path = require('path');
const fs   = require('fs');
const { query }                 = require('../../config/database');
const { parseAndValidateImage } = require('../../utils/image.util');

const LOGOS_DIR = path.join(__dirname, '../../../../uploads/logos');

// Cache en memoria
let cache = null;

const loadCache = async () => {
  const [rows] = await query('SELECT clave, valor, tipo, descripcion, grupo FROM configuraciones');
  cache = {};
  for (const row of rows) {
    cache[row.clave] = { ...row, valorParsed: parseValue(row.valor, row.tipo) };
  }
  return cache;
};

const parseValue = (valor, tipo) => {
  switch (tipo) {
    case 'number':  return Number(valor);
    case 'boolean': return valor === 'true';
    case 'json':    try { return JSON.parse(valor); } catch { return valor; }
    default:        return valor;
  }
};

const invalidateCache = () => { cache = null; };

const getAll = async () => {
  if (!cache) await loadCache();
  return Object.values(cache).map(({ clave, valor, tipo, descripcion, grupo, valorParsed }) =>
    ({ clave, valor, tipo, descripcion, grupo, valorParsed })
  );
};

const getByGrupo = async (grupo) => {
  const all = await getAll();
  return all.filter(c => c.grupo === grupo);
};

// Claves expuestas a usuarios no-admin (mínimo necesario para la UI)
const CLAVES_PUBLICAS = ['empresa_nombre', 'empresa_logo_url', 'inactividad_umbral_min', 'inactividad_alerta_min', 'jornada_dias_laborales'];

const getPublico = async () => {
  if (!cache) await loadCache();
  return Object.fromEntries(
    CLAVES_PUBLICAS
      .filter(clave => cache[clave] !== undefined)
      .map(clave => [clave, cache[clave].valorParsed])
  );
};

const get = async (clave) => {
  if (!cache) await loadCache();
  return cache[clave]?.valorParsed ?? null;
};

/**
 * Registra en auditoría los cambios de configuración.
 * @param {number|null} userId
 * @param {string}      ip
 * @param {string}      userAgent
 * @param {Array}       cambios  - [{ clave, valorAnterior, valorNuevo }]
 */
const registrarAuditoria = (userId, ip, userAgent, cambios) => {
  if (!cambios.length) return;
  query(
    `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_ant, datos_nue, ip, user_agent)
     VALUES (?, 'UPDATE_CONFIGURACION', 'configuraciones', NULL, ?, ?, ?, ?)`,
    [
      userId || null,
      JSON.stringify(Object.fromEntries(cambios.map(c => [c.clave, c.valorAnterior]))),
      JSON.stringify(Object.fromEntries(cambios.map(c => [c.clave, c.valorNuevo]))),
      ip   || null,
      userAgent ? userAgent.slice(0, 500) : null,
    ]
  ).catch(err => console.error('[Audit-Config] Error al registrar:', err.message));
};

const set = async (clave, valor, userId = null, ip = null, userAgent = null) => {
  // Capturar valor anterior
  if (!cache) await loadCache();
  const anterior = cache[clave]?.valor ?? null;
  const nuevo    = String(valor);

  await query('UPDATE configuraciones SET valor = ? WHERE clave = ?', [nuevo, clave]);
  invalidateCache();

  if (anterior !== nuevo) {
    registrarAuditoria(userId, ip, userAgent, [{ clave, valorAnterior: anterior, valorNuevo: nuevo }]);
  }
};

const setBulk = async (updates, userId = null, ip = null, userAgent = null) => {
  // Capturar valores anteriores de todas las claves a actualizar
  if (!cache) await loadCache();

  const cambios = [];
  for (const [clave, valor] of Object.entries(updates)) {
    const anterior = cache[clave]?.valor ?? null;
    const nuevo    = String(valor);
    await query('UPDATE configuraciones SET valor = ? WHERE clave = ?', [nuevo, clave]);
    if (anterior !== nuevo) {
      cambios.push({ clave, valorAnterior: anterior, valorNuevo: nuevo });
    }
  }

  invalidateCache();

  if (cambios.length) {
    registrarAuditoria(userId, ip, userAgent, cambios);
  }
};

const setLogo = async (base64Data, userId = null, ip = null, userAgent = null) => {
  const { ext, buffer } = parseAndValidateImage(base64Data, ['png', 'jpg', 'webp']);

  if (!fs.existsSync(LOGOS_DIR)) fs.mkdirSync(LOGOS_DIR, { recursive: true });

  const anterior = await get('empresa_logo_url');
  if (anterior) {
    const anteriorPath = path.join(__dirname, '../../../../uploads', anterior.replace(/^\/uploads\//, ''));
    if (fs.existsSync(anteriorPath)) fs.unlinkSync(anteriorPath);
  }

  const filename = `logo_${Date.now()}.${ext}`;
  fs.writeFileSync(path.join(LOGOS_DIR, filename), buffer);

  const urlRelativa = `logos/${filename}`;
  await set('empresa_logo_url', urlRelativa, userId, ip, userAgent);
  return urlRelativa;
};

module.exports = { getAll, getByGrupo, getPublico, get, set, setBulk, setLogo };
