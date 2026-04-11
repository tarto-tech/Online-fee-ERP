const express = require('express');
const { body } = require('express-validator');
const multer = require('multer');
const router = express.Router();
const studentController = require('../controllers/studentController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

const upload = multer({
  dest: 'uploads/',
  limits: { fileSize: 1 * 1024 * 1024 }, // 1MB max
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) cb(null, true);
    else cb(new Error('Only CSV files are allowed'));
  },
});

router.use(protect, restrictTo('admin', 'super_admin'));

const studentValidators = [
  body('studentId').optional().trim(),
  body('name').notEmpty().trim().withMessage('Name required'),
  body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
  body('mobile').matches(/^[6-9]\d{9}$/).withMessage('Valid mobile number required'),
  body('course').isMongoId().withMessage('Valid course ID required'),
  body('currentYear').isInt({ min: 1, max: 6 }).withMessage('Valid year required'),
  body('academicYear').matches(/^\d{4}-\d{4}$/).withMessage('Academic year format: YYYY-YYYY'),
];

router.route('/')
  .get(studentController.getAllStudents)
  .post(studentValidators, validate, studentController.createStudent);

router.post('/bulk-upload', upload.single('file'), studentController.bulkUpload);
router.post('/promote', studentController.promoteStudents);

router.route('/:id')
  .get(studentController.getStudent)
  .patch(studentController.updateStudent)
  .delete(studentController.deactivateStudent);

router.delete('/:id/permanent', studentController.deleteStudent);
router.post('/:id/resend-email', studentController.resendWelcomeEmail);

module.exports = router;
