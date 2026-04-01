const Course = require('../models/Course');
const FeeStructure = require('../models/FeeStructure');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.createCourse = catchAsync(async (req, res) => {
  const course = await Course.create(req.body);
  res.status(201).json({ status: 'success', data: { course } });
});

exports.getAllCourses = catchAsync(async (req, res) => {
  const filter = req.query.showInactive === 'true' ? {} : { isActive: true };
  const courses = await Course.find(filter).sort('name');
  res.json({ status: 'success', results: courses.length, data: { courses } });
});

exports.getCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));
  res.json({ status: 'success', data: { course } });
});

exports.updateCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!course) return next(new AppError('Course not found', 404));
  res.json({ status: 'success', data: { course } });
});

exports.deleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { new: true }
  );
  if (!course) return next(new AppError('Course not found', 404));
  res.json({ status: 'success', message: 'Course deactivated' });
});

exports.permanentDeleteCourse = catchAsync(async (req, res, next) => {
  const course = await Course.findById(req.params.id);
  if (!course) return next(new AppError('Course not found', 404));
  if (course.isActive) return next(new AppError('Only inactive courses can be deleted', 400));
  if (course.totalStudents > 0) return next(new AppError('Cannot delete course with enrolled students', 400));
  await Course.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Course permanently deleted' });
});
