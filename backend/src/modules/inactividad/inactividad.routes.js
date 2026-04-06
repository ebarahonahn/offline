const router = require('express').Router();
const ctrl = require('./inactividad.controller');
const { authenticate } = require('../../middlewares/auth.middleware');

router.use(authenticate);

router.post('/iniciar',    ctrl.iniciar);
router.post('/:id/cerrar', ctrl.cerrar);
router.get('/',            ctrl.getAll);

module.exports = router;
