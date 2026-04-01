const mongoose = require('mongoose');
const Counter = require('./Counter');

const paymentSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Student',
      required: true,
    },
    feeStructure: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'FeeStructure',
      required: true,
    },
    receiptNumber: {
      type: String,
      unique: true,
      sparse: true,
    },
    // Razorpay fields
    razorpayOrderId: { type: String, required: true, unique: true },
    razorpayPaymentId: { type: String, sparse: true },
    razorpaySignature: { type: String, select: false },

    amount: { type: Number, required: true, min: 1 }, // in paise (INR * 100)
    amountInRupees: { type: Number, required: true, min: 1 },
    currency: { type: String, default: 'INR' },

    installmentNumber: { type: Number, enum: [1, 2], default: 1 },
    isPartialPayment: { type: Boolean, default: false },

    status: {
      type: String,
      enum: ['created', 'paid', 'failed', 'refunded'],
      default: 'created',
    },

    paymentMethod: { type: String }, // upi, card, netbanking, etc.
    paidAt: { type: Date },

    lateFeeApplied: { type: Number, default: 0 },
    notes: { type: String, trim: true },

    // Snapshot of fee components at time of payment
    feeSnapshot: {
      courseName: String,
      year: Number,
      academicYear: String,
      components: [{ name: String, amount: Number }],
      discountAmount: { type: Number, default: 0 },
      discountReason: String,
    },
  },
  { timestamps: true }
);

paymentSchema.index({ student: 1, status: 1 });
paymentSchema.index({ paidAt: -1 });

// Generate receipt number atomically before save
paymentSchema.pre('save', async function (next) {
  if (!this.receiptNumber) {
    const year = new Date().getFullYear();
    const seq = await Counter.nextSeq(`receipt_${year}`);
    this.receiptNumber = `RCP${year}${String(seq).padStart(6, '0')}`;
  }
  next();
});

module.exports = mongoose.model('Payment', paymentSchema);
