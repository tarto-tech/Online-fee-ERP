const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const adminAuthController = require('../controllers/adminAuthController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  adminAuthController.login
);

router.use(protect, restrictTo('admin', 'super_admin'));

router.get('/me', adminAuthController.getMe);
router.patch(
  '/change-password',
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 8 }).withMessage('New password must be at least 8 characters'),
  ],
  validate,
  adminAuthController.changePassword
);

// Test email delivery — admin only
router.post('/test-email', async (req, res, next) => {
  try {
    const { sendEmail } = require('../services/emailService');
    await sendEmail({
      to: req.user.email,
      subject: 'Test Email — SMTP Working',
      html: '<p>If you received this, your SMTP config is working correctly on Render.</p>',
    });
    res.json({ status: 'success', message: `Test email sent to ${req.user.email}` });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
