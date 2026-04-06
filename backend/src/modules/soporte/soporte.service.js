const { query, transaction } = require('../../config/database');
const { sendMail }           = require('../../config/mailer');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');

// ── Helpers de email ─────────────────────────────────────────────────────────

const tplBase = (titulo, cuerpo) => `
<div style="font-family:Arial,sans-serif;max-width:520px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:12px">
  <div style="background:#2563eb;border-radius:8px;padding:16px 20px;margin-bottom:20px">
    <h2 style="margin:0;color:#fff;font-size:16px">&#127384; Soporte Técnico — Sistema Teletrabajo</h2>
  </div>
  <h3 style="margin:0 0 12px;font-size:18px;color:#111827">${titulo}</h3>
  ${cuerpo}
  <p style="margin:20px 0 0;color:#d1d5db;font-size:11px;text-align:center">
    Este correo fue generado automáticamente, no responda directamente.
  </p>
</div>`;

const enviarConfirmacionCreacion = async (ticket, emailReporter, nombreReporter) => {
  const categoriaLabel = { funcionalidad:'Funcionalidad', error:'Error del sistema', solicitud:'Solicitud', consulta:'Consulta', otro:'Otro' };
  const prioridadLabel = { baja:'Baja', media:'Media', alta:'Alta', urgente:'Urgente' };
  await sendMail({
    to:      emailReporter,
    subject: `[Soporte] Ticket ${ticket.numero} creado — ${ticket.titulo}`,
    html: tplBase(
      `Tu ticket fue registrado`,
      `<p style="color:#374151;font-size:14px">Hola <strong>${nombreReporter}</strong>, hemos recibido tu solicitud de soporte.</p>
       <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
         <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase">Número de ticket</p>
         <p style="margin:0 0 14px;font-size:22px;font-weight:700;color:#2563eb;font-family:monospace">${ticket.numero}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Título</p>
         <p style="margin:0 0 12px;font-size:14px;color:#111827">${ticket.titulo}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Categoría / Prioridad</p>
         <p style="margin:0;font-size:14px;color:#374151">${categoriaLabel[ticket.categoria] ?? ticket.categoria} &nbsp;·&nbsp; Prioridad ${prioridadLabel[ticket.prioridad] ?? ticket.prioridad}</p>
       </div>
       <p style="color:#6b7280;font-size:13px">Te notificaremos por correo cuando un agente responda tu solicitud.</p>`
    ),
  }).catch(() => {});
};

const enviarNotifAdmin = async (ticket, emailsAdmins) => {
  if (!emailsAdmins.length) return;
  const prioridadColor = { baja:'#16a34a', media:'#2563eb', alta:'#d97706', urgente:'#dc2626' };
  await sendMail({
    to:      emailsAdmins.join(','),
    subject: `[Soporte] Nuevo ticket ${ticket.numero} — Prioridad ${ticket.prioridad.toUpperCase()}`,
    html: tplBase(
      `Nuevo ticket de soporte`,
      `<p style="color:#374151;font-size:14px">Se ha registrado una nueva solicitud de soporte que requiere atención.</p>
       <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Ticket</p>
         <p style="margin:0 0 12px;font-size:18px;font-weight:700;color:#111827;font-family:monospace">${ticket.numero}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Solicitante</p>
         <p style="margin:0 0 12px;font-size:14px;color:#374151">${ticket.usuario_nombre} ${ticket.usuario_apellido}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Título</p>
         <p style="margin:0 0 12px;font-size:14px;color:#111827">${ticket.titulo}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Prioridad</p>
         <p style="margin:0;font-size:14px;font-weight:600;color:${prioridadColor[ticket.prioridad] ?? '#374151'}">${ticket.prioridad.toUpperCase()}</p>
       </div>
       <p style="color:#6b7280;font-size:13px">Ingrese al sistema para gestionar y responder este ticket.</p>`
    ),
  }).catch(() => {});
};

