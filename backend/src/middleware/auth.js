const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const Admin = require('../models/Admin');
const Student = require('../models/Student');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { isTokenBlocked, blockToken } = require('../config/cache');
const { signAccessToken, signRefreshToken, verifyRefreshToken } = require('../utils/tokenHelper');

const verifyAccessToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

exports.protect = catchAsync(async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return next(new AppError('Authentication required', 401));
  }

  const token = authHeader.split(' ')[1];
  const decoded = await verifyAccessToken(token);

  // 1. Check token blocklist (explicit logout)
  if (decoded.jti && await isTokenBlocked(decoded.jti)) {
    return next(new AppError('Session expired. Please login again', 401));
  }

  // 2. Load user + sessionId from DB
  let user;
  if (decoded.role === 'student') {
    user = await Student.findById(decoded.id).select('+isActive +sessionId');
    if (!user?.isActive) return next(new AppError('Student account is inactive', 401));
  } else {
    user = await Admin.findById(decoded.id).select('+passwordChangedAt +isActive +sessionId');
    if (!user?.isActive) return next(new AppError('Admin account is inactive', 401));
    if (user.changedPasswordAfter(decoded.iat)) {
      return next(new AppError('Password changed. Please login again', 401));
    }
  }

  // 3. Validate sessionId — if user logged in elsewhere, old tokens are rejected
  if (!user.sessionId || user.sessionId !== decoded.sessionId) {
    return next(new AppError('Session is no longer valid. Please login again', 401));
  }

  req.user = user;
  req.userRole = decoded.role;
  req.tokenDecoded = decoded;
  next();
});

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.userRole)) {
      return next(new AppError('You do not have permission to perform this action', 403));
    }
    next();
  };
};

// Logout — clears session from DB + blocks current access token
exports.logout = catchAsync(async (req, res) => {
  const { jti, exp, id, role } = req.tokenDecoded;

  // Block the current access token until its natural expiry
  if (jti) {
    const ttl = exp - Math.floor(Date.now() / 1000);
    if (ttl > 0) await blockToken(jti, ttl);
  }

  // Clear session from DB — invalidates refresh token too
  const Model = role === 'student' ? Student : Admin;
  await Model.findByIdAndUpdate(id, {
    $unset: { sessionId: 1, refreshToken: 1, refreshTokenExpiry: 1 },
  });

  res.json({ status: 'success', message: 'Logged out successfully' });
});

// Refresh — exchange valid refresh token for new access token
exports.refresh = catchAsync(async (req, res, next) => {
  const { refreshToken } = req.body;
  if (!refreshToken) return next(new AppError('Refresh token required', 400));

  let decoded;
  try {
    decoded = await verifyRefreshToken(refreshToken);
  } catch {
    return next(new AppError('Invalid or expired refresh token. Please login again', 401));
  }

  // Load user with stored refresh token hash
  const Model = decoded.role === 'student' ? Student : Admin;
  const user = await Model.findById(decoded.id).select(
    '+sessionId +refreshToken +refreshTokenExpiry +isActive'
  );

  if (!user?.isActive) return next(new AppError('Account is inactive', 401));

  // Validate sessionId matches
  if (!user.sessionId || user.sessionId !== decoded.sessionId) {
    return next(new AppError('Session is no longer valid. Please login again', 401));
  }

  // Validate stored refresh token hash
  const incomingHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
  if (user.refreshToken !== incomingHash) {
    return next(new AppError('Refresh token mismatch. Please login again', 401));
  }

  // Check refresh token expiry
  if (!user.refreshTokenExpiry || user.refreshTokenExpiry < new Date()) {
    return next(new AppError('Refresh token expired. Please login again', 401));
  }

  // Rotate: issue new access token + new refresh token, invalidate old one
  const { v4: uuidv4 } = require('uuid');
  const newSessionId = user.sessionId; // keep same session
  const newAccessToken = signAccessToken(user._id, decoded.role, newSessionId);
  const newRefreshToken = signRefreshToken(user._id, decoded.role, newSessionId);

  const parseDuration = (str) => {
    const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    const match = str.match(/^(\d+)([smhd])$/);
    if (!match) return 7 * 86400000;
    return parseInt(match[1]) * units[match[2]];
  };
  const newRefreshExpiry = new Date(Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d'));
  const newHashedRefresh = crypto.createHash('sha256').update(newRefreshToken).digest('hex');

  await Model.findByIdAndUpdate(user._id, {
    refreshToken: newHashedRefresh,
    refreshTokenExpiry: newRefreshExpiry,
  });

  res.json({
    status: 'success',
    accessToken: newAccessToken,
    refreshToken: newRefreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
  });
});
