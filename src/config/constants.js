/**
 * Application Constants
 * Consolidates business rules, operational limits, and settings
 * to eliminate magic numbers throughout the codebase.
 */

module.exports = {
  // Appointment slot configuration
  OPEN_HOUR: 9,              // 09:00 opening time
  CLOSE_HOUR: 17,            // 17:00 closing time
  SLOT_MINUTES: 30,          // Fixed 30-minute slot intervals
  LAST_SLOT_HOUR: 16,        // 16:30 is the last bookable slot start
  LAST_SLOT_MINUTE: 30,

  // Daily capacity cap per doctor
  DAILY_CAP: 12,

  // Busy days reporting threshold (80% of capacity = 9.6 appointments -> > 9)
  BUSY_THRESHOLD: 0.8,

  // Doctor upcoming stats lookahead in days
  STATS_DAYS: 7,

  // Refund policy tiers (evaluated in hours before appointment)
  REFUND_TIERS: {
    FULL: {
      MIN_NOTICE_HOURS: 48,  // Strictly > 48 hours notice
      PERCENT: 100
    },
    HALF: {
      MIN_NOTICE_HOURS: 24,  // Between 24 and 48 hours inclusive
      PERCENT: 50
    },
    NONE: {
      PERCENT: 0             // Under 24 hours notice
    }
  },

  // Redis queue names and keys
  REDIS_KEYS: {
    WAITLIST_PREFIX: 'waitlist',
    PROCESSING_QUEUE: 'waitlist:processing',
    SLOT_FREED_QUEUE: 'jobs:slot-freed',
    NOTIFICATIONS_QUEUE: 'jobs:notifications'
  },

  // Worker retry settings
  MAX_WORKER_RETRIES: 3,

  // i18n localization
  SUPPORTED_LANGS: ['en', 'rw'],
  DEFAULT_LANG: 'en'
};
