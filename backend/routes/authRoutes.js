const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const { protect } = require('../middleware/auth');

const router = express.Router();

const signToken = (user) =>
  jwt.sign(
    { id: user._id, role: user.role, loginId: user.loginId },
    process.env.JWT_SECRET || 'hucems_dev_secret',
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );

const getProfile = async (user) => {
  if (user.role === 'student') return Student.findOne({ studentId: user.loginId });
  if (user.role === 'lecturer') return Lecturer.findOne({ lecturerId: user.loginId });
  return null;
};

router.post('/login', async (req, res) => {
  const { loginId, password } = req.body;
  if (!loginId || !password) return res.status(400).json({ message: 'Login ID and password are required' });

  const user = await User.findOne({ loginId });
  if (!user || user.status !== 'active') return res.status(401).json({ message: 'Invalid credentials' });

  const valid = await user.comparePassword(password);
  if (!valid) return res.status(401).json({ message: 'Invalid credentials' });

  const safeUser = user.toObject();
  delete safeUser.password;
  res.json({ token: signToken(user), user: safeUser, profile: await getProfile(user) });
});

router.get('/me', protect, async (req, res) => {
  res.json({ user: req.user, profile: await getProfile(req.user) });
});

module.exports = router;
