const router = require('express').Router();
const ctrl = require('./usuarios.controller');
const { createRules, updateRules, estadoRules } = require('./usuarios.validators');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');
const { auditLog } = require('../../middlewares/audit.middleware');

router.use(authenticate);

router.get('/roles',        ctrl.getRoles);
router.get('/departamentos',ctrl.getDepartamentos);

router.get('/',    authorize('admin', 'supervisor', 'jefe_departamento'), ctrl.getAll);
router.post('/',   authorize('admin'), auditLog('CREATE_USUARIO', 'usuarios'), createRules, validate, ctrl.create);

router.get('/:id',          authorize('admin', 'supervisor'), ctrl.getById);
router.put('/:id',          authorize('admin'), auditLog('UPDATE_USUARIO', 'usuarios', 'usuarios'), updateRules, validate, ctrl.update);
router.delete('/:id',       authorize('admin'), auditLog('DELETE_USUARIO', 'usuarios', 'usuarios'), ctrl.remove);
router.patch('/:id/estado', authorize('admin'), auditLog('ESTADO_USUARIO', 'usuarios', 'usuarios'), estadoRules, validate, ctrl.updateEstado);
router.post('/:id/avatar',   authorize('admin'), auditLog('AVATAR_USUARIO',  'usuarios', 'usuarios'), ctrl.uploadAvatar);
router.delete('/:id/avatar', authorize('admin'), auditLog('AVATAR_USUARIO',  'usuarios', 'usuarios'), ctrl.removeAvatar);

module.exports = router;
