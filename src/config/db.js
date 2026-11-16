const mysql = require('mysql2/promise');
require('dotenv').config();

/**
 * MySQL Connection Pool
 * Configured with dateStrings: true to prevent automatic JavaScript Date conversion,
 * preserving consistent ISO datetime string representations across UTC.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || '127.0.0.1',
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'changeme',
  database: process.env.DB_NAME || 'medibook',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  dateStrings: true,
  timezone: 'Z'
});

module.exports = pool;
