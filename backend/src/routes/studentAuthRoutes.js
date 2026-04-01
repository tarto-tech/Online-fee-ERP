const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const c = require('../controllers/studentAuthController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

// ── OTP Login ──
router.post('/send-otp',
  [body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile required')],
  validate, c.sendOtp
);
router.post('/verify-otp',
  [
    body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile required'),
    body('otp').isLength({ min: 6, max: 6 }).isNumeric().withMessage('Valid 6-digit OTP required'),
  ],
  validate, c.verifyOtp
);

// ── Protected ──
router.use(protect, restrictTo('student'));

router.patch('/update-profile',
  [body('mobile').optional().matches(/^[6-9]\d{9}$/).withMessage('Valid 10-digit mobile required')],
  validate, c.updateProfile
);
router.get('/me', c.getMe);

module.exports = router;
