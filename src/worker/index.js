require('dotenv').config();
const redis = require('../config/redis');
const pool = require('../config/db');
const { REDIS_KEYS, MAX_WORKER_RETRIES } = require('../config/constants');
const appointmentModel = require('../models/appointmentModel');
const { enqueueConfirmation } = require('../services/queues');
const { logEvent } = require('../services/auditLogger');

// Dedicated Redis connection for blocking BRPOP
const blockingRedis = redis.duplicate();

let isRunning = true;

/**
 * Handles slot-freed waitlist promotion job
 */
async function handleSlotFreedJob(jobData) {
  try {
    const { doctorId, datetime } = JSON.parse(jobData);
    const date = datetime.substring(0, 10);
    const waitlistKey = `${REDIS_KEYS.WAITLIST_PREFIX}:${doctorId}:${date}`;

    // Atomically move next waitlisted patient to processing queue (prevents loss)
    const rawEntry = await redis.lmove(
      waitlistKey,
      REDIS_KEYS.PROCESSING_QUEUE,
      'LEFT',
      'RIGHT'
    );

    if (!rawEntry) {
      console.log(`[Worker] No patients currently on waitlist for doctor ${doctorId} on ${date}`);
      return;
    }

    const entry = JSON.parse(rawEntry);
    console.log(`[Worker] Attempting promotion for patient ${entry.patientId} on slot ${datetime}`);

    try {
      const bookedAppt = await appointmentModel.createBooking({
        patientId: entry.patientId,
        doctorId,
        datetime: entry.datetime || datetime
      });

      // Promotion succeeded: remove from processing list, audit log, enqueue confirmation
      await redis.lrem(REDIS_KEYS.PROCESSING_QUEUE, 1, rawEntry);
      console.log(`[Worker] Promotion successful! Appointment ID: ${bookedAppt.appointment_id}`);

      await logEvent('waitlist_promoted', bookedAppt.appointment_id, {
        patientId: entry.patientId,
        doctorId,
        datetime: bookedAppt.appointment_datetime
      });

      await enqueueConfirmation({
        appointmentId: bookedAppt.appointment_id,
        patientId: entry.patientId,
        doctorId,
        datetime: bookedAppt.appointment_datetime
      });
    } catch (bookingErr) {
      console.error(`[Worker] Promotion booking attempt failed: ${bookingErr.message}`);

      // If slot conflict (409) or cap reached (422), check retry attempts
      entry.attempts = (entry.attempts || 0) + 1;

      if (entry.attempts < MAX_WORKER_RETRIES) {
        // Re-queue to FRONT of waitlist so patient maintains priority
        const reQueueData = JSON.stringify(entry);
        await redis.lpush(waitlistKey, reQueueData);
        await redis.lrem(REDIS_KEYS.PROCESSING_QUEUE, 1, rawEntry);
        console.log(`[Worker] Patient ${entry.patientId} requeued to front of waitlist (Attempt ${entry.attempts}/${MAX_WORKER_RETRIES})`);
      } else {
        // Exceeded retries: audit log dropped promotion and remove from processing list
        console.warn(`[Worker] Patient ${entry.patientId} exceeded max retries. Promotion dropped.`);
        await logEvent('promotion_dropped', null, {
          patientId: entry.patientId,
          doctorId,
          datetime,
          attempts: entry.attempts,
          error: bookingErr.message
        });
        await redis.lrem(REDIS_KEYS.PROCESSING_QUEUE, 1, rawEntry);
      }
    }
  } catch (err) {
    console.error('[Worker] Error processing slot-freed job:', err.message);
  }
}

/**
 * Handles confirmation notification job
 */
async function handleNotificationJob(jobData) {
  try {
    const notification = JSON.parse(jobData);
    console.log(`[Worker] Processing confirmation notification for appointment ${notification.appointmentId}`);

    await logEvent('confirmation', notification.appointmentId, {
      patientId: notification.patientId,
      doctorId: notification.doctorId,
      datetime: notification.datetime,
      status: 'confirmed_and_notified'
    });
  } catch (err) {
    console.error('[Worker] Error processing notification job:', err.message);
  }
}

/**
 * Main worker polling loop
 */
async function startWorker() {
  console.log('[Worker] MediBook background worker started. Listening for jobs...');

  while (isRunning) {
    try {
      // BRPOP blocks for up to 2 seconds across both queues
      const result = await blockingRedis.brpop(
        REDIS_KEYS.SLOT_FREED_QUEUE,
        REDIS_KEYS.NOTIFICATIONS_QUEUE,
        2
      );

      if (!result) {
        continue;
      }

      const [queueName, jobData] = result;

      if (queueName === REDIS_KEYS.SLOT_FREED_QUEUE) {
        await handleSlotFreedJob(jobData);
      } else if (queueName === REDIS_KEYS.NOTIFICATIONS_QUEUE) {
        await handleNotificationJob(jobData);
      }
    } catch (loopErr) {
      if (isRunning) {
        console.error('[Worker] Polling loop error:', loopErr.message);
        await new Promise((res) => setTimeout(res, 1000));
      }
    }
  }
}

// Graceful shutdown
async function shutdown() {
  console.log('\n[Worker] Gracefully shutting down worker process...');
  isRunning = false;
  try {
    await blockingRedis.quit();
    await redis.quit();
    await pool.end();
  } catch (err) {
    console.error('[Worker Shutdown Error]', err.message);
  }
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

startWorker().catch((err) => {
  console.error('[Worker Fatal Error]', err);
  process.exit(1);
});
