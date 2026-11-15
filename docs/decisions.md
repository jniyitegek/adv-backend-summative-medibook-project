# MediBook Design Decisions

**Date:** Nov 23, 2026  
**Author:** Jean Philippe  

These are the architectural and implementation decisions locked for the MediBook clinic backend, each with its technical justification.

---

## 1. Table Count & Entity Design

| Decision | Choice | Technical Reason |
|---|---|---|
| **Table count** | 4 tables: `patients`, `doctors`, `appointments`, `refunds` | A separate `refunds` table ensures that "cancellation and refund succeed or fail together" forms a genuine two-table ACID transaction. It separates refund financial tracking from the booking lifecycle while keeping foreign key integrity. |
| **Specialty storage** | Plain VARCHAR column on `doctors` | Specialty is a short descriptive label. A dedicated lookup table would add unnecessary schema complexity and cost a SQL JOIN in every doctor query. |
| **Appointment status values** | `booked`, `cancelled` | Represents the minimal finite state set required by clinic operations. Extra states like `completed` add unused code paths and edge cases. |

---

## 2. Database Schema & Constraints

| Decision | Choice | Technical Reason |
|---|---|---|
| **Slot rebooking after cancellation** | Stored generated column `active_slot` with `UNIQUE (doctor_id, active_slot)` | MySQL does not support partial unique indexes (`WHERE status = 'booked'`). A plain `UNIQUE(doctor_id, appointment_datetime)` would permanently lock a slot even if cancelled. Setting `active_slot = IF(status = 'booked', appointment_datetime, NULL)` leverages MySQL's behavior where multiple `NULL` values do not collide in a unique index. A rebooked appointment inserts cleanly. |
| **Money data type** | `DECIMAL(10,2)` | IEEE-754 floating-point numbers introduce binary rounding inaccuracies (e.g., `150.00 * 0.50` resulting in `74.99999999`). Exact decimal arithmetic preserves monetary accuracy. |
| **Slot time representation** | `DATETIME` | Holds both date and time components, enabling direct temporal comparisons, daily grouping, CTE generation, and boundary calculations. |
| **Meaning of `amount_paid`** | Snapshot of doctor's fee copied at booking time | A doctor's consultation fee may change in the future. Persisting the historical price paid at the time of booking preserves financial audit accuracy and ensures refund calculations remain faithful. |
| **Delete behavior** | Foreign key `ON DELETE RESTRICT` (returns 409 Conflict) | Prevents accidental cascading deletion or orphan records of patients or doctors who have historical appointments or refunds. |
| **Database constraints** | `CHECK (consultation_fee > 0)`, `CHECK (amount_paid >= 0)`, `CHECK (refund_percent IN (0, 50, 100))`, `CHECK (refund_amount >= 0)`, `UNIQUE (email)` | Defensive design: business constraints are enforced by the database engine itself, rejecting invalid state even in the event of an application logic bug. |

---

## 3. Booking & Concurrency

| Decision | Choice | Technical Reason |
|---|---|---|
| **Concurrency method** | Database transaction with row locking: `SELECT ... FROM doctors WHERE doctor_id = ? FOR UPDATE`, count booked rows for the day, then insert | Checking the 12-slot daily cap in application code without database locking causes race conditions where simultaneous requests both observe count = 11 and both insert (exceeding capacity). Locking the doctor row serializes concurrent bookings for that doctor. |
| **Operating hours & last slot** | Hours: 09:00–17:00; Last valid slot: 16:30 | Because appointments last 30 minutes, an appointment starting at 17:00 would finish at 17:30, violating clinic closing time. The last slot must be 16:30. |
| **Timezone handling** | UTC (`Z`), with `dateStrings: true` in `mysql2` | Eliminates implicit and unexpected client/server timezone conversions across system boundaries, ensuring date and refund boundary calculations match expectations everywhere. |
| **Future booking enforcement** | Strictly after current timestamp (`appointment_datetime > now`) | Bookings in the past or present are invalid. Passing `now` as a parameter to validator functions enables fully deterministic unit tests. |
| **Capacity count filter** | Only appointments with `status = 'booked'` count towards the 12-appointment cap | Cancelled appointments release the doctor's working capacity. |
| **HTTP status codes** | `400` malformed input, `404` resource not found, `409` conflict / slot already taken, `422` unprocessable entity (business rule violated: past slot, off hours, cap reached), `201` created | Follows RFC 7231 / REST conventions. |

