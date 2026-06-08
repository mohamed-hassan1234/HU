const express = require('express');
const Evaluation = require('../models/Evaluation');
const EvaluationQuestion = require('../models/EvaluationQuestion');
const CourseAssignment = require('../models/CourseAssignment');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Course = require('../models/Course');
const { protect, authorize } = require('../middleware/auth');
const { sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();

const buildFilter = (query) => {
  const filter = {};
  ['assignmentId', 'faculty', 'department', 'courseCode', 'lecturerId', 'className', 'semester', 'academicYear'].forEach((key) => {
    if (query[key]) filter[key] = query[key];
  });
  return filter;
};

const avg = (rows, key) => {
  const valid = rows.filter((item) => Number(item[key]));
  return valid.length ? Number((valid.reduce((sum, item) => sum + Number(item[key]), 0) / valid.length).toFixed(2)) : 0;
};

const groupAverage = (rows, groupKey, scoreKey) => {
  const map = {};
  rows.forEach((item) => {
    const key = item[groupKey] || 'Unknown';
    map[key] ||= { name: key, total: 0, count: 0 };
    map[key].total += Number(item[scoreKey] || 0);
    map[key].count += 1;
  });
  return Object.values(map)
    .map((item) => ({ name: item.name, average: Number((item.total / item.count).toFixed(2)), submissions: item.count }))
    .sort((a, b) => b.average - a.average);
};

const getAnalyticsData = async (query = {}) => {
  const filter = buildFilter(query);
  const evaluations = await Evaluation.find(filter).lean();
  const studentFilter = {
    status: 'active',
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {})
  };
  const assignmentFilter = {
    status: { $ne: 'inactive' },
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {}),
    ...(filter.courseCode ? { courseCode: filter.courseCode } : {}),
    ...(filter.lecturerId ? { lecturerId: filter.lecturerId } : {}),
    ...(filter.assignmentId ? { assignmentId: filter.assignmentId } : {})
  };
  const [totalStudents, totalLecturers, totalCourses, totalAssignments] = await Promise.all([
    Student.countDocuments(studentFilter),
    Lecturer.countDocuments({ status: 'active' }),
    Course.countDocuments({ status: 'active' }),
    CourseAssignment.countDocuments(assignmentFilter)
  ]);

  const lecturerRanking = groupAverage(evaluations, 'lecturerName', 'lecturerOverallRating');
  const courseSatisfaction = groupAverage(evaluations, 'courseName', 'courseOverallRating');
  const departmentComparison = groupAverage(evaluations, 'department', 'courseOverallRating');
  const facultyComparison = groupAverage(evaluations, 'faculty', 'courseOverallRating');
  const semesterTrends = groupAverage(evaluations, 'semester', 'courseOverallRating');
  const possibleSubmissions = totalStudents * totalAssignments;
  const participationRate = possibleSubmissions ? Number(((evaluations.length / possibleSubmissions) * 100).toFixed(1)) : 0;

  return {
    totals: {
      students: totalStudents,
      lecturers: totalLecturers,
      courses: totalCourses,
      evaluations: evaluations.length,
      participationRate,
      averageSatisfactionScore: avg(evaluations, 'courseOverallRating'),
      averageLecturerScore: avg(evaluations, 'lecturerOverallRating'),
      topLecturer: lecturerRanking[0]?.name || 'N/A',
      lowRatedCourses: courseSatisfaction.filter((item) => item.average < 3).length
    },
    lecturerRanking,
    courseSatisfaction,
    departmentComparison,
    facultyComparison,
    semesterTrends,
    participationChart: [
      { name: 'Submitted', value: evaluations.length },
      { name: 'Pending', value: Math.max(possibleSubmissions - evaluations.length, 0) }
    ],
    topLecturers: lecturerRanking.slice(0, 5),
    lowCourses: [...courseSatisfaction].sort((a, b) => a.average - b.average).slice(0, 5),
    earlyWarnings: courseSatisfaction
      .filter((item) => item.average < 3)
      .map((item) => ({ ...item, warning: 'Low satisfaction score' })),
    heatmap: evaluations.map((item) => ({
      faculty: item.faculty,
      department: item.department,
      course: item.courseCode,
      lecturer: item.lecturerName,
      score: item.courseOverallRating
    }))
  };
};

const inferSentiment = (payload) => {
  const text = Object.values(payload.comments || {}).join(' ').toLowerCase();
  const positive = ['good', 'great', 'excellent', 'valuable', 'clear', 'helpful', 'best'];
  const negative = ['bad', 'poor', 'late', 'unclear', 'difficult', 'weak', 'improve'];
  const positiveHits = positive.filter((word) => text.includes(word)).length;
  const negativeHits = negative.filter((word) => text.includes(word)).length;
  const averageScore = ((Number(payload.courseOverallRating) || 0) + (Number(payload.lecturerOverallRating) || 0)) / 2;
  if (positiveHits > negativeHits || averageScore >= 4) return 'positive';
  if (negativeHits > positiveHits || averageScore < 3) return 'negative';
  return 'neutral';
};