const enviarNotifRespuesta = async (ticket, respuesta, emailReporter, nombreReporter, nombreResponde) => {
  await sendMail({
    to:      emailReporter,
    subject: `[Soporte] Nueva respuesta en ticket ${ticket.numero}`,
    html: tplBase(
      `Tienen una respuesta para tu ticket`,
      `<p style="color:#374151;font-size:14px">Hola <strong>${nombreReporter}</strong>, <strong>${nombreResponde}</strong> ha respondido tu solicitud de soporte.</p>
       <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px;padding:16px;margin-bottom:16px">
         <p style="margin:0 0 6px;font-size:12px;color:#9ca3af;text-transform:uppercase">Ticket ${ticket.numero} · ${ticket.titulo}</p>
         <p style="margin:0;font-size:14px;color:#111827;white-space:pre-wrap">${respuesta.mensaje}</p>
       </div>
       <p style="color:#6b7280;font-size:13px">Si necesitas más información, ingresa al sistema para continuar la conversación.</p>`
    ),
  }).catch(() => {});
};

const enviarNotifCambioEstado = async (ticket, nuevoEstado, emailReporter, nombreReporter) => {
  const estadoLabel = { en_proceso:'En proceso', pendiente_usuario:'Pendiente tu respuesta', resuelto:'Resuelto', cerrado:'Cerrado' };
  const estadoColor = { en_proceso:'#2563eb', pendiente_usuario:'#d97706', resuelto:'#16a34a', cerrado:'#6b7280' };
  await sendMail({
    to:      emailReporter,
    subject: `[Soporte] Ticket ${ticket.numero} actualizado — ${estadoLabel[nuevoEstado] ?? nuevoEstado}`,
    html: tplBase(
      `Estado de tu ticket actualizado`,
      `<p style="color:#374151;font-size:14px">Hola <strong>${nombreReporter}</strong>, el estado de tu ticket ha cambiado.</p>
       <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-bottom:16px">
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Ticket</p>
         <p style="margin:0 0 12px;font-size:16px;font-weight:700;color:#111827;font-family:monospace">${ticket.numero} — ${ticket.titulo}</p>
         <p style="margin:0 0 4px;font-size:12px;color:#9ca3af;text-transform:uppercase">Nuevo estado</p>
         <p style="margin:0;font-size:15px;font-weight:600;color:${estadoColor[nuevoEstado] ?? '#374151'}">${estadoLabel[nuevoEstado] ?? nuevoEstado}</p>
       </div>
       ${nuevoEstado === 'pendiente_usuario' ? '<p style="color:#d97706;font-size:13px;font-weight:600">&#9888; El equipo de soporte requiere información adicional de tu parte.</p>' : ''}
       ${nuevoEstado === 'resuelto' ? '<p style="color:#16a34a;font-size:13px">&#10003; Tu solicitud ha sido resuelta. Si el problema persiste, puedes abrir un nuevo ticket.</p>' : ''}`
    ),
  }).catch(() => {});
};

// ── Generar número de ticket ──────────────────────────────────────────────────

const generarNumero = async () => {
  const anio = new Date().getFullYear();
  let seq;

  await transaction(async (conn) => {
    const [rows] = await conn.execute(
      'SELECT ultimo_seq FROM ticket_secuencias WHERE anio = ? FOR UPDATE',
      [anio]
    );

    if (rows.length) {
      seq = rows[0].ultimo_seq + 1;
      await conn.execute(
        'UPDATE ticket_secuencias SET ultimo_seq = ? WHERE anio = ?',
        [seq, anio]
      );
    } else {
      // Primer ticket del año: inicializar desde tickets existentes
      const [existing] = await conn.execute(
        'SELECT COUNT(*) AS total FROM tickets WHERE YEAR(created_at) = ?',
        [anio]
      );
      seq = (existing[0].total || 0) + 1;
      await conn.execute(
        'INSERT INTO ticket_secuencias (anio, ultimo_seq) VALUES (?, ?)',
        [anio, seq]
      );
    }
  });

  return `STK-${anio}-${String(seq).padStart(4, '0')}`;
};

// ── CRUD ─────────────────────────────────────────────────────────────────────

