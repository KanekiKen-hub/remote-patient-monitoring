/**
 * src/controllers/alertController.js
 * Alert retrieval and review management.
 * Doctors see only their patients' alerts; admins see all.
 */
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// GET /api/alerts — list alerts (with optional ?reviewed=false filter)
// ---------------------------------------------------------------------------
exports.getAlerts = catchAsync(async (req, res, next) => {
  let patientFilter = {};

  if (req.user.role === 'doctor') {
    // Find all patients assigned to this doctor
    const doctorPatients = await Patient.find(
      { assignedDoctor: req.user._id },
      { _id: 1 }
    ).lean();
    const patientIds = doctorPatients.map((p) => p._id);
    patientFilter.patientRef = { $in: patientIds };
  }

  // Optional reviewed filter (?reviewed=false or ?reviewed=true)
  if (req.query.reviewed !== undefined) {
    patientFilter.reviewed = req.query.reviewed === 'true';
  }

  const alerts = await Alert.find(patientFilter)
    .populate('patientRef', 'patientId name')
    .populate('readingRef', 'heartRate spo2 alertLevel alertLabel timestamp mlPrediction')
    .populate('reviewedBy', 'name email')
    .sort({ timestamp: -1 })
    .limit(100);

  res.status(200).json({
    status: 'success',
    results: alerts.length,
    data: { alerts },
  });
});

// ---------------------------------------------------------------------------
// GET /api/alerts/patient/:patientId — alerts for a specific patient
// ---------------------------------------------------------------------------
exports.getPatientAlerts = catchAsync(async (req, res, next) => {
  const patient = await Patient.findOne({ patientId: req.params.patientId });
  if (!patient) return next(new AppError('Patient not found.', 404));

  // Access control
  if (req.user.role === 'doctor') {
    if (
      !patient.assignedDoctor ||
      patient.assignedDoctor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Access denied.', 403));
    }
  } else if (req.user.role === 'patient') {
    if (
      !req.user.patientRef ||
      req.user.patientRef.toString() !== patient._id.toString()
    ) {
      return next(new AppError('Access denied. You may only view your own alerts.', 403));
    }
  }

  const alerts = await Alert.find({ patientRef: patient._id })
    .populate('readingRef', 'heartRate spo2 alertLevel alertLabel timestamp mlPrediction')
    .populate('reviewedBy', 'name')
    .sort({ timestamp: -1 })
    .limit(50);

  res.status(200).json({
    status: 'success',
    results: alerts.length,
    data: { alerts },
  });
});

// ---------------------------------------------------------------------------
// PUT /api/alerts/:id/review — mark alert as reviewed (doctor only)
// ---------------------------------------------------------------------------
exports.reviewAlert = catchAsync(async (req, res, next) => {
  const alert = await Alert.findById(req.params.id).populate('patientRef');
  if (!alert) return next(new AppError('Alert not found.', 404));

  // Only the assigned doctor may review their patients' alerts
  if (req.user.role === 'doctor') {
    const patient = await Patient.findById(alert.patientRef);
    if (
      !patient ||
      !patient.assignedDoctor ||
      patient.assignedDoctor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Access denied.', 403));
    }
  }

  alert.reviewed = true;
  alert.reviewedBy = req.user._id;
  alert.reviewedAt = new Date();
  await alert.save();

  res.status(200).json({
    status: 'success',
    data: { alert },
  });
});
