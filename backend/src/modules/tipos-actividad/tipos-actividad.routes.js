const router = require('express').Router();
const ctrl = require('./tipos-actividad.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { auditLog } = require('../../middlewares/audit.middleware');

router.use(authenticate);

router.get('/',              ctrl.getAll);
router.get('/:id',           ctrl.getById);
router.post('/',             authorize('admin'), auditLog('CREATE_TIPO_ACTIVIDAD', 'tipos_actividad'), ctrl.create);
router.put('/:id',           authorize('admin'), auditLog('UPDATE_TIPO_ACTIVIDAD', 'tipos_actividad', 'tipos_actividad'), ctrl.update);
router.patch('/:id/activo',  authorize('admin'), auditLog('TOGGLE_TIPO_ACTIVIDAD', 'tipos_actividad', 'tipos_actividad'), ctrl.toggleActivo);

module.exports = router;
