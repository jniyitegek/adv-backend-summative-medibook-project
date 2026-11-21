const appointmentModel = require('../models/appointmentModel');
const patientModel = require('../models/patientModel');
const doctorModel = require('../models/doctorModel');
const { validateSlot } = require('../services/slotValidator');
const { joinWaitlist, publishSlotFreed, enqueueConfirmation } = require('../services/queues');
const { logEvent } = require('../services/auditLogger');
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
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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

    // Enqueue confirmation notification job (swallowed if Redis is unavailable)
    try {
      await enqueueConfirmation({
        appointmentId: appointment.appointment_id,
        patientId: appointment.patient_id,
        doctorId: appointment.doctor_id,
        datetime: appointment.appointment_datetime
      });
    } catch (queueErr) {
      console.error('[Queue Error] Failed to enqueue confirmation job:', queueErr.message);
    }

    // Append to audit log
    try {
      await logEvent('booking_created', appointment.appointment_id, {
        doctorId: appointment.doctor_id,
        patientId: appointment.patient_id,
        datetime: appointment.appointment_datetime,
        amountPaid: appointment.amount_paid
      });
    } catch (auditErr) {
      console.error('[Audit Log Error]', auditErr.message);
    }

    res.status(201).json({ appointment });
  } catch (err) {
    next(err);
  }
}

/**
 * DELETE /api/appointments/:id - Cancel an appointment and calculate refund
 */
async function cancelAppointment(req, res, next) {
  try {
    const appointmentId = validatePositiveIntegerId(req.params.id, 'Appointment ID');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const result = await appointmentModel.cancelAppointment(appointmentId, now);

    // Publish slot-freed job for waitlist promotion (swallowed if Redis fails)
    try {
      await publishSlotFreed({
        doctorId: result.doctorId,
        datetime: result.datetime
      });
    } catch (queueErr) {
      console.error('[Queue Error] Failed to publish slot-freed job:', queueErr.message);
    }

    // Append to audit log
    try {
      await logEvent('booking_cancelled', result.appointmentId, {
        doctorId: result.doctorId,
        patientId: result.patientId,
        datetime: result.datetime,
        refundPercent: result.refundPercent,
        refundAmount: result.refundAmount
      });
    } catch (auditErr) {
      console.error('[Audit Log Error]', auditErr.message);
    }

    res.status(200).json({
      message: 'Appointment cancelled successfully',
      appointmentId: result.appointmentId,
      refundPercent: result.refundPercent,
      refundAmount: result.refundAmount
    });
  } catch (err) {
    next(err);
  }
}

/**
 * POST /api/appointments/waitlist - Join waitlist for a specific doctor slot/day
 */
async function joinWaitlistHandler(req, res, next) {
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

    // Verify patient exists
    const patient = await patientModel.getPatientById(patientId);
    if (!patient) {
      throw new AppError(404, `Patient with ID ${patientId} not found`);
    }

    // Verify doctor exists
    const doctor = await doctorModel.getDoctorById(doctorId);
    if (!doctor) {
      throw new AppError(404, `Doctor with ID ${doctorId} not found`);
    }

    // Validate slot format and constraints
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
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

    const queuePosition = await joinWaitlist({ patientId, doctorId, datetime });

    res.status(201).json({
      message: 'Added to waitlist successfully',
      doctorId,
      patientId,
      datetime,
      queuePosition
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  bookAppointment,
  cancelAppointment,
  joinWaitlist: joinWaitlistHandler
};
