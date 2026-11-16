-- MediBook Clinic Appointment System
-- Database Schema Definition (MySQL 8.0+)
-- Character set: utf8mb4, Engine: InnoDB

CREATE DATABASE IF NOT EXISTS medibook
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE medibook;

-- ---------------------------------------------------------------------------
-- 1. PATIENTS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS patients (
  patient_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  -- Business Rule: Each patient must have a unique email address to prevent duplicate accounts
  email VARCHAR(255) NOT NULL UNIQUE,
  phone VARCHAR(20) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 2. DOCTORS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS doctors (
  doctor_id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(100) NOT NULL,
  specialty VARCHAR(100) NOT NULL,
  consultation_fee DECIMAL(10,2) NOT NULL,
  room VARCHAR(10) NOT NULL,
  -- Business Rule: Doctor consultation fee must be strictly positive (> 0)
  CONSTRAINT chk_consultation_fee CHECK (consultation_fee > 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 3. APPOINTMENTS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS appointments (
  appointment_id INT AUTO_INCREMENT PRIMARY KEY,
  patient_id INT NOT NULL,
  doctor_id INT NOT NULL,
  appointment_datetime DATETIME NOT NULL,
  status ENUM('booked', 'cancelled') NOT NULL DEFAULT 'booked',
  amount_paid DECIMAL(10,2) NOT NULL,
  booked_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  cancelled_at DATETIME NULL,
  -- Business Rule: Rebooking after cancellation:
  -- When status is 'booked', active_slot contains the appointment datetime.
  -- When status is 'cancelled', active_slot becomes NULL.
  -- In MySQL, multiple NULL values do not collide in a UNIQUE index.
  -- This frees the slot for another patient while preserving the historical cancelled record.
  active_slot DATETIME GENERATED ALWAYS AS (IF(status = 'booked', appointment_datetime, NULL)) STORED,

  -- Business Rule: Fee copied at booking time must be non-negative
  CONSTRAINT chk_amount_paid CHECK (amount_paid >= 0),

  -- Business Rule: Patients with appointments cannot be deleted (preserves clinic records)
  CONSTRAINT fk_appointment_patient FOREIGN KEY (patient_id)
    REFERENCES patients(patient_id)
    ON DELETE RESTRICT,

  -- Business Rule: Doctors with appointments cannot be deleted (preserves clinic records)
  CONSTRAINT fk_appointment_doctor FOREIGN KEY (doctor_id)
    REFERENCES doctors(doctor_id)
    ON DELETE RESTRICT,

  -- Business Rule: A doctor cannot have two active appointments at the same date and time
  CONSTRAINT uq_doctor_active_slot UNIQUE KEY (doctor_id, active_slot)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------------
-- 4. REFUNDS TABLE
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS refunds (
  refund_id INT AUTO_INCREMENT PRIMARY KEY,
  appointment_id INT NOT NULL UNIQUE,
  refund_percent TINYINT NOT NULL,
  refund_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Business Rule: One refund record per appointment; cannot delete appointment with refund
  CONSTRAINT fk_refund_appointment FOREIGN KEY (appointment_id)
    REFERENCES appointments(appointment_id)
    ON DELETE RESTRICT,

  -- Business Rule: Refund percentages must conform strictly to policy tiers: 0%, 50%, or 100%
  CONSTRAINT chk_refund_percent CHECK (refund_percent IN (0, 50, 100)),

  -- Business Rule: Refund amount must be non-negative
  CONSTRAINT chk_refund_amount CHECK (refund_amount >= 0)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
