const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    loginId: { type: String, required: true, unique: true, trim: true },
    fullName: { type: String, trim: true },
    email: { type: String, trim: true, lowercase: true, sparse: true },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ['admin', 'registration', 'student', 'lecturer', 'dean'],
      required: true
    },
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: 'Faculty' },
    faculty: { type: String, trim: true },
    departmentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    department: { type: String, trim: true },
    permissions: [{ type: String, trim: true }],
    lastLogin: Date,
    status: { type: String, enum: ['active', 'inactive'], default: 'active' }
  },
  { timestamps: true }
);

userSchema.pre('save', async function hashPassword(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

userSchema.methods.comparePassword = function comparePassword(password) {
  return bcrypt.compare(password, this.password);
};

module.exports = mongoose.model('User', userSchema);
