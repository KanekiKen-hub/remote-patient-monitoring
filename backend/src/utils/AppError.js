/**
 * src/utils/AppError.js
 * Custom operational error class for the RPM API.
 * Distinguishes between programmer errors and expected operational errors.
 */
class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   */
  constructor(message, statusCode) {
    super(message);

    this.statusCode = statusCode;
    // 4xx → 'fail', 5xx → 'error'
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';
    // Operational errors are expected; programming errors are not
    this.isOperational = true;

    // Capture the stack trace, excluding the constructor call itself
    Error.captureStackTrace(this, this.constructor);
  }
}

module.exports = AppError;
