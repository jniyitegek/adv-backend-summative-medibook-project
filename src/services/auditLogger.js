const fs = require('fs');
const path = require('path');

const LOGS_DIR = path.join(__dirname, '../../logs');
const AUDIT_LOG_FILE = path.join(LOGS_DIR, 'audit.log');

let dirEnsured = false;

/**
 * Asynchronously appends a single JSON line to logs/audit.log
 * Non-blocking, never throws, never fails user requests.
 *
 * @param {string} event - Event name (e.g. 'booking_created', 'booking_cancelled', 'waitlist_promoted', 'notification_sent')
 * @param {number|null} appointmentId - Related appointment ID if applicable
 * @param {object} details - Additional event metadata
 */
async function logEvent(event, appointmentId, details = {}) {
  try {
    if (!dirEnsured) {
      await fs.promises.mkdir(LOGS_DIR, { recursive: true });
      dirEnsured = true;
    }

    const logEntry = {
      event,
      appointmentId: appointmentId !== undefined && appointmentId !== null ? Number(appointmentId) : null,
      timestamp: new Date().toISOString(),
      details
    };

    await fs.promises.appendFile(AUDIT_LOG_FILE, JSON.stringify(logEntry) + '\n', 'utf8');
  } catch (err) {
    // Audit logging failure must never fail user requests
    console.error('[Audit Logger Error]', err.message);
  }
}

module.exports = {
  logEvent
};
