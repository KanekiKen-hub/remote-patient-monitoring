/**
 * src/controllers/deviceController.js
 * Device lifecycle management: creation, assignment, and status control.
 * Raw device tokens are shown ONLY once (at creation). All storage is hashed.
 */
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');
const Device = require('../models/Device');
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// POST /api/devices — provision a new device
// ---------------------------------------------------------------------------
exports.createDevice = catchAsync(async (req, res, next) => {
  // Generate unique deviceId (e.g. DEV_001)
  const deviceId = await Device.generateNextDeviceId();

  // Generate a cryptographically secure random token (32 bytes = 64 hex chars)
  const rawToken = crypto.randomBytes(32).toString('hex');

  // Hash the token for storage (cost 12)
  const hashedToken = await bcrypt.hash(rawToken, 12);

  const device = await Device.create({
    deviceId,
    deviceToken: hashedToken,
    status: 'unassigned',
  });

  // Return the raw token ONLY this one time
  res.status(201).json({
    status: 'success',
    message: 'Device created. Save the rawToken — it will NOT be shown again.',
    data: {
      deviceId: device.deviceId,
      rawToken, // Shown once for device provisioning
      status: device.status,
      _id: device._id,
    },
  });
});

// ---------------------------------------------------------------------------
// GET /api/devices — list devices
// ---------------------------------------------------------------------------
exports.getAllDevices = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.user.role === 'doctor') {
    filter.assignedDoctor = req.user._id;
  }

  const devices = await Device.find(filter)
    .populate('assignedPatient', 'patientId name')
    .populate('assignedDoctor', 'name email')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: devices.length,
    data: { devices },
  });
});

// ---------------------------------------------------------------------------
// GET /api/devices/:id — single device
// ---------------------------------------------------------------------------
exports.getDevice = catchAsync(async (req, res, next) => {
  const device = await Device.findById(req.params.id)
    .populate('assignedPatient', 'patientId name')
    .populate('assignedDoctor', 'name email');

  if (!device) {
    return next(new AppError('Device not found.', 404));
  }

  // Doctors may only view devices assigned to them
  if (
    req.user.role === 'doctor' &&
    device.assignedDoctor &&
    device.assignedDoctor._id.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Access denied.', 403));
  }

  res.status(200).json({
    status: 'success',
    data: { device },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/assign — link device to a patient
// Body: { patientId: 'P001' }
// ---------------------------------------------------------------------------
exports.assignDevice = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { patientId } = req.body;

  const device = await Device.findById(req.params.id);
  if (!device) return next(new AppError('Device not found.', 404));

  // Find patient by their string patientId (e.g. "P001")
  const patient = await Patient.findOne({ patientId });
  if (!patient) {
    return next(new AppError(`Patient with ID "${patientId}" not found.`, 404));
  }

  // Doctors may only assign to their own patients
  if (
    req.user.role === 'doctor' &&
    patient.assignedDoctor &&
    patient.assignedDoctor.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Access denied. Patient is not assigned to you.', 403));
  }

  // Update device
  device.assignedPatient = patient._id;
  device.assignedDoctor = patient.assignedDoctor || req.user._id;
  device.status = 'active';
  await device.save();

  // Update patient
  patient.assignedDevice = device._id;
  await patient.save();

  res.status(200).json({
    status: 'success',
    message: `Device ${device.deviceId} assigned to patient ${patientId}.`,
    data: { device },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/unassign — remove device from patient
// ---------------------------------------------------------------------------
exports.unassignDevice = catchAsync(async (req, res, next) => {
  const device = await Device.findById(req.params.id);
  if (!device) return next(new AppError('Device not found.', 404));

  // Clear the patient's device reference
  if (device.assignedPatient) {
    await Patient.findByIdAndUpdate(device.assignedPatient, {
      assignedDevice: null,
    });
  }

  device.assignedPatient = null;
  device.assignedDoctor = null;
  device.status = 'unassigned';
  await device.save();

  res.status(200).json({
    status: 'success',
    message: `Device ${device.deviceId} unassigned.`,
    data: { device },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/activate (admin)
// ---------------------------------------------------------------------------
exports.activateDevice = catchAsync(async (req, res, next) => {
  const device = await Device.findByIdAndUpdate(
    req.params.id,
    { status: 'active' },
    { new: true, runValidators: true }
  );
  if (!device) return next(new AppError('Device not found.', 404));

  res.status(200).json({ status: 'success', data: { device } });
});

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/deactivate (admin)
// ---------------------------------------------------------------------------
exports.deactivateDevice = catchAsync(async (req, res, next) => {
  const device = await Device.findByIdAndUpdate(
    req.params.id,
    { status: 'inactive' },
    { new: true, runValidators: true }
  );
  if (!device) return next(new AppError('Device not found.', 404));

  res.status(200).json({ status: 'success', data: { device } });
});
