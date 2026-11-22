const pool = require('../config/db');
const { DAILY_CAP, STATS_DAYS, BUSY_THRESHOLD } = require('../config/constants');
const { AppError } = require('../middleware/errorHandler');

/**
 * Statistics and Reports Model
 * All aggregation, CTE date generation, join calculations, and threshold filtering
 * are performed strictly within MySQL SQL queries (never raw-fetched into JavaScript).
 */

/**
 * Retrieves comprehensive statistics for a given doctor:
 * - Net revenue (SUM(amount_paid) - COALESCE(SUM(refund_amount), 0))
 * - Upcoming booked count (status 'booked' and datetime > now)
 * - 7-day daily breakdown using recursive CTE (empty days show 0 booked)
 * - Utilization percentage per day and overall 7-day figure
 */
async function getDoctorStats(doctorId, now) {
  // 1. Verify doctor exists
  const [docRows] = await pool.query(
    'SELECT doctor_id, full_name, specialty, consultation_fee, room FROM doctors WHERE doctor_id = ?',
    [doctorId]
  );

  if (docRows.length === 0) {
    throw new AppError(404, `Doctor with ID ${doctorId} not found`);
  }

  const doctor = docRows[0];

  // 2. Compute net revenue and upcoming booked count entirely in SQL
  const [metricRows] = await pool.query(
    `SELECT
       ROUND(COALESCE(SUM(a.amount_paid), 0) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_revenue,
       COUNT(CASE WHEN a.appointment_datetime > ? AND a.status = 'booked' THEN 1 END) AS upcoming_booked_count
     FROM doctors d
     LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
     LEFT JOIN refunds r ON a.appointment_id = r.appointment_id
     WHERE d.doctor_id = ?`,
    [now, doctorId]
  );

  const metrics = metricRows[0];

  // 3. Compute 7-day daily breakdown with recursive CTE and daily utilization % entirely in SQL
  const startDate = now.substring(0, 10);
  const [dailyBreakdown] = await pool.query(
    `WITH RECURSIVE next_7_days AS (
       SELECT DATE(?) AS day_date, 1 AS day_num
       UNION ALL
       SELECT DATE_ADD(day_date, INTERVAL 1 DAY), day_num + 1
       FROM next_7_days
       WHERE day_num < ?
     )
     SELECT
       d.day_date AS date,
       COUNT(a.appointment_id) AS booked_count,
       ROUND((COUNT(a.appointment_id) / ?) * 100, 2) AS utilization_percent
     FROM next_7_days d
     LEFT JOIN appointments a ON a.doctor_id = ?
       AND a.status = 'booked'
       AND DATE(a.appointment_datetime) = d.day_date
     GROUP BY d.day_date
     ORDER BY d.day_date ASC`,
    [startDate, STATS_DAYS, DAILY_CAP, doctorId]
  );

  // 4. Compute overall 7-day utilization % entirely in SQL
  const [overallRows] = await pool.query(
    `WITH RECURSIVE next_7_days AS (
       SELECT DATE(?) AS day_date, 1 AS day_num
       UNION ALL
       SELECT DATE_ADD(day_date, INTERVAL 1 DAY), day_num + 1
       FROM next_7_days
       WHERE day_num < ?
     )
     SELECT
       COUNT(a.appointment_id) AS total_7_day_booked,
       ROUND((COUNT(a.appointment_id) / (? * ?)) * 100, 2) AS overall_utilization_percent
     FROM next_7_days d
     LEFT JOIN appointments a ON a.doctor_id = ?
       AND a.status = 'booked'
       AND DATE(a.appointment_datetime) = d.day_date`,
    [startDate, STATS_DAYS, DAILY_CAP, STATS_DAYS, doctorId]
  );

  const overall = overallRows[0];

  return {
    doctorId: doctor.doctor_id,
    doctorName: doctor.full_name,
    specialty: doctor.specialty,
    consultationFee: doctor.consultation_fee,
    room: doctor.room,
    netRevenue: Number(metrics.net_revenue),
    upcomingBookedCount: Number(metrics.upcoming_booked_count),
    sevenDayStats: {
      totalBooked: Number(overall.total_7_day_booked),
      overallUtilizationPercent: Number(overall.overall_utilization_percent),
      daily: dailyBreakdown.map((row) => ({
        date: row.date,
        bookedCount: Number(row.booked_count),
        utilizationPercent: Number(row.utilization_percent)
      }))
    }
  };
}

/**
 * Generates clinic-wide report of all doctors, including doctors with zero appointments.
 * Note on total_appointments: Counts all historical appointments associated with the doctor.
 * Active booked and cancelled counts are also reported via conditional SQL aggregation.
 */
async function getDoctorsReport() {
  const [rows] = await pool.query(
    `SELECT
       d.doctor_id,
       d.full_name AS doctor_name,
       d.specialty,
       d.consultation_fee,
       d.room,
       -- Total appointments counts all historical bookings (both booked and cancelled)
       COUNT(a.appointment_id) AS total_appointments,
       COUNT(CASE WHEN a.status = 'booked' THEN 1 END) AS booked_appointments,
       COUNT(CASE WHEN a.status = 'cancelled' THEN 1 END) AS cancelled_appointments,
       -- Net revenue = total fees paid minus refunds issued (zero-appointment doctors return 0.00 via COALESCE)
       ROUND(COALESCE(SUM(a.amount_paid), 0) - COALESCE(SUM(r.refund_amount), 0), 2) AS net_revenue
     FROM doctors d
     LEFT JOIN appointments a ON d.doctor_id = a.doctor_id
     LEFT JOIN refunds r ON a.appointment_id = r.appointment_id
     GROUP BY d.doctor_id, d.full_name, d.specialty, d.consultation_fee, d.room
     ORDER BY d.doctor_id ASC`
  );

  return rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    consultationFee: row.consultation_fee,
    room: row.room,
    totalAppointments: Number(row.total_appointments),
    bookedAppointments: Number(row.booked_appointments),
    cancelledAppointments: Number(row.cancelled_appointments),
    netRevenue: Number(row.net_revenue)
  }));
}

/**
 * Generates report of all (doctor, date) combinations where booked appointments
 * exceed the specified threshold percentage of daily capacity (> 80% of 12 = > 9.6).
 */
async function getBusyDays(cap = DAILY_CAP, threshold = BUSY_THRESHOLD) {
  const [rows] = await pool.query(
    `SELECT
       d.doctor_id,
       d.full_name AS doctor_name,
       d.specialty,
       DATE(a.appointment_datetime) AS date,
       COUNT(*) AS booked_count,
       ROUND((COUNT(*) / ?) * 100, 2) AS utilization_percent
     FROM appointments a
     JOIN doctors d ON a.doctor_id = d.doctor_id
     WHERE a.status = 'booked'
     GROUP BY d.doctor_id, d.full_name, d.specialty, DATE(a.appointment_datetime)
     HAVING COUNT(*) > (? * ?)
     ORDER BY date ASC, booked_count DESC`,
    [cap, cap, threshold]
  );

  return rows.map((row) => ({
    doctorId: row.doctor_id,
    doctorName: row.doctor_name,
    specialty: row.specialty,
    date: row.date,
    bookedCount: Number(row.booked_count),
    utilizationPercent: Number(row.utilization_percent)
  }));
}

module.exports = {
  getDoctorStats,
  getDoctorsReport,
  getBusyDays
};
