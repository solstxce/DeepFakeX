const express = require('express');
const {
  register,
  login,
  getUserProfile,
  updateUserProfile,
  changePassword
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.post('/register', register);
router.post('/login', login);

// Protected routes
router.get('/user', protect, getUserProfile);
router.put('/user', protect, updateUserProfile);
router.put('/change-password', protect, changePassword);

module.exports = router; 