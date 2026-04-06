const { body } = require('express-validator');

const loginRules = [
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('password').notEmpty().withMessage('Contraseña requerida'),
];

const refreshRules = [
  body('refreshToken').notEmpty().withMessage('refreshToken requerido'),
];

module.exports = { loginRules, refreshRules };
