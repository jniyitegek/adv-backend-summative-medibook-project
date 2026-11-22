const statsModel = require('../models/statsModel');
const { validatePositiveIntegerId } = require('../middleware/validate');

/**
 * GET /api/doctors/:id/stats - Retrieve statistics for a specific doctor
 */
async function getDoctorStats(req, res, next) {
  try {
    const doctorId = validatePositiveIntegerId(req.params.id, 'Doctor ID');
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    const stats = await statsModel.getDoctorStats(doctorId, now);
    res.status(200).json({ stats });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/doctors - Retrieve clinic-wide doctors report
 */
async function getDoctorsReport(req, res, next) {
  try {
    const doctors = await statsModel.getDoctorsReport();
    res.status(200).json({ report: doctors });
  } catch (err) {
    next(err);
  }
}

/**
 * GET /api/reports/busy-days - Retrieve busy days report (> 80% capacity)
 */
async function getBusyDaysReport(req, res, next) {
  try {
    const busyDays = await statsModel.getBusyDays();
    res.status(200).json({ report: busyDays });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  getDoctorStats,
  getDoctorsReport,
  getBusyDaysReport
};
