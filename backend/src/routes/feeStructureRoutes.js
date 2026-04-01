const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const feeStructureController = require('../controllers/feeStructureController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const feeValidators = [
  body('course').isMongoId().withMessage('Valid course ID required'),
  body('year').isInt({ min: 1, max: 6 }).withMessage('Valid year required'),
  body('academicYear').matches(/^\d{4}-\d{4}$/).withMessage('Format: YYYY-YYYY'),
  body('components').isArray({ min: 1 }).withMessage('At least one fee component required'),
  body('components.*.name').notEmpty().withMessage('Component name required'),
  body('components.*.amount').isFloat({ min: 0 }).withMessage('Valid amount required'),
];

// Student route
router.get(
  '/my-fee-structure',
  protect,
  restrictTo('student'),
  feeStructureController.getStudentFeeStructure
);

// Admin routes
router.use(protect, restrictTo('admin', 'super_admin'));

router.route('/')
  .get(feeStructureController.getAllFeeStructures)
  .post(feeValidators, validate, feeStructureController.createFeeStructure);

router.route('/:id')
  .get(feeStructureController.getFeeStructure)
  .patch(feeStructureController.updateFeeStructure)
  .delete(feeStructureController.deactivateFeeStructure);

router.delete('/:id/permanent', feeStructureController.permanentDeleteFeeStructure);

module.exports = router;
