/**
 * src/controllers/feedbackController.js
 * Doctor feedback on AI predictions — used for model quality monitoring.
 */
const { validationResult } = require('express-validator');
const Patient = require('../models/Patient');
const Alert = require('../models/Alert');
const Feedback = require('../models/Feedback');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

// ---------------------------------------------------------------------------
// POST /api/feedback — submit feedback on a prediction
// Body: { alertId, readingId, predictionCorrect, notes }
// ---------------------------------------------------------------------------
exports.createFeedback = catchAsync(async (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return next(new AppError(errors.array()[0].msg, 400));
  }

  const { alertId, readingId, predictionCorrect, notes } = req.body;

  // Verify the alert exists and belongs to this doctor's patient
  const alert = await Alert.findById(alertId).populate('patientRef');
  if (!alert) return next(new AppError('Alert not found.', 404));

  if (req.user.role === 'doctor') {
    const patient = await Patient.findById(alert.patientRef);
    if (
      !patient ||
      !patient.assignedDoctor ||
      patient.assignedDoctor.toString() !== req.user._id.toString()
    ) {
      return next(new AppError('Access denied. Alert does not belong to your patient.', 403));
    }
  }

  // Prevent duplicate feedback from the same doctor on the same alert
  const existing = await Feedback.findOne({ alertRef: alertId, doctorRef: req.user._id });
  if (existing) {
    return next(new AppError('You have already submitted feedback for this alert.', 409));
  }

  const feedback = await Feedback.create({
    alertRef: alertId,
    readingRef: readingId,
    doctorRef: req.user._id,
    predictionCorrect,
    notes: notes || '',
  });

  res.status(201).json({
    status: 'success',
    data: { feedback },
  });
});

// ---------------------------------------------------------------------------
// GET /api/feedback — list feedback
// Doctor: own submissions; Admin: all
// ---------------------------------------------------------------------------
exports.getFeedback = catchAsync(async (req, res, next) => {
  let filter = {};

  if (req.user.role === 'doctor') {
    filter.doctorRef = req.user._id;
  }

  const feedback = await Feedback.find(filter)
    .populate('doctorRef', 'name email')
    .populate('alertRef', 'patientId level label timestamp')
    .populate('readingRef', 'heartRate spo2 alertLevel mlPrediction')
    .sort({ createdAt: -1 });

  res.status(200).json({
    status: 'success',
    results: feedback.length,
    data: { feedback },
  });
});
