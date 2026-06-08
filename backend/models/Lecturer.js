const mongoose = require('mongoose');

const lecturerSchema = new mongoose.Schema(
  {
    lecturerId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    password: { type: String, select: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lecturer', lecturerSchema);
