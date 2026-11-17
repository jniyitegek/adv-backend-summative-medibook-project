const { calculateRefund } = require('../src/services/refundCalculator');

describe('Refund Calculator (Part C.3 & Part F)', () => {
  const fee = 150.00;
  // Fixed reference appointment time: 2026-12-20 10:00:00 UTC
  const appointmentDatetime = '2026-12-20T10:00:00.000Z';

  describe('Tier 1: Notice > 48 hours (100% refund)', () => {
    test('calculates 100% refund when notice is well over 48 hours (72 hours notice)', () => {
      // 72 hours before: 2026-12-17 10:00:00 UTC
      const now = '2026-12-17T10:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(100);
      expect(result.amount).toBe(150.00);
    });

    test('calculates 100% refund when notice is just over 48 hours (48 hours + 1 minute)', () => {
      // 48 hours and 1 minute before: 2026-12-18 09:59:00 UTC
      const now = '2026-12-18T09:59:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(100);
      expect(result.amount).toBe(150.00);
    });
  });

  describe('Tier 2: 24h to 48h inclusive (50% refund)', () => {
    test('calculates 50% refund at exactly 48 hours notice (upper boundary)', () => {
      // Exactly 48 hours before: 2026-12-18 10:00:00 UTC
      const now = '2026-12-18T10:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(50);
      expect(result.amount).toBe(75.00);
    });

    test('calculates 50% refund when notice is between 24 and 48 hours (36 hours notice)', () => {
      // 36 hours before: 2026-12-18 22:00:00 UTC
      const now = '2026-12-18T22:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(50);
      expect(result.amount).toBe(75.00);
    });

    test('calculates 50% refund at exactly 24 hours notice (lower boundary)', () => {
      // Exactly 24 hours before: 2026-12-19 10:00:00 UTC
      const now = '2026-12-19T10:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(50);
      expect(result.amount).toBe(75.00);
    });
  });

  describe('Tier 3: Notice < 24 hours or past (0% refund)', () => {
    test('calculates 0% refund when notice is just under 24 hours (23h 59m notice)', () => {
      // 23 hours 59 minutes before: 2026-12-19 10:01:00 UTC
      const now = '2026-12-19T10:01:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(0);
      expect(result.amount).toBe(0.00);
    });

    test('calculates 0% refund when notice is well under 24 hours (5 hours notice)', () => {
      // 5 hours before: 2026-12-20 05:00:00 UTC
      const now = '2026-12-20T05:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(0);
      expect(result.amount).toBe(0.00);
    });

    test('calculates 0% refund when appointment is in the past (-2 hours)', () => {
      // 2 hours after: 2026-12-20 12:00:00 UTC
      const now = '2026-12-20T12:00:00.000Z';
      const result = calculateRefund(appointmentDatetime, now, fee);

      expect(result.percent).toBe(0);
      expect(result.amount).toBe(0.00);
    });
  });

  describe('Monetary Precision and Rounding', () => {
    test('handles exact cents rounding cleanly without floating point errors', () => {
      const oddFee = 125.75;
      const now = '2026-12-18T10:00:00.000Z'; // 50% tier
      const result = calculateRefund(appointmentDatetime, now, oddFee);

      expect(result.percent).toBe(50);
      // 125.75 / 2 = 62.875 -> rounded to nearest cent is 62.88
      expect(result.amount).toBe(62.88);
    });
  });
});
