const { body } = require('express-validator');

const createRules = [
  body('nombre').notEmpty().trim().withMessage('Nombre requerido'),
  body('apellido').notEmpty().trim().withMessage('Apellido requerido'),
  body('email').isEmail().normalizeEmail().withMessage('Email inválido'),
  body('rol_id').isInt({ min: 1 }).withMessage('Rol inválido'),
];

const updateRules = [
  body('nombre').optional().notEmpty().trim(),
  body('apellido').optional().notEmpty().trim(),
  body('email').optional().isEmail().normalizeEmail(),
];

const estadoRules = [
  body('estado').isIn(['activo', 'inactivo', 'suspendido']).withMessage('Estado inválido'),
];

module.exports = { createRules, updateRules, estadoRules };
