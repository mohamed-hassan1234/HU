const express = require('express');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const CourseAssignment = require('../models/CourseAssignment');
const { protect, authorize } = require('../middleware/auth');
const { createEvaluation } = require('./evaluationRoutes');

const router = express.Router();
router.use(protect, authorize('student'));

router.get('/my-courses', async (req, res) => {
  const student = await Student.findOne({ studentId: req.user.loginId });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const [courses, evaluations] = await Promise.all([
    CourseAssignment.find({
      className: student.className,
      ...(student.departmentId ? { departmentId: student.departmentId } : {}),
      status: { $ne: 'inactive' }
    }).sort({ courseCode: 1 }),
    Evaluation.find({ studentId: student.studentId })
  ]);
  const evaluated = new Set(evaluations.map((item) => item.assignmentId || String(item.assignment)));
  res.json(
    courses.map((course) => ({
      ...course.toObject(),
      evaluated: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)),
      studentStatus: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)) ? 'Completed' : 'Pending'
    }))
  );
});

router.get('/evaluated-courses', async (req, res) => {
  const data = await Evaluation.find({ studentId: req.user.loginId }).sort({ submittedAt: -1 });
  res.json({ data });
});

router.post('/submit-evaluation', createEvaluation);

module.exports = router;
