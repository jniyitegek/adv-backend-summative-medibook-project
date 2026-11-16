-- MediBook Seed Data
-- Test data for development and grading verification
-- All appointment dates use FUTURE dates in December 2026

USE medibook;

-- ---------------------------------------------------------------------------
-- 1. SEED PATIENTS (4 patients)
-- ---------------------------------------------------------------------------
INSERT INTO patients (patient_id, full_name, email, phone, created_at) VALUES
  (1, 'Ama Mensah', 'ama@mail.com', '0244-111-222', '2026-11-01 08:00:00'),
  (2, 'Kojo Owusu', 'kojo@mail.com', '0555-333-444', '2026-11-01 08:30:00'),
  (3, 'Abena Osei', 'abena@mail.com', '0200-555-666', '2026-11-02 09:00:00'),
  (4, 'Kwame Asante', 'kwame@mail.com', '0277-888-999', '2026-11-02 09:30:00')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ---------------------------------------------------------------------------
-- 2. SEED DOCTORS (4 doctors: Dr. Nkrumah has 0 appointments)
-- ---------------------------------------------------------------------------
INSERT INTO doctors (doctor_id, full_name, specialty, consultation_fee, room) VALUES
  (1, 'Dr. Boateng', 'Dermatology', 150.00, 'R-12'),
  (2, 'Dr. Adjei', 'Paediatrics', 100.00, 'R-03'),
  (3, 'Dr. Mensah', 'General Medicine', 80.00, 'R-05'),
  (4, 'Dr. Nkrumah', 'Cardiology', 200.00, 'R-08')
ON DUPLICATE KEY UPDATE full_name=VALUES(full_name);

-- ---------------------------------------------------------------------------
-- 3. SEED APPOINTMENTS
-- ---------------------------------------------------------------------------
-- AP-001: Ama Mensah with Dr. Boateng (150.00)
-- AP-002: Kojo Owusu with Dr. Boateng (amount_paid=150.00)
-- AP-003: Ama Mensah with Dr. Adjei (100.00)
-- AP-004: Abena Osei with Dr. Adjei (cancelled with matching refund)
-- AP-005 to AP-015: 11 appointments on 2026-12-20 with Dr. Mensah (09:00 to 14:00, 11/12 = 91.7% > 80% cap)
INSERT INTO appointments (appointment_id, patient_id, doctor_id, appointment_datetime, status, amount_paid, booked_on, cancelled_at) VALUES
  (1, 1, 1, '2026-12-10 09:00:00', 'booked', 150.00, '2026-11-10 10:00:00', NULL),
  (2, 2, 1, '2026-12-10 09:30:00', 'booked', 150.00, '2026-11-10 10:30:00', NULL),
  (3, 1, 2, '2026-12-15 10:00:00', 'booked', 100.00, '2026-11-12 11:00:00', NULL),
  (4, 3, 2, '2026-12-18 11:00:00', 'cancelled', 100.00, '2026-11-15 09:00:00', '2026-11-20 09:00:00'),
  -- 11 booked appointments on 2026-12-20 for Dr. Mensah (Doctor 3)
  (5, 1, 3, '2026-12-20 09:00:00', 'booked', 80.00, '2026-11-15 08:00:00', NULL),
  (6, 2, 3, '2026-12-20 09:30:00', 'booked', 80.00, '2026-11-15 08:15:00', NULL),
  (7, 3, 3, '2026-12-20 10:00:00', 'booked', 80.00, '2026-11-15 08:30:00', NULL),
  (8, 4, 3, '2026-12-20 10:30:00', 'booked', 80.00, '2026-11-15 08:45:00', NULL),
  (9, 1, 3, '2026-12-20 11:00:00', 'booked', 80.00, '2026-11-15 09:00:00', NULL),
  (10, 2, 3, '2026-12-20 11:30:00', 'booked', 80.00, '2026-11-15 09:15:00', NULL),
  (11, 3, 3, '2026-12-20 12:00:00', 'booked', 80.00, '2026-11-15 09:30:00', NULL),
  (12, 4, 3, '2026-12-20 12:30:00', 'booked', 80.00, '2026-11-15 09:45:00', NULL),
  (13, 1, 3, '2026-12-20 13:00:00', 'booked', 80.00, '2026-11-15 10:00:00', NULL),
  (14, 2, 3, '2026-12-20 13:30:00', 'booked', 80.00, '2026-11-15 10:15:00', NULL),
  (15, 3, 3, '2026-12-20 14:00:00', 'booked', 80.00, '2026-11-15 10:30:00', NULL)
ON DUPLICATE KEY UPDATE status=VALUES(status);

-- ---------------------------------------------------------------------------
-- 4. SEED REFUNDS
-- ---------------------------------------------------------------------------
-- Refund for AP-004 cancelled more than 48 hours in advance (100% refund = 100.00)
INSERT INTO refunds (refund_id, appointment_id, refund_percent, refund_amount, created_at) VALUES
  (1, 4, 100, 100.00, '2026-11-20 09:00:00')
ON DUPLICATE KEY UPDATE refund_amount=VALUES(refund_amount);
