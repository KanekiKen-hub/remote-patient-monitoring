/**
 * src/routes/iot.js
 * IoT device data ingestion route.
 * Uses deviceAuthMiddleware instead of user JWT auth.
 */
const express = require('express');
const { body } = require('express-validator');
const iotController = require('../controllers/iotController');
const { deviceAuth } = require('../middleware/deviceAuthMiddleware');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/iot/readings
// Headers: Authorization: Bearer <rawDeviceToken>
// Body: { deviceId, heartRate, spo2, timestamp? }
// ---------------------------------------------------------------------------
router.post(
  '/readings',
  deviceAuth,
  [
    body('deviceId').trim().notEmpty().withMessage('deviceId is required.'),
    body('heartRate')
      .isFloat({ min: 20, max: 300 })
      .withMessage('heartRate must be between 20 and 300 bpm.'),
    body('spo2')
      .isFloat({ min: 50, max: 100 })
      .withMessage('spo2 must be between 50 and 100%.'),
    body('timestamp')
      .optional()
      .isISO8601()
      .withMessage('timestamp must be a valid ISO 8601 date.'),
  ],
  iotController.submitReading
);

module.exports = router;
