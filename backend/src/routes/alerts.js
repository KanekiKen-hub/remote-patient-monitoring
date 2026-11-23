/**
 * src/routes/alerts.js
 * Alert retrieval and review routes.
 */
const express = require('express');
const alertController = require('../controllers/alertController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

// GET /api/alerts — all alerts (doctor: own patients; admin: all)
// Optional query param: ?reviewed=false
router.get('/', restrictTo('admin', 'doctor'), alertController.getAlerts);

// GET /api/alerts/patient/:patientId — alerts for a specific patient
router.get('/patient/:patientId', alertController.getPatientAlerts);

// PUT /api/alerts/:id/review — mark alert as reviewed
router.put('/:id/review', restrictTo('doctor', 'admin'), alertController.reviewAlert);

module.exports = router;
