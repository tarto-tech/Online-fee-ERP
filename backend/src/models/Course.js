const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    duration: { type: Number, required: true, min: 1, max: 6 }, // years
    description: { type: String, trim: true },
    isActive: { type: Boolean, default: true },
    totalStudents: { type: Number, default: 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
