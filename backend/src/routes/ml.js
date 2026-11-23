/**
 * src/routes/ml.js
 * ML proxy routes — forward authenticated requests to the ML microservice.
 * Fetches the patient's latest readings to build feature vectors server-side,
 * so the client never needs to send raw vitals directly.
 */
const express = require('express');
const { body } = require('express-validator');
const { validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const HealthReading = require('../models/HealthReading');
const mlService = require('../services/mlService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// ---------------------------------------------------------------------------
// Helper: build feature vector from latest two readings for a patient
// ---------------------------------------------------------------------------
const buildFeaturesForPatient = async (patientId) => {
  const readings = await HealthReading.find({ patientId })
    .sort({ timestamp: -1 })
    .limit(2)
    .select('heartRate spo2')
    .lean();

  if (!readings.length) {
    throw new AppError(`No readings found for patient "${patientId}".`, 404);
  }

  const latest = readings[0];
  const prev = readings[1] || latest;

  return {
    heartRate: latest.heartRate,
    spo2: latest.spo2,
    prevHeartRate: prev.heartRate,
    prevSpo2: prev.spo2,
    hrChange: latest.heartRate - prev.heartRate,
    spo2Change: latest.spo2 - prev.spo2,
  };
};

// ---------------------------------------------------------------------------
// POST /api/ml/predict — get ML prediction for a patient's latest readings
// Body: { patientId }
// ---------------------------------------------------------------------------
router.post(
  '/predict',
  [body('patientId').trim().notEmpty().withMessage('patientId is required.')],
  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

    const { patientId } = req.body;

    // Verify patient access
    const patient = await Patient.findOne({ patientId });
    if (!patient) return next(new AppError(`Patient "${patientId}" not found.`, 404));

    if (req.user.role === 'doctor') {
      if (
        !patient.assignedDoctor ||
        patient.assignedDoctor.toString() !== req.user._id.toString()
      ) {
        return next(new AppError('Access denied.', 403));
      }
    } else if (req.user.role === 'patient') {
      if (req.user.patientRef.toString() !== patient._id.toString()) {
        return next(new AppError('Access denied.', 403));
      }
    }

    const features = await buildFeaturesForPatient(patientId);
    const prediction = await mlService.getPrediction(features);

    res.status(200).json({
      status: 'success',
      data: { prediction },
    });
  })
);

// ---------------------------------------------------------------------------
// POST /api/ml/explain — get SHAP explanation for a patient's latest reading
// Body: { patientId }
// ---------------------------------------------------------------------------
router.post(
  '/explain',
  [body('patientId').trim().notEmpty().withMessage('patientId is required.')],
  catchAsync(async (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return next(new AppError(errors.array()[0].msg, 400));

    const { patientId } = req.body;

    const patient = await Patient.findOne({ patientId });
    if (!patient) return next(new AppError(`Patient "${patientId}" not found.`, 404));

    if (req.user.role === 'doctor') {
      if (
        !patient.assignedDoctor ||
        patient.assignedDoctor.toString() !== req.user._id.toString()
      ) {
        return next(new AppError('Access denied.', 403));
      }
    } else if (req.user.role === 'patient') {
      if (req.user.patientRef.toString() !== patient._id.toString()) {
        return next(new AppError('Access denied.', 403));
      }
    }

    const features = await buildFeaturesForPatient(patientId);
    const explanation = await mlService.getExplanation(features);

    res.status(200).json({
      status: 'success',
      data: { explanation },
    });
  })
);

module.exports = router;
