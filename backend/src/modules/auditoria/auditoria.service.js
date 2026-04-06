const { query } = require('../../config/database');
const { parsePagination, buildPaginationMeta } = require('../../utils/pagination.util');

const ETIQUETAS_ACCION = {
  LOGIN:                  'Inicio de sesión',
  LOGOUT:                 'Cierre de sesión',
  CREATE_USUARIO:         'Crear usuario',
  UPDATE_USUARIO:         'Modificar usuario',
  DELETE_USUARIO:         'Eliminar usuario',
  ESTADO_USUARIO:         'Cambiar estado usuario',
  AVATAR_USUARIO:         'Actualizar avatar',
  CREATE_DEPARTAMENTO:    'Crear departamento',
  UPDATE_DEPARTAMENTO:    'Modificar departamento',
  TOGGLE_DEPARTAMENTO:    'Activar/desactivar departamento',
  CREATE_TIPO_ACTIVIDAD:  'Crear tipo de actividad',
  UPDATE_TIPO_ACTIVIDAD:  'Modificar tipo de actividad',
  TOGGLE_TIPO_ACTIVIDAD:  'Activar/desactivar tipo actividad',
  CREATE_ACTIVIDAD:       'Crear actividad',
  UPDATE_ACTIVIDAD:       'Modificar actividad',
  DELETE_ACTIVIDAD:       'Eliminar actividad',
  APROBAR_ACTIVIDAD:      'Aprobar actividad',
  DELETE_CAPTURA:         'Eliminar captura',
  REACTIVAR_JORNADA:      'Reactivar jornada',
  UPDATE_CONFIGURACION:   'Modificar configuración',
  REPORTE_JORNADAS:       'Consultar reporte jornadas',
  REPORTE_PRODUCTIVIDAD:  'Consultar productividad',
  EXPORT_EXCEL:           'Exportar Excel',
  EXPORT_PDF:             'Exportar PDF',
};

const getAll = async (queryParams) => {
  const { page, limit, offset } = parsePagination(queryParams);
  const { fecha_inicio, fecha_fin, usuario_id, accion, entidad } = queryParams;

  let where = 'WHERE 1=1';
  const params = [];

  if (fecha_inicio) { where += ' AND DATE(a.created_at) >= ?'; params.push(fecha_inicio); }
  if (fecha_fin)    { where += ' AND DATE(a.created_at) <= ?'; params.push(fecha_fin); }
  if (usuario_id)   { where += ' AND a.usuario_id = ?';        params.push(usuario_id); }
  if (accion)       { where += ' AND a.accion = ?';            params.push(accion); }
  if (entidad)      { where += ' AND a.entidad = ?';           params.push(entidad); }

  const [[{ total }]] = await query(
    `SELECT COUNT(*) AS total FROM auditoria a ${where}`, params
  );

  const [rows] = await query(
    `SELECT a.id, a.accion, a.entidad, a.entidad_id,
            a.datos_ant, a.datos_nue,
            a.ip, a.created_at,
            a.usuario_id,
            CONCAT(u.nombre, ' ', u.apellido) AS usuario_nombre,
            u.email AS usuario_email,
            r.nombre AS usuario_rol
     FROM auditoria a
     LEFT JOIN usuarios u ON u.id = a.usuario_id
     LEFT JOIN roles r    ON r.id = u.rol_id
     ${where}
     ORDER BY a.created_at DESC
     LIMIT ${Number(limit)} OFFSET ${Number(offset)}`,
    params
  );

  const data = rows.map(r => ({
    ...r,
    accion_label: ETIQUETAS_ACCION[r.accion] || r.accion,
  }));

  return { data, pagination: buildPaginationMeta(total, page, limit) };
};

// Lista de acciones y entidades distintas para los filtros del frontend
const getOpciones = async () => {
  const [acciones] = await query(
    'SELECT DISTINCT accion FROM auditoria ORDER BY accion'
  );
  const [entidades] = await query(
    "SELECT DISTINCT entidad FROM auditoria WHERE entidad IS NOT NULL ORDER BY entidad"
  );
  return {
    acciones:  acciones.map(r => ({ valor: r.accion, label: ETIQUETAS_ACCION[r.accion] || r.accion })),
    entidades: entidades.map(r => r.entidad),
  };
};

module.exports = { getAll, getOpciones, ETIQUETAS_ACCION };
