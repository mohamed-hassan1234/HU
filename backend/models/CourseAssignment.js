const mongoose = require('mongoose');

const courseAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true, unique: true, trim: true },
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    faculty: { type: String, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    className: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    semester: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    lecturerId: { type: String, required: true, trim: true },
    lecturerName: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

courseAssignmentSchema.index(
  { courseCode: 1, className: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('CourseAssignment', courseAssignmentSchema);