---

## 4. Cancellation & Refunds

| Decision | Choice | Technical Reason |
|---|---|---|
| **Refund calculation** | Pure function `calculateRefund(appointmentDatetime, now, fee)` | Computes refund server-side based solely on verified timestamps and persisted fee. Pure function architecture enables comprehensive unit testing without database or Redis mocks. |
| **Refund policy boundaries** | `> 48h`: 100%; `24h <= notice <= 48h`: 50%; `< 24h`: 0% | Clarifies assignment ambiguous phrasing: exact 48h and exact 24h boundary times both fall into the 50% tier. |
| **Revenue definition** | Net revenue = `SUM(amount_paid) - COALESCE(SUM(refund_amount), 0)` | Ensures that doctor statistics, doctor reports, and clinic totals strictly agree across all SQL endpoints. |
| **Authorization model** | Open endpoint holding `appointment_id` | The assignment does not mandate an authentication/authorization layer. Documented as an explicit known limitation. |
| **Repeated cancellation** | Return `409 Conflict` | Cancelling an already-cancelled appointment is rejected to prevent duplicate refunds and corrupted records. |

---

## 5. Redis Queues & Background Worker

| Decision | Choice | Technical Reason |
|---|---|---|
| **Queue library** | `ioredis` with native Redis primitives | Eliminates heavyweight abstractions like BullMQ for lightweight queue tasks; plain lists are simpler to maintain, debug, and explain during project walkthroughs. |
| **Waitlist key format** | `waitlist:{doctorId}:{date}` | Segregates waitlists per doctor-day, allowing fast, localized queue operations when an appointment for that specific doctor on that date is cancelled. |
| **Queue entry payload** | JSON string: `{"patientId": 1, "datetime": "...", "attempts": 0}` | Contains all essential metadata necessary for the background worker to attempt booking promotion. |
| **Promotion safety** | `LMOVE waitlist:{doctorId}:{date} waitlist:processing LEFT RIGHT` | Atomic transfer ensures the patient is never lost between popping and booking. If booking succeeds, entry is removed with `LREM`. If booking fails, it is re-queued or dropped after max retries. |
| **Cancellation signal** | Asynchronously pushed to `jobs:slot-freed` Redis list | Decouples the HTTP web server from background processing. Failure in Redis publishing does not abort the committed database cancellation. |
| **Worker architecture** | Separate executable script (`npm run worker`), never loaded inside web server | Follows 12-factor application design and rubric requirements, ensuring worker failures or blocking tasks do not degrade HTTP API availability. |
| **Worker retry cap** | Maximum of 3 attempts before moving to audit log and dropping | Prevents toxic/poison messages from causing infinite processing loops. |

---

## 6. Code Architecture & Hardening

| Decision | Choice | Technical Reason |
|---|---|---|
| **Directory structure** | `models/`, `controllers/`, `routes/`, `services/`, `middleware/`, `config/`, `worker/` | Separation of concerns: models house 100% of SQL; controllers coordinate request/response flows; services isolate pure algorithms; routes declare endpoints. |
| **Audit log format** | Single JSON object per line appended to `logs/audit.log` | Non-blocking `fs.promises.appendFile` guarantees high throughput. Try/catch prevents file system errors from failing user requests. |
| **Internationalization (i18n)** | JSON locale dictionaries in `locales/en.json` and `locales/rw.json` (Kinyarwanda) | Server-rendered feedback view at `GET /feedback` uses ISO language tags, formatting dates via `Intl.DateTimeFormat(lang, { dateStyle: 'full' })` and falling back cleanly to English (`en`). |
| **Testing framework** | Jest with pure functions | Runs fast, deterministic unit test suites with zero database or network dependencies. |
