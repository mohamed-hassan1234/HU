const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    classCode: { type: String, trim: true, uppercase: true, unique: true, sparse: true },
    className: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    facultyName: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    departmentName: { type: String, required: true, trim: true },
    currentAcademicYear: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicYear' },
    currentAcademicYearName: { type: String, trim: true },
    currentTerm: { type: mongoose.Schema.Types.ObjectId, ref: 'AcademicTerm' },
    currentTermNumber: { type: Number, enum: [1, 2] },
    currentSemester: { type: Number, min: 1, max: 20 },
    // Legacy snapshots remain temporarily while assignments/evaluations are migrated.
    academicYear: { type: String, trim: true },
    semester: { type: String, trim: true },
    status: { type: String, enum: ['planned', 'active', 'suspended', 'graduated', 'archived', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

classSchema.index({ className: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
