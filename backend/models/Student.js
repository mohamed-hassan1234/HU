const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema(
  {
    studentId: { type: String, required: true, unique: true, trim: true },
    registrationNumber: { type: String, trim: true },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phoneNumber: { type: String, trim: true },
    faculty: { type: String, required: true, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    className: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    academicYear: { type: String, trim: true },
    semester: { type: String, trim: true },
    username: { type: String, trim: true },
    password: { type: String, select: false },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive', 'suspended', 'withdrawn', 'graduated'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Student', studentSchema);
