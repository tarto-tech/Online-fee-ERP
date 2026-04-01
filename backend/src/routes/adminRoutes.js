const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const paymentController = require('../controllers/paymentController');
const { protect, restrictTo } = require('../middleware/auth');

router.use(protect, restrictTo('admin', 'super_admin'));

router.get('/stats', dashboardController.getDashboardStats);
router.get('/defaulters', dashboardController.getDefaulters);
router.get('/payments', paymentController.getAllPayments);
router.get('/export/payments', dashboardController.exportPaymentsCSV);

module.exports = router;
