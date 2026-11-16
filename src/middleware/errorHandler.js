/**
 * Custom Application Error class for domain and operational errors
 */
class AppError extends Error {
  constructor(status, message, data = null) {
    super(message);
    this.status = status;
    this.statusCode = status;
    this.data = data;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * 404 Route Not Found Middleware
 */
const notFoundHandler = (req, res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

/**
 * Central Error-Handling Middleware
 */
const errorHandler = (err, req, res, next) => {
  const statusCode = err.statusCode || err.status || 500;
  const message = err.message || 'Internal Server Error';

  const responseBody = {
    error: message
  };

  // Attach additional data if provided (e.g. waitlist availability on 409/422)
  if (err.data) {
    Object.assign(responseBody, err.data);
  }

  if (statusCode >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  res.status(statusCode).json(responseBody);
};

module.exports = {
  AppError,
  notFoundHandler,
  errorHandler
};
