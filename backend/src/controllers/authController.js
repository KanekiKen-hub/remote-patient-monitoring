/**
 * src/controllers/authController.js
 * Handles login, current-user info, and admin user registration.
 */
const jwt = require('jsonwebtoken');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// Helper: sign a JWT for a given user id
// ---------------------------------------------------------------------------
const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '24h',
  });
};

/**
 * Helper: build the sanitized user payload returned to the client.
 * Includes patientId string when the user is a patient.
 */
const buildUserPayload = async (user) => {
  const payload = {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };

  if (user.role === 'patient' && user.patientRef) {
    const patient = await Patient.findById(user.patientRef).select('patientId').lean();
    if (patient) payload.patientId = patient.patientId;
  }

  return payload;
};

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
exports.login = catchAsync(async (req, res, next) => {
  // Validate input
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { email, password } = req.body;

  // Find user and explicitly select the hashed password
  const user = await User.findOne({ email }).select('+password');
  if (!user || !user.isActive) {
    return next(new AppError('Invalid email or password.', 401));
  }

  // Compare password
  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    return next(new AppError('Invalid email or password.', 401));
  }

  // Sign token and build response
  const token = signToken(user._id);
  const userPayload = await buildUserPayload(user);

  res.status(200).json({
    status: 'success',
    token,
    data: { user: userPayload },
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (protected)
// ---------------------------------------------------------------------------
exports.getMe = catchAsync(async (req, res, next) => {
  const userPayload = await buildUserPayload(req.user);

  res.status(200).json({
    status: 'success',
    data: { user: userPayload },
  });
});

// ---------------------------------------------------------------------------
// POST /api/auth/register  (admin only — creates admin or doctor accounts)
// Note: Patient accounts are created through POST /api/patients
// ---------------------------------------------------------------------------
exports.register = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password, role } = req.body;

  // Only admin and doctor roles can be created here
  if (role === 'patient') {
    return next(
      new AppError(
        'Patient accounts must be created via POST /api/patients.',
        400
      )
    );
  }

  // Check for duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  const newUser = await User.create({ name, email, password, role });

  res.status(201).json({
    status: 'success',
    data: {
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    },
  });
});
