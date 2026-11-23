/**
 * src/models/User.js
 * User account model — supports admin, doctor, and patient roles.
 * Passwords are bcrypt-hashed at cost 12 before saving.
 * Password is stripped from JSON responses via toJSON transform.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name must not exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address'],
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Never returned in queries by default
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'doctor', 'patient'],
        message: 'Role must be admin, doctor, or patient',
      },
      required: [true, 'Role is required'],
    },
    /**
     * Reference to the Patient document — only populated for role === 'patient'.
     * Allows resolving req.user → their patient record without a second query.
     */
    patientRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    /**
     * Reference to a doctor-specific profile (extensible for future use).
     * Currently doctors are fully represented by the User document itself.
     */
    doctorRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Doctor',
      default: null,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true, // adds createdAt and updatedAt
    toJSON: {
      transform(doc, ret) {
        // Remove sensitive fields before sending to client
        delete ret.password;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Pre-save hook: hash password whenever it is new or modified
// ---------------------------------------------------------------------------
userSchema.pre('save', async function (next) {
  // Only run if password was actually changed (or is new)
  if (!this.isModified('password')) return next();

  // Cost factor 12 — good balance of security and performance
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

// ---------------------------------------------------------------------------
// Instance method: compare a plain-text candidate with the stored hash
// ---------------------------------------------------------------------------
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

const User = mongoose.model('User', userSchema);

module.exports = User;
