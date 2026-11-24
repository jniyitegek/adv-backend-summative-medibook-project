# MediBook — Clinic Appointment System Backend

## 0. WALKTHROUGH VIDEO (8 minutes)

[![Watch the demo video](https://img.youtube.com/vi/-x9BSPaIACc/maxresdefault.jpg)](https://www.youtube.com/watch?v=-x9BSPaIACc)

A production-ready clinic appointment booking backend engineered with **Node.js**, **Express.js**, **MySQL 8.0+** (parameterized queries only, no ORM), and **Redis** (native list queues).

---

## 1. Prerequisites

- **Node.js**: v20.0.0 or higher (required for built-in full ICU international date formatting)
- **MySQL**: 8.0.16 or higher (required for `CHECK` constraints and stored generated columns)
- **Redis**: 6.2 or higher (required for atomic `LMOVE` command)
- **Docker & Docker Compose** (recommended for running MySQL and Redis)

---

## 2. Infrastructure Setup (Docker)

Spin up MySQL 8.0 and Redis 7 containers:

```bash
# Start MySQL container
docker run -d --name medibook-mysql -e MYSQL_ROOT_PASSWORD=changeme -p 3306:3306 mysql:8.0

# Start Redis container
docker run -d --name medibook-redis -p 6379:6379 redis:7
```

*(Note: If port `3306` is occupied by another service on your machine, map `-p 3307:3306` and set `DB_PORT=3307` in your `.env` file.)*

---

## 3. Environment & Database Initialization

### Step 1: Configure Environment Variables
Copy the `.env.example` template:
```bash
cp .env.example .env
```
Ensure `.env` matches your environment credentials (e.g. `DB_PORT=3306` or `3307`).

### Step 2: Install Node Dependencies
```bash
npm install
```

### Step 3: Load Database Schema & Seed Data
Execute the DDL schema and seed scripts against MySQL:
```bash
# Load schema (creates database medibook and tables)
mysql -u root -pchangeme -h 127.0.0.1 -P 3306 < database/schema.sql

# Load seed data (4 patients, 4 doctors, 15 appointments, refund)
mysql -u root -pchangeme -h 127.0.0.1 -P 3306 medibook < database/seed.sql
```

---

## 4. Running the Application & Services

### Web API Server
Start the Express REST API server:
```bash
npm start
# or for development mode:
npm run dev
```
The server listens on `http://localhost:3000`. Test liveness at `http://localhost:3000/health`.

### Background Worker Process
Start the independent Redis worker process in a separate terminal:
```bash
npm run worker
```
The worker processes cancellation promotions from `jobs:slot-freed` and notification confirmations from `jobs:notifications`.

### Running Unit Tests
Execute the pure unit test suite (runs in Jest with zero database or Redis dependencies):
```bash
npm test
```

---

## 5. API Reference Table

All endpoints use plural resource naming and adhere strictly to standard HTTP status codes:

| Method | Endpoint | Description | Success | Errors |
|---|---|---|---|---|
| `GET` | `/health` | Liveness health check | `200 OK` | - |
| `POST` | `/api/patients` | Register a new patient | `201 Created` | `400`, `409` (duplicate email) |
| `GET` | `/api/patients` | List all registered patients | `200 OK` | - |
| `GET` | `/api/patients/:id` | Get patient details by ID | `200 OK` | `400`, `404` |
| `PUT` | `/api/patients/:id` | Update patient record | `200 OK` | `400`, `404`, `409` |
| `DELETE` | `/api/patients/:id` | Delete patient (blocked if appointments exist) | `200 OK` | `400`, `404`, `409` |
| `POST` | `/api/doctors` | Register a new doctor | `201 Created` | `400` |
| `GET` | `/api/doctors` | List all doctors | `200 OK` | - |
| `GET` | `/api/doctors/:id` | Get doctor details by ID | `200 OK` | `400`, `404` |
| `PUT` | `/api/doctors/:id` | Update doctor record | `200 OK` | `400`, `404` |
| `DELETE` | `/api/doctors/:id` | Delete doctor (blocked if appointments exist) | `200 OK` | `400`, `404`, `409` |
| `POST` | `/api/appointments` | Book appointment slot | `201 Created` | `400`, `404`, `409` (slot taken), `422` (cap reached/off-hours) |
| `DELETE` | `/api/appointments/:id` | Cancel appointment & calculate refund | `200 OK` | `400`, `404`, `409` (already cancelled) |
| `POST` | `/api/appointments/waitlist` | Join Redis waitlist for doctor-date | `201 Created` | `400`, `404`, `422` |
| `GET` | `/api/doctors/:id/stats` | Net revenue, upcoming count, 7-day CTE stats | `200 OK` | `400`, `404` |
| `GET` | `/api/reports/doctors` | Clinic-wide doctor appointments & net revenue | `200 OK` | - |
| `GET` | `/api/reports/busy-days` | Every (doctor, date) with > 80% capacity booked | `200 OK` | - |
| `GET` | `/feedback?lang=en\|rw` | Course feedback page in English or Kinyarwanda | `200 OK` | - |

---

## 6. Design Decisions & Justifications

### Part C — Booking, Concurrency, and Cancellation

1. **Concurrency and Daily Cap Safety:**
   - Checking daily appointment count in JavaScript before inserting introduces race conditions under concurrent requests where multiple requests both observe count = 11 and simultaneously insert, violating the 12-appointment cap.
   - We serialize bookings per doctor by opening an explicit transaction and issuing `SELECT doctor_id FROM doctors WHERE doctor_id = ? FOR UPDATE`. This row lock ensures that concurrent booking requests for that doctor execute sequentially. The count query checks active `booked` rows and strictly enforces `DAILY_CAP = 12`.
   - In addition, slot collisions are prevented at the database level by a stored generated column `active_slot` with `UNIQUE KEY uq_doctor_active_slot (doctor_id, active_slot)`.

2. **Rebooking Cancelled Slots & Keeping History (`DELETE /api/appointments/:id`):**
   - In REST semantics, `DELETE` signifies the removal or cancellation of a resource. However, clinic financial accounting and medical audits require that the historical record of the appointment and its corresponding refund never be expunged.
   - The stored generated column `active_slot` is defined as:
     `active_slot DATETIME GENERATED ALWAYS AS (IF(status = 'booked', appointment_datetime, NULL)) STORED`
   - When an appointment is cancelled, its status updates to `'cancelled'`, which sets `active_slot` to `NULL`. Because MySQL allows multiple `NULL` values in a unique index, cancelled records never collide, instantly freeing the slot for another patient to rebook while preserving audit history.

3. **Refund Boundary Policy:**
   - The assignment specifies refund tiers as: `> 48h` (100%), `24h - 48h` (50%), and `< 24h` (0%).
   - We explicitly treat both the 24-hour and 48-hour marks as inclusive of the 50% tier (`24 <= noticeHours <= 48 -> 50%`).
   - Notice calculation is performed by a pure function `calculateRefund(appointmentDatetime, now, fee)` using integer cents to eliminate floating-point rounding discrepancies.

4. **HTTP Status Code Mapping:**
   - `400 Bad Request`: Malformed or syntactically invalid input (invalid types, non-numeric IDs, invalid email format, invalid date string).
   - `404 Not Found`: Target patient, doctor, or appointment ID does not exist in the database.
   - `409 Conflict`: Request conflicts with current database state (slot already booked, duplicate patient email, appointment already cancelled, or deleting an entity with existing appointment history). On a booked slot, the response includes `waitlistAvailable: true`.
   - `422 Unprocessable Entity`: Well-formed request violates domain business rules (e.g. attempting to book in the past, outside operating hours 09:00–16:30, or when the doctor has reached the 12-slot daily cap). The response offers `waitlistAvailable: true`.
   - `201 Created`: Resource successfully created.
   - `200 OK`: Successful retrieval, update, or cancellation.

### Part D — Non-Blocking Audit Logging

- Every booking, cancellation, waitlist promotion, and notification event is logged to `logs/audit.log` as a single line containing a valid JSON object (`{ event, appointmentId, timestamp, details }`).
- Implemented using Node's non-blocking `fs.promises.appendFile`. No synchronous methods (`*Sync`) are ever used inside request handlers.
- The logger automatically ensures `logs/` directory creation on first invocation.
- All logging operations are wrapped in safe error handling: **a logging failure (e.g. disk full or unwritable permissions) is caught and logged to stderr but never crashes or fails the user's HTTP request**.

### Part E — Redis Queues, Worker Architecture, and Promotion Safety

1. **Plain Redis Lists vs. Frameworks:**
   - We utilize `ioredis` with native Redis commands (`RPUSH`, `LMOVE`, `LREM`, `LPUSH`, `BRPOP`) instead of heavy abstractions like BullMQ. Native lists offer complete transparency, zero hidden Redis keys, and easy explainability.

2. **Waitlist Segregation:**
   - Waitlists are keyed by doctor and date: `waitlist:{doctorId}:{date}`. When a slot is freed, only patients waiting for that specific doctor on that specific date are examined.

3. **Promotion Safety with `LMOVE`:**
   - To guarantee that a patient is never lost between the queue and the database, the worker uses `LMOVE waitlist:{doctorId}:{date} waitlist:processing LEFT RIGHT`.
   - This atomically transfers the candidate from the waitlist into a processing list.
   - If `createBooking` succeeds, the entry is removed from processing via `LREM`.
   - If `createBooking` fails (e.g. doctor daily cap hit or race condition), attempts are incremented:
     - If `attempts < 3`: the patient is re-queued to the **front** of the waitlist (`LPUSH`) and removed from processing.
     - If `attempts >= 3`: the poison entry is logged as `promotion_dropped` and purged from processing.
   - This guarantees that a candidate is always present in at least one Redis list during the transition.

4. **Separate Worker Process:**
   - The worker runs as a dedicated process (`npm run worker`), completely decoupled from the Express web server.
   - The web server signals cancellations by pushing to `jobs:slot-freed`. If Redis is temporarily down, the database transaction is unaffected.

---

## 7. Internationalization (i18n & l10n) — Course Feedback Page

- Located at `GET /feedback`.
- Supports English (`en`) and Kinyarwanda (`rw`) via query parameter `?lang=en|rw`.
- Any missing or unsupported `lang` parameter (e.g. `?lang=fr` or `?lang=unknown`) gracefully falls back to English (`en`) without errors.
- Today's date is dynamically localized using `Intl.DateTimeFormat(lang, { dateStyle: 'full' })` (e.g., rendering `2026 Ugushyingo 23, Kuwa mbere` in Kinyarwanda).
- All visible UI strings are loaded asynchronously from `locales/en.json` and `locales/rw.json`. No user-facing text is hardcoded in the HTML template.

---

## 8. Known Limitations

- **No Authentication / Authorization Layer**: In accordance with the project specification scope, endpoints do not require bearer tokens or user logins. Any client possessing an `appointment_id` may cancel the appointment. In production, this would be protected by JWT-based role authentication (e.g. patient self-service or clinic staff role).
