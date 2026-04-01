const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

// Access token — short lived (15 min default)
exports.signAccessToken = (id, role, sessionId) => {
  return jwt.sign(
    { id, role, sessionId, jti: uuidv4() },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '15m' }
  );
};

// Refresh token — long lived (7 days default)
exports.signRefreshToken = (id, role, sessionId) => {
  return jwt.sign(
    { id, role, sessionId, jti: uuidv4() },
    process.env.JWT_REFRESH_SECRET,
    { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d' }
  );
};

exports.verifyRefreshToken = (token) => {
  return new Promise((resolve, reject) => {
    jwt.verify(token, process.env.JWT_REFRESH_SECRET, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};

// Called on login — returns both tokens + saves session to DB
exports.createSession = async (user, role, res, statusCode = 200) => {
  const sessionId = uuidv4();
  const accessToken = exports.signAccessToken(user._id, role, sessionId);
  const refreshToken = exports.signRefreshToken(user._id, role, sessionId);

  const refreshExpiry = new Date(
    Date.now() + parseDuration(process.env.JWT_REFRESH_EXPIRES_IN || '7d')
  );

  // Save sessionId + refreshToken to DB (hashed for security)
  const crypto = require('crypto');
  const hashedRefresh = crypto.createHash('sha256').update(refreshToken).digest('hex');

  await user.constructor.findByIdAndUpdate(user._id, {
    sessionId,
    refreshToken: hashedRefresh,
    refreshTokenExpiry: refreshExpiry,
    lastLogin: new Date(),
  });

  const userObj = user.toObject ? user.toObject() : { ...user };
  delete userObj.password;
  delete userObj.passwordResetToken;
  delete userObj.passwordResetExpiry;
  delete userObj.otp;
  delete userObj.otpExpiry;
  delete userObj.sessionId;
  delete userObj.refreshToken;

  res.status(statusCode).json({
    status: 'success',
    accessToken,
    refreshToken,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    data: { user: userObj },
  });
};

// Parse duration string like '7d', '15m', '1h' to milliseconds
const parseDuration = (str) => {
  const units = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
  const match = str.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 86400000;
  return parseInt(match[1]) * units[match[2]];
};
