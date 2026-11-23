/**
 * src/routes/auth.js
 * Authentication routes.
 */
const express = require('express');
const { body } = require('express-validator');
const authController = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
router.post(
  '/login',
  [
    body('email').isEmail().withMessage('Please provide a valid email.').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required.'),
  ],
  authController.login
);

// ---------------------------------------------------------------------------
// GET /api/auth/me  — returns current user info (protected)
// ---------------------------------------------------------------------------
router.get('/me', protect, authController.getMe);

// ---------------------------------------------------------------------------
// POST /api/auth/register — create admin or doctor account (admin only)
// ---------------------------------------------------------------------------
router.post(
  '/register',
  protect,
  restrictTo('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name is required.'),
    body('email').isEmail().withMessage('Valid email is required.').normalizeEmail(),
    body('password')
      .isLength({ min: 6 })
      .withMessage('Password must be at least 6 characters.'),
    body('role')
      .isIn(['admin', 'doctor'])
      .withMessage('Role must be admin or doctor.'),
  ],
  authController.register
);

module.exports = router;
