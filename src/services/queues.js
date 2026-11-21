const redis = require('../config/redis');
const { REDIS_KEYS } = require('../config/constants');

/**
 * Waitlist and Background Job Queue Helpers
 * Utilizes plain Redis lists with native commands (RPUSH, LMOVE, LREM, LPUSH, BRPOP).
 */

/**
 * Pushes a patient onto the waitlist for a specific doctor-day
 *
 * @param {object} param
 * @param {number} param.patientId
 * @param {number} param.doctorId
 * @param {string} param.datetime
 * @returns {Promise<number>} Queue position
 */
async function joinWaitlist({ patientId, doctorId, datetime }) {
  const date = datetime.substring(0, 10);
  const queueKey = `${REDIS_KEYS.WAITLIST_PREFIX}:${doctorId}:${date}`;

  const payload = JSON.stringify({
    patientId: Number(patientId),
    doctorId: Number(doctorId),
    datetime,
    attempts: 0
  });

  const queuePosition = await redis.rpush(queueKey, payload);
  return queuePosition;
}

/**
 * Publishes a slot-freed job for background worker consumption
 *
 * @param {object} param
 * @param {number} param.doctorId
 * @param {string} param.datetime
 */
async function publishSlotFreed({ doctorId, datetime }) {
  const payload = JSON.stringify({
    doctorId: Number(doctorId),
    datetime
  });

  await redis.rpush(REDIS_KEYS.SLOT_FREED_QUEUE, payload);
}

/**
 * Enqueues an appointment confirmation notification job
 *
 * @param {object} param
 * @param {number} param.appointmentId
 * @param {number} param.patientId
 * @param {number} param.doctorId
 * @param {string} param.datetime
 */
async function enqueueConfirmation({ appointmentId, patientId, doctorId, datetime }) {
  const payload = JSON.stringify({
    appointmentId: Number(appointmentId),
    patientId: Number(patientId),
    doctorId: Number(doctorId),
    datetime
  });

  await redis.rpush(REDIS_KEYS.NOTIFICATIONS_QUEUE, payload);
}

module.exports = {
  joinWaitlist,
  publishSlotFreed,
  enqueueConfirmation
};
