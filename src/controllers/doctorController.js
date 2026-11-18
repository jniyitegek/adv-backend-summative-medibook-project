const doctorModel = require('../models/doctorModel');
const { AppError } = require('../middleware/errorHandler');
const {
  validatePositiveIntegerId,
  validateRequiredString,
  validatePositiveDecimal
} = require('../middleware/validate');

/**
 * GET /api/doctors - Retrieve all doctors
 */
async function getDoctors(req, res, next) {
  try {
    const doctors = await doctorModel.getAllDoctors();
    res.status(200).json({ doctors });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/doctors/:id - Retrieve doctor by ID
 */
async function getDoctorById(req, res, next) {
  try {
    const doctorId = validatePositiveIntegerId(req.params.id, 'Doctor ID');
    const doctor = await doctorModel.getDoctorById(doctorId);

    if (!doctor) {
      throw new AppError(404, `Doctor with ID ${doctorId} not found`);
    }

    res.status(200).json({ doctor });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/doctors - Create a new doctor
 */
async function createDoctor(req, res, next) {
  try {
    const fullName = validateRequiredString(
      req.body.full_name || req.body.fullName,
      'Full name',
      100
    );
    const specialty = validateRequiredString(req.body.specialty, 'Specialty', 100);
    const consultationFee = validatePositiveDecimal(
      req.body.consultation_fee !== undefined ? req.body.consultation_fee : req.body.consultationFee,
      'Consultation fee'
    );
    const room = validateRequiredString(req.body.room, 'Room', 10);

    const doctor = await doctorModel.createDoctor({
      fullName,
      specialty,
      consultationFee,
      room
    });

    res.status(201).json({ doctor });
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /api/doctors/:id - Update an existing doctor
 */
async function updateDoctor(req, res, next) {
  try {
    const doctorId = validatePositiveIntegerId(req.params.id, 'Doctor ID');
    const existing = await doctorModel.getDoctorById(doctorId);

    if (!existing) {
      throw new AppError(404, `Doctor with ID ${doctorId} not found`);
    }

    const fullName = validateRequiredString(
      req.body.full_name !== undefined ? req.body.full_name : (req.body.fullName !== undefined ? req.body.fullName : existing.full_name),
      'Full name',
      100
    );
    const specialty = validateRequiredString(
      req.body.specialty !== undefined ? req.body.specialty : existing.specialty,
      'Specialty',
      100
    );
    const consultationFee = validatePositiveDecimal(
      req.body.consultation_fee !== undefined ? req.body.consultation_fee : (req.body.consultationFee !== undefined ? req.body.consultationFee : existing.consultation_fee),
      'Consultation fee'
    );
    const room = validateRequiredString(
      req.body.room !== undefined ? req.body.room : existing.room,
      'Room',
      10
    );

    const updated = await doctorModel.updateDoctor(doctorId, {
      fullName,
      specialty,
      consultationFee,
      room
    });

    res.status(200).json({ doctor: updated });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/doctors/:id - Delete a doctor
 */
async function deleteDoctor(req, res, next) {
  try {
    const doctorId = validatePositiveIntegerId(req.params.id, 'Doctor ID');
    const existing = await doctorModel.getDoctorById(doctorId);

    if (!existing) {
      throw new AppError(404, `Doctor with ID ${doctorId} not found`);
    }

    const apptCount = await doctorModel.countDoctorAppointments(doctorId);
    if (apptCount > 0) {
      throw new AppError(409, 'Cannot delete doctor with existing appointment history');
    }

    await doctorModel.deleteDoctor(doctorId);
    res.status(200).json({ message: 'Doctor deleted successfully' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDoctors,
  getDoctorById,
  createDoctor,
  updateDoctor,
  deleteDoctor
};
