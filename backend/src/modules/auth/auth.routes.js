const router = require('express').Router();
const rateLimit = require('express-rate-limit');
const ctrl = require('./auth.controller');
const { loginRules, refreshRules } = require('./auth.validators');
const { validate } = require('../../middlewares/validate.middleware');
const { authenticate } = require('../../middlewares/auth.middleware');
const { auditLog } = require('../../middlewares/audit.middleware');

const recuperarPasswordLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Demasiadas solicitudes de recuperación, intenta en 1 hora' },
});

router.post('/login',              loginRules,   validate, auditLog('LOGIN', 'sesiones'), ctrl.login);
router.post('/logout',             authenticate,                                            ctrl.logout);
router.post('/refresh',            refreshRules, validate,                                  ctrl.refresh);
router.get('/me',                  authenticate,                                            ctrl.getMe);
router.put('/me',                  authenticate,                                            ctrl.updateMe);
router.post('/me/avatar',          authenticate,                                            ctrl.uploadMeAvatar);
router.delete('/me/avatar',        authenticate,                                            ctrl.deleteMeAvatar);
router.post('/recuperar-password', recuperarPasswordLimiter,                                ctrl.recuperarPassword);
router.post('/cambiar-password',   authenticate,                                            ctrl.cambiarPassword);

module.exports = router;
