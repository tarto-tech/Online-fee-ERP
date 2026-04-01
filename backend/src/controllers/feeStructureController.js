const FeeStructure = require('../models/FeeStructure');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

exports.createFeeStructure = catchAsync(async (req, res, next) => {
  // Check for existing fee structure
  const existing = await FeeStructure.findOne({
    course: req.body.course,
    year: req.body.year,
    academicYear: req.body.academicYear,
  });
  if (existing) {
    return next(new AppError(
      `Fee structure already exists for Year ${req.body.year} (${req.body.academicYear}). Please edit the existing one or use a different academic year.`,
      400
    ));
  }

  const components = req.body.components || [];
  const totalAmount = components.reduce((sum, c) => sum + Number(c.amount), 0);
  const feeStructure = await FeeStructure.create({ ...req.body, totalAmount });
  await feeStructure.populate('course', 'name code');
  res.status(201).json({ status: 'success', data: { feeStructure } });
});

exports.getAllFeeStructures = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.showInactive !== 'true') filter.isActive = true;
  if (req.query.course) filter.course = req.query.course;
  if (req.query.year) filter.year = req.query.year;
  if (req.query.academicYear) filter.academicYear = req.query.academicYear;

  const feeStructures = await FeeStructure.find(filter)
    .populate('course', 'name code')
    .sort({ 'course': 1, year: 1 });

  res.json({ status: 'success', results: feeStructures.length, data: { feeStructures } });
});

exports.getFeeStructure = catchAsync(async (req, res, next) => {
  const feeStructure = await FeeStructure.findById(req.params.id).populate('course', 'name code');
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));
  res.json({ status: 'success', data: { feeStructure } });
});

exports.updateFeeStructure = catchAsync(async (req, res, next) => {
  // Check for duplicate if course/year/academicYear is being changed
  if (req.body.course || req.body.year || req.body.academicYear) {
    const current = await FeeStructure.findById(req.params.id);
    if (!current) return next(new AppError('Fee structure not found', 404));

    const existing = await FeeStructure.findOne({
      _id: { $ne: req.params.id },
      course: req.body.course || current.course,
      year: req.body.year || current.year,
      academicYear: req.body.academicYear || current.academicYear,
    });
    if (existing) {
      return next(new AppError(
        `Fee structure already exists for Year ${req.body.year || current.year} (${req.body.academicYear || current.academicYear})`,
        400
      ));
    }
  }

  if (req.body.components) {
    req.body.totalAmount = req.body.components.reduce((sum, c) => sum + Number(c.amount), 0);
  }
  const feeStructure = await FeeStructure.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  }).populate('course', 'name code');
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));
  res.json({ status: 'success', data: { feeStructure } });
});

exports.deactivateFeeStructure = catchAsync(async (req, res, next) => {
  const feeStructure = await FeeStructure.findByIdAndUpdate(
    req.params.id, { isActive: false }, { new: true }
  );
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));
  res.json({ status: 'success', message: 'Fee structure deactivated' });
});

exports.permanentDeleteFeeStructure = catchAsync(async (req, res, next) => {
  const feeStructure = await FeeStructure.findById(req.params.id);
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));
  if (feeStructure.isActive) return next(new AppError('Only inactive fee structures can be deleted', 400));
  await FeeStructure.findByIdAndDelete(req.params.id);
  res.json({ status: 'success', message: 'Fee structure permanently deleted' });
});

// Get fee structure for a specific student (used by student app)
exports.getStudentFeeStructure = catchAsync(async (req, res, next) => {
  const student = req.user;
  const feeStructure = await FeeStructure.findOne({
    course: student.course,
    year: student.currentYear,
    academicYear: student.academicYear,
    isActive: true,
  }).populate('course', 'name code');

  if (!feeStructure) return next(new AppError('Fee structure not defined for your course/year', 404));
  res.json({ status: 'success', data: { feeStructure } });
});
