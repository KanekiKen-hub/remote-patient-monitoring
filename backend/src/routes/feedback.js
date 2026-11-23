/**
 * src/routes/feedback.js
 * AI prediction feedback routes.
 */
const express = require('express');
const { body } = require('express-validator');
const feedbackController = require('../controllers/feedbackController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

router.use(protect);

// POST /api/feedback — submit prediction feedback (doctor only)
router.post(
  '/',
  restrictTo('doctor', 'admin'),
  [
    body('alertId')
      .notEmpty()
      .withMessage('alertId is required.'),
    body('readingId')
      .notEmpty()
      .withMessage('readingId is required.'),
    body('predictionCorrect')
      .isBoolean()
      .withMessage('predictionCorrect must be true or false.'),
    body('notes').optional().isString().withMessage('notes must be a string.'),
  ],
  feedbackController.createFeedback
);

// GET /api/feedback — list feedback (doctor: own; admin: all)
router.get('/', restrictTo('doctor', 'admin'), feedbackController.getFeedback);

module.exports = router;
