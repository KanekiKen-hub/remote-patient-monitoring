/**
 * src/middleware/deviceAuthMiddleware.js
 * IoT device authentication middleware.
 * Used exclusively on the POST /api/iot/readings endpoint.
 *
 * Protocol:
 *   - Authorization header: Bearer <rawDeviceToken>
 *   - Request body must include: deviceId (e.g. "DEV_001")
 *
 * On success, attaches req.device (Device document) for use in the controller.
 */
const Device = require('../models/Device');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * deviceAuth — Validates the device's bearer token against the stored bcrypt hash.
 */
const deviceAuth = catchAsync(async (req, res, next) => {
  // 1. Extract raw token from Authorization header, x-device-token, or body
  let rawToken;
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    rawToken = authHeader.split(' ')[1];
  } else if (req.headers['x-device-token']) {
    rawToken = req.headers['x-device-token'];
  } else if (req.body.deviceToken) {
    rawToken = req.body.deviceToken;
  }

  if (!rawToken) {
    return next(new AppError('Device authentication token is required.', 401));
  }

  // 2. Extract deviceId from request body
  const { deviceId } = req.body;
  if (!deviceId) {
    return next(new AppError('deviceId is required in the request body.', 400));
  }

  // 3. Find the device — explicitly select the hashed token (normally excluded)
  const device = await Device.findOne({ deviceId }).select('+deviceToken');
  if (!device) {
    return next(new AppError('Device not found or invalid credentials.', 401));
  }

  // 4. Verify the raw token against the stored hash
  const isValid = await device.verifyToken(rawToken);
  if (!isValid) {
    return next(new AppError('Invalid device token.', 401));
  }

  // 5. Ensure the device is active
  if (device.status === 'inactive') {
    return next(new AppError('This device has been deactivated.', 403));
  }

  // 6. Attach the device document to the request
  req.device = device;
  next();
});

module.exports = { deviceAuth };
