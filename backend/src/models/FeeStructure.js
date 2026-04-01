const mongoose = require('mongoose');

const feeComponentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true }, // e.g., "Tuition Fee", "Lab Fee"
    amount: { type: Number, required: true, min: 0 },
    isOptional: { type: Boolean, default: false },
  },
  { _id: false }
);

const feeStructureSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    year: { type: Number, required: true, min: 1, max: 6 },
    academicYear: {
      type: String,
      required: true,
      match: /^\d{4}-\d{4}$/,
    }, // e.g., "2024-2025"
    components: [feeComponentSchema],
    totalAmount: { type: Number, required: true, min: 0 },
    lateFeePerDay: { type: Number, default: 0 },
    dueDateFirstInstallment: { type: Date },
    dueDateSecondInstallment: { type: Date },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate fee structure for same course+year+academicYear
feeStructureSchema.index(
  { course: 1, year: 1, academicYear: 1 },
  { unique: true }
);

// Auto-calculate totalAmount before save
feeStructureSchema.pre('save', function (next) {
  if (this.components?.length) {
    this.totalAmount = this.components.reduce((sum, c) => sum + c.amount, 0);
  }
  next();
});

module.exports = mongoose.model('FeeStructure', feeStructureSchema);
