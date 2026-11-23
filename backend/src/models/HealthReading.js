/**
 * src/models/HealthReading.js
 * Stores every vital-signs reading submitted by an IoT device.
 * Uses pseudonymous patientId strings for ML processing to avoid
 * direct PII exposure to the ML service.
 */
const mongoose = require('mongoose');

const healthReadingSchema = new mongoose.Schema(
  {
    /**
     * Pseudonymous patient identifier (e.g. "P001").
     * Sent to the ML service — never contains PII.
     */
    patientId: {
      type: String,
      required: [true, 'patientId is required'],
      trim: true,
    },
    /** MongoDB reference for internal queries and population. */
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    /** Device identifier string (e.g. "DEV_001"). */
    deviceId: {
      type: String,
      required: [true, 'deviceId is required'],
      trim: true,
    },
    deviceRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      required: true,
    },

    // --- Vital signs ---
    heartRate: {
      type: Number,
      required: [true, 'Heart rate is required'],
      min: [20, 'Heart rate must be at least 20 bpm'],
      max: [300, 'Heart rate must not exceed 300 bpm'],
    },
    spo2: {
      type: Number,
      required: [true, 'SpO2 is required'],
      min: [50, 'SpO2 must be at least 50%'],
      max: [100, 'SpO2 must not exceed 100%'],
    },

    // --- Alert classification ---
    alertLevel: {
      type: Number,
      enum: {
        values: [1, 2, 3],
        message: 'Alert level must be 1, 2, or 3',
      },
      required: true,
    },
    alertLabel: {
      type: String,
      enum: {
        values: ['Normal', 'Attention Needed', 'Doctor Attention Recommended'],
        message: 'Invalid alert label',
      },
      required: true,
    },

    /**
     * Raw ML model prediction output.
     * { level, label, confidence, features }
     */
    mlPrediction: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    /**
     * SHAP explanation values — stored here for fast retrieval
     * without needing to re-query the ML service.
     */
    modelExplanation: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },

    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Index for efficient patient history queries (sorted by time)
healthReadingSchema.index({ patientRef: 1, timestamp: -1 });
healthReadingSchema.index({ patientId: 1, timestamp: -1 });

const HealthReading = mongoose.model('HealthReading', healthReadingSchema);

module.exports = HealthReading;
