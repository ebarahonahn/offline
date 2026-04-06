const router = require('express').Router();
const ctrl = require('./departamentos.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { auditLog } = require('../../middlewares/audit.middleware');

router.use(authenticate);

router.get('/',             ctrl.getAll);
router.post('/',            authorize('admin'), auditLog('CREATE_DEPARTAMENTO', 'departamentos'), ctrl.create);
router.put('/:id',          authorize('admin'), auditLog('UPDATE_DEPARTAMENTO', 'departamentos', 'departamentos'), ctrl.update);
router.patch('/:id/activo', authorize('admin'), auditLog('TOGGLE_DEPARTAMENTO', 'departamentos', 'departamentos'), ctrl.toggleActivo);

module.exports = router;
