const express = require('express');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const CourseAssignment = require('../models/CourseAssignment');
const { protect } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();

const asyncRoute = (handler) => (req, res, next) => {
  Promise.resolve(handler(req, res, next)).catch(next);
};

const requireDatabase = (req, res, next) => {
  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({ message: 'Database connection is unavailable. Please check MongoDB configuration.' });
};

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, loginId: user.loginId },
    process.env.JWT_SECRET || 'hucems_dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const getProfile = async (user) => {
  if (user.role === 'student') return Student.findOne({ studentId: user.loginId });
  if (user.role === 'lecturer') {
    const [lecturer, assignments] = await Promise.all([
      Lecturer.findOne({ lecturerId: user.loginId }).lean(),
      CourseAssignment.find({ lecturerId: user.loginId, status: { $ne: 'inactive' } }).lean()
    ]);
    if (!lecturer) return null;
    const classes = [...new Set(assignments.map((item) => item.className).filter(Boolean))];
    const students = classes.length
      ? await Student.find({ className: { $in: classes }, status: 'active' }).lean()
      : [];
    return {
      ...lecturer,
      faculty: [...new Set(students.map((item) => item.faculty).filter(Boolean))].join(', ') || 'Not assigned',
      department: [...new Set(students.map((item) => item.department).filter(Boolean))].join(', ') || 'Not assigned',
      assignedClasses: classes.join(', ') || 'None',
      assignedCourses: assignments.map((item) => `${item.courseCode} - ${item.courseName}`).join(', ') || 'None'
    };
  }
  return {
    fullName: user.fullName,
    email: user.email,
    faculty: user.faculty,
    facultyId: user.facultyId,
    department: user.department,
    departmentId: user.departmentId,
    permissions: user.permissions || []
  };
};

router.post('/login', requireDatabase, asyncRoute(async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) return res.status(400).json({ message: 'Login ID and password are required' });

  const user = await User.findOne({ loginId: loginId.trim() });
  if (!user || user.status !== 'active') return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  user.lastLogin = new Date();
  await user.save();

  const safeUser = user.toObject();
  delete safeUser.password;
  res.json({ token: signToken(user), user: safeUser, profile: await getProfile(user) });
}));

router.get('/me', requireDatabase, protect, asyncRoute(async (req, res) => {
  res.json({ user: req.user, profile: await getProfile(req.user) });
}));

router.put('/change-password', requireDatabase, protect, asyncRoute(async (req, res) => {
  const { currentPassword, newPassword, confirmPassword } = req.body;
  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: 'Current password, new password, and confirmation are required' });
  }
  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'New password must contain at least 8 characters' });
  }
  if (!/[a-z]/.test(newPassword) || !/[A-Z]/.test(newPassword) || !/\d/.test(newPassword) || !/[^A-Za-z0-9]/.test(newPassword)) {
    return res.status(400).json({ message: 'New password must include uppercase, lowercase, number, and symbol characters' });
  }
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: 'New password and confirmation do not match' });
  }
  if (currentPassword === newPassword) {
    return res.status(400).json({ message: 'New password must be different from the current password' });
  }

  const user = await User.findById(req.user._id);
  if (!user || !(await user.comparePassword(currentPassword))) {
    return res.status(400).json({ message: 'Current password is incorrect' });
  }
  user.password = newPassword;
  await user.save();
  await logActivity(req, 'change_password', 'user_account', user._id.toString());
  res.json({ message: 'Password updated successfully', token: signToken(user) });
}));

module.exports = router;
