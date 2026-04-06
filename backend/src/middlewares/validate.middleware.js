const { validationResult } = require('express-validator');
const { fail } = require('../utils/response.util');

const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return fail(res, 'Datos de entrada inválidos', 422, errors.array());
  }
  next();
};

module.exports = { validate };
