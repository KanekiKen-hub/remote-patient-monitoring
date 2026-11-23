/**
 * src/utils/catchAsync.js
 * Wraps async route handlers to forward errors to Express's next() automatically.
 * Eliminates repetitive try/catch boilerplate in controllers.
 *
 * @param {Function} fn - An async Express route handler
 * @returns {Function} Express middleware that catches promise rejections
 */
const catchAsync = (fn) => {
  return (req, res, next) => {
    fn(req, res, next).catch(next);
  };
};

module.exports = catchAsync;
