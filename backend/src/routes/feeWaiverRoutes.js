const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const c = require('../controllers/feeWaiverController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, restrictTo('admin', 'super_admin'));

router.route('/')
  .get(c.getAllWaivers)
  .post([
    body('studentId').isMongoId().withMessage('Valid student ID required'),
    body('feeStructureId').isMongoId().withMessage('Valid fee structure ID required'),
    body('discountAmount').isFloat({ min: 1 }).withMessage('Discount amount must be at least 1'),
    body('reason').notEmpty().trim().withMessage('Reason is required'),
  ], validate, c.createWaiver);

router.route('/:id')
  .patch(c.updateWaiver)
  .delete(c.deleteWaiver);

module.exports = router;
