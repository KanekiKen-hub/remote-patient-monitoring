/**
 * src/middleware/authMiddleware.js
 * JWT authentication middleware.
 * Reads the Bearer token from the Authorization header,
 * verifies it, loads the user from DB, and attaches to req.user.
 */
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * protect — Middleware that requires a valid JWT.
 * Rejects with 401 if the token is missing, malformed, or expired.
 */
const protect = catchAsync(async (req, res, next) => {
  // 1. Read and validate the Authorization header
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(
      new AppError('No authentication token provided. Please log in.', 401)
    );
  }

  const token = authHeader.split(' ')[1];

  // 2. Verify the token signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return next(new AppError('Your session has expired. Please log in again.', 401));
    }
    return next(new AppError('Invalid authentication token.', 401));
  }

  // 3. Check the user still exists and is active
  const currentUser = await User.findById(decoded.id);
  if (!currentUser) {
    return next(new AppError('The user associated with this token no longer exists.', 401));
  }
  if (!currentUser.isActive) {
    return next(new AppError('This account has been deactivated. Contact an administrator.', 401));
  }

  // 4. Attach user to the request object
  req.user = currentUser;
  next();
});

module.exports = { protect };
