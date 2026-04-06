/**
 * Scheduler de cierre automático de jornadas.
 *
 * Lógica:
 *  1. Al llegar a jornada_hora_fin → avisa al usuario (una vez por jornada).
 *  2. A los 60 minutos después de jornada_hora_fin → finaliza automáticamente.
 *
 * Se ejecuta cada minuto. El aviso es vía Socket.io; el cierre usa el servicio
 * de jornadas para mantener consistencia (cierra pausas abiertas, actualiza BD).
 */

const { query }        = require('../../config/database');
const { emitToUser }   = require('../../config/socket');
const { get }          = require('../configuraciones/configuraciones.service');
const { esDiaLaboral } = require('./jornadas.service');
const jornadasSvc      = require('./jornadas.service');
const { getTodayDate } = require('../../utils/date.util');

// Jornadas ya finalizadas automáticamente en esta sesión del servidor (evita doble cierre).
const jornadasCerradas = new Set();

/**
 * Construye un Date de hoy con la hora HH:MM dada.
 * @param {string} horaStr  - Formato "HH:MM"
 * @returns {Date}
 */
const buildHoyConHora = (horaStr) => {
  const [h, m] = horaStr.split(':').map(Number);
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d;
};

/**
 * Formatea un Date a "HH:MM" en hora local.
 * @param {Date} date
 * @returns {string}
 */
const toHHMM = (date) =>
  `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;

const tick = async () => {
  try {
    // No actuar en días no laborales
    if (!await esDiaLaboral(new Date().getDay())) return;

    const horaFinStr = await get('jornada_hora_fin');
    if (!horaFinStr) return;

    const horaFin     = buildHoyConHora(horaFinStr);
    const horaAutoFin = new Date(horaFin.getTime() + 60 * 60 * 1000); // +60 min
    const ahora       = new Date();

    // Solo actuar cuando ya pasó la hora de fin laboral
    if (ahora < horaFin) return;

    // Buscar jornadas activas/pausadas de hoy
    const [jornadas] = await query(
      `SELECT id, usuario_id FROM jornadas
       WHERE fecha = ? AND estado IN ('activa','pausada')`,
      [getTodayDate()]
    );

    for (const j of jornadas) {
      if (ahora >= horaAutoFin) {
        // ─── Cierre automático (solo una vez por jornada) ─────────────────────
        if (jornadasCerradas.has(j.id)) continue;
        jornadasCerradas.add(j.id);
        try {
          await jornadasSvc.finalizarAuto(j.id, j.usuario_id);
          console.log(`[Scheduler] Jornada ${j.id} finalizada automáticamente (usuario ${j.usuario_id})`);
        } catch (err) {
          console.error(`[Scheduler] Error al finalizar jornada ${j.id}:`, err.message);
        }
      } else {
        // ─── Aviso en cada tick dentro de la ventana ──────────────────────────
        // Se emite en cada tick (cada minuto) para que usuarios recién
        // conectados o reconectados también reciban el aviso. El frontend
        // controla que el modal no aparezca dos veces.
        const minutosRestantes = Math.round((horaAutoFin - ahora) / 60000);
        emitToUser(j.usuario_id, 'jornada:aviso_fin', {
          jornadaId:         j.id,
          horaFinProgramada: toHHMM(horaFin),
          horaAutoFin:       toHHMM(horaAutoFin),
          minutosRestantes,
        });
        console.log(`[Scheduler] Aviso emitido al usuario ${j.usuario_id} (jornada ${j.id}). Auto-cierre en ${minutosRestantes} min`);
      }
    }
  } catch (err) {
    console.error('[Scheduler] Error en tick:', err.message);
  }
};

const init = () => {
  // Ejecutar inmediatamente al arrancar y luego cada minuto
  tick();
  setInterval(tick, 60 * 1000);
  console.log('[Scheduler] Scheduler de cierre de jornadas iniciado');
};

module.exports = { init };
