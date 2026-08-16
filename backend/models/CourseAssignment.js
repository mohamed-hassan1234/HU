const mongoose = require('mongoose');

const courseAssignmentSchema = new mongoose.Schema(
  {
    assignmentId: { type: String, required: true, unique: true, trim: true },
    assignmentTitle: { type: String, trim: true },
    assignmentDescription: { type: String, trim: true },
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
    academicYearId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    termId: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm' },
    termNumber: { type: Number, enum: [1, 2] },
    lecturerId: { type: String, required: true, trim: true },
    lecturerName: { type: String, required: true, trim: true },
    assignmentDate: { type: String, trim: true },
    dueDate: { type: String, trim: true },
    assignmentMode: { type: String, enum: ['class', 'students'], default: 'class' },
    assignedStudents: [{ type: String, trim: true }],
    createdBy: { type: String, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

courseAssignmentSchema.index(
  { courseCode: 1, classId: 1, academicYearId: 1, termId: 1 },
  { unique: true }
);
courseAssignmentSchema.index({ classId: 1, lecturerId: 1, status: 1 });
courseAssignmentSchema.index({ assignedStudents: 1 });

module.exports = mongoose.model('CourseAssignment', courseAssignmentSchema);
