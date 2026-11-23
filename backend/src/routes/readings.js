/**
 * src/routes/readings.js
 * Health reading history routes.
 * IMPORTANT: /latest/:patientId MUST be registered before /:patientId
 * to prevent Express matching "latest" as a patientId value.
 */
const express = require('express');
const readingController = require('../controllers/readingController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

// POST /api/readings/mock — submit simulated reading (mock sensor)
router.post('/mock', readingController.createMockReading);

// GET /api/readings/latest/:patientId — most recent reading (specific route first!)
router.get('/latest/:patientId', readingController.getLatestReading);

// GET /api/readings/:patientId — paginated history (general route second)
router.get('/:patientId', readingController.getReadings);

module.exports = router;
