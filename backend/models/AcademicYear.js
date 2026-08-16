const mongoose = require('mongoose');

const academicYearSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    status: { type: String, enum: ['planned', 'active', 'closed'], default: 'planned' }
  },
  { timestamps: true }
);

academicYearSchema.index(
  { status: 1 },
  { unique: true, partialFilterExpression: { status: 'active' } }
);

academicYearSchema.pre('validate', function validateDates(next) {
  if (this.startDate && this.endDate && this.startDate >= this.endDate) {
    return next(new Error('Academic year end date must be after its start date'));
  }
  next();
});

module.exports = mongoose.model('AcademicYear', academicYearSchema);
