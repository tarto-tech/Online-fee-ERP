const mongoose = require('mongoose');

const feeWaiverSchema = new mongoose.Schema(
  {
    student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
    feeStructure: { type: mongoose.Schema.Types.ObjectId, ref: 'FeeStructure', required: true },
    discountAmount: { type: Number, required: true, min: 1 },
    reason: { type: String, required: true, trim: true },
    grantedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin', required: true },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// One waiver per student per fee structure
feeWaiverSchema.index({ student: 1, feeStructure: 1 }, { unique: true });

module.exports = mongoose.model('FeeWaiver', feeWaiverSchema);
