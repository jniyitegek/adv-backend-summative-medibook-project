const { validateSlot } = require('../src/services/slotValidator');

describe('Slot Validator (Part C.2 & Part F)', () => {
  // Reference now: 2026-12-01 00:00:00 UTC
  const fixedNow = '2026-12-01T00:00:00.000Z';

  describe('Valid Slots', () => {
    test('accepts earliest valid slot at 09:00 on future date', () => {
      const result = validateSlot('2026-12-20 09:00:00', fixedNow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('accepts latest valid slot at 16:30 on future date', () => {
      const result = validateSlot('2026-12-20 16:30:00', fixedNow);
      expect(result.valid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    test('accepts valid slot with ISO T separator', () => {
      const result = validateSlot('2026-12-20T14:30:00', fixedNow);
      expect(result.valid).toBe(true);
    });
  });

  describe('Working Hours Enforcement', () => {
    test('rejects 17:00 slot as running past closing hours', () => {
      const result = validateSlot('2026-12-20 17:00:00', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/close/i);
    });

    test('rejects slots before opening hours (e.g., 08:30)', () => {
      const result = validateSlot('2026-12-20 08:30:00', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/between 09:00 and 16:30/i);
    });

    test('rejects slots after 17:00 (e.g., 17:30)', () => {
      const result = validateSlot('2026-12-20 17:30:00', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/close/i);
    });
  });

  describe('Minute and Second Alignment', () => {
    test('rejects unaligned minutes (e.g., 09:15)', () => {
      const result = validateSlot('2026-12-20 09:15:00', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/30-minute slots/i);
    });

    test('rejects non-zero seconds (e.g., 09:00:15)', () => {
      const result = validateSlot('2026-12-20 09:00:15', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/exact minute/i);
    });
  });

  describe('Temporal & Format Validation', () => {
    test('rejects appointment scheduled in the past', () => {
      const pastSlot = '2026-11-20 10:00:00';
      const result = validateSlot(pastSlot, fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/strictly in the future/i);
    });

    test('rejects appointment scheduled at the exact current time', () => {
      const exactNow = '2026-12-01 10:00:00';
      const result = validateSlot(exactNow, '2026-12-01T10:00:00.000Z');
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/strictly in the future/i);
    });

    test('rejects malformed date strings', () => {
      const result = validateSlot('not-a-valid-date', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Malformed datetime format/i);
    });

    test('rejects invalid calendar dates like February 30', () => {
      const result = validateSlot('2026-02-30 10:00:00', fixedNow);
      expect(result.valid).toBe(false);
      expect(result.reason).toMatch(/Invalid calendar date/i);
    });
  });
});
