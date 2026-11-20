const appointmentModel = require('../models/appointmentModel');
const { validateSlot } = require('../services/slotValidator');
const { AppError } = require('../middleware/errorHandler');
const {
  validatePositiveIntegerId,
  validateRequiredString
} = require('../middleware/validate');

/**
 * POST /api/appointments - Book a new appointment
 */
async function bookAppointment(req, res, next) {
  try {
    const patientId = validatePositiveIntegerId(
      req.body.patient_id !== undefined ? req.body.patient_id : req.body.patientId,
      'Patient ID'
    );
    const doctorId = validatePositiveIntegerId(
      req.body.doctor_id !== undefined ? req.body.doctor_id : req.body.doctorId,
      'Doctor ID'
    );
    const datetime = validateRequiredString(
      req.body.appointment_datetime || req.body.datetime,
      'Appointment datetime',
      30
    );

    // Validate slot rules (hours, 30-min alignment, future only)
    const now = new Date().toISOString();
    const slotValidation = validateSlot(datetime, now);

    if (!slotValidation.valid) {
      if (
        slotValidation.reason.includes('Malformed') ||
        slotValidation.reason.includes('Invalid')
      ) {
        throw new AppError(400, slotValidation.reason);
      }
      throw new AppError(422, slotValidation.reason);
    }

    const appointment = await appointmentModel.createBooking({
      patientId,
      doctorId,
      datetime
    });

    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  bookAppointment
};
