/**
 * Ejecutar: node database/migrations/run.js
 * Aplica todas las migraciones *.sql del directorio en orden numérico.
 * Ejecuta cada sentencia individualmente para manejar errores de columna/índice duplicado.
 */
const path = require('path');
const fs   = require('fs');

try {
  require(path.join(__dirname, '../../backend/node_modules/dotenv'))
    .config({ path: path.join(__dirname, '../../backend/.env') });
} catch { /* sin .env, usa variables de entorno del sistema */ }

const mysql = require(path.join(__dirname, '../../backend/node_modules/mysql2/promise'));

// Códigos de error que indican que la sentencia "ya estaba aplicada"
const ERRORES_IGNORABLES = new Set([
  'ER_DUP_FIELDNAME',    // columna ya existe
  'ER_DUP_KEYNAME',      // índice/clave ya existe
  'ER_TABLE_EXISTS_ERROR', // tabla ya existe
  'ER_FK_DUP_NAME',      // foreign key ya existe
]);

function parsearSentencias(sql) {
  // Dividir por ; ignorando líneas de comentario
  return sql
    .split(';')
    .map(s => s.replace(/--[^\n]*/g, '').trim())
    .filter(s => s.length > 0);
}

async function run() {
  const conn = await mysql.createConnection({
    host:     process.env.DB_HOST     || 'localhost',
    port:     process.env.DB_PORT     || 3306,
    database: process.env.DB_NAME     || 'teletrabajo_db',
    user:     process.env.DB_USER     || 'root',
    password: process.env.DB_PASSWORD || '',
  });

  console.log('Conectado a MySQL.');

  const archivos = fs.readdirSync(__dirname)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (!archivos.length) {
    console.log('No hay archivos .sql para ejecutar.');
    await conn.end();
    return;
  }

  for (const archivo of archivos) {
    const ruta      = path.join(__dirname, archivo);
    const sql       = fs.readFileSync(ruta, 'utf8');
    const sentencias = parsearSentencias(sql);

    console.log(`\nEjecutando ${archivo} (${sentencias.length} sentencias)...`);
    let ok = 0, omitidas = 0, errores = 0;

    for (const sentencia of sentencias) {
      try {
        await conn.query(sentencia);
        ok++;
      } catch (err) {
        if (ERRORES_IGNORABLES.has(err.code)) {
          omitidas++;
        } else {
          errores++;
          console.error(`  ✗ Error: ${err.message}`);
          console.error(`    SQL: ${sentencia.slice(0, 120)}...`);
        }
      }
    }

    if (errores > 0) {
      console.log(`  Resultado: ${ok} aplicadas, ${omitidas} ya existían, ${errores} con error.`);
      await conn.end();
      process.exit(1);
    } else {
      console.log(`  ✓ ${ok} aplicadas, ${omitidas} ya existían.`);
    }
  }

  console.log('\nMigraciones completadas.');
  await conn.end();
}

run()
  .then(() => process.exit(0))
  .catch(err => { console.error('Error fatal:', err.message); process.exit(1); });
