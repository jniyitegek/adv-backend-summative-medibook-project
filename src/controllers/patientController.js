const patientModel = require('../models/patientModel');
const { AppError } = require('../middleware/errorHandler');
const {
  validatePositiveIntegerId,
  validateRequiredString,
  validateEmail,
  validatePhone
} = require('../middleware/validate');

/**
 * GET /api/patients - Get all patients
 */
async function getPatients(req, res, next) {
  try {
    const patients = await patientModel.getAllPatients();
    res.status(200).json({ patients });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/patients/:id - Get patient by ID
 */
async function getPatientById(req, res, next) {
  try {
    const patientId = validatePositiveIntegerId(req.params.id, 'Patient ID');
    const patient = await patientModel.getPatientById(patientId);

    if (!patient) {
      throw new AppError(404, `Patient with ID ${patientId} not found`);
    }

    res.status(200).json({ patient });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/patients - Create a new patient
 */
async function createPatient(req, res, next) {
  try {
    const fullName = validateRequiredString(req.body.full_name || req.body.fullName, 'Full name', 100);
    const email = validateEmail(req.body.email);
    const phone = validatePhone(req.body.phone);

    try {
      const patient = await patientModel.createPatient({ fullName, email, phone });
      res.status(201).json({ patient });
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY' || (dbErr.message && dbErr.message.includes('Duplicate entry'))) {
        throw new AppError(409, 'A patient with this email already exists');
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/patients/:id - Update an existing patient
 */
async function updatePatient(req, res, next) {
  try {
    const patientId = validatePositiveIntegerId(req.params.id, 'Patient ID');
    const existing = await patientModel.getPatientById(patientId);

    if (!existing) {
      throw new AppError(404, `Patient with ID ${patientId} not found`);
    }

    const fullName = validateRequiredString(
      req.body.full_name !== undefined ? req.body.full_name : (req.body.fullName !== undefined ? req.body.fullName : existing.full_name),
      'Full name',
      100
    );
    const email = validateEmail(req.body.email !== undefined ? req.body.email : existing.email);
    const phone = validatePhone(req.body.phone !== undefined ? req.body.phone : existing.phone);

    try {
      const updated = await patientModel.updatePatient(patientId, { fullName, email, phone });
      res.status(200).json({ patient: updated });
    } catch (dbErr) {
      if (dbErr.code === 'ER_DUP_ENTRY' || (dbErr.message && dbErr.message.includes('Duplicate entry'))) {
        throw new AppError(409, 'A patient with this email already exists');
      }
      throw dbErr;
    }
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/patients/:id - Delete a patient
 */
async function deletePatient(req, res, next) {
  try {
    const patientId = validatePositiveIntegerId(req.params.id, 'Patient ID');
    const existing = await patientModel.getPatientById(patientId);

    if (!existing) {
      throw new AppError(404, `Patient with ID ${patientId} not found`);
    }

    const apptCount = await patientModel.countPatientAppointments(patientId);
    if (apptCount > 0) {
      throw new AppError(409, 'Cannot delete patient with existing appointment history');
    }

    await patientModel.deletePatient(patientId);
    res.status(200).json({ message: 'Patient deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getPatients,
  getPatientById,
  createPatient,
  updatePatient,
  deletePatient
};
