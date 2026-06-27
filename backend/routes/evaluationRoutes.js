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
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();

const buildFilter = (query) => {
  const filter = {};
  ['assignmentId', 'faculty', 'facultyId', 'department', 'departmentId', 'courseCode', 'lecturerId', 'className', 'classId', 'semester', 'academicYear'].forEach((key) => {
    if (query[key]) filter[key] = query[key];
  });
  if (query.dateFrom || query.dateTo) {
    filter.submittedAt = {};
    if (query.dateFrom) filter.submittedAt.$gte = new Date(query.dateFrom);
    if (query.dateTo) filter.submittedAt.$lte = new Date(query.dateTo);
  }
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
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {})
  };
  const assignmentFilter = {
    status: { $ne: 'inactive' },
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {}),
    ...(filter.courseCode ? { courseCode: filter.courseCode } : {}),
    ...(filter.lecturerId ? { lecturerId: filter.lecturerId } : {}),
    ...(filter.assignmentId ? { assignmentId: filter.assignmentId } : {})
  };
  const [students, lecturers, courses, rawAssignments] = await Promise.all([
    Student.find(studentFilter).lean(),
    Lecturer.find({ status: 'active' }).lean(),
    Course.find({ status: 'active', ...(filter.courseCode ? { courseCode: filter.courseCode } : {}) }).lean(),
    CourseAssignment.find(assignmentFilter).lean()
  ]);
  const eligibleClasses = new Set(students.map((item) => item.className));
  const assignments = rawAssignments.filter((item) => eligibleClasses.has(item.className));
  const totalStudents = students.length;
  const totalLecturers = lecturers.length;
  const totalCourses = courses.length;

  const lecturerRanking = groupAverage(evaluations, 'lecturerName', 'lecturerOverallRating');
  const courseSatisfaction = groupAverage(evaluations, 'courseName', 'courseOverallRating');
  const departmentComparison = groupAverage(evaluations, 'department', 'courseOverallRating');
  const facultyComparison = groupAverage(evaluations, 'faculty', 'courseOverallRating');
  const classComparison = groupAverage(evaluations, 'className', 'courseOverallRating');
  const semesterTrends = groupAverage(evaluations, 'semester', 'courseOverallRating');
  const activeSemesters = [...new Set(assignments.map((item) => item.semester).filter(Boolean))];
  const studentFacultyByClass = new Map();
  students.forEach((item) => {
    if (!studentFacultyByClass.has(item.className)) studentFacultyByClass.set(item.className, item.faculty || 'Unknown');
  });

  const teacherMap = new Map(lecturers.map((item) => [item.lecturerId, {
    lecturerId: item.lecturerId,
    teacher: item.fullName,
    faculty: 'Not assigned',
    total: 0,
    totalEvaluations: 0
  }]));
  assignments.forEach((item) => {
    const teacher = teacherMap.get(item.lecturerId);
    if (teacher) teacher.faculty = studentFacultyByClass.get(item.className) || teacher.faculty;
  });
  evaluations.forEach((item) => {
    const teacher = teacherMap.get(item.lecturerId) || {
      lecturerId: item.lecturerId,
      teacher: item.lecturerName,
      faculty: item.faculty || 'Unknown',
      total: 0,
      totalEvaluations: 0
    };
    teacher.faculty = item.faculty || teacher.faculty;
    teacher.total += Number(item.lecturerOverallRating || 0);
    teacher.totalEvaluations += 1;
    teacherMap.set(item.lecturerId, teacher);
  });
  const teacherLeaderboard = [...teacherMap.values()]
    .map((item) => ({
      ...item,
      averageScore: item.totalEvaluations ? Number((item.total / item.totalEvaluations).toFixed(2)) : 0,
      trend: item.totalEvaluations ? (item.total / item.totalEvaluations >= 4 ? 'up' : item.total / item.totalEvaluations >= 3 ? 'stable' : 'down') : 'pending'
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.totalEvaluations - a.totalEvaluations || a.teacher.localeCompare(b.teacher))
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const courseMap = new Map(courses.map((item) => [item.courseCode, {
    courseCode: item.courseCode,
    course: item.courseName,
    total: 0,
    totalEvaluations: 0
  }]));
  evaluations.forEach((item) => {
    const course = courseMap.get(item.courseCode) || {
      courseCode: item.courseCode,
      course: item.courseName,
      total: 0,
      totalEvaluations: 0
    };
    course.total += Number(item.courseOverallRating || 0);
    course.totalEvaluations += 1;
    courseMap.set(item.courseCode, course);
  });
  const courseLeaderboard = [...courseMap.values()]
    .map((item) => ({ ...item, averageScore: item.totalEvaluations ? Number((item.total / item.totalEvaluations).toFixed(2)) : 0 }))
    .sort((a, b) => b.averageScore - a.averageScore || b.totalEvaluations - a.totalEvaluations)
    .map((item, index) => ({ ...item, rank: index + 1 }));

  const assignmentParticipation = assignments.map((assignment) => {
    const eligible = students.filter((student) => student.className === assignment.className).length;
    const submitted = new Set(
      evaluations.filter((item) => item.assignmentId === assignment.assignmentId).map((item) => item.studentId)
    ).size;
    return {
      assignmentId: assignment.assignmentId,
      courseCode: assignment.courseCode,
      courseName: assignment.courseName,
      className: assignment.className,
      lecturerId: assignment.lecturerId,
      lecturerName: assignment.lecturerName,
      semester: assignment.semester,
      eligible,
      submitted,
      pending: Math.max(eligible - submitted, 0),
      participationRate: eligible ? Number(((submitted / eligible) * 100).toFixed(1)) : 0
    };
  });
  const possibleSubmissions = assignmentParticipation.reduce((sum, item) => sum + item.eligible, 0);
  const submittedAssignments = assignmentParticipation.reduce((sum, item) => sum + item.submitted, 0);
  const participationRate = possibleSubmissions ? Number(((submittedAssignments / possibleSubmissions) * 100).toFixed(1)) : 0;

  return {
    totals: {
      students: totalStudents,
      lecturers: totalLecturers,
      courses: totalCourses,
      evaluations: evaluations.length,
      participationRate,
      averageSatisfactionScore: avg(evaluations, 'courseOverallRating'),
      averageLecturerScore: avg(evaluations, 'lecturerOverallRating'),
      topLecturer: teacherLeaderboard.find((item) => item.totalEvaluations)?.teacher || 'N/A',
      lowRatedCourses: courseSatisfaction.filter((item) => item.average < 3).length,
      activeSemesters: activeSemesters.length
    },
    lecturerRanking,
    courseSatisfaction,
    departmentComparison,
    facultyComparison,
    classComparison,
    departmentRankings: departmentComparison,
    facultyRankings: facultyComparison,
    universityRankings: teacherLeaderboard,
    bestDepartment: departmentComparison[0] || null,
    worstDepartment: [...departmentComparison].reverse().find((item) => item.submissions > 0) || null,
    bestFaculty: facultyComparison[0] || null,
    worstFaculty: [...facultyComparison].reverse().find((item) => item.submissions > 0) || null,
    highestParticipation: [...assignmentParticipation].sort((a, b) => b.participationRate - a.participationRate)[0] || null,
    lowestParticipation: [...assignmentParticipation].sort((a, b) => a.participationRate - b.participationRate)[0] || null,
    highestRatedLecturer: teacherLeaderboard.find((item) => item.totalEvaluations > 0) || null,
    lowestRatedLecturer: [...teacherLeaderboard].reverse().find((item) => item.totalEvaluations > 0) || null,
    highestRatedCourse: courseLeaderboard.find((item) => item.totalEvaluations > 0) || null,
    lowestRatedCourse: [...courseLeaderboard].reverse().find((item) => item.totalEvaluations > 0) || null,
    highestRatedClass: classComparison[0] || null,
    lowestRatedClass: [...classComparison].reverse().find((item) => item.submissions > 0) || null,
    semesterTrends,
    participationChart: [
      { name: 'Submitted', value: submittedAssignments },
      { name: 'Not submitted', value: Math.max(possibleSubmissions - submittedAssignments, 0) }
    ],
    assignmentParticipation,
    topLecturers: lecturerRanking.slice(0, 5),
    teacherLeaderboard,
    bestTeachers: teacherLeaderboard.slice(0, 10),
    lowestPerformingTeachers: [...teacherLeaderboard].filter((item) => item.totalEvaluations > 0).reverse().slice(0, 10),
    bestCourses: courseLeaderboard.slice(0, 10),
    worstCourses: [...courseLeaderboard].reverse().slice(0, 10),
    mostEvaluatedCourses: [...courseLeaderboard].sort((a, b) => b.totalEvaluations - a.totalEvaluations).slice(0, 10),
    leastEvaluatedCourses: [...courseLeaderboard].sort((a, b) => a.totalEvaluations - b.totalEvaluations).slice(0, 10),
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
    ...(student.departmentId ? { departmentId: student.departmentId } : {}),
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
    facultyId: student.facultyId || assignment.facultyId,
    department: student.department,
    departmentId: student.departmentId || assignment.departmentId,
    className: assignment.className,
    classId: student.classId || assignment.classId,
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

router.get('/', protect, authorize('admin', 'registration', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(scopedQuery(req, req.query));
  if (req.user.role === 'lecturer') filter.lecturerId = req.user.loginId;
  const evaluations = await Evaluation.find(filter).sort({ submittedAt: -1 }).lean();
  const studentIds = evaluations.map((item) => item.studentId);
  const students = await Student.find({ studentId: { $in: studentIds } }).lean();
  const studentMap = Object.fromEntries(students.map((student) => [student.studentId, student]));
  res.json({
    data: evaluations.map((item) => ({
      ...item,
      studentName: item.anonymous ? 'Anonymous' : studentMap[item.studentId]?.fullName || item.studentId
    }))
  });
});

router.post('/', protect, authorize('admin', 'student'), createEvaluation);

router.get('/student/:studentId', protect, async (req, res) => {
  if (req.user.role === 'student' && req.user.loginId !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const data = await Evaluation.find({ studentId: req.params.studentId }).sort({ submittedAt: -1 });
  res.json({ data });
});

router.get('/reports', protect, authorize('admin', 'registration', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(scopedQuery(req, req.query));
  if (req.user.role === 'lecturer') filter.lecturerId = req.user.loginId;
  const evaluations = await Evaluation.find(filter).lean();
  const studentCount = await Student.countDocuments({
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {})
  });
  const assignmentCount = await CourseAssignment.countDocuments({
    status: { $ne: 'inactive' },
    ...(filter.faculty ? { faculty: filter.faculty } : {}),
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.department ? { department: filter.department } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {}),
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

router.get('/analytics', protect, authorize('admin', 'registration', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const scoped = scopedQuery(req, req.query);
  if (req.user.role === 'lecturer') scoped.lecturerId = req.user.loginId;
  res.json(await getAnalyticsData(scoped));
});

router.get('/export-csv', protect, authorize('admin', 'registration', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const filter = buildFilter(scopedQuery(req, req.query));
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