const crear = async (usuarioId, data) => {
  const { titulo, descripcion, categoria, prioridad } = data;

  const [userRows] = await query(
    'SELECT nombre, apellido, email FROM usuarios WHERE id = ?', [usuarioId]
  );
  if (!userRows.length) throw Object.assign(new Error('Usuario no encontrado'), { statusCode: 404 });
  const reporter = userRows[0];

  const numero = await generarNumero();

  const [result] = await query(
    'INSERT INTO tickets (numero, usuario_id, categoria, prioridad, titulo, descripcion) VALUES (?,?,?,?,?,?)',
    [numero, usuarioId, categoria, prioridad || 'media', titulo, descripcion]
  );

  const ticket = await getById(result.insertId, usuarioId, 'admin');

  // Notificar al reporter
  await enviarConfirmacionCreacion(ticket, reporter.email, reporter.nombre);

  // Notificar a todos los admins
  const [admins] = await query(
    "SELECT email FROM usuarios WHERE rol_id = (SELECT id FROM roles WHERE nombre='admin') AND estado='activo'"
  );
  await enviarNotifAdmin(ticket, admins.map(a => a.email));

  return ticket;
};

const getAll = async (usuarioId, rol, queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { estado, prioridad, categoria, usuario_id, fecha_inicio, fecha_fin } = queryParams;

  let where = 'WHERE 1=1';
  const params = [];

  if (rol === 'empleado') {
    where += ' AND t.usuario_id = ?'; params.push(usuarioId);
  } else if (usuario_id) {
    where += ' AND t.usuario_id = ?'; params.push(usuario_id);
  }

  if (estado)       { where += ' AND t.estado = ?';         params.push(estado); }
  if (prioridad)    { where += ' AND t.prioridad = ?';      params.push(prioridad); }
  if (categoria)    { where += ' AND t.categoria = ?';      params.push(categoria); }
  if (fecha_inicio) { where += ' AND DATE(t.created_at) >= ?'; params.push(fecha_inicio); }
  if (fecha_fin)    { where += ' AND DATE(t.created_at) <= ?'; params.push(fecha_fin); }

  const [countRows] = await query(`SELECT COUNT(*) AS total FROM tickets t ${where}`, params);
  const total = countRows[0].total;

  const [rows] = await query(
    `SELECT t.id, t.numero, t.titulo, t.categoria, t.prioridad, t.estado, t.created_at, t.updated_at, t.resuelto_en,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
            a.nombre AS asignado_nombre, a.apellido AS asignado_apellido,
            (SELECT COUNT(*) FROM ticket_respuestas r WHERE r.ticket_id = t.id) AS total_respuestas
     FROM tickets t
     JOIN usuarios u ON u.id = t.usuario_id
     LEFT JOIN usuarios a ON a.id = t.asignado_a
     ${where} ORDER BY FIELD(t.estado,'abierto','en_proceso','pendiente_usuario','resuelto','cerrado'),
              FIELD(t.prioridad,'urgente','alta','media','baja'), t.created_at DESC
     LIMIT ? OFFSET ?`,
    [...params, limit, offset]
  );

  return { data: rows, pagination: buildPaginationMeta(total, page, limit) };
};

const getById = async (id, usuarioId, rol) => {
  const [rows] = await query(
    `SELECT t.*,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido, u.email AS usuario_email,
            a.nombre AS asignado_nombre, a.apellido AS asignado_apellido
     FROM tickets t
     JOIN usuarios u ON u.id = t.usuario_id
     LEFT JOIN usuarios a ON a.id = t.asignado_a
     WHERE t.id = ?`,
    [id]
  );
  if (!rows.length) throw Object.assign(new Error('Ticket no encontrado'), { statusCode: 404 });

  const ticket = rows[0];

  // empleado solo ve sus propios tickets
  if (rol === 'empleado' && ticket.usuario_id !== usuarioId) {
    throw Object.assign(new Error('No tienes acceso a este ticket'), { statusCode: 403 });
  }

  // Respuestas (excluir notas internas si es empleado)
  const [respuestas] = await query(
    `SELECT r.id, r.ticket_id, r.usuario_id, r.mensaje, r.es_nota_interna, r.created_at,
            u.nombre AS usuario_nombre, u.apellido AS usuario_apellido,
            ro.nombre AS usuario_rol
     FROM ticket_respuestas r
     JOIN usuarios u ON u.id = r.usuario_id
     JOIN roles ro ON ro.id = u.rol_id
     WHERE r.ticket_id = ? ${rol === 'empleado' ? 'AND r.es_nota_interna = 0' : ''}
     ORDER BY r.created_at ASC`,
    [id]
  );

  ticket.respuestas = respuestas;
  return ticket;
};

