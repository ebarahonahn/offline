/**
 * Parsea parámetros de paginación desde query string
 * @param {object} query - req.query
 * @returns {{ page, limit, offset }}
 */
const parsePagination = (query) => {
  const page  = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
};

/**
 * Construye metadata de paginación para la respuesta
 */
const buildPaginationMeta = (total, page, limit) => ({
  total,
  page,
  limit,
  pages: Math.ceil(total / limit),
  hasNext: page * limit < total,
  hasPrev: page > 1,
});

module.exports = { parsePagination, buildPaginationMeta };
