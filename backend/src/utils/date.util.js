/**
 * Convierte un Date a formato MySQL DATETIME: 'YYYY-MM-DD HH:MM:SS'
 */
const toMySQLDatetime = (date = new Date()) => {
  const d = new Date(date);
  return d.toISOString().slice(0, 19).replace('T', ' ');
};

/**
 * Devuelve la fecha actual en formato 'YYYY-MM-DD'
 */
const getTodayDate = () => new Date().toISOString().slice(0, 10);

/**
 * Calcula diferencia en minutos entre dos fechas
 */
const calcDurationMin = (start, end) => {
  const ms = new Date(end) - new Date(start);
  return Math.round(ms / 60000);
};

/**
 * Convierte minutos a formato legible '2h 30m'
 */
const formatDuration = (minutes) => {
  if (!minutes || minutes < 0) return '0m';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
};

/**
 * Retorna inicio y fin de un rango de fechas para queries
 */
const dateRange = (fechaInicio, fechaFin) => ({
  inicio: `${fechaInicio} 00:00:00`,
  fin:    `${fechaFin} 23:59:59`,
});

module.exports = { toMySQLDatetime, getTodayDate, calcDurationMin, formatDuration, dateRange };
