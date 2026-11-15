# MediBook Requirements Checklist

This checklist documents every business rule and operational requirement for the MediBook backend appointment system.

| # | Requirement | Rule / Detail | Implementation Verification |
|---|---|---|---|
| **R01** | Working Hours | Clinic operates strictly from 09:00 to 17:00. | `src/services/slotValidator.js` rejects slots before 09:00 or starting at/after 17:00. |
| **R02** | Slot Duration | Appointments are fixed 30-minute intervals aligned on :00 and :30 minute marks. | `src/services/slotValidator.js` validates minutes are `00` or `30`, seconds `00`. |
| **R03** | Last Bookable Slot | The latest appointment slot of the day is 16:30 (finishing at 17:00). | `src/services/slotValidator.js` marks 16:30 as valid, 17:00 as invalid. |
| **R04** | Future Only Booking | Appointments can only be booked strictly in the future (`appointment_datetime > now`). | Evaluated against `now` parameter in `slotValidator` and transactional booking model. |
| **R05** | Daily Capacity Cap | A doctor can handle at most 12 appointments per day (`DAILY_CAP = 12`). | Enforced inside database transaction by counting active `booked` rows for doctor on that date. |
| **R06** | Concurrency Safety | No two patients can ever hold the same doctor slot, even with simultaneous requests. | Enforced by `SELECT ... FOR UPDATE` row locking and `UNIQUE KEY (doctor_id, active_slot)`. |
| **R07** | Slot Rebooking & History | A cancelled slot must be rebookable by another patient, while keeping the cancelled record for history. | Stored generated column `active_slot = IF(status = 'booked', appointment_datetime, NULL)` with unique index. |
| **R08** | Refund Tier 1 (100%) | Notice given > 48 hours before appointment time results in a 100% refund. | `src/services/refundCalculator.js`: `noticeHours > 48` -> 100%. |
| **R09** | Refund Tier 2 (50%) | Notice given from 24h to 48h inclusive results in a 50% refund. | `src/services/refundCalculator.js`: `24 <= noticeHours <= 48` -> 50%. |
| **R10** | Refund Tier 3 (0%) | Notice given < 24 hours (or past appointment) results in 0% refund. | `src/services/refundCalculator.js`: `noticeHours < 24` -> 0%. |
| **R11** | Atomic Cancellation | Cancellation status update and refund record creation succeed or fail together. | Managed in a single database transaction (`UPDATE appointments` + `INSERT INTO refunds`). |
| **R12** | Redis Waitlist Queue | When a slot is booked or day full, patients can join a Redis waitlist (`waitlist:{doctorId}:{date}`). | `src/services/queues.js` pushes to Redis list; cancellation pushes to `jobs:slot-freed`. |
| **R13** | Safe Worker Promotion | Separate worker process safely pops waitlisted patients via `LMOVE` to processing list and retries up to 3 times. | `src/worker/index.js` handles promotion with `LMOVE`, retry cap (3), and `LREM`. |
| **R14** | Notification Enqueueing | Confirmed bookings enqueue notification jobs; worker records them to audit log. | `jobs:notifications` queue processed by separate background worker. |
| **R15** | Non-blocking Audit Log | Every booking and cancellation appends a JSON line to `logs/audit.log` via async `fs`. Logging errors never fail requests. | `src/services/auditLogger.js` uses `fs.promises` inside try/catch without sync calls. |
| **R16** | Pure Unit Tests | At least 6 Jest unit tests covering refund tiers, both boundaries (24h, 48h), and slot validator edge cases without DB/Redis. | Tested in `tests/refund.test.js` and `tests/slot.test.js`. |
| **R17** | Advanced SQL Reports | Statistics and reports (revenue = amount_paid - refunds, doctor stats, busy days > 80% cap) computed in SQL models. | Handled via aggregation, joins, and CTEs in `src/models/statsModel.js`. |
| **R18** | Course Feedback Page | Server-rendered HTML at `GET /feedback` with 5 textarea questions, supporting `en` and `rw` locales with English fallback. | Handled in `src/controllers/feedbackController.js` and `locales/`. |
| **R19** | RESTful Architecture | Full CRUD for patients and doctors, parameterized queries (`?`), central error handler, thin controllers. | Structured across `models/`, `controllers/`, `routes/`, `middleware/`, `services/`. |
