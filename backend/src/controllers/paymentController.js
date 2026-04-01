const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const Payment = require('../models/Payment');
const Student = require('../models/Student');
const FeeStructure = require('../models/FeeStructure');
const { getStudentWaiver } = require('./feeWaiverController');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { generateReceiptPDF } = require('../services/pdfService');
const cache = require('../config/cache');

// Calculate late fee based on due date
const calculateLateFee = (feeStructure, installmentNumber) => {
  const dueDate = installmentNumber === 1
    ? feeStructure.dueDateFirstInstallment
    : feeStructure.dueDateSecondInstallment;

  if (!dueDate || !feeStructure.lateFeePerDay || new Date() <= dueDate) return 0;

  const daysLate = Math.floor((Date.now() - dueDate) / (1000 * 60 * 60 * 24));
  return daysLate * feeStructure.lateFeePerDay;
};

exports.createOrder = catchAsync(async (req, res, next) => {
  const { feeStructureId, amount, installmentNumber = 1, isPartialPayment = false } = req.body;
  const student = req.user;

  const feeStructure = await FeeStructure.findById(feeStructureId).populate('course', 'name code');
  if (!feeStructure) return next(new AppError('Fee structure not found', 404));

  // Verify student belongs to this fee structure
  if (
    feeStructure.course._id.toString() !== student.course.toString() ||
    feeStructure.year !== student.currentYear
  ) {
    return next(new AppError('Fee structure does not match your course/year', 403));
  }

  const lateFee = calculateLateFee(feeStructure, installmentNumber);
  const waiver = await getStudentWaiver(student._id, feeStructureId);
  const discountAmount = waiver ? waiver.discountAmount : 0;
  const effectiveTotal = feeStructure.totalAmount - discountAmount;
  const totalAmount = isPartialPayment ? amount : effectiveTotal + lateFee;

  if (totalAmount < 1) return next(new AppError('Invalid payment amount', 400));

  const amountInPaise = Math.round(totalAmount * 100);

  const order = await razorpay.orders.create({
    amount: amountInPaise,
    currency: 'INR',
    receipt: `rcpt_${Date.now()}`,
    notes: {
      studentId: student.studentId,
      studentName: student.name,
      course: feeStructure.course.name,
      year: feeStructure.year,
      academicYear: feeStructure.academicYear,
      ...(discountAmount && { discount: `₹${discountAmount} waiver applied` }),
    },
  }).catch((err) => {
    console.error('Razorpay error:', JSON.stringify(err.error || err, null, 2));
    throw new AppError(`Razorpay error: ${err.error?.description || err.message}`, 502);
  });

  const payment = await Payment.create({
    student: student._id,
    feeStructure: feeStructureId,
    razorpayOrderId: order.id,
    amount: amountInPaise,
    amountInRupees: totalAmount,
    installmentNumber,
    isPartialPayment,
    lateFeeApplied: lateFee,
    feeSnapshot: {
      courseName: feeStructure.course.name,
      year: feeStructure.year,
      academicYear: feeStructure.academicYear,
      components: feeStructure.components,
      discountAmount,
      discountReason: waiver?.reason || null,
    },
  });

  res.status(201).json({
    status: 'success',
    data: {
      orderId: order.id,
      amount: amountInPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID,
      paymentId: payment._id,
      studentName: student.name,
      studentEmail: student.email,
      studentMobile: student.mobile,
    },
  });
});

exports.verifyPayment = catchAsync(async (req, res, next) => {
  const { razorpayOrderId, razorpayPaymentId, razorpaySignature } = req.body;

  // Verify signature
  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (expectedSignature !== razorpaySignature) {
    return next(new AppError('Payment verification failed. Invalid signature', 400));
  }

  // Fetch payment details from Razorpay
  const razorpayPayment = await razorpay.payments.fetch(razorpayPaymentId);

  const payment = await Payment.findOneAndUpdate(
    { razorpayOrderId },
    {
      razorpayPaymentId,
      razorpaySignature,
      status: 'paid',
      paymentMethod: razorpayPayment.method,
      paidAt: new Date(),
    },
    { new: true }
  ).populate('student', 'name email studentId mobile');

  if (!payment) return next(new AppError('Payment record not found', 404));

  res.json({
    status: 'success',
    message: 'Payment verified successfully',
    data: {
      receiptNumber: payment.receiptNumber,
      amountPaid: payment.amountInRupees,
      paidAt: payment.paidAt,
      paymentMethod: payment.paymentMethod,
    },
  });
});

