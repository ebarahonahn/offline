const router = require('express').Router();
const ctrl = require('./actividades.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');
const { auditLog }     = require('../../middlewares/audit.middleware');

router.use(authenticate);

router.get('/tipos',       ctrl.getTipos);
router.get('/',            ctrl.getAll);
router.get('/:id',         ctrl.getById);

router.post('/',
  auditLog('CREATE_ACTIVIDAD', 'actividades'),
  ctrl.create);

router.put('/:id',
  auditLog('UPDATE_ACTIVIDAD', 'actividades', 'actividades'),
  ctrl.update);

router.delete('/:id',
  auditLog('DELETE_ACTIVIDAD', 'actividades', 'actividades'),
  ctrl.remove);

router.patch('/:id/aprobar',
  authorize('supervisor', 'admin'),
  auditLog('APROBAR_ACTIVIDAD', 'actividades', 'actividades'),
  ctrl.aprobar);

router.get('/:id/evidencias',         ctrl.getEvidencias);
router.post('/:id/evidencias',        auditLog('ADD_EVIDENCIA', 'actividades', 'actividades'), ctrl.addEvidencia);
router.delete('/:id/evidencias/:eid', auditLog('DEL_EVIDENCIA', 'actividades', 'actividades'), ctrl.removeEvidencia);

module.exports = router;
