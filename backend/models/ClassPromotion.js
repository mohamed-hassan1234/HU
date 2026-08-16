const mongoose = require('mongoose');

const outcomeSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  studentId: { type: String, required: true },
  outcome: { type: String, enum: ['promoted', 'repeated', 'transferred', 'suspended', 'withdrawn', 'graduated'], required: true },
  destinationClass: { type: mongoose.Schema.Types.ObjectId, ref: 'Class' },
  reason: { type: String, trim: true, default: '' }
}, { _id: false });

const promotionSchema = new mongoose.Schema({
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  fromAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  fromTerm: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  fromSemester: { type: Number, required: true },
  toAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
  toTerm: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm' },
  toSemester: Number,
  outcomes: [outcomeSchema],
  status: { type: String, enum: ['completed', 'reversed'], default: 'completed' },
  promotedBy: { type: String, required: true },
  promotedAt: { type: Date, default: Date.now },
  reversedBy: String,
  reversedAt: Date,
  reversalReason: String
}, { timestamps: true });

promotionSchema.index({ class: 1, fromAcademicYear: 1, fromTerm: 1 }, { unique: true });

module.exports = mongoose.model('ClassPromotion', promotionSchema);
