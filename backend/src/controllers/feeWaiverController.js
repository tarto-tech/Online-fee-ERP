const FeeWaiver = require('../models/FeeWaiver');
const Student = require('../models/Student');
const FeeStructure = require('../models/FeeStructure');
const Payment = require('../models/Payment');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');

const hasPaid = async (studentId, feeStructureId) => {
  const payment = await Payment.findOne({ student: studentId, feeStructure: feeStructureId, status: 'paid' });
  return !!payment;
};

exports.createWaiver = catchAsync(async (req, res, next) => {
  const { studentId, feeStructureId, discountAmount, reason } = req.body;

  const student = await Student.findById(studentId).populate('course', 'name code');
  if (!student) return next(new AppError('Student not found', 404));

  const feeStructure = await FeeStructure.findById(feeStructureId);
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));

  if (discountAmount >= feeStructure.totalAmount)
    return next(new AppError('Discount cannot be equal to or more than total fee', 400));

  const waiver = await FeeWaiver.create({
    student: studentId,
    feeStructure: feeStructureId,
    discountAmount,
    reason,
    grantedBy: req.user._id,
  });

  await waiver.populate([
    { path: 'student', select: 'name studentId usn email mobile course currentYear academicYear', populate: { path: 'course', select: 'name code' } },
    { path: 'feeStructure', select: 'totalAmount academicYear year' },
    { path: 'grantedBy', select: 'name email' },
  ]);

  res.status(201).json({ status: 'success', data: { waiver } });
});

exports.updateWaiver = catchAsync(async (req, res, next) => {
  const waiver = await FeeWaiver.findById(req.params.id);
  if (!waiver) return next(new AppError('Waiver not found', 404));
  if (await hasPaid(waiver.student, waiver.feeStructure))
    return next(new AppError('Cannot edit waiver — student has already paid using this waiver', 400));

  const { discountAmount, reason, isActive } = req.body;
  Object.assign(waiver, {
    ...(discountAmount && { discountAmount }),
    ...(reason && { reason }),
    ...(isActive !== undefined && { isActive }),
  });
  await waiver.save({ runValidators: true });
  await waiver.populate([
    { path: 'student', select: 'name studentId usn email mobile course currentYear academicYear', populate: { path: 'course', select: 'name code' } },
    { path: 'feeStructure', select: 'totalAmount academicYear year' },
    { path: 'grantedBy', select: 'name email' },
  ]);
  res.json({ status: 'success', data: { waiver } });
});

exports.deleteWaiver = catchAsync(async (req, res, next) => {
  const waiver = await FeeWaiver.findById(req.params.id);
  if (!waiver) return next(new AppError('Waiver not found', 404));
  if (await hasPaid(waiver.student, waiver.feeStructure))
    return next(new AppError('Cannot remove waiver — student has already paid using this waiver', 400));
  await waiver.deleteOne();
  res.json({ status: 'success', message: 'Waiver removed' });
});

exports.getAllWaivers = catchAsync(async (req, res) => {
  const filter = {};
  if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';

  const waivers = await FeeWaiver.find(filter)
    .populate({ path: 'student', select: 'name studentId usn email mobile currentYear academicYear', populate: { path: 'course', select: 'name code' } })
    .populate('feeStructure', 'totalAmount academicYear year')
    .populate('grantedBy', 'name email')
    .sort({ createdAt: -1 })
    .lean();

  // Single batch query instead of N individual hasPaid() calls
  const paidSet = new Set();
  if (waivers.length > 0) {
    const studentIds = waivers.map((w) => w.student._id);
    const paidPayments = await Payment.find({
      student: { $in: studentIds },
      status: 'paid',
    }).select('student feeStructure').lean();
    paidPayments.forEach((p) => paidSet.add(`${p.student}_${p.feeStructure}`));
  }

  const waiversWithPaidStatus = waivers.map((w) => ({
    ...w,
    isPaid: paidSet.has(`${w.student._id}_${w.feeStructure._id}`),
  }));

  res.json({ status: 'success', results: waivers.length, data: { waivers: waiversWithPaidStatus } });
});

// Used internally by payment controller
exports.getStudentWaiver = async (studentId, feeStructureId) => {
  return FeeWaiver.findOne({ student: studentId, feeStructure: feeStructureId, isActive: true });
};
