const { REFUND_TIERS } = require('../config/constants');

/**
 * Pure function to calculate refund percentage and amount
 *
 * Refund policy:
 * - Notice > 48 hours: 100% refund
 * - Notice between 24h and 48h (inclusive): 50% refund
 * - Notice < 24 hours (or past): 0% refund
 *
 * @param {string|Date} appointmentDatetime - Scheduled appointment date/time
 * @param {string|Date} now - Current reference timestamp (passed in for testability)
 * @param {number|string} fee - Amount paid or consultation fee
 * @returns {{ percent: number, amount: number }}
 */
function calculateRefund(appointmentDatetime, now, fee) {
  const appDate = new Date(appointmentDatetime);
  const nowDate = new Date(now);

  if (isNaN(appDate.getTime()) || isNaN(nowDate.getTime())) {
    throw new Error('Invalid date provided to calculateRefund');
  }

  const diffMs = appDate.getTime() - nowDate.getTime();
  const hoursOfNotice = diffMs / (1000 * 60 * 60);

  let percent = REFUND_TIERS.NONE.PERCENT;

  if (hoursOfNotice > REFUND_TIERS.FULL.MIN_NOTICE_HOURS) {
    percent = REFUND_TIERS.FULL.PERCENT;
  } else if (hoursOfNotice >= REFUND_TIERS.HALF.MIN_NOTICE_HOURS) {
    percent = REFUND_TIERS.HALF.PERCENT;
  } else {
    percent = REFUND_TIERS.NONE.PERCENT;
  }

  // Calculate refund in integer cents to prevent floating point inaccuracies
  const feeCents = Math.round(Number(fee) * 100);
  const refundCents = Math.round((feeCents * percent) / 100);
  const amount = Number((refundCents / 100).toFixed(2));

  return { percent, amount };
}

module.exports = {
  calculateRefund
};
