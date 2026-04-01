const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

// Razorpay webhook (raw body needed - no auth)
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  paymentController.webhookHandler
);

// Student routes
router.use(protect, restrictTo('student'));

router.post(
  '/create-order',
  [
    body('feeStructureId').isMongoId().withMessage('Valid fee structure ID required'),
    body('installmentNumber').optional().isIn([1, 2]).withMessage('Installment must be 1 or 2'),
    body('amount').optional().isFloat({ min: 1 }).withMessage('Valid amount required'),
  ],
  validate,
  paymentController.createOrder
);

router.post(
  '/verify',
  [
    body('razorpayOrderId').notEmpty().withMessage('Order ID required'),
    body('razorpayPaymentId').notEmpty().withMessage('Payment ID required'),
    body('razorpaySignature').notEmpty().withMessage('Signature required'),
  ],
  validate,
  paymentController.verifyPayment
);

router.get('/my-payments', paymentController.getMyPayments);
router.get('/my-fee-status', paymentController.getMyFeeStatus);
router.get('/receipt/:paymentId', paymentController.downloadReceipt);

module.exports = router;
