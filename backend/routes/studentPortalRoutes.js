const express = require('express');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const CourseAssignment = require('../models/CourseAssignment');
const StudentClassMembership = require('../models/StudentClassMembership');
const { activeCampaignForAssignment } = require('../utils/evaluationCampaign');
const { protect, authorize } = require('../middleware/auth');
const { createEvaluation } = require('./evaluationRoutes');

const router = express.Router();
router.use(protect, authorize('student'));

router.get('/my-courses', async (req, res) => {
  const student = await Student.findOne({ studentId: req.user.loginId });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const membership = await StudentClassMembership.findOne({ student: student._id, status: 'active' }).lean();
  if (!membership) return res.json([]);
  const classFilter = student.classId
    ? { classId: student.classId }
    : {
      className: student.className,
      ...(student.departmentId ? { departmentId: student.departmentId } : {})
    };
  const [courses, evaluations] = await Promise.all([
    CourseAssignment.find({
      ...classFilter,
      academicYearId: membership.academicYear,
      termId: membership.term,
      $or: [
        { assignmentMode: { $ne: 'students' } },
        { assignedStudents: { $exists: false } },
        { assignedStudents: { $size: 0 } },
        { assignedStudents: student.studentId }
      ],
      status: { $ne: 'inactive' }
    }).sort({ courseCode: 1 }),
    Evaluation.find({ studentId: student.studentId })
  ]);
  const evaluated = new Set(evaluations.map((item) => item.assignmentId || String(item.assignment)));
  res.json(await Promise.all(
    courses.map(async (course) => ({
      ...course.toObject(),
      evaluationOpen: Boolean(await activeCampaignForAssignment(course)),
      evaluated: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)),
      studentStatus: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)) ? 'Completed' : 'Pending'
    }))
  ));
});

router.get('/evaluated-courses', async (req, res) => {
  const data = await Evaluation.find({ studentId: req.user.loginId }).sort({ submittedAt: -1 });
  res.json({ data });
});

router.post('/submit-evaluation', createEvaluation);

module.exports = router;
