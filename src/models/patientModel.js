const pool = require('../config/db');

/**
 * Patient Model - All patient-related SQL queries
 */

async function getAllPatients() {
  const [rows] = await pool.query(
    'SELECT patient_id, full_name, email, phone, created_at FROM patients ORDER BY patient_id ASC'
  );
  return rows;
}

async function getPatientById(patientId) {
  const [rows] = await pool.query(
    'SELECT patient_id, full_name, email, phone, created_at FROM patients WHERE patient_id = ?',
    [patientId]
  );
  return rows[0] || null;
}

async function createPatient({ fullName, email, phone }) {
  const [result] = await pool.query(
    'INSERT INTO patients (full_name, email, phone) VALUES (?, ?, ?)',
    [fullName, email, phone]
  );
  return getPatientById(result.insertId);
}

async function updatePatient(patientId, { fullName, email, phone }) {
  await pool.query(
    'UPDATE patients SET full_name = ?, email = ?, phone = ? WHERE patient_id = ?',
    [fullName, email, phone, patientId]
  );
  return getPatientById(patientId);
}

async function countPatientAppointments(patientId) {
  const [rows] = await pool.query(
    'SELECT COUNT(*) AS count FROM appointments WHERE patient_id = ?',
    [patientId]
  );
  return rows[0].count;
}

async function deletePatient(patientId) {
  const [result] = await pool.query(
    'DELETE FROM patients WHERE patient_id = ?',
    [patientId]
  );
  return result.affectedRows > 0;
}

module.exports = {
  getAllPatients,
  getPatientById,
  createPatient,
  updatePatient,
  countPatientAppointments,
  deletePatient
};
