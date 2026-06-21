const mongoose = require('mongoose');

const teacherCommentSchema = new mongoose.Schema(
  {
    lecturerId: { type: String, required: true, trim: true, index: true },
    lecturerName: { type: String, trim: true },
    className: { type: String, required: true, trim: true, index: true },
    comment: { type: String, required: true, trim: true },
    category: {
      type: String,
      enum: ['attendance', 'participation', 'coverage', 'assignments', 'practical', 'general'],
      default: 'general'
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('TeacherComment', teacherCommentSchema);
