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

const groupAverage = (rows, idKey, labelKey, scoreKey) => {
  const map = {};
  rows.forEach((item) => {
    const name = item[labelKey] || 'Unknown';
    const key = String(item[idKey] || name);
    map[key] ||= { id: key, name, total: 0, count: 0 };
    map[key].total += Number(item[scoreKey] || 0);
    map[key].count += 1;
  });
  return Object.values(map)
    .map((item) => ({ id: item.id, name: item.name, average: Number((item.total / item.count).toFixed(2)), submissions: item.count }))
    .sort((a, b) => b.average - a.average || b.submissions - a.submissions || a.name.localeCompare(b.name))
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

const reverseRank = (rows) => [...rows].filter((item) => item.submissions > 0).reverse();

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

  const lecturerRanking = groupAverage(evaluations, 'lecturerId', 'lecturerName', 'lecturerOverallRating');
  const courseSatisfaction = groupAverage(evaluations, 'courseCode', 'courseName', 'courseOverallRating');
  const departmentComparison = groupAverage(evaluations, 'departmentId', 'department', 'courseOverallRating');
  const facultyComparison = groupAverage(evaluations, 'facultyId', 'faculty', 'courseOverallRating');
  const classComparison = groupAverage(evaluations, 'classId', 'className', 'courseOverallRating');
  const semesterTrends = groupAverage(evaluations, 'semester', 'semester', 'courseOverallRating');
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
    const eligible = students.filter((student) => (
      assignment.classId
        ? String(student.classId) === String(assignment.classId)
        : student.className === assignment.className && (!assignment.departmentId || String(student.departmentId) === String(assignment.departmentId))
    )).length;
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
    classRankings: classComparison,
    universityRankings: teacherLeaderboard,
    bestDepartment: departmentComparison[0] || null,
    worstDepartment: reverseRank(departmentComparison)[0] || null,
    bestFaculty: facultyComparison[0] || null,
    worstFaculty: reverseRank(facultyComparison)[0] || null,
    highestParticipation: [...assignmentParticipation].sort((a, b) => b.participationRate - a.participationRate)[0] || null,
    lowestParticipation: [...assignmentParticipation].sort((a, b) => a.participationRate - b.participationRate)[0] || null,
    highestRatedLecturer: teacherLeaderboard.find((item) => item.totalEvaluations > 0) || null,
    lowestRatedLecturer: [...teacherLeaderboard].reverse().find((item) => item.totalEvaluations > 0) || null,
    highestRatedCourse: courseLeaderboard.find((item) => item.totalEvaluations > 0) || null,
    lowestRatedCourse: [...courseLeaderboard].reverse().find((item) => item.totalEvaluations > 0) || null,
    highestRatedClass: classComparison[0] || null,
    lowestRatedClass: reverseRank(classComparison)[0] || null,
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

const buildParticipationData = async (req) => {
  const query = scopedQuery(req, req.query);
  if (req.user.role === 'lecturer') query.lecturerId = req.user.loginId;
  const filter = buildFilter(query);
  const assignmentFilter = {
    status: { $ne: 'inactive' },
    ...(filter.assignmentId ? { assignmentId: filter.assignmentId } : {}),
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {}),
    ...(filter.semester ? { semester: filter.semester } : {}),
    ...(filter.academicYear ? { academicYear: filter.academicYear } : {}),
    ...(filter.courseCode ? { courseCode: filter.courseCode } : {}),
    ...(filter.lecturerId ? { lecturerId: filter.lecturerId } : {})
  };
  const assignments = await CourseAssignment.find(assignmentFilter).sort({ className: 1, courseCode: 1 }).lean();
  const assignmentIds = assignments.map((item) => item.assignmentId);
  const studentFilter = {
    status: 'active',
    ...(filter.facultyId ? { facultyId: filter.facultyId } : {}),
    ...(filter.departmentId ? { departmentId: filter.departmentId } : {}),
    ...(filter.className ? { className: filter.className } : {}),
    ...(filter.classId ? { classId: filter.classId } : {})
  };
  const [students, evaluations] = await Promise.all([
    Student.find(studentFilter).sort({ className: 1, fullName: 1 }).lean(),
    Evaluation.find({ ...filter, assignmentId: { $in: assignmentIds } }).lean()
  ]);
  const studentsByClass = new Map();
  students.forEach((student) => {
    const key = String(student.classId || `${student.departmentId || student.department}|${student.className}`);
    if (!studentsByClass.has(key)) studentsByClass.set(key, []);
    studentsByClass.get(key).push(student);
  });
  const evaluationMap = new Map(evaluations.map((item) => [`${item.assignmentId}|${item.studentId}`, item]));
  const rows = [];
  assignments.forEach((assignment) => {
    const classKey = String(assignment.classId || `${assignment.departmentId || assignment.department}|${assignment.className}`);
    (studentsByClass.get(classKey) || []).forEach((student) => {
      const evaluation = evaluationMap.get(`${assignment.assignmentId}|${student.studentId}`);
      rows.push({
        assignmentId: assignment.assignmentId,
        courseCode: assignment.courseCode,
        courseName: assignment.courseName,
        lecturerId: assignment.lecturerId,
        lecturerName: assignment.lecturerName,
        faculty: student.faculty,
        facultyId: student.facultyId,
        department: student.department,
        departmentId: student.departmentId,
        className: student.className,
        classId: student.classId,
        studentId: student.studentId,
        studentName: student.fullName,
        status: evaluation ? 'evaluated' : 'not_evaluated',
        submittedAt: evaluation?.submittedAt || null,
        evaluationId: evaluation?._id || null,
        courseScore: evaluation?.courseOverallRating || null,
        lecturerScore: evaluation?.lecturerOverallRating || null,
        attendanceRate: evaluation?.attendanceRate || null,
        recommendation: evaluation?.recommendation || null
      });
    });
  });
  const status = req.query.status;
  const evaluated = rows.filter((item) => item.status === 'evaluated').length;
  return {
    rows: status ? rows.filter((item) => item.status === status) : rows,
    allRows: rows,
    totals: {
      assignments: assignments.length,
      students: students.length,
      possible: rows.length,
      evaluated,
      notEvaluated: Math.max(rows.length - evaluated, 0),
      participationRate: rows.length ? Number(((evaluated / rows.length) * 100).toFixed(1)) : 0
    }
  };
};

