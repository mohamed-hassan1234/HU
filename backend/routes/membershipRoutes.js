const express = require('express');
const StudentClassMembership = require('../models/StudentClassMembership');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();

router.get('/me', protect, authorize('student'), async (req, res) => {
  res.json(await StudentClassMembership.find({ studentId: req.user.loginId }).sort({ startedAt: -1 }).lean());
});

router.get('/student/:studentId', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const student = await Student.findOne(scopedQuery(req, { studentId: req.params.studentId })).lean();
  if (!student) return res.status(404).json({ message: 'Student not found' });
  res.json(await StudentClassMembership.find({ student: student._id }).sort({ startedAt: -1 }).lean());
});

module.exports = router;