// Razorpay webhook handler
exports.webhookHandler = catchAsync(async (req, res, next) => {
  const signature = req.headers['x-razorpay-signature'];

  // req.body is a raw Buffer from express.raw()
  const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(JSON.stringify(req.body));

  const expectedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  if (signature !== expectedSignature) {
    return next(new AppError('Invalid webhook signature', 400));
  }

  const { event, payload } = JSON.parse(rawBody.toString());

  if (event === 'payment.failed') {
    const orderId = payload.payment.entity.order_id;
    await Payment.findOneAndUpdate({ razorpayOrderId: orderId }, { status: 'failed' });
  }

  res.json({ status: 'success' });
});

exports.getMyPayments = catchAsync(async (req, res) => {
  const payments = await Payment.find({
    student: req.user._id,
    status: 'paid',
  })
    .sort({ paidAt: -1 })
    .select('-razorpaySignature');

  res.json({ status: 'success', results: payments.length, data: { payments } });
});

exports.getMyFeeStatus = catchAsync(async (req, res, next) => {
  const student = req.user;

  // Handle graduated students gracefully
  if (student.isGraduated) {
    return res.json({
      status: 'success',
      data: { graduated: true, message: 'You have successfully graduated. All fees are cleared.' },
    });
  }

  const feeStructureCacheKey = `fs:${student.course}:${student.currentYear}:${student.academicYear}`;
  let feeStructure = await cache.get(feeStructureCacheKey);
  if (!feeStructure) {
    feeStructure = await FeeStructure.findOne({
      course: student.course,
      year: student.currentYear,
      academicYear: student.academicYear,
      isActive: true,
    }).lean();
    if (feeStructure) await cache.set(feeStructureCacheKey, feeStructure, 300); // 5 min TTL
  }

  if (!feeStructure) return res.json({
    status: 'success',
    data: { noStructure: true, message: `Fee structure not yet configured for Year ${student.currentYear} (${student.academicYear}). Please contact admin.` },
  });

  const payments = await Payment.find({
    student: student._id,
    feeStructure: feeStructure._id,
    status: 'paid',
  });

  const waiver = await getStudentWaiver(student._id, feeStructure._id);
  const discountAmount = waiver ? waiver.discountAmount : 0;
  const effectiveTotal = feeStructure.totalAmount - discountAmount;
  const paidAmount = payments.reduce((sum, p) => sum + p.amountInRupees, 0);
  const lateFee = calculateLateFee(feeStructure, 1);

  res.json({
    status: 'success',
    data: {
      totalFees: feeStructure.totalAmount,
      discountAmount,
      discountReason: waiver?.reason || null,
      effectiveFees: effectiveTotal,
      paidAmount,
      pendingAmount: Math.max(0, effectiveTotal - paidAmount),
      lateFeeApplicable: lateFee,
      feeComponents: feeStructure.components,
      payments,
    },
  });
});

exports.downloadReceipt = catchAsync(async (req, res, next) => {
  // student filter ensures a student can ONLY access their own receipt
  const filter = { _id: req.params.paymentId, status: 'paid' };
  if (req.userRole === 'student') filter.student = req.user._id;

  const payment = await Payment.findOne(filter)
    .populate('student', 'name studentId email mobile');

  if (!payment) return next(new AppError('Payment receipt not found', 404));

  const pdfBuffer = await generateReceiptPDF(payment);

  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': `attachment; filename="receipt-${payment.receiptNumber}.pdf"`,
    'Content-Length': pdfBuffer.length,
  });
  res.end(pdfBuffer);
});

// Admin: Get all payments with filters
exports.getAllPayments = catchAsync(async (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 20;
  const skip = (page - 1) * limit;

  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.from || req.query.to) {
    filter.paidAt = {};
    if (req.query.from) filter.paidAt.$gte = new Date(req.query.from);
    if (req.query.to) filter.paidAt.$lte = new Date(req.query.to);
  }

  const [payments, total] = await Promise.all([
    Payment.find(filter)
      .populate('student', 'name studentId course currentYear')
      .populate({ path: 'student', populate: { path: 'course', select: 'name code' } })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .select('-razorpaySignature'),
    Payment.countDocuments(filter),
  ]);

  res.json({
    status: 'success',
    results: payments.length,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
    data: { payments },
  });
});