const attendanceValue = (value) => {
  if (value === '75-100%') return 90;
  if (value === '50-74%') return 62;
  if (value === 'Less than 50%') return 40;
  return 0;
};

const countBy = (rows, key) => Object.values(rows.reduce((map, item) => {
  const name = item[key] || 'Unknown';
  map[name] ||= { name, value: 0 };
  map[name].value += 1;
  return map;
}, {}));

const buildReportModel = async (req) => {
  const analyticsQuery = scopedQuery(req, req.query);
  if (req.user.role === 'lecturer') analyticsQuery.lecturerId = req.user.loginId;
  const filter = buildFilter(analyticsQuery);
  const [analytics, participation, evaluations] = await Promise.all([
    getAnalyticsData(analyticsQuery),
    buildParticipationData(req),
    Evaluation.find(filter).lean()
  ]);
  const evaluatedRows = participation.allRows.filter((row) => row.status === 'evaluated');
  const recommendationRows = evaluatedRows.filter((row) => row.recommendation);
  const yesRecommendations = recommendationRows.filter((row) => row.recommendation === 'Yes').length;
  const attendanceRows = evaluatedRows.filter((row) => row.attendanceRate);
  const attendanceRate = attendanceRows.length
    ? Number((attendanceRows.reduce((sum, row) => sum + attendanceValue(row.attendanceRate), 0) / attendanceRows.length).toFixed(1))
    : 0;
  const recommendationRate = recommendationRows.length ? Number(((yesRecommendations / recommendationRows.length) * 100).toFixed(1)) : 0;
  const report = {
    filters: filter,
    totalSubmissions: evaluations.length,
    participationRate: analytics.totals.participationRate,
    averageLecturerScore: avg(evaluations, 'lecturerOverallRating'),
    averageCourseScore: avg(evaluations, 'courseOverallRating'),
    courseSatisfaction: analytics.courseSatisfaction,
    lecturerRanking: analytics.lecturerRanking,
    departmentComparison: analytics.departmentRankings,
    facultyComparison: analytics.facultyRankings,
    classComparison: analytics.classRankings,
    bestDepartment: analytics.bestDepartment,
    worstDepartment: analytics.worstDepartment,
    bestFaculty: analytics.bestFaculty,
    worstFaculty: analytics.worstFaculty,
    bestClass: analytics.highestRatedClass,
    worstClass: analytics.lowestRatedClass,
    bestLecturer: analytics.highestRatedLecturer,
    worstLecturer: analytics.lowestRatedLecturer,
    bestCourse: analytics.highestRatedCourse,
    worstCourse: analytics.lowestRatedCourse
  };
  return {
    meta: {
      generatedAt: new Date(),
      generatedBy: req.user.fullName || req.user.loginId,
      role: req.user.role,
      confidentiality: 'Confidential',
      filters: req.query
    },
    report,
    participation: {
      rows: participation.rows,
      totals: participation.totals
    },
    derived: {
      bestLecturer: report.bestLecturer ? { name: report.bestLecturer.teacher, average: report.bestLecturer.averageScore, rank: report.bestLecturer.rank } : null,
      worstLecturer: report.worstLecturer ? { name: report.worstLecturer.teacher, average: report.worstLecturer.averageScore, rank: report.worstLecturer.rank } : null,
      bestCourse: report.bestCourse ? { name: report.bestCourse.course, average: report.bestCourse.averageScore, rank: report.bestCourse.rank } : null,
      worstCourse: report.worstCourse ? { name: report.worstCourse.course, average: report.worstCourse.averageScore, rank: report.worstCourse.rank } : null,
      attendanceRate,
      recommendationRate,
      recommendationBreakdown: countBy(evaluatedRows, 'recommendation'),
      attendanceBreakdown: countBy(evaluatedRows, 'attendanceRate'),
      evaluationTrend: countBy(evaluatedRows.map((row) => ({ submittedDate: row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : 'No date' })), 'submittedDate'),
      radar: [
        { metric: 'Participation', value: participation.totals.participationRate || 0 },
        { metric: 'Attendance', value: attendanceRate },
        { metric: 'Recommend', value: recommendationRate },
        { metric: 'Course Score', value: (report.averageCourseScore || 0) * 20 },
        { metric: 'Teacher Score', value: (report.averageLecturerScore || 0) * 20 }
      ]
    }
  };
};

