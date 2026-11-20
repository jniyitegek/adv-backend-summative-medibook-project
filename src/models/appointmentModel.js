const pool = require('../config/db');
const { DAILY_CAP } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Appointment Model
 * All SQL interactions for appointments live strictly in this file.
 */

/**
 * Creates an appointment booking in a single ACID transaction
 * with row-level locking on the doctor to serialize concurrent bookings.
 */
async function createBooking({ patientId, doctorId, datetime }) {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Lock doctor row with SELECT ... FOR UPDATE to serialize concurrent bookings for this doctor
    const [doctors] = await connection.query(
      'SELECT doctor_id, full_name, consultation_fee FROM doctors WHERE doctor_id = ? FOR UPDATE',
      [doctorId]
    );
    if (doctors.length === 0) {
      throw new AppError(404, `Doctor with ID ${doctorId} not found`);
    }
    const doctor = doctors[0];

    // 2. Confirm patient exists
    const [patients] = await connection.query(
      'SELECT patient_id, full_name FROM patients WHERE patient_id = ?',
      [patientId]
    );
    if (patients.length === 0) {
      throw new AppError(404, `Patient with ID ${patientId} not found`);
    }

    // 3. Count booked rows for this doctor on the requested date
    const targetDate = datetime.substring(0, 10);
    const [countRows] = await connection.query(
      'SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ? AND DATE(appointment_datetime) = ? AND status = ?',
      [doctorId, targetDate, 'booked']
    );

    const bookedCount = countRows[0].count;
    if (bookedCount >= DAILY_CAP) {
      throw new AppError(
        422,
        `Doctor ${doctor.full_name} has reached the maximum daily limit of ${DAILY_CAP} appointments for ${targetDate}`,
        {
          waitlistAvailable: true,
          doctorId: Number(doctorId),
          datetime
        }
      );
    }

    // 4. Insert appointment copying the doctor's current consultation fee
    const [insertResult] = await connection.query(
      'INSERT INTO appointments (patient_id, doctor_id, appointment_datetime, status, amount_paid) VALUES (?, ?, ?, ?, ?)',
      [patientId, doctorId, datetime, 'booked', doctor.consultation_fee]
    );

    const [newApptRows] = await connection.query(
      'SELECT appointment_id, patient_id, doctor_id, appointment_datetime, status, amount_paid, booked_on FROM appointments WHERE appointment_id = ?',
      [insertResult.insertId]
    );

    await connection.commit();
    return newApptRows[0];
  } catch (err) {
    await connection.rollback();

    // Catch unique constraint collision on uq_doctor_active_slot
    if (
      err.code === 'ER_DUP_ENTRY' ||
      (err.message && err.message.includes('uq_doctor_active_slot'))
    ) {
      throw new AppError(
        409,
        `Slot at ${datetime} is already booked for this doctor`,
        {
          waitlistAvailable: true,
          doctorId: Number(doctorId),
          datetime
        }
      );
    }

    throw err;
  } finally {
    connection.release();
  }
}

async function getAppointmentById(appointmentId) {
  const [rows] = await pool.query(
    'SELECT appointment_id, patient_id, doctor_id, appointment_datetime, status, amount_paid, booked_on, cancelled_at FROM appointments WHERE appointment_id = ?',
    [appointmentId]
  );
  return rows[0] || null;
}

module.exports = {
  createBooking,
  getAppointmentById
};
