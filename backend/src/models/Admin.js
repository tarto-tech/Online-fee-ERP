const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const adminSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: { type: String, required: true, minlength: 8, select: false },
    role: { type: String, enum: ['super_admin', 'admin'], default: 'admin' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    sessionId: { type: String, select: false },
    refreshToken: { type: String, select: false },
    refreshTokenExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

adminSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

adminSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

adminSchema.methods.changedPasswordAfter = function (jwtTimestamp) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtTimestamp < changedTimestamp;
  }
  return false;
};

module.exports = mongoose.model('Admin', adminSchema);
