const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema(
  {
    courseCode: { type: String, required: true, unique: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    creditHours: { type: Number, default: 3 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Course', courseSchema);
