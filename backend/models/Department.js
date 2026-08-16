const mongoose = require('mongoose');

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, trim: true, uppercase: true },
    faculty: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty', required: true },
    facultyName: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: '' },
    totalSemesters: { type: Number, min: 1, max: 20, default: 8 },
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

departmentSchema.index({ faculty: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Department', departmentSchema);
