const {
  OPEN_HOUR,
  CLOSE_HOUR,
  SLOT_MINUTES,
  LAST_SLOT_HOUR,
  LAST_SLOT_MINUTE
} = require('../config/constants');

/**
 * Validates whether an appointment datetime conforms to clinic booking rules:
 * - Proper datetime format (YYYY-MM-DD HH:mm:ss or ISO)
 * - Exact minute alignment on 30-minute boundaries (:00 or :30) with 00 seconds
 * - Within working hours (09:00 - 17:00), where the last valid starting slot is 16:30
 * - Strictly in the future relative to `now`
 *
 * @param {string} datetimeString - Target appointment datetime string
 * @param {string|Date} now - Reference timestamp for future-only check
 * @returns {{ valid: boolean, reason?: string }}
 */
function validateSlot(datetimeString, now) {
  if (!datetimeString || typeof datetimeString !== 'string') {
    return { valid: false, reason: 'Datetime string is required' };
  }

  const trimmed = datetimeString.trim();
  const match = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
  if (!match) {
    return { valid: false, reason: 'Malformed datetime format. Expected YYYY-MM-DD HH:mm:ss' };
  }

  const [_, yStr, mStr, dStr, hhStr, mmStr, ssStr = '00'] = match;
  const year = parseInt(yStr, 10);
  const month = parseInt(mStr, 10) - 1;
  const day = parseInt(dStr, 10);
  const hour = parseInt(hhStr, 10);
  const minute = parseInt(mmStr, 10);
  const second = parseInt(ssStr, 10);

  // Validate real calendar date
  const targetDate = new Date(Date.UTC(year, month, day, hour, minute, second));
  if (
    isNaN(targetDate.getTime()) ||
    targetDate.getUTCFullYear() !== year ||
    targetDate.getUTCMonth() !== month ||
    targetDate.getUTCDate() !== day
  ) {
    return { valid: false, reason: 'Invalid calendar date' };
  }

  // Second alignment: must be 00
  if (second !== 0) {
    return { valid: false, reason: 'Appointments must be aligned to the exact minute (:00 seconds)' };
  }

  // Minute alignment: must be :00 or :30
  if (minute !== 0 && minute !== SLOT_MINUTES) {
    return { valid: false, reason: `Appointments must be aligned to ${SLOT_MINUTES}-minute slots (:00 or :${SLOT_MINUTES})` };
  }

  // Working hours check: 09:00 to 17:00, last start is 16:30
  if (
    hour < OPEN_HOUR ||
    hour > LAST_SLOT_HOUR ||
    (hour === LAST_SLOT_HOUR && minute > LAST_SLOT_MINUTE)
  ) {
    return {
      valid: false,
      reason: `Appointments must be scheduled between 0${OPEN_HOUR}:00 and ${LAST_SLOT_HOUR}:${LAST_SLOT_MINUTE} (clinic closes at ${CLOSE_HOUR}:00)`
    };
  }

  // Future-only check
  const nowDate = new Date(now);
  if (isNaN(nowDate.getTime())) {
    return { valid: false, reason: 'Invalid current timestamp reference' };
  }

  if (targetDate.getTime() <= nowDate.getTime()) {
    return { valid: false, reason: 'Appointments can only be booked strictly in the future' };
  }

  return { valid: true };
}

module.exports = {
  validateSlot
};
