/**
 * src/routes/patients.js
 * Patient CRUD routes — all protected.
 */
const express = require('express');
const { body } = require('express-validator');
const patientController = require('../controllers/patientController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

// All patient routes require authentication
router.use(protect);

// ---------------------------------------------------------------------------
// POST /api/patients — create patient + user account (doctor or admin)
// ---------------------------------------------------------------------------
router.post(
  '/',
  restrictTo('doctor', 'admin'),
  [
    body('name').trim().notEmpty().withMessage('Patient name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Gender must be Male, Female, or Other.'),
  ],
  patientController.createPatient
);

// ---------------------------------------------------------------------------
// GET /api/patients — list (doctor: own patients; admin: all)
// ---------------------------------------------------------------------------
router.get('/', restrictTo('doctor', 'admin'), patientController.getAllPatients);

// ---------------------------------------------------------------------------
// GET /api/patients/:id — single patient (doctor of patient, admin, patient themselves)
// ---------------------------------------------------------------------------
router.get('/:id', patientController.getPatient);

// ---------------------------------------------------------------------------
// PUT /api/patients/:id — update patient info
// ---------------------------------------------------------------------------
router.put(
  '/:id',
  restrictTo('doctor', 'admin'),
  [
    body('gender')
      .optional()
      .isIn(['Male', 'Female', 'Other'])
      .withMessage('Gender must be Male, Female, or Other.'),
    body('name').optional().trim().notEmpty().withMessage('Name cannot be empty.'),
  ],
  patientController.updatePatient
);

module.exports = router;
