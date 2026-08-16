const mongoose = require('mongoose');

const academicTermSchema = new mongoose.Schema(
  {
    academicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear', required: true },
    academicYearName: { type: String, required: true, trim: true },
    termNumber: { type: Number, enum: [1, 2], required: true },
    name: { type: String, required: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planned', 'active', 'closed'], default: 'planned' }
  },
  { timestamps: true }
);

academicTermSchema.index({ academicYear: 1, termNumber: 1 }, { unique: true });
academicTermSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

academicTermSchema.pre('validate', function validateDates(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('Academic term end date must be after its start date'));
  }
  next();
});

module.exports = mongoose.model('AcademicTerm', academicTermSchema);
