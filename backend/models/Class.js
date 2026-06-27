const mongoose = require('mongoose');

const classSchema = new mongoose.Schema(
  {
    className: { type: String, required: true, trim: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    facultyName: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    departmentName: { type: String, required: true, trim: true },
    academicYear: { type: String, required: true, trim: true },
    semester: { type: String, required: true, trim: true },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

classSchema.index({ department: 1, className: 1, academicYear: 1, semester: 1 }, { unique: true });

module.exports = mongoose.model('Class', classSchema);
