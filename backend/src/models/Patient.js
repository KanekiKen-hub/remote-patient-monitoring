/**
 * src/models/Patient.js
 * Patient profile model.
 * patientId follows the format P001, P002, … and is auto-generated.
 * Each patient is linked to one User account (login credentials) and
 * optionally to an assigned doctor and device.
 */
const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema(
  {
    /** Pseudonymous identifier used in ML service calls (e.g. "P001"). */
    patientId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    /** Reference to the User document that represents this patient's login. */
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Patient must have an associated user account'],
    },
    name: {
      type: String,
      required: [true, 'Patient name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    dateOfBirth: {
      type: Date,
      default: null,
    },
    gender: {
      type: String,
      enum: {
        values: ['Male', 'Female', 'Other'],
        message: 'Gender must be Male, Female, or Other',
      },
      default: null,
    },
    contactNumber: {
      type: String,
      trim: true,
      default: null,
    },
    /** The doctor (User) responsible for monitoring this patient. */
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    /** The IoT Device currently assigned to this patient. */
    assignedDevice: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Device',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
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

// ---------------------------------------------------------------------------
// Static method: generate the next sequential patientId (P001, P002, …)
// ---------------------------------------------------------------------------
patientSchema.statics.generateNextPatientId = async function () {
  // Find the patient with the numerically highest patientId
  const lastPatient = await this.findOne(
    { patientId: { $regex: /^P\d{3,}$/ } },
    { patientId: 1 }
  )
    .sort({ patientId: -1 })
    .lean();

  if (!lastPatient) {
    return 'P001';
  }

  // Extract numeric portion and increment
  const lastNum = parseInt(lastPatient.patientId.replace('P', ''), 10);
  const nextNum = lastNum + 1;
  // Zero-pad to at least 3 digits (P001 … P999, then P1000, etc.)
  return 'P' + String(nextNum).padStart(3, '0');
};

const Patient = mongoose.model('Patient', patientSchema);

module.exports = Patient;
