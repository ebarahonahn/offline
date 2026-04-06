const service = require('./auditoria.service');
const { generateAuditoriaExcel } = require('./generators/excel.generator');
const { generateAuditoriaPDF }   = require('./generators/pdf.generator');
const { ok, fail }               = require('../../utils/response.util');
const configService              = require('../configuraciones/configuraciones.service');

const getAll = async (req, res, next) => {
  try {
    const result = await service.getAll(req.query);
    res.json({ success: true, ...result });
  } catch (err) { next(err); }
};

const getOpciones = async (req, res, next) => {
  try {
    ok(res, await service.getOpciones());
  } catch (err) { next(err); }
};

const exportExcel = async (req, res, next) => {
  try {
    const { data } = await service.getAll({ ...req.query, page: 1, limit: 10000 });
    const buffer  = await generateAuditoriaExcel(data, req.query);
    const fecha   = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="bitacora_${fecha}.xlsx"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

const exportPDF = async (req, res, next) => {
  try {
    const { data }      = await service.getAll({ ...req.query, page: 1, limit: 10000 });
    const empresaNombre = await configService.get('empresa_nombre') || 'Mi Institución';
    const buffer        = await generateAuditoriaPDF(data, req.query, empresaNombre);
    const fecha         = new Date().toISOString().slice(0, 10);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="bitacora_${fecha}.pdf"`);
    res.send(buffer);
  } catch (err) { next(err); }
};

module.exports = { getAll, getOpciones, exportExcel, exportPDF };
