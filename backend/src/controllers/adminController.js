/**
 * src/controllers/adminController.js
 * Admin-only endpoints for user management and system statistics.
 */
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Patient = require('../models/Patient');
const Device = require('../models/Device');
const HealthReading = require('../models/HealthReading');
const Alert = require('../models/Alert');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// GET /api/admin/users — list all users
// ---------------------------------------------------------------------------
exports.getAllUsers = catchAsync(async (req, res, next) => {
  const users = await User.find().sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: users.length,
    data: { users },
  });
});

// ---------------------------------------------------------------------------
// POST /api/admin/users — create a doctor account
// ---------------------------------------------------------------------------
exports.createUser = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password, role } = req.body;

  if (role === 'patient') {
    return next(new AppError('Use POST /api/patients to create patient accounts.', 400));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError('Email already in use.', 409));

  const user = await User.create({ name, email, password, role });

  res.status(201).json({
    status: 'success',
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id — update a user
// ---------------------------------------------------------------------------
exports.updateUser = catchAsync(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError('User not found.', 404));

  const allowedFields = ['name', 'email', 'role', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) user[field] = req.body[field];
  });

  // Update password separately if provided
  if (req.body.password) {
    user.password = req.body.password; // pre-save hook will hash
  }

  await user.save();

  res.status(200).json({
    status: 'success',
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/admin/users/:id/deactivate — soft-delete a user
// ---------------------------------------------------------------------------
exports.deactivateUser = catchAsync(async (req, res, next) => {
  const user = await User.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!user) return next(new AppError('User not found.', 404));

  res.status(200).json({
    status: 'success',
    message: `User ${user.email} deactivated.`,
    data: { user },
  });
});

// ---------------------------------------------------------------------------
// GET /api/admin/stats — system-wide statistics
// ---------------------------------------------------------------------------
exports.getStats = catchAsync(async (req, res, next) => {
  const [
    totalUsers,
    totalDoctors,
    totalPatients,
    totalDevices,
    totalReadings,
    totalAlerts,
    unreviewedAlerts,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'doctor' }),
    Patient.countDocuments(),
    Device.countDocuments(),
    HealthReading.countDocuments(),
    Alert.countDocuments(),
    Alert.countDocuments({ reviewed: false }),
  ]);

  res.status(200).json({
    status: 'success',
    data: {
      stats: {
        totalUsers,
        totalDoctors,
        totalPatients,
        totalDevices,
        totalReadings,
        totalAlerts,
        unreviewedAlerts,
      },
    },
  });
});
