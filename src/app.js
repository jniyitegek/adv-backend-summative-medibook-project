const express = require('express');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const patientRoutes = require('./routes/patientRoutes');

const app = express();

// Core middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Liveness probe
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  });
});

// Mount routes
app.use('/api/patients', patientRoutes);

// 404 Fallback
app.use(notFoundHandler);

// Central error handler
app.use(errorHandler);

module.exports = app;
