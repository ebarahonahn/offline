const mysql = require('mysql2/promise');
const env = require('./env');

const pool = mysql.createPool({
  host:            env.db.host,
  port:            env.db.port,
  database:        env.db.database,
  user:            env.db.user,
  password:        env.db.password,
  waitForConnections: true,
  connectionLimit: env.db.poolMax,
  queueLimit:      0,
  timezone:        'local',
  charset:         'utf8mb4',
});

// Verificar conexión al iniciar
pool.getConnection()
  .then(conn => {
    console.log('[DB] Conexión MySQL establecida correctamente');
    conn.release();
  })
  .catch(err => {
    console.error('[DB] Error al conectar con MySQL:', err.message);
    process.exit(1);
  });

/**
 * Ejecuta una query con parámetros
 * @param {string} sql
 * @param {Array} params
 * @returns {Promise<[rows, fields]>}
 */
const query = (sql, params = []) => pool.query(sql, params);

/**
 * Ejecuta múltiples queries en una transacción
 * @param {Function} callback - async (conn) => { ... }
 */
const transaction = async (callback) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const result = await callback(conn);
    await conn.commit();
    return result;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
};

module.exports = { pool, query, transaction };
