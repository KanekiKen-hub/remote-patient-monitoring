/**
 * src/middleware/roleMiddleware.js
 * Role-based access control middleware.
 * Used after protect() to restrict endpoints to specific roles.
 */
const AppError = require('../utils/AppError');

/**
 * restrictTo — Factory that returns middleware allowing only the specified roles.
 *
 * Usage: router.get('/admin', protect, restrictTo('admin'), handler)
 *
 * @param {...string} roles - Allowed role strings ('admin', 'doctor', 'patient')
 * @returns {Function} Express middleware
 */
const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      // Should never happen if protect() ran first, but guard defensively
      return next(new AppError('Not authenticated.', 401));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        new AppError(
          `Access denied. This action requires one of the following roles: ${roles.join(', ')}.`,
          403
        )
      );
    }

    next();
  };
};

module.exports = { restrictTo };
