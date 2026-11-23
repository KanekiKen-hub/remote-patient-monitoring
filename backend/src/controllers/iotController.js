/**
 * src/controllers/iotController.js
 * Handles IoT device data submissions.
 * Flow:
 *  1. deviceAuthMiddleware has already verified the device and set req.device
 *  2. Validate vital signs
 *  3. Resolve patient assigned to device
 *  4. Build trend features (prev reading)
 *  5. Call ML service for prediction
 *  6. Persist HealthReading
 *  7. Create Alert if level >= 2
 *  8. Return result
 */
const { validationResult } = require('express-validator');
const HealthReading = require('../models/HealthReading');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const mlService = require('../services/mlService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// POST /api/iot/readings
// ---------------------------------------------------------------------------
exports.submitReading = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const device = req.device; // Attached by deviceAuthMiddleware

  const heartRate = Number(req.body.heartRate);
  const spo2 = Number(req.body.spo2);
  const timestamp = req.body.timestamp ? new Date(req.body.timestamp) : new Date();

  // 1. Resolve the patient assigned to this device
  if (!device.assignedPatient) {
    return next(new AppError('This device is not assigned to any patient.', 400));
  }

  const patient = await Patient.findById(device.assignedPatient);
  if (!patient) {
    return next(new AppError('Assigned patient not found.', 404));
  }

  // 2. Fetch previous reading for trend features (privacy: use patientId string)
  const prevReading = await HealthReading.findOne({ patientId: patient.patientId })
    .sort({ timestamp: -1 })
    .select('heartRate spo2')
    .lean();

  const prevHeartRate = prevReading ? prevReading.heartRate : heartRate;
  const prevSpo2 = prevReading ? prevReading.spo2 : spo2;

  const features = {
    heartRate,
    spo2,
    prevHeartRate,
    prevSpo2,
    hrChange: heartRate - prevHeartRate,
    spo2Change: spo2 - prevSpo2,
  };

  // 3. Call ML service for classification (with graceful fallback)
  const prediction = await mlService.getPrediction(features);

  const alertLevel = prediction.level;
  const alertLabel = prediction.label;

  // 4. Persist the reading
  const reading = await HealthReading.create({
    patientId: patient.patientId,
    patientRef: patient._id,
    deviceId: device.deviceId,
    deviceRef: device._id,
    heartRate,
    spo2,
    alertLevel,
    alertLabel,
    mlPrediction: {
      level: prediction.level,
      label: prediction.label,
      confidence: prediction.confidence,
      features: prediction.features,
      mlAvailable: prediction.mlAvailable,
    },
    timestamp,
  });

  // 5. Create an Alert for level 2 or 3 readings
  if (alertLevel >= 2) {
    await Alert.create({
      patientRef: patient._id,
      patientId: patient.patientId,
      deviceRef: device._id,
      readingRef: reading._id,
      level: alertLevel,
      label: alertLabel,
      heartRate,
      spo2,
      timestamp,
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      patientId: patient.patientId,
      level: alertLevel,
      label: alertLabel,
      readingId: reading._id,
      mlAvailable: prediction.mlAvailable,
    },
  });
});
