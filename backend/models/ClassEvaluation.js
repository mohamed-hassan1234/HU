const mongoose = require('mongoose');

const topStudentSchema = new mongoose.Schema(
  {
    position: { type: Number, min: 1, max: 3, required: true },
    studentId: { type: String, required: true, trim: true },
    studentName: { type: String, required: true, trim: true }
  },
  { _id: false }
);

const classEvaluationSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseAssignment', required: true },
    assignmentId: { type: String, required: true, trim: true },
    lecturerId: { type: String, required: true, trim: true },
    lecturerName: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    classId: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
    faculty: { type: String, required: true, trim: true },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    department: { type: String, required: true, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    semester: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    classPerformance: { type: String, enum: ['excellent', 'good', 'average', 'poor'], required: true },
    courseStatus: { type: String, enum: ['completed', 'in_progress', 'remaining'], required: true },
    courseCompletion: { type: Number, min: 0, max: 100, required: true },
    attendanceQuality: { type: String, enum: ['excellent', 'good', 'average', 'poor'], required: true },
    attendancePercent: { type: Number, min: 0, max: 100, required: true },
    participationQuality: { type: String, enum: ['excellent', 'good', 'average', 'poor'], required: true },
    topStudents: [topStudentSchema],
    strengths: { type: String, trim: true, default: '' },
    improvements: { type: String, trim: true, default: '' },
    announcement: { type: String, trim: true, default: '' },
    overallScore: { type: Number, min: 0, max: 5, required: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

classEvaluationSchema.index({ assignment: 1, lecturerId: 1 }, { unique: true });

module.exports = mongoose.model('ClassEvaluation', classEvaluationSchema);
