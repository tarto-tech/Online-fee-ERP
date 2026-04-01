const crypto = require('crypto');
const Student = require('../models/Student');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { createSession } = require('../utils/tokenHelper');
const logger = require('../utils/logger');

// ── OTP helpers ──────────────────────────────────────────────────────────────

const sendOtpSms = async (mobile, otp) => {
  if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
    const twilio = require('twilio')(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
    await twilio.messages.create({
      body: `Your Kalpataru College OTP is: ${otp}. Valid for 10 minutes.`,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: `+91${mobile}`,
    });
    logger.info(`OTP sent via SMS to ${mobile}`);
  } else {
    logger.info(`[DEV] OTP for ${mobile}: ${otp}`);
  }
};

// ── OTP Login ─────────────────────────────────────────────────────────────────

exports.sendOtp = catchAsync(async (req, res, next) => {
  const { mobile } = req.body;

  const student = await Student.findOne({ mobile, isActive: true });
  if (!student) return next(new AppError('No active student found with this mobile number', 404));

  const otp = crypto.randomInt(100000, 999999).toString();
  const otpExpiry = new Date(Date.now() + 10 * 60 * 1000);

  await Student.findByIdAndUpdate(student._id, { otp, otpExpiry });

  try {
    await sendOtpSms(mobile, otp);
  } catch (err) {
    logger.error('OTP SMS failed:', err.message);
    return res.json({ status: 'success', message: 'OTP generated (SMS failed)', otp });
  }

  res.json({
    status: 'success',
    message: 'OTP sent successfully',
    ...(!process.env.TWILIO_ACCOUNT_SID && { otp }),
  });
});

exports.verifyOtp = catchAsync(async (req, res, next) => {
  const { mobile, otp } = req.body;

  const student = await Student.findOne({ mobile, isActive: true }).select('+otp +otpExpiry');
  if (!student) return next(new AppError('Student not found', 404));

  if (!student.otp || student.otp !== otp)
    return next(new AppError('Invalid OTP', 401));

  if (student.otpExpiry < Date.now())
    return next(new AppError('OTP has expired. Please request a new one', 401));

  await Student.findByIdAndUpdate(student._id, { $unset: { otp: 1, otpExpiry: 1 } });

  const populated = await Student.findById(student._id).populate('course', 'name code duration');
  await createSession(populated, 'student', res);
});

// ── Profile ───────────────────────────────────────────────────────────────────

exports.updateProfile = catchAsync(async (req, res) => {
  const { mobile } = req.body;
  const update = {};
  if (mobile) update.mobile = mobile;

  const student = await Student.findByIdAndUpdate(req.user._id, update, {
    new: true, runValidators: true,
  }).populate('course', 'name code duration');

  res.json({ status: 'success', data: { student } });
});

exports.getMe = catchAsync(async (req, res) => {
  const student = await Student.findById(req.user._id).populate('course', 'name code duration');
  res.json({ status: 'success', data: { student } });
});
