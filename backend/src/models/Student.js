const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const academicHistorySchema = new mongoose.Schema(
  {
    year: { type: Number, required: true },
    academicYear: { type: String, required: true },
    courseName: { type: String, required: true },
    courseCode: { type: String },
    courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    feeSnapshot: {
      totalFee: { type: Number, default: 0 },
      paidAmount: { type: Number, default: 0 },
      waiver: { type: Number, default: 0 },
      pendingAmount: { type: Number, default: 0 },
    },
    status: { type: String, enum: ['promoted', 'graduated', 'corrected'], default: 'promoted' },
    promotedAt: { type: Date, default: Date.now },
    promotionBatchId: { type: String },
  },
  { _id: false }
);

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, uppercase: true, trim: true },
    usn: { type: String, unique: true, sparse: true, uppercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    mobile: { type: String, required: true, unique: true, match: /^[6-9]\d{9}$/ },
    course: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
    currentYear: { type: Number, required: true, min: 1, max: 6 },
    academicYear: { type: String, required: true, match: /^\d{4}-\d{4}$/ },
    rollNumber: { type: String, trim: true },
    dateOfBirth: { type: Date },
    address: {
      street: String,
      city: String,
      state: String,
      pincode: { type: String, match: /^\d{6}$/ },
    },
    guardianName: { type: String, trim: true },
    guardianMobile: { type: String, match: /^[6-9]\d{9}$/ },
    profilePhoto: { type: String },
    isActive: { type: Boolean, default: true },
    isGraduated: { type: Boolean, default: false },
    graduatedAt: { type: Date },
    academicHistory: [academicHistorySchema],
    // Session
    sessionId: { type: String, select: false },
    refreshToken: { type: String, select: false },
    refreshTokenExpiry: { type: Date, select: false },
    lastLogin: { type: Date },
    // OTP login
    otp: { type: String, select: false },
    otpExpiry: { type: Date, select: false },
    // Email + password login
    password: { type: String, select: false },
    isPasswordReset: { type: Boolean, default: false },
    passwordResetToken: { type: String, select: false },
    passwordResetExpiry: { type: Date, select: false },
  },
  { timestamps: true }
);

studentSchema.index({ course: 1, currentYear: 1 });
studentSchema.index({ mobile: 1 });
studentSchema.index({ studentId: 1 });
studentSchema.index({ isGraduated: 1, isActive: 1 });

studentSchema.pre('save', async function (next) {
  if (!this.isModified('password') || !this.password) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

studentSchema.methods.comparePassword = async function (candidate) {
  return bcrypt.compare(candidate, this.password);
};

module.exports = mongoose.model('Student', studentSchema);
