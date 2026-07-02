const mongoose = require('mongoose');

const lecturerSchema = new mongoose.Schema(
  {
    lecturerId: { type: String, required: true, unique: true, trim: true },
    employeeId: { type: String, trim: true },
    firstName: { type: String, trim: true },
    middleName: { type: String, trim: true },
    lastName: { type: String, trim: true },
    fullName: { type: String, required: true, trim: true },
    gender: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true },
    phoneNumber: { type: String, trim: true },
    faculty: { type: String, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    position: { type: String, trim: true },
    employmentType: { type: String, trim: true },
    username: { type: String, trim: true },
    password: { type: String, select: false },
    notes: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Lecturer', lecturerSchema);
