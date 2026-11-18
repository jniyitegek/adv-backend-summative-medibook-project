const { AppError } = require('./errorHandler');

/**
 * Validates that an ID parameter is a positive integer
 */
function validatePositiveIntegerId(id, fieldName = 'ID') {
  const parsed = Number(id);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new AppError(400, `${fieldName} must be a positive integer`);
  }
  return parsed;
}

/**
 * Validates that a field is a non-empty string
 */
function validateRequiredString(val, fieldName, maxLen = 255) {
  if (val === undefined || val === null || typeof val !== 'string' || val.trim().length === 0) {
    throw new AppError(400, `${fieldName} is required and cannot be empty`);
  }
  const trimmed = val.trim();
  if (trimmed.length > maxLen) {
    throw new AppError(400, `${fieldName} exceeds maximum length of ${maxLen} characters`);
  }
  return trimmed;
}

/**
 * Validates an email address format
 */
function validateEmail(email) {
  const trimmed = validateRequiredString(email, 'Email', 255);
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(trimmed)) {
    throw new AppError(400, 'Invalid email format');
  }
  return trimmed.toLowerCase();
}

/**
 * Validates a phone number format
 */
function validatePhone(phone) {
  const trimmed = validateRequiredString(phone, 'Phone number', 20);
  const phoneRegex = /^[0-9+\-\s()]{7,20}$/;
  if (!phoneRegex.test(trimmed)) {
    throw new AppError(400, 'Invalid phone number format');
  }
  return trimmed;
}

/**
 * Validates a positive decimal / number
 */
function validatePositiveDecimal(val, fieldName = 'Amount') {
  if (val === undefined || val === null || val === '') {
    throw new AppError(400, `${fieldName} is required`);
  }
  const num = Number(val);
  if (isNaN(num) || num <= 0) {
    throw new AppError(400, `${fieldName} must be a positive number greater than 0`);
  }
  return num;
}

module.exports = {
  validatePositiveIntegerId,
  validateRequiredString,
  validateEmail,
  validatePhone,
  validatePositiveDecimal
};
