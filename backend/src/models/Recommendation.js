/**
 * src/models/Recommendation.js
 * Per-patient, per-doctor custom recommendation text for each alert level.
 * Doctors can override the default messages to provide personalized guidance.
 */
const mongoose = require('mongoose');

const recommendationSchema = new mongoose.Schema(
  {
    /** The patient these recommendations apply to. */
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      required: [true, 'Patient reference is required'],
    },
    /** The doctor who authored/owns these recommendations. */
    doctorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Doctor reference is required'],
    },

    /** Shown to patient when reading is Normal (level 1). */
    level1Text: {
      type: String,
      default: 'Continue regular monitoring.',
      maxlength: [1000, 'Recommendation text must not exceed 1000 characters'],
    },
    /** Shown to patient when reading requires Attention (level 2). */
    level2Text: {
      type: String,
      default:
        'Follow your prescribed instructions and monitor your readings as advised.',
      maxlength: [1000, 'Recommendation text must not exceed 1000 characters'],
    },
    /** Shown to patient when Doctor Attention is Recommended (level 3). */
    level3Text: {
      type: String,
      default:
        'Please contact your doctor or healthcare provider promptly.',
      maxlength: [1000, 'Recommendation text must not exceed 1000 characters'],
    },

    updatedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: false, // We manage updatedAt manually
    toJSON: {
      transform(doc, ret) {
        delete ret.__v;
        return ret;
      },
    },
  }
);

// A doctor can have at most one recommendation set per patient
recommendationSchema.index({ patientRef: 1, doctorRef: 1 }, { unique: true });

const Recommendation = mongoose.model('Recommendation', recommendationSchema);

module.exports = Recommendation;
