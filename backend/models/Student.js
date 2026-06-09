const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    password: { type: String, select: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
