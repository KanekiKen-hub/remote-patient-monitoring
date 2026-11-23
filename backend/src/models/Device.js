/**
 * src/models/Device.js
 * IoT Device model.
 * deviceId format: DEV_001, DEV_002, …
 * deviceToken is stored bcrypt-hashed; the raw token is revealed only once at creation.
 */
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const deviceSchema = new mongoose.Schema(
  {
    /** Human-readable unique device identifier (e.g. "DEV_001"). */
    deviceId: {
      type: String,
      unique: true,
      required: true,
      trim: true,
    },
    /**
     * Bcrypt hash of the device's bearer token.
     * The raw token is returned to the caller only at creation time.
     */
    deviceToken: {
      type: String,
      required: true,
      select: false, // Never returned in queries by default
    },
    status: {
      type: String,
      enum: {
        values: ['active', 'inactive', 'unassigned'],
        message: 'Status must be active, inactive, or unassigned',
      },
      default: 'unassigned',
    },
    /** Patient this device is currently assigned to. */
    assignedPatient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Patient',
      default: null,
    },
    /** Doctor responsible for the device's patient. */
    assignedDoctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        // Never expose the hashed token
        delete ret.deviceToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// ---------------------------------------------------------------------------
// Static method: generate the next sequential deviceId (DEV_001, DEV_002, …)
// ---------------------------------------------------------------------------
deviceSchema.statics.generateNextDeviceId = async function () {
  const lastDevice = await this.findOne(
    { deviceId: { $regex: /^DEV_\d{3,}$/ } },
    { deviceId: 1 }
  )
    .sort({ deviceId: -1 })
    .lean();

  if (!lastDevice) {
    return 'DEV_001';
  }

  const lastNum = parseInt(lastDevice.deviceId.replace('DEV_', ''), 10);
  const nextNum = lastNum + 1;
  return 'DEV_' + String(nextNum).padStart(3, '0');
};

// ---------------------------------------------------------------------------
// Instance method: verify a plain-text candidate token against the stored hash
// ---------------------------------------------------------------------------
deviceSchema.methods.verifyToken = async function (candidateToken) {
  // deviceToken may not be loaded (select: false) — use explicit findOne with +deviceToken
  return bcrypt.compare(candidateToken, this.deviceToken);
};

const Device = mongoose.model('Device', deviceSchema);

module.exports = Device;
