const router = require('express').Router();
const ctrl = require('./configuraciones.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(authenticate);

router.get('/publico',     ctrl.getPublico);
router.get('/',            authorize('admin'), ctrl.getAll);
router.get('/:grupo',      authorize('admin'), ctrl.getByGrupo);
router.post('/logo',       authorize('admin'), ctrl.uploadLogo);
router.put('/',            authorize('admin'), ctrl.updateBulk);
router.put('/:clave',      authorize('admin'), ctrl.updateOne);

module.exports = router;
