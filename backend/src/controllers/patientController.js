/**
 * src/controllers/patientController.js
 * CRUD for patient records.
 * Access control:
 *   - Doctors: their own assigned patients only
 *   - Admin: all patients
 *   - Patient: their own record only
 */
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const User = require('../models/User');
const Patient = require('../models/Patient');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const resolvePatientByParam = async (idParam) => {
  if (!idParam) return null;

  if (mongoose.isValidObjectId(idParam)) {
    return Patient.findById(idParam);
  }

  return Patient.findOne({ patientId: idParam });
};

// ---------------------------------------------------------------------------
// POST /api/patients — create patient + linked user account
// ---------------------------------------------------------------------------
exports.createPatient = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { name, email, password, dateOfBirth, gender, contactNumber } = req.body;

  // Prevent duplicate email
  const existing = await User.findOne({ email });
  if (existing) {
    return next(new AppError('An account with this email already exists.', 409));
  }

  // Generate next sequential patientId (P001, P002, …)
  const patientId = await Patient.generateNextPatientId();

  // Create the user account first (password will be hashed by pre-save hook)
  const userAccount = await User.create({
    name,
    email,
    password,
    role: 'patient',
  });

  // Create the patient profile linked to that user and the creating doctor
  const patient = await Patient.create({
    patientId,
    userId: userAccount._id,
    name,
    dateOfBirth: dateOfBirth || null,
    gender: gender || null,
    contactNumber: contactNumber || null,
    // Assign the creating doctor (unless admin is creating without a doctor)
    assignedDoctor: req.user.role === 'doctor' ? req.user._id : null,
  });

  // Back-link the user to the patient record
  userAccount.patientRef = patient._id;
  await userAccount.save({ validateBeforeSave: false });

  res.status(201).json({
    status: 'success',
    data: { patient },
  });
});

// ---------------------------------------------------------------------------
// GET /api/patients — list patients
// ---------------------------------------------------------------------------
exports.getAllPatients = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.user.role === 'doctor') {
    // Doctors only see their own assigned patients
    filter.assignedDoctor = req.user._id;
  }
  // Admins see all patients (empty filter)

  const patients = await Patient.find(filter)
    .populate('assignedDoctor', 'name email')
    .populate('assignedDevice', 'deviceId status')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: patients.length,
    data: { patients },
  });
});

// ---------------------------------------------------------------------------
// GET /api/patients/:id — single patient details
// ---------------------------------------------------------------------------
exports.getPatient = catchAsync(async (req, res, next) => {
  let patient = await resolvePatientByParam(req.params.id);

  if (!patient) {
    return next(new AppError('Patient not found.', 404));
  }

  patient = await patient.populate('assignedDoctor', 'name email');
  patient = await patient.populate('assignedDevice', 'deviceId status');

  // Access control
  if (req.user.role === 'doctor') {
    if (!patient.assignedDoctor || patient.assignedDoctor._id.toString() !== req.user._id.toString()) {
      return next(new AppError('Access denied. This patient is not assigned to you.', 403));
    }
  } else if (req.user.role === 'patient') {
    // Patients can only view their own record
    if (!req.user.patientRef || req.user.patientRef.toString() !== patient._id.toString()) {
      return next(new AppError('Access denied. You may only view your own record.', 403));
    }
  }

  res.status(200).json({
    status: 'success',
    data: { patient },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/patients/:id — update patient info
// ---------------------------------------------------------------------------
exports.updatePatient = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const patient = await resolvePatientByParam(req.params.id);
  if (!patient) {
    return next(new AppError('Patient not found.', 404));
  }

  // Doctors may only update their own patients
  if (req.user.role === 'doctor') {
    if (!patient.assignedDoctor || patient.assignedDoctor.toString() !== req.user._id.toString()) {
      return next(new AppError('Access denied. This patient is not assigned to you.', 403));
    }
  }

  // Only allow safe fields to be updated
  const allowedFields = ['name', 'dateOfBirth', 'gender', 'contactNumber', 'isActive'];
  allowedFields.forEach((field) => {
    if (req.body[field] !== undefined) {
      patient[field] = req.body[field];
    }
  });

  // If name is updated, also update the linked user account name
  if (req.body.name) {
    await User.findByIdAndUpdate(patient.userId, { name: req.body.name });
  }

  await patient.save();

  res.status(200).json({
    status: 'success',
    data: { patient },
  });
});
