const mongoose = require('mongoose');

const evaluationQuestionSchema = new mongoose.Schema(
  {
    questionId: { type: String, required: true, unique: true, trim: true },
    questionText: { type: String, required: true, trim: true },
    category: { type: String, required: true, trim: true },
    inputType: { type: String, enum: ['likert', 'star', 'radio', 'textarea'], default: 'likert' },
    options: [{ type: String }],
    order: { type: Number, default: 0 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' },
    scope: { type: String, enum: ['global', 'lecturer'], default: 'global' },
    lecturerId: { type: String, trim: true },
    courseCode: { type: String, trim: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('EvaluationQuestion', evaluationQuestionSchema);
