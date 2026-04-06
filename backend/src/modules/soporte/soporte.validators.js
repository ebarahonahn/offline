const { body } = require('express-validator');

const crearRules = [
  body('titulo').trim().notEmpty().withMessage('El título es obligatorio').isLength({ max: 255 }),
  body('descripcion').trim().notEmpty().withMessage('La descripción es obligatoria'),
  body('categoria').isIn(['funcionalidad','error','solicitud','consulta','otro']).withMessage('Categoría inválida'),
  body('prioridad').optional().isIn(['baja','media','alta','urgente']).withMessage('Prioridad inválida'),
];

const responderRules = [
  body('mensaje').trim().notEmpty().withMessage('El mensaje es obligatorio'),
  body('es_nota_interna').optional().isBoolean(),
];

const estadoRules = [
  body('estado').isIn(['abierto','en_proceso','pendiente_usuario','resuelto','cerrado']).withMessage('Estado inválido'),
];

const asignarRules = [
  body('asignado_a').optional({ nullable: true }).isInt({ min: 1 }).withMessage('ID de usuario inválido'),
];

module.exports = { crearRules, responderRules, estadoRules, asignarRules };
