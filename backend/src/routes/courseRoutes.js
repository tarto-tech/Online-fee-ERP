const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const courseController = require('../controllers/courseController');
const { protect, restrictTo } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(protect, restrictTo('admin', 'super_admin'));

const courseValidators = [
  body('name').notEmpty().trim().withMessage('Course name required'),
  body('code').notEmpty().trim().withMessage('Course code required'),
  body('duration').isInt({ min: 1, max: 6 }).withMessage('Duration must be 1-6 years'),
];

router.route('/')
  .get(courseController.getAllCourses)
  .post(courseValidators, validate, courseController.createCourse);

router.route('/:id')
  .get(courseController.getCourse)
  .patch(courseController.updateCourse)
  .delete(courseController.deleteCourse);

router.delete('/:id/permanent', courseController.permanentDeleteCourse);

module.exports = router;
