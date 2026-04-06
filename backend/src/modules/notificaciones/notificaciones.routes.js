const router = require('express').Router();
const { authenticate } = require('../../middlewares/auth.middleware');
const ctrl = require('./notificaciones.controller');

router.use(authenticate);

router.get('/',              ctrl.getPendientes);
router.patch('/:id/leer',   ctrl.marcarLeida);
router.patch('/leer-todas', ctrl.marcarTodasLeidas);

module.exports = router;
