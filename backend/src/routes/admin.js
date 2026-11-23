/**
 * src/routes/admin.js
 * Admin-only management routes.
 */
const express = require('express');
const { body } = require('express-validator');
const adminController = require('../controllers/adminController');
const { protect } = require('../middleware/authMiddleware');
const { restrictTo } = require('../middleware/roleMiddleware');

const router = express.Router();

// All admin routes require authentication + admin role
router.use(protect, restrictTo('admin'));

// GET /api/admin/users — list all users
router.get('/users', adminController.getAllUsers);

// POST /api/admin/users — create a new doctor account
router.post(
  '/users',
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
  adminController.createUser
);

// PUT /api/admin/users/:id — update a user
router.put('/users/:id', adminController.updateUser);

// PUT /api/admin/users/:id/deactivate — soft-delete
router.put('/users/:id/deactivate', adminController.deactivateUser);

// GET /api/admin/stats — system statistics
router.get('/stats', adminController.getStats);

module.exports = router;