const responder = async (id, usuarioId, rol, mensaje, esNotaInterna = false) => {
  const [rows] = await query('SELECT * FROM tickets t JOIN usuarios u ON u.id = t.usuario_id WHERE t.id = ?', [id]);
  if (!rows.length) throw Object.assign(new Error('Ticket no encontrado'), { statusCode: 404 });
  const ticket = rows[0];

  // empleado solo responde sus propios tickets
  if (rol === 'empleado' && ticket.usuario_id !== usuarioId) {
    throw Object.assign(new Error('No tienes acceso a este ticket'), { statusCode: 403 });
  }
  if (['resuelto', 'cerrado'].includes(ticket.estado)) {
    throw Object.assign(new Error('No se pueden enviar mensajes en un ticket resuelto o cerrado'), { statusCode: 400 });
  }
  // empleado no puede poner notas internas
  if (rol === 'empleado') esNotaInterna = false;

  await transaction(async (conn) => {
    await conn.execute(
      'INSERT INTO ticket_respuestas (ticket_id, usuario_id, mensaje, es_nota_interna) VALUES (?,?,?,?)',
      [id, usuarioId, mensaje, esNotaInterna ? 1 : 0]
    );
    // Si admin/supervisor responde y ticket estaba abierto → en_proceso
    if (rol !== 'empleado' && ticket.estado === 'abierto') {
      await conn.execute("UPDATE tickets SET estado='en_proceso' WHERE id=?", [id]);
    }
    // Si empleado responde y estaba pendiente_usuario → en_proceso
    if (rol === 'empleado' && ticket.estado === 'pendiente_usuario') {
      await conn.execute("UPDATE tickets SET estado='en_proceso' WHERE id=?", [id]);
    }
  });

  // Notificar por email solo si no es nota interna y el que responde NO es el reporter
  if (!esNotaInterna && usuarioId !== ticket.usuario_id) {
    const [respRows] = await query(
      'SELECT * FROM ticket_respuestas WHERE ticket_id=? ORDER BY id DESC LIMIT 1', [id]
    );
    const [userRows] = await query('SELECT nombre, apellido FROM usuarios WHERE id=?', [usuarioId]);
    const nombreResponde = userRows.length ? `${userRows[0].nombre} ${userRows[0].apellido}` : 'Soporte';
    await enviarNotifRespuesta(
      ticket, respRows[0],
      ticket.email, // email del reporter (del JOIN)
      `${ticket.nombre} ${ticket.apellido}`,
      nombreResponde
    );
  }

  return getById(id, usuarioId, rol);
};

const cambiarEstado = async (id, nuevoEstado, usuarioId, rol) => {
  if (rol === 'empleado') throw Object.assign(new Error('Sin permiso'), { statusCode: 403 });

  const [rows] = await query('SELECT t.*, u.email, u.nombre, u.apellido FROM tickets t JOIN usuarios u ON u.id = t.usuario_id WHERE t.id = ?', [id]);
  if (!rows.length) throw Object.assign(new Error('Ticket no encontrado'), { statusCode: 404 });
  const ticket = rows[0];

  const resueltoEn = ['resuelto', 'cerrado'].includes(nuevoEstado) ? new Date() : null;

  await query(
    'UPDATE tickets SET estado=?, resuelto_en=? WHERE id=?',
    [nuevoEstado, resueltoEn, id]
  );

  // Email al reporter si el estado cambia a algo relevante
  if (['pendiente_usuario', 'resuelto', 'cerrado'].includes(nuevoEstado)) {
    await enviarNotifCambioEstado(ticket, nuevoEstado, ticket.email, ticket.nombre);
  }

  return getById(id, usuarioId, rol);
};

const asignar = async (id, asignadoA, adminId) => {
  const [rows] = await query('SELECT id FROM tickets WHERE id=?', [id]);
  if (!rows.length) throw Object.assign(new Error('Ticket no encontrado'), { statusCode: 404 });

  await query('UPDATE tickets SET asignado_a=? WHERE id=?', [asignadoA || null, id]);
  return getById(id, adminId, 'admin');
};

module.exports = { crear, getAll, getById, responder, cambiarEstado, asignar };
