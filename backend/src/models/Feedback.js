/**
 * src/models/Feedback.js
 * Doctor feedback on AI/ML predictions.
 * Used for model quality monitoring and future retraining signals.
 */
const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    /** The Alert document this feedback is associated with. */
    alertRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Alert',
      required: true,
    },
    /** The HealthReading that contains the ML prediction being evaluated. */
    readingRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'HealthReading',
      required: true,
    },
    /** Doctor providing the feedback. */
    doctorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    /** Whether the doctor agrees with the AI's prediction. */
    predictionCorrect: {
      type: Boolean,
      required: [true, 'predictionCorrect field is required'],
    },
    /** Optional clinical notes or reasons for disagreement. */
    notes: {
      type: String,
      trim: true,
      maxlength: [2000, 'Notes must not exceed 2000 characters'],
      default: '',
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

// Prevent duplicate feedback on the same alert from the same doctor
feedbackSchema.index({ alertRef: 1, doctorRef: 1 }, { unique: true });

const Feedback = mongoose.model('Feedback', feedbackSchema);

module.exports = Feedback;
