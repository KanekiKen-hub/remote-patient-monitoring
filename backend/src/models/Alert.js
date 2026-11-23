/**
 * src/models/Alert.js
 * Created whenever a HealthReading's alertLevel is >= 2.
 * Doctors review alerts to acknowledge abnormal readings.
 */
const mongoose = require('mongoose');

const alertSchema = new mongoose.Schema(
  {
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: true,
    },
    /** Pseudonymous identifier mirrored from the reading for quick display. */
    patientId: {
      type: String,
      required: true,
    },
    deviceRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },
    /** The HealthReading that triggered this alert. */
    readingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthReading',
      required: true,
    },

    // --- Classification mirrored from reading for fast list display ---
    level: {
      type: Number,
      enum: {
        values: [1, 2, 3],
        message: 'Alert level must be 1, 2, or 3',
      },
      required: true,
    },
    label: {
      type: String,
      required: true,
    },
    heartRate: {
      type: Number,
      required: true,
    },
    spo2: {
      type: Number,
      required: true,
    },

    // --- Review status ---
    reviewed: {
      type: Boolean,
      default: false,
    },
    /** Doctor who acknowledged/reviewed the alert. */
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    reviewedAt: {
      type: Date,
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

// Index for efficient doctor dashboard queries
alertSchema.index({ patientRef: 1, timestamp: -1 });
alertSchema.index({ reviewed: 1, timestamp: -1 });

const Alert = mongoose.model('Alert', alertSchema);

module.exports = Alert;
