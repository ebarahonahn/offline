const router = require('express').Router();
const ctrl = require('./dashboard.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize } = require('../../middlewares/role.middleware');

router.use(authenticate);

router.get('/resumen',  ctrl.getResumen);
router.get('/semana',   ctrl.getSemana);
router.get('/estado',   authorize('admin', 'supervisor'), ctrl.getEstado);
router.get('/ranking',  authorize('admin', 'supervisor'), ctrl.getRanking);

module.exports = router;