router.get('/', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
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

router.get('/student/:studentId', protect, authorize('admin', 'registration', 'dean', 'student'), async (req, res) => {
  if (req.user.role === 'student' && req.user.loginId !== req.params.studentId) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  const student = await Student.findOne({ studentId: req.params.studentId }).lean();
  if (!student) return res.status(404).json({ message: 'Student not found' });
  if (req.user.role !== 'student') {
    const scoped = scopedQuery(req, {});
    if (scoped.facultyId && String(student.facultyId) !== String(scoped.facultyId)) return res.status(403).json({ message: 'Forbidden' });
    if (scoped.departmentId && String(student.departmentId) !== String(scoped.departmentId)) return res.status(403).json({ message: 'Forbidden' });
  }
  const filter = buildFilter(scopedQuery(req, req.query));
  const data = await Evaluation.find({ ...filter, studentId: req.params.studentId }).sort({ submittedAt: -1 }).lean();
  res.json({ student, data });
});

router.get('/participation', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const participation = await buildParticipationData(req);
  res.json({
    rows: participation.rows,
    totals: participation.totals
  });
});

router.get('/reports', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  const model = await buildReportModel(req);
  res.json(model.report);
});

router.get('/report-model', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  res.json(await buildReportModel(req));
});

router.get('/analytics', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  const scoped = scopedQuery(req, req.query);
  if (req.user.role === 'lecturer') scoped.lecturerId = req.user.loginId;
  res.json(await getAnalyticsData(scoped));
});

router.get('/export-csv', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
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

module.exports = { router, createEvaluation, getAnalyticsData, buildReportModel };
