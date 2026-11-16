const Redis = require('ioredis');
require('dotenv').config();

/**
 * Redis Client Instance
 * Lightweight client connection using native Redis commands.
 */
const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: Number(process.env.REDIS_PORT) || 6379,
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  lazyConnect: true
});

redis.on('error', (err) => {
  console.error('[Redis Client Error]', err.message);
});

module.exports = redis;