const createEvaluation = async (req, res) => {
  const studentId = req.user.role === 'student' ? req.user.loginId : req.body.studentId;
  const student = await Student.findOne({ studentId });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });

  const assignment = await CourseAssignment.findOne({
    ...(req.body.assignmentId ? { assignmentId: req.body.assignmentId } : { courseCode: req.body.courseCode }),
    className: student.className,
    semester: student.semester,
    academicYear: student.academicYear,
    status: { $ne: 'inactive' }
  });
  if (!assignment) return res.status(404).json({ message: 'Course assignment not found for this student' });

  const exists = await Evaluation.findOne({
    studentId,
    assignment: assignment._id
  });
  if (exists) return res.status(409).json({ message: 'You have already evaluated this course for this semester' });

  const evaluation = await Evaluation.create({
    assignment: assignment._id,
    assignmentId: assignment.assignmentId,
    studentId,
    courseCode: assignment.courseCode,
    courseName: assignment.courseName,
    lecturerId: assignment.lecturerId,
    lecturerName: assignment.lecturerName,
    faculty: student.faculty,
    department: student.department,
    className: assignment.className,
    semester: assignment.semester,
    academicYear: assignment.academicYear,
    responses: req.body.responses || [],
    courseOverallRating: Number(req.body.courseOverallRating),
    lecturerOverallRating: Number(req.body.lecturerOverallRating),
    recommendation: req.body.recommendation || 'Maybe',
    attendanceRate: req.body.attendanceRate || '75-100%',
    comments: req.body.comments || {},
    anonymous: req.body.anonymous !== false,
    sentiment: inferSentiment(req.body)
  });

  await logActivity(req, 'submit', 'evaluation', evaluation._id.toString(), {
    assignmentId: evaluation.assignmentId,
    courseCode: evaluation.courseCode,
    studentId
  });
  res.status(201).json(evaluation);
};

router.get('/', protect, authorize('admin', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(req.query);
  if (req.user.role === 'lecturer') filter.lecturerId = req.user.loginId;
  const evaluations = await Evaluation.find(filter).sort({ submittedAt: -1 });
  res.json({ data: evaluations });
});

router.post('/', protect, authorize('admin', 'student'), createEvaluation);

router.get('/student/:studentId', protect, async (req, res) => {
  if (req.user.role === 'student' && req.user.loginId !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const data = await Evaluation.find({ studentId: req.params.studentId }).sort({ submittedAt: -1 });
  res.json({ data });
});

router.get('/reports', protect, authorize('admin', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(req.query);
  if (req.user.role === 'lecturer') filter.lecturerId = req.user.loginId;
  const evaluations = await Evaluation.find(filter).lean();
  const studentCount = await Student.countDocuments({
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {})
  });
  const assignmentCount = await CourseAssignment.countDocuments({
    status: { $ne: 'inactive' },
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {}),
    ...(filter.courseCode ? { courseCode: filter.courseCode } : {}),
    ...(filter.lecturerId ? { lecturerId: filter.lecturerId } : {}),
    ...(filter.assignmentId ? { assignmentId: filter.assignmentId } : {})
  });
  const possibleSubmissions = studentCount * assignmentCount;
  res.json({
    filters: filter,
    totalSubmissions: evaluations.length,
    participationRate: possibleSubmissions ? Number(((evaluations.length / possibleSubmissions) * 100).toFixed(1)) : 0,
    averageLecturerScore: avg(evaluations, 'lecturerOverallRating'),
    averageCourseScore: avg(evaluations, 'courseOverallRating'),
    courseSatisfaction: groupAverage(evaluations, 'courseName', 'courseOverallRating'),
    lecturerRanking: groupAverage(evaluations, 'lecturerName', 'lecturerOverallRating'),
    departmentComparison: groupAverage(evaluations, 'department', 'courseOverallRating'),
    facultyComparison: groupAverage(evaluations, 'faculty', 'courseOverallRating')
  });
});

router.get('/analytics', protect, authorize('admin', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const scopedQuery = { ...req.query };
  if (req.user.role === 'lecturer') scopedQuery.lecturerId = req.user.loginId;
  res.json(await getAnalyticsData(scopedQuery));
});

router.get('/export-csv', protect, authorize('admin', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(req.query);
  if (req.user.role === 'lecturer') filter.lecturerId = req.user.loginId;
  const rows = await Evaluation.find(filter).lean();
  sendCsv(res, 'evaluations.csv', rows, [
    { header: 'assignment_id', key: 'assignmentId' },
    { header: 'student_id', key: 'studentId' },
    { header: 'course_code', key: 'courseCode' },
    { header: 'course_name', key: 'courseName' },
    { header: 'lecturer_id', key: 'lecturerId' },
    { header: 'lecturer_name', key: 'lecturerName' },
    { header: 'faculty', key: 'faculty' },
    { header: 'department', key: 'department' },
    { header: 'class_name', key: 'className' },
    { header: 'semester', key: 'semester' },
    { header: 'academic_year', key: 'academicYear' },
    { header: 'course_overall_rating', key: 'courseOverallRating' },
    { header: 'lecturer_overall_rating', key: 'lecturerOverallRating' },
    { header: 'recommendation', key: 'recommendation' },
    { header: 'attendance_rate', key: 'attendanceRate' },
    { header: 'sentiment', key: 'sentiment' },
    { header: 'submitted_at', key: 'submittedAt' }
  ]);
});

module.exports = { router, createEvaluation, getAnalyticsData };
