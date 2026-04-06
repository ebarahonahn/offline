const service = require('./jornadas.service');
const { ok, paged, forbidden } = require('../../utils/response.util');
const { generateReportePDF } = require('./generators/pdf.generator');
const configService = require('../configuraciones/configuraciones.service');
const { query } = require('../../config/database');

const iniciar = async (req, res, next) => {
  try {
    const jornada = await service.iniciar(req.user.id, req.ip);
    ok(res, jornada, 'Jornada iniciada', 201);
  } catch (err) { next(err); }
};

const pausar = async (req, res, next) => {
  try {
    const jornada = await service.pausar(req.params.id, req.user.id, req.body.motivo);
    ok(res, jornada, 'Jornada pausada');
  } catch (err) { next(err); }
};

const reanudar = async (req, res, next) => {
  try {
    const jornada = await service.reanudar(req.params.id, req.user.id);
    ok(res, jornada, 'Jornada reanudada');
  } catch (err) { next(err); }
};

const finalizar = async (req, res, next) => {
  try {
    const jornada = await service.finalizar(req.params.id, req.user.id, req.ip, req.body.observaciones);
    ok(res, jornada, 'Jornada finalizada');
  } catch (err) { next(err); }
};

const reactivar = async (req, res, next) => {
  try {
    if (req.user.rol === 'jefe_departamento') {
      const [rows] = await query(
        `SELECT j.id FROM jornadas j
         JOIN usuarios u ON u.id = j.usuario_id
         WHERE j.id = ? AND u.departamento_id = ?`,
        [req.params.id, req.user.departamento_id]
      );
      if (!rows.length) return forbidden(res, 'No tienes permiso para reactivar esta jornada');
    }
    const jornada = await service.reactivar(req.params.id, req.user.id);
    ok(res, jornada, 'Jornada reactivada');
  } catch (err) { next(err); }
};

const getActiva = async (req, res, next) => {
  try {
    const jornada = await service.getActiva(req.user.id);
    ok(res, jornada);
  } catch (err) { next(err); }
};

const getHistorial = async (req, res, next) => {
  try {
    const rol = req.user.rol;
    const queryParams = { ...req.query };
    if (rol === 'jefe_departamento') {
      queryParams.departamento_id = req.user.departamento_id;
    }
    const result = await service.getHistorial(req.user.id, rol, queryParams);
    paged(res, result.data, result.pagination);
  } catch (err) { next(err); }
};

const getById = async (req, res, next) => {
  try {
    const jornada = await service.getById(req.params.id);
    ok(res, jornada);
  } catch (err) { next(err); }
};

const getReporte = async (req, res, next) => {
  try {
    const reporte = await service.getReporte(req.params.id, req.user.id, req.user.rol);
    ok(res, reporte);
  } catch (err) { next(err); }
};

const getReportePDF = async (req, res, next) => {
  try {
    const reporte = await service.getReporte(req.params.id, req.user.id, req.user.rol);
    const cfg = await configService.getPublico();
    const empresaNombre = cfg['empresa_nombre'] || 'Mi Institución';
    const pdf = await generateReportePDF(reporte, empresaNombre);
    const nombre = `${reporte.jornada.apellido}_${reporte.jornada.nombre}_${String(reporte.jornada.fecha).slice(0,10)}.pdf`;
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${nombre}"`);
    res.send(pdf);
  } catch (err) { next(err); }
};

module.exports = { iniciar, pausar, reanudar, finalizar, reactivar, getActiva, getHistorial, getById, getReporte, getReportePDF };
