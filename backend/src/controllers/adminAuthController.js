const Admin = require('../models/Admin');
const catchAsync = require('../utils/catchAsync');
const AppError = require('../utils/AppError');
const { createSession } = require('../utils/tokenHelper');

exports.login = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  const admin = await Admin.findOne({ email, isActive: true }).select('+password');
  if (!admin || !(await admin.comparePassword(password))) {
    return next(new AppError('Invalid email or password', 401));
  }

  await createSession(admin, 'admin', res);
});

exports.getMe = catchAsync(async (req, res) => {
  res.json({ status: 'success', data: { user: req.user } });
});

exports.changePassword = catchAsync(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  const admin = await Admin.findById(req.user._id).select('+password');
  if (!(await admin.comparePassword(currentPassword))) {
    return next(new AppError('Current password is incorrect', 401));
  }

  admin.password = newPassword;
  await admin.save();

  // New login after password change — creates fresh session
  await createSession(admin, 'admin', res);
});
