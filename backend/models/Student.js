const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    className: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    password: { type: String, select: false },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
