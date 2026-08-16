const mongoose = require('mongoose');

const campaignSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
  academicYearName: { type: String, required: true, trim: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm', required: true },
  termNumber: { type: Number, enum: [1, 2], required: true },
  startsAt: { type: Date, required: true },
  endsAt: { type: Date, required: true },
  targetType: { type: String, enum: ['all', 'faculty', 'department', 'class'], default: 'all' },
  targetIds: [{ type: mongoose.Schema.Types.ObjectId }],
  minimumResponses: { type: Number, min: 1, default: 5 },
  status: { type: String, enum: ['scheduled', 'open', 'closed', 'published'], default: 'scheduled' },
  createdBy: { type: String, required: true, trim: true },
  publishedAt: Date
}, { timestamps: true });

campaignSchema.index({ academicYear: 1, term: 1 }, { unique: true });
campaignSchema.pre('validate', function validateWindow(next) {
  if (this.startsAt && this.endsAt && this.startsAt >= this.endsAt) return next(new Error('Campaign end must be after its start'));
  next();
});

module.exports = mongoose.model('EvaluationCampaign', campaignSchema);
