# MediBook Unit Test Plan

In accordance with Part F of the specification, all unit tests are written with Jest and evaluate pure functions with zero runtime dependencies on MySQL or Redis.

## Planned Test Cases

### 1. Refund Calculator (`src/services/refundCalculator.js`)
Tests verify the three refund tiers and the exact 24-hour and 48-hour boundary policies. All calculations use fixed reference dates passed into `now`.

| # | Test Name | Notice Duration | Expected Refund % | Expected Behavior |
|---|---|---|---|---|
| 1 | `calculates 100% refund when notice is well over 48 hours` | 72 hours | 100% | Full refund of booking fee |
| 2 | `calculates 100% refund when notice is just over 48 hours` | 48 hours + 1 minute | 100% | Full refund of booking fee |
| 3 | `calculates 50% refund at exactly 48 hours notice (upper boundary)` | 48 hours exact | 50% | Half refund of booking fee |
| 4 | `calculates 50% refund when notice is between 24 and 48 hours` | 36 hours | 50% | Half refund of booking fee |
| 5 | `calculates 50% refund at exactly 24 hours notice (lower boundary)` | 24 hours exact | 50% | Half refund of booking fee |
| 6 | `calculates 0% refund when notice is just under 24 hours` | 23 hours 59 minutes | 0% | No refund issued |
| 7 | `calculates 0% refund when notice is well under 24 hours` | 5 hours | 0% | No refund issued |
| 8 | `calculates 0% refund when appointment is in the past` | -2 hours | 0% | No refund issued |
| 9 | `handles exact cents rounding cleanly without floating point errors` | 36 hours (50% of 150.00) | 50% | Returns 75.00 exactly |

### 2. Slot Validator (`src/services/slotValidator.js`)
Tests verify appointment timing rules: 09:00–17:00 operating window, 30-minute alignment, 16:30 last slot, and future-only constraint.

| # | Test Name | Input Datetime | Current `now` | Expected Result | Reason |
|---|---|---|---|---|---|
| 1 | `accepts earliest valid slot at 09:00 on future date` | `2026-12-20 09:00:00` | `2026-12-01 00:00:00` | Valid (`true`) | Opening hour slot |
| 2 | `accepts latest valid slot at 16:30 on future date` | `2026-12-20 16:30:00` | `2026-12-01 00:00:00` | Valid (`true`) | Concludes at 17:00 closing |
| 3 | `rejects 17:00 slot as running past closing hours` | `2026-12-20 17:00:00` | `2026-12-01 00:00:00` | Invalid (`false`) | Appointment would exceed 17:00 |
| 4 | `rejects slots before opening hours (e.g., 08:30)` | `2026-12-20 08:30:00` | `2026-12-01 00:00:00` | Invalid (`false`) | Clinic unopened |
| 5 | `rejects slots after 17:00 (e.g., 17:30)` | `2026-12-20 17:30:00` | `2026-12-01 00:00:00` | Invalid (`false`) | Clinic closed |
| 6 | `rejects unaligned minutes (e.g., 09:15)` | `2026-12-20 09:15:00` | `2026-12-01 00:00:00` | Invalid (`false`) | Must be :00 or :30 |
| 7 | `rejects non-zero seconds (e.g., 09:00:15)` | `2026-12-20 09:00:15` | `2026-12-01 00:00:00` | Invalid (`false`) | Must be aligned on minute |
| 8 | `rejects appointment scheduled in the past` | `2026-11-20 10:00:00` | `2026-12-01 00:00:00` | Invalid (`false`) | Strictly future only |
| 9 | `rejects appointment scheduled at the exact current time` | `2026-12-01 10:00:00` | `2026-12-01 10:00:00` | Invalid (`false`) | Must be strictly in the future |
| 10 | `rejects malformed date strings` | `invalid-date` | `2026-12-01 00:00:00` | Invalid (`false`) | Invalid ISO datetime format |
