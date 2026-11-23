/**
 * src/controllers/recommendationController.js
 * Per-patient recommendation text management for doctors.
 * A doctor has one recommendation set per patient (upsert pattern).
 */
const mongoose = require('mongoose');
const { validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const Recommendation = require('../models/Recommendation');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// Helper: authorise access to a patient's recommendations
// ---------------------------------------------------------------------------
const authorisePatientAccess = async (patientIdParam, reqUser) => {
  const isObjId = mongoose.isValidObjectId(patientIdParam);
  const patient = await Patient.findOne({
    $or: [
      { patientId: patientIdParam },
      ...(isObjId ? [{ _id: patientIdParam }] : []),
    ],
  });
  if (!patient) throw new AppError(`Patient "${patientIdParam}" not found.`, 404);

  if (reqUser.role === 'doctor') {
    if (
      !patient.assignedDoctor ||
      patient.assignedDoctor.toString() !== reqUser._id.toString()
    ) {
      throw new AppError('Access denied. Patient is not assigned to you.', 403);
    }
  } else if (reqUser.role === 'patient') {
    if (
      !reqUser.patientRef ||
      reqUser.patientRef.toString() !== patient._id.toString()
    ) {
      throw new AppError('Access denied. You may only view your own recommendations.', 403);
    }
  }

  return patient;
};

// ---------------------------------------------------------------------------
// GET /api/recommendations/:patientId
// ---------------------------------------------------------------------------
exports.getRecommendations = catchAsync(async (req, res, next) => {
  const patient = await authorisePatientAccess(req.params.patientId, req.user);

  const recommendation = await Recommendation.findOne({ patientRef: patient._id })
    .populate('doctorRef', 'name email');

  if (!recommendation) {
    // Return defaults if none saved yet
    return res.status(200).json({
      status: 'success',
      data: {
        recommendation: {
          level1Text: 'Continue regular monitoring.',
          level2Text: 'Follow your prescribed instructions and monitor your readings as advised.',
          level3Text: 'Please contact your doctor or healthcare provider promptly.',
        },
      },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { recommendation },
  });
});

// ---------------------------------------------------------------------------
// POST /api/recommendations — create/upsert recommendation set
// Body: { patientId, level1Text, level2Text, level3Text }
// ---------------------------------------------------------------------------
exports.createRecommendation = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { patientId } = req.body;
  const level1Text = req.body.level1Text !== undefined ? req.body.level1Text : req.body.level1;
  const level2Text = req.body.level2Text !== undefined ? req.body.level2Text : req.body.level2;
  const level3Text = req.body.level3Text !== undefined ? req.body.level3Text : req.body.level3;

  const isObjId = mongoose.isValidObjectId(patientId);
  const patient = await Patient.findOne({
    $or: [
      { patientId },
      ...(isObjId ? [{ _id: patientId }] : []),
    ],
  });
  if (!patient) return next(new AppError(`Patient "${patientId}" not found.`, 404));

  // Doctor ownership check
  if (
    req.user.role === 'doctor' &&
    patient.assignedDoctor &&
    patient.assignedDoctor.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Access denied. Patient is not assigned to you.', 403));
  }

  // Upsert: one recommendation set per patient-doctor pair
  const recommendation = await Recommendation.findOneAndUpdate(
    { patientRef: patient._id, doctorRef: req.user._id },
    {
      patientRef: patient._id,
      doctorRef: req.user._id,
      ...(level1Text !== undefined && { level1Text }),
      ...(level2Text !== undefined && { level2Text }),
      ...(level3Text !== undefined && { level3Text }),
      updatedAt: new Date(),
    },
    { new: true, upsert: true, runValidators: true }
  );

  res.status(201).json({
    status: 'success',
    data: { recommendation },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/recommendations/:id
// ---------------------------------------------------------------------------
exports.updateRecommendation = catchAsync(async (req, res, next) => {
  const recommendation = await Recommendation.findById(req.params.id);
  if (!recommendation) return next(new AppError('Recommendation not found.', 404));

  // Only the owning doctor (or admin) can update
  if (
    req.user.role === 'doctor' &&
    recommendation.doctorRef.toString() !== req.user._id.toString()
  ) {
    return next(new AppError('Access denied.', 403));
  }

  if (req.body.level1Text !== undefined) recommendation.level1Text = req.body.level1Text;
  else if (req.body.level1 !== undefined) recommendation.level1Text = req.body.level1;

  if (req.body.level2Text !== undefined) recommendation.level2Text = req.body.level2Text;
  else if (req.body.level2 !== undefined) recommendation.level2Text = req.body.level2;

  if (req.body.level3Text !== undefined) recommendation.level3Text = req.body.level3Text;
  else if (req.body.level3 !== undefined) recommendation.level3Text = req.body.level3;
  recommendation.updatedAt = new Date();

  await recommendation.save();

  res.status(200).json({
    status: 'success',
    data: { recommendation },
  });
});
