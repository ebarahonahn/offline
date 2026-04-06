const router    = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');
const { auditLog }     = require('../../middlewares/audit.middleware');
const ctrl = require('./capturas.controller');

router.use(authenticate);

router.get('/config', ctrl.getConfig);
router.post('/',      ctrl.subirCaptura);
router.get('/',       authorize('admin', 'supervisor'), ctrl.listar);
router.delete('/:id', authorize('admin'), auditLog('DELETE_CAPTURA', 'capturas', 'capturas'), ctrl.eliminar);

module.exports = router;
