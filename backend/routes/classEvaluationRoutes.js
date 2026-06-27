const express = require('express');
const ClassEvaluation = require('../models/ClassEvaluation');
const CourseAssignment = require('../models/CourseAssignment');
const Lecturer = require('../models/Lecturer');
const Student = require('../models/Student');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();
const qualityScore = { excellent: 5, good: 4, average: 3, poor: 2 };

const calculateOverall = (payload) => Number((
  (qualityScore[payload.classPerformance] || 0) * 0.4
  + (Number(payload.courseCompletion) / 20) * 0.3
  + (Number(payload.attendancePercent) / 20) * 0.3
).toFixed(2));

router.get('/options', protect, authorize('lecturer'), async (req, res) => {
  const assignments = await CourseAssignment.find({
    lecturerId: req.user.loginId,
    status: { $ne: 'inactive' }
  }).sort({ createdAt: -1 }).lean();
  const classes = [...new Set(assignments.map((item) => item.className))];
  const students = await Student.find({ className: { $in: classes }, status: 'active' })
    .sort({ fullName: 1 })
    .lean();
  res.json({
    assignments: assignments.map((assignment) => ({
      ...assignment,
      students: students
        .filter((student) => student.className === assignment.className)
        .map((student) => ({ studentId: student.studentId, studentName: student.fullName }))
    }))
  });
});

router.get('/mine', protect, authorize('lecturer'), async (req, res) => {
  const data = await ClassEvaluation.find({ lecturerId: req.user.loginId }).sort({ submittedAt: -1 }).lean();
  res.json({ data });
});

router.post('/', protect, authorize('lecturer'), async (req, res) => {
  const assignment = await CourseAssignment.findOne({
    _id: req.body.assignment,
    lecturerId: req.user.loginId,
    status: { $ne: 'inactive' }
  }).lean();
  if (!assignment) return res.status(403).json({ message: 'Select one of your assigned course classes' });

  const students = await Student.find({ className: assignment.className, status: 'active' }).lean();
  const studentMap = new Map(students.map((student) => [student.studentId, student]));
  const selectedIds = (req.body.topStudents || []).filter(Boolean);
  if (selectedIds.length > 3 || new Set(selectedIds).size !== selectedIds.length) {
    return res.status(400).json({ message: 'Select up to three different students' });
  }
  if (selectedIds.some((studentId) => !studentMap.has(studentId))) {
    return res.status(400).json({ message: 'Every top student must belong to the assigned class' });
  }
  const referenceStudent = students[0];
  if (!referenceStudent) return res.status(400).json({ message: 'This class has no active students' });
  const lecturer = await Lecturer.findOne({ lecturerId: req.user.loginId }).lean();
  const payload = {
    assignment: assignment._id,
    assignmentId: assignment.assignmentId,
    lecturerId: assignment.lecturerId,
    lecturerName: lecturer?.fullName || assignment.lecturerName,
    courseCode: assignment.courseCode,
    courseName: assignment.courseName,
    className: assignment.className,
    classId: assignment.classId,
    faculty: referenceStudent.faculty,
    facultyId: referenceStudent.facultyId || assignment.facultyId,
    department: referenceStudent.department,
    departmentId: referenceStudent.departmentId || assignment.departmentId,
    semester: assignment.semester,
    academicYear: assignment.academicYear,
    classPerformance: req.body.classPerformance,
    courseStatus: req.body.courseStatus,
    courseCompletion: Number(req.body.courseCompletion),
    attendanceQuality: req.body.attendanceQuality,
    attendancePercent: Number(req.body.attendancePercent),
    participationQuality: req.body.participationQuality,
    topStudents: selectedIds.map((studentId, index) => ({
      position: index + 1,
      studentId,
      studentName: studentMap.get(studentId).fullName
    })),
    strengths: req.body.strengths || '',
    improvements: req.body.improvements || '',
    announcement: req.body.announcement || '',
    submittedAt: new Date()
  };
  payload.overallScore = calculateOverall(payload);

  const evaluation = await ClassEvaluation.findOneAndUpdate(
    { assignment: assignment._id, lecturerId: req.user.loginId },
    payload,
    { upsert: true, new: true, runValidators: true }
  );
  await logActivity(req, 'submit', 'class_evaluation', evaluation._id.toString(), {
    assignmentId: assignment.assignmentId,
    className: assignment.className
  });
  res.status(201).json(evaluation);
});

router.get('/admin', protect, authorize('admin', 'registration', 'department_head', 'dean'), async (req, res) => {
  const filter = scopedQuery(req, {});
  ['faculty', 'department', 'className', 'lecturerId', 'semester', 'academicYear'].forEach((key) => {
    if (req.query[key]) filter[key] = req.query[key];
  });
  if (req.query.facultyId && req.user.role === 'admin') filter.facultyId = req.query.facultyId;
  if (req.query.departmentId && req.user.role === 'admin') filter.departmentId = req.query.departmentId;
  const data = await ClassEvaluation.find(filter).sort({ submittedAt: -1 }).lean();
  const classMap = new Map();
  data.forEach((item) => {
    const key = `${item.faculty}|${item.className}`;
    const row = classMap.get(key) || {
      className: item.className,
      faculty: item.faculty,
      department: item.department,
      reports: 0,
      scoreTotal: 0,
      completionTotal: 0,
      attendanceTotal: 0,
      courses: new Set(),
      teachers: new Set()
    };
    row.reports += 1;
    row.scoreTotal += Number(item.overallScore || 0);
    row.completionTotal += Number(item.courseCompletion || 0);
    row.attendanceTotal += Number(item.attendancePercent || 0);
    row.courses.add(item.courseCode);
    row.teachers.add(item.lecturerId);
    classMap.set(key, row);
  });
  const classRankings = [...classMap.values()]
    .map((item) => ({
      className: item.className,
      faculty: item.faculty,
      department: item.department,
      reports: item.reports,
      courses: item.courses.size,
      teachers: item.teachers.size,
      averageScore: Number((item.scoreTotal / item.reports).toFixed(2)),
      courseCompletion: Number((item.completionTotal / item.reports).toFixed(1)),
      attendancePercent: Number((item.attendanceTotal / item.reports).toFixed(1))
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.attendancePercent - a.attendancePercent)
    .map((item, index) => ({ ...item, universityRank: index + 1 }));
  const facultyWinners = [...new Set(classRankings.map((item) => item.faculty))]
    .map((faculty) => classRankings.find((item) => item.faculty === faculty))
    .filter(Boolean);

  res.json({
    data,
    classRankings,
    facultyWinners,
    bestUniversityClass: classRankings[0] || null,
    totals: {
      reports: data.length,
      classes: classRankings.length,
      faculties: facultyWinners.length,
      averageScore: data.length ? Number((data.reduce((sum, item) => sum + Number(item.overallScore || 0), 0) / data.length).toFixed(2)) : 0
    }
  });
});

module.exports = router;
