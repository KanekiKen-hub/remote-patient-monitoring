/**
 * src/controllers/readingController.js
 * Fetches stored health readings.
 * Access control: doctor → assigned patients only; patient → own readings only.
 */
const Patient = require('../models/Patient');
const HealthReading = require('../models/HealthReading');
const Alert = require('../models/Alert');
const mlService = require('../services/mlService');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// Shared helper: resolve and authorise access to a patient's readings
// Returns the Patient document or throws an AppError.
// ---------------------------------------------------------------------------
const resolvePatientAccess = async (patientIdParam, reqUser) => {
  const patient = await Patient.findOne({ patientId: patientIdParam });
  if (!patient) {
    throw new AppError(`Patient "${patientIdParam}" not found.`, 404);
  }

  if (reqUser.role === 'doctor') {
    if (
      !patient.assignedDoctor ||
      patient.assignedDoctor.toString() !== reqUser._id.toString()
    ) {
      throw new AppError('Access denied. Patient is not assigned to you.', 403);
    }
  } else if (reqUser.role === 'patient') {
    // A patient can only view their OWN readings
    if (
      !reqUser.patientRef ||
      reqUser.patientRef.toString() !== patient._id.toString()
    ) {
      throw new AppError('Access denied. You may only view your own readings.', 403);
    }
  }

  return patient;
};

// ---------------------------------------------------------------------------
// GET /api/readings/latest/:patientId — most recent single reading
// NOTE: This route MUST be registered before /:patientId in the router
// ---------------------------------------------------------------------------
exports.getLatestReading = catchAsync(async (req, res, next) => {
  await resolvePatientAccess(req.params.patientId, req.user);

  const reading = await HealthReading.findOne({ patientId: req.params.patientId })
    .sort({ timestamp: -1 })
    .populate('deviceRef', 'deviceId');

  if (!reading) {
    return res.status(200).json({
      status: 'success',
      data: { reading: null },
    });
  }

  res.status(200).json({
    status: 'success',
    data: { reading },
  });
});

// ---------------------------------------------------------------------------
// GET /api/readings/:patientId — paginated reading history
// ---------------------------------------------------------------------------
exports.getReadings = catchAsync(async (req, res, next) => {
  await resolvePatientAccess(req.params.patientId, req.user);

  const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

  const readings = await HealthReading.find({ patientId: req.params.patientId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('deviceRef', 'deviceId');

  res.status(200).json({
    status: 'success',
    results: readings.length,
    data: { readings },
  });
});

// ---------------------------------------------------------------------------
// POST /api/readings/mock — submit mock reading (demo / development mode)
// ---------------------------------------------------------------------------
exports.createMockReading = catchAsync(async (req, res, next) => {
  const { patientId, heartRate, spo2 } = req.body;

  if (!patientId || heartRate == null || spo2 == null) {
    return next(new AppError('patientId, heartRate, and spo2 are required.', 400));
  }

  const hr = Number(heartRate);
  const sp = Number(spo2);
  if (isNaN(hr) || hr < 20 || hr > 300) {
    return next(new AppError('heartRate must be a number between 20 and 300.', 400));
  }
  if (isNaN(sp) || sp < 50 || sp > 100) {
    return next(new AppError('spo2 must be a number between 50 and 100.', 400));
  }

  const patient = await resolvePatientAccess(patientId, req.user);

  // Get previous reading for trend features
  const prevReading = await HealthReading.findOne({ patientId })
    .sort({ timestamp: -1 })
    .select('heartRate spo2')
    .lean();

  const prevHeartRate = prevReading ? prevReading.heartRate : hr;
  const prevSpo2 = prevReading ? prevReading.spo2 : sp;

  const features = {
    heartRate: hr,
    spo2: sp,
    prevHeartRate,
    prevSpo2,
    hrChange: hr - prevHeartRate,
    spo2Change: sp - prevSpo2,
  };

  // Call ML service for prediction (with fallback)
  const prediction = await mlService.getPrediction(features);
  const alertLevel = prediction.level;
  const alertLabel = prediction.label;

  const reading = await HealthReading.create({
    patientId: patient.patientId,
    patientRef: patient._id,
    deviceId: patient.assignedDevice ? 'MOCK_DEV' : 'MOCK_DEV',
    deviceRef: patient.assignedDevice || undefined,
    heartRate: hr,
    spo2: sp,
    alertLevel,
    alertLabel,
    mlPrediction: {
      level: prediction.level,
      label: prediction.label,
      confidence: prediction.confidence,
      features: prediction.features,
      mlAvailable: prediction.mlAvailable,
    },
    timestamp: new Date(),
  });

  // Create alert if level >= 2
  if (alertLevel >= 2) {
    await Alert.create({
      patientRef: patient._id,
      patientId: patient.patientId,
      deviceRef: patient.assignedDevice || undefined,
      readingRef: reading._id,
      level: alertLevel,
      label: alertLabel,
      heartRate: hr,
      spo2: sp,
      timestamp: new Date(),
    });
  }

  res.status(201).json({
    status: 'success',
    data: {
      reading,
      prediction,
    },
  });
});
