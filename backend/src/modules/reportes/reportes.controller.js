const service = require('./reportes.service');
const { generateJornadasExcel }      = require('./generators/excel.generator');
const { generateJornadasPDF }        = require('./generators/pdf.generator');
const { generateProductividadExcel } = require('./generators/productividad.excel.generator');
const { generateProductividadPDF }   = require('./generators/productividad.pdf.generator');
const { ok, fail }              = require('../../utils/response.util');
const configService             = require('../configuraciones/configuraciones.service');
const { query }                 = require('../../config/database');

// ── Auditoría de reportes ─────────────────────────────────────────────────────
// Los endpoints de exportación (Excel/PDF) no retornan JSON, por lo que el
// middleware auditLog no puede interceptarlos. Se registra directamente aquí.
const auditarReporte = (req, tipo, filtros) => {
  query(
    `INSERT INTO auditoria (usuario_id, accion, entidad, entidad_id, datos_ant, datos_nue, ip, user_agent)
     VALUES (?, ?, 'reportes', NULL, NULL, ?, ?, ?)`,
    [
      req.user?.id || null,
      tipo,
      JSON.stringify(filtros),
      req.ip,
      req.headers['user-agent']?.slice(0, 500) || null,
    ]
  ).catch(err => console.error('[Audit-Reporte] Error al registrar:', err.message));
};

// ── Extraer filtros relevantes del query string ───────────────────────────────
const extraerFiltros = (q) => {
  const filtros = {};
  if (q.fecha_inicio)    filtros.fecha_inicio    = q.fecha_inicio;
  if (q.fecha_fin)       filtros.fecha_fin       = q.fecha_fin;
  if (q.usuario_id)      filtros.usuario_id      = q.usuario_id;
  if (q.departamento_id) filtros.departamento_id = q.departamento_id;
  if (q.estado)          filtros.estado          = q.estado;
  if (q.tipo)            filtros.tipo            = q.tipo;
  return filtros;
};

// jefe_departamento solo puede consultar datos de su propio departamento
const resolverFiltros = (req) => {
  const q = { ...req.query };
  if (req.user.rol === 'jefe_departamento') {
    q.departamento_id = req.user.departamento_id;
  }
  return q;
};

// ── Controladores ─────────────────────────────────────────────────────────────

const getJornadas = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros = resolverFiltros(req);
    const data = await service.getJornadas(filtros);
    auditarReporte(req, 'REPORTE_JORNADAS', extraerFiltros(filtros));
    ok(res, data);
  } catch (err) { next(err); }
};

const getProductividad = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros = resolverFiltros(req);
    const data = await service.getProductividad(filtros);
    auditarReporte(req, 'REPORTE_PRODUCTIVIDAD', extraerFiltros(filtros));
    ok(res, data);
  } catch (err) { next(err); }
};

const exportExcel = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros  = resolverFiltros(req);
    const data     = await service.getJornadas(filtros);
    const buffer   = await generateJornadasExcel(data, filtros);
    auditarReporte(req, 'EXPORT_EXCEL', extraerFiltros(filtros));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="jornadas_${fecha_inicio}_${fecha_fin}.xlsx"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

const exportPDF = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros       = resolverFiltros(req);
    const data          = await service.getJornadas(filtros);
    const empresaNombre = await configService.get('empresa_nombre') || 'Mi Institución';
    const buffer        = await generateJornadasPDF(data, filtros, empresaNombre);
    auditarReporte(req, 'EXPORT_PDF', extraerFiltros(filtros));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="jornadas_${fecha_inicio}_${fecha_fin}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

const exportProductividadExcel = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros = resolverFiltros(req);
    const data    = await service.getProductividad(filtros);
    const buffer  = await generateProductividadExcel(data, filtros);
    auditarReporte(req, 'EXPORT_PRODUCTIVIDAD_EXCEL', extraerFiltros(filtros));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="productividad_${fecha_inicio}_${fecha_fin}.xlsx"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

const exportProductividadPDF = async (req, res, next) => {
  try {
    const { fecha_inicio, fecha_fin } = req.query;
    if (!fecha_inicio || !fecha_fin) return fail(res, 'fecha_inicio y fecha_fin requeridos');
    const filtros       = resolverFiltros(req);
    const data          = await service.getProductividad(filtros);
    const empresaNombre = await configService.get('empresa_nombre') || 'Mi Institución';
    const buffer        = await generateProductividadPDF(data, filtros, empresaNombre);
    auditarReporte(req, 'EXPORT_PRODUCTIVIDAD_PDF', extraerFiltros(filtros));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="productividad_${fecha_inicio}_${fecha_fin}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

module.exports = { getJornadas, getProductividad, exportExcel, exportPDF, exportProductividadExcel, exportProductividadPDF };
