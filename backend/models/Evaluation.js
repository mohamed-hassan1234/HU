const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema(
  {
    questionId: String,
    questionText: String,
    category: String,
    answer: mongoose.Schema.Types.Mixed,
    rating: Number
  },
  { _id: false }
);

const evaluationSchema = new mongoose.Schema(
  {
    assignment: { type: mongoose.Schema.Types.ObjectId, ref: 'CourseAssignment', required: true },
    assignmentId: { type: String, required: true, trim: true },
    studentId: { type: String, required: true, trim: true },
    courseCode: { type: String, required: true, trim: true },
    courseName: { type: String, required: true, trim: true },
    lecturerId: { type: String, required: true, trim: true },
    lecturerName: { type: String, required: true, trim: true },
    faculty: { type: String, required: true, trim: true },
    department: { type: String, required: true, trim: true },
    className: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    responses: [responseSchema],
    courseOverallRating: { type: Number, min: 1, max: 5 },
    lecturerOverallRating: { type: Number, min: 1, max: 5 },
    recommendation: { type: String, enum: ['Yes', 'Maybe', 'No'], default: 'Maybe' },
    attendanceRate: { type: String, enum: ['75-100%', '50-74%', 'Less than 50%'], default: '75-100%' },
    comments: {
      valuable: String,
      improve: String,
      missing: String,
      other: String
    },
    sentiment: { type: String, enum: ['positive', 'neutral', 'negative'], default: 'neutral' },
    anonymous: { type: Boolean, default: true },
    submittedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

evaluationSchema.index(
  { studentId: 1, assignment: 1 },
  { unique: true }
);

evaluationSchema.index(
  { studentId: 1, courseCode: 1, semester: 1, academicYear: 1 },
  { unique: true }
);

module.exports = mongoose.model('Evaluation', evaluationSchema);
