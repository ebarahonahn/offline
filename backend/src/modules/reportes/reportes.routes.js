const router = require('express').Router();
const ctrl = require('./reportes.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(authenticate, authorize('admin', 'supervisor', 'jefe_departamento'));

router.get('/jornadas',                   ctrl.getJornadas);
router.get('/productividad',              ctrl.getProductividad);
router.get('/asistencias',                ctrl.getAsistencias);
router.get('/export/excel',               ctrl.exportExcel);
router.get('/export/pdf',                 ctrl.exportPDF);
router.get('/export/productividad/excel', ctrl.exportProductividadExcel);
router.get('/export/productividad/pdf',   ctrl.exportProductividadPDF);
router.get('/export/asistencias/excel',   ctrl.exportAsistenciasExcel);
router.get('/export/asistencias/pdf',     ctrl.exportAsistenciasPDF);
router.get('/export/asistencias/detalle/excel', ctrl.exportDetalleExcel);
router.get('/export/asistencias/detalle/pdf',   ctrl.exportDetallePDF);

module.exports = router;
