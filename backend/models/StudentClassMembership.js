const mongoose = require('mongoose');

const membershipSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true, trim: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  classCode: { type: String, trim: true },
  className: { type: String, required: true, trim: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  academicYearName: { type: String, required: true, trim: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  termNumber: { type: Number, enum: [1, 2], required: true },
  semester: { type: Number, required: true, min: 1, max: 20 },
  joinedAt: { type: Date, default: Date.now },
  endedAt: Date,
  status: { type: String, enum: ['active', 'promoted', 'repeated', 'transferred', 'suspended', 'withdrawn', 'graduated'], default: 'active' },
  reason: { type: String, trim: true, default: '' }
}, { timestamps: true });

membershipSchema.index({ student: 1, status: 1 }, { unique: true, partialFilterExpression: { status: 'active' } });
membershipSchema.index({ class: 1, academicYear: 1, term: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('StudentClassMembership', membershipSchema);
