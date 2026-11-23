/**
 * src/routes/devices.js
 * Device management routes.
 */
const express = require('express');
const { body } = require('express-validator');
const deviceController = require('../controllers/deviceController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

// All device routes require authentication
router.use(protect);

// ---------------------------------------------------------------------------
// POST /api/devices — provision a new device
// ---------------------------------------------------------------------------
router.post('/', restrictTo('admin', 'doctor'), deviceController.createDevice);

// ---------------------------------------------------------------------------
// GET /api/devices — list all devices (filtered by role)
// ---------------------------------------------------------------------------
router.get('/', restrictTo('admin', 'doctor'), deviceController.getAllDevices);

// ---------------------------------------------------------------------------
// GET /api/devices/:id
// ---------------------------------------------------------------------------
router.get('/:id', restrictTo('admin', 'doctor'), deviceController.getDevice);

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/assign — assign to patient
// Body: { patientId: 'P001' }
// ---------------------------------------------------------------------------
router.put(
  '/:id/assign',
  restrictTo('admin', 'doctor'),
  [body('patientId').trim().notEmpty().withMessage('patientId is required.')],
  deviceController.assignDevice
);

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/unassign
// ---------------------------------------------------------------------------
router.put('/:id/unassign', restrictTo('admin', 'doctor'), deviceController.unassignDevice);

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/activate — admin only
// ---------------------------------------------------------------------------
router.put('/:id/activate', restrictTo('admin'), deviceController.activateDevice);

// ---------------------------------------------------------------------------
// PUT /api/devices/:id/deactivate — admin only
// ---------------------------------------------------------------------------
router.put('/:id/deactivate', restrictTo('admin'), deviceController.deactivateDevice);

module.exports = router;
