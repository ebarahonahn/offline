const router     = require('express').Router();
const ctrl       = require('./soporte.controller');
const { authenticate } = require('../../middlewares/auth.middleware');
const { authorize }    = require('../../middlewares/role.middleware');
const { validate }     = require('../../middlewares/validate.middleware');
const { crearRules, responderRules, estadoRules, asignarRules } = require('./soporte.validators');

router.use(authenticate);

// Cualquier usuario autenticado puede listar y crear tickets
router.get ('/',              ctrl.getAll);
router.post('/', crearRules, validate, ctrl.crear);
router.get ('/:id',           ctrl.getById);

// Cualquier usuario puede responder (empleado solo sus tickets, validado en service)
router.post('/:id/responder', responderRules, validate, ctrl.responder);

// Solo admin y supervisor cambian estado y asignan
router.patch('/:id/estado',  authorize('admin','supervisor'), estadoRules,  validate, ctrl.cambiarEstado);
router.patch('/:id/asignar', authorize('admin'),              asignarRules, validate, ctrl.asignar);

module.exports = router;
