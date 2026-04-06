require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const bcrypt = require('bcryptjs');
const { query } = require('../config/database');

const seed = async () => {
  console.log('🌱 Iniciando seed...');

  // Admin por defecto
  const password = 'Admin@123';
  const hash = await bcrypt.hash(password, 12);

  const [existing] = await query('SELECT id FROM usuarios WHERE email = ?', ['admin@teletrabajo.com']);
  if (!existing.length) {
    await query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, departamento_id, estado)
       VALUES ('Administrador', 'Sistema', 'admin@teletrabajo.com', ?, 1, 1, 'activo')`,
      [hash]
    );
    console.log('✅ Admin creado: admin@teletrabajo.com / Admin@123');
  } else {
    console.log('ℹ️  Admin ya existe');
  }

  // Empleado de prueba
  const [emp] = await query('SELECT id FROM usuarios WHERE email = ?', ['empleado@teletrabajo.com']);
  if (!emp.length) {
    const empHash = await bcrypt.hash('Empleado@123', 12);
    await query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, departamento_id, estado)
       VALUES ('Juan', 'Pérez', 'empleado@teletrabajo.com', ?, 3, 2, 'activo')`,
      [empHash]
    );
    console.log('✅ Empleado creado: empleado@teletrabajo.com / Empleado@123');
  }

  // Supervisor de prueba
  const [sup] = await query('SELECT id FROM usuarios WHERE email = ?', ['supervisor@teletrabajo.com']);
  if (!sup.length) {
    const supHash = await bcrypt.hash('Supervisor@123', 12);
    await query(
      `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, departamento_id, estado)
       VALUES ('María', 'García', 'supervisor@teletrabajo.com', ?, 2, 2, 'activo')`,
      [supHash]
    );
    console.log('✅ Supervisor creado: supervisor@teletrabajo.com / Supervisor@123');
  }

  // Jefe de departamento de prueba
  const [jefe] = await query('SELECT id FROM usuarios WHERE email = ?', ['jefe@teletrabajo.com']);
  if (!jefe.length) {
    const jefeHash = await bcrypt.hash('Jefe@123', 12);
    const [roleRow] = await query("SELECT id FROM roles WHERE nombre = 'jefe_departamento'");
    if (roleRow.length) {
      await query(
        `INSERT INTO usuarios (nombre, apellido, email, password_hash, rol_id, departamento_id, estado)
         VALUES ('Carlos', 'López', 'jefe@teletrabajo.com', ?, ?, 2, 'activo')`,
        [jefeHash, roleRow[0].id]
      );
      console.log('✅ Jefe dpto creado: jefe@teletrabajo.com / Jefe@123');
    }
  }

  console.log('\n✅ Seed completado');
  process.exit(0);
};

seed().catch(err => {
  console.error('❌ Error en seed:', err.message);
  process.exit(1);
});
