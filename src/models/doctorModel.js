const pool = require('../config/db');

/**
 * Doctor Model - All doctor-related SQL queries
 */

async function getAllDoctors() {
  const [rows] = await pool.query(
    'SELECT doctor_id, full_name, specialty, consultation_fee, room FROM doctors ORDER BY doctor_id ASC'
  );
  return rows;
}

async function getDoctorById(doctorId) {
  const [rows] = await pool.query(
    'SELECT doctor_id, full_name, specialty, consultation_fee, room FROM doctors WHERE doctor_id = ?',
    [doctorId]
  );
  return rows[0] || null;
}

async function createDoctor({ fullName, specialty, consultationFee, room }) {
  const [result] = await pool.query(
    'INSERT INTO doctors (full_name, specialty, consultation_fee, room) VALUES (?, ?, ?, ?)',
    [fullName, specialty, consultationFee, room]
  );
  return getDoctorById(result.insertId);
}

async function updateDoctor(doctorId, { fullName, specialty, consultationFee, room }) {
  await pool.query(
    'UPDATE doctors SET full_name = ?, specialty = ?, consultation_fee = ?, room = ? WHERE doctor_id = ?',
    [fullName, specialty, consultationFee, room, doctorId]
  );
  return getDoctorById(doctorId);
}

async function countDoctorAppointments(doctorId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM appointments WHERE doctor_id = ?',
    [doctorId]
  );
  return rows[0].count;
}

async function deleteDoctor(doctorId) {
  const [result] = await pool.query(
    'DELETE FROM doctors WHERE doctor_id = ?',
    [doctorId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  countDoctorAppointments,
  deleteDoctor
};
