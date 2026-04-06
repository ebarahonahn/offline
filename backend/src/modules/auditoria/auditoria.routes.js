const router = require('express').Router();
const ctrl = require('./auditoria.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');

router.use(authenticate, authorize('admin'));

router.get('/',              ctrl.getAll);
router.get('/opciones',      ctrl.getOpciones);
router.get('/export/excel',  ctrl.exportExcel);
router.get('/export/pdf',    ctrl.exportPDF);

module.exports = router;
