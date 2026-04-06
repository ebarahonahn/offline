const router = require('express').Router();
const ctrl = require('./jornadas.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');
const { auditLog }     = require('../../middlewares/audit.middleware');

router.use(authenticate);

router.post('/iniciar',           ctrl.iniciar);
router.get('/activa',             ctrl.getActiva);
router.get('/',                   ctrl.getHistorial);
router.get('/:id',                ctrl.getById);
router.get('/:id/reporte',        ctrl.getReporte);
router.get('/:id/reporte/pdf',    ctrl.getReportePDF);
router.post('/:id/pausar',        ctrl.pausar);
router.post('/:id/reanudar',      ctrl.reanudar);
router.post('/:id/finalizar',     ctrl.finalizar);
router.post('/:id/reactivar',     authorize('admin', 'jefe_departamento'), auditLog('REACTIVAR_JORNADA', 'jornadas', 'jornadas'), ctrl.reactivar);

module.exports = router;
