/**
 * src/routes/recommendations.js
 * Patient recommendation text routes.
 */
const express = require('express');
const { body } = require('express-validator');
const recommendationController = require('../controllers/recommendationController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

// GET /api/recommendations/:patientId — fetch recommendations
router.get(
  '/:patientId',
  recommendationController.getRecommendations
);

// POST /api/recommendations — create/upsert (doctor only)
router.post(
  '/',
  restrictTo('doctor', 'admin'),
  [
    body('patientId').trim().notEmpty().withMessage('patientId is required.'),
    body('level1Text').optional().isString().withMessage('level1Text must be a string.'),
    body('level2Text').optional().isString().withMessage('level2Text must be a string.'),
    body('level3Text').optional().isString().withMessage('level3Text must be a string.'),
  ],
  recommendationController.createRecommendation
);

// PUT /api/recommendations/:id — update (doctor only)
router.put(
  '/:id',
  restrictTo('doctor', 'admin'),
  recommendationController.updateRecommendation
);

module.exports = router;
