const express = require('express');
const bcrypt = require('bcryptjs');
const Lecturer = require('../models/Lecturer');
const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const CourseAssignment = require('../models/CourseAssignment');
const TeacherComment = require('../models/TeacherComment');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

const columns = [
  { header: 'lecturer_id', key: 'lecturerId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'status', key: 'status' }
];

const toLecturer = (body) => ({
  lecturerId: body.lecturerId || body.lecturer_id,
  fullName: body.fullName || body.full_name || body.lecturer_name,
  password: body.password,
  status: String(body.status || 'active').toLowerCase()
});

const upsertLecturerUser = async (lecturer, password) => {
  const user = await User.findOne({ loginId: lecturer.lecturerId });
  if (user) {
    user.role = 'lecturer';
    user.status = lecturer.status;
    if (password) user.password = password;
    await user.save();
  } else {
    await User.create({
      loginId: lecturer.lecturerId,
      password: password || lecturer.lecturerId,
      role: 'lecturer',
      status: lecturer.status
    });
  }
};

router.get('/', protect, authorize('admin', 'department_head', 'dean'), async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const query = {};
  if (search) query.$or = [{ lecturerId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Lecturer.find(query).sort({ fullName: 1 }).skip(skip).limit(Number(limit)),
    Lecturer.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', adminOnly, async (req, res) => {
  const payload = toLecturer(req.body);
  if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
  const lecturer = await Lecturer.create(payload);
  await upsertLecturerUser(lecturer, req.body.password || payload.lecturerId);
  await logActivity(req, 'create', 'lecturer', lecturer.lecturerId);
  res.status(201).json(lecturer);
});

router.put('/:id', adminOnly, async (req, res) => {
  const payload = toLecturer(req.body);
  if (!payload.password) delete payload.password;
  else payload.password = await bcrypt.hash(payload.password, 10);
  const lecturer = await Lecturer.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });
  if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
  await upsertLecturerUser(lecturer, req.body.password);
  await logActivity(req, 'update', 'lecturer', lecturer.lecturerId);
  res.json(lecturer);
});

router.delete('/:id', adminOnly, async (req, res) => {
  const lecturer = await Lecturer.findByIdAndDelete(req.params.id);
  if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
  await User.deleteOne({ loginId: lecturer.lecturerId });
  await logActivity(req, 'delete', 'lecturer', lecturer.lecturerId);
  res.json({ message: 'Lecturer deleted' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = toLecturer(row);
    if (!payload.lecturerId || !payload.fullName) continue;
    const loginPassword = row.password || payload.lecturerId;
    if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
    const lecturer = await Lecturer.findOneAndUpdate({ lecturerId: payload.lecturerId }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    await upsertLecturerUser(lecturer, loginPassword);
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'lecturer', 'bulk', { imported });
  res.json({ message: 'Lecturers imported', imported });
});

router.get('/export-csv', adminOnly, async (req, res) => {
  sendCsv(res, 'lecturers.csv', await Lecturer.find().lean(), columns);
});

const average = (rows, key) => {
  const valid = rows.filter((item) => Number(item[key]));
  return valid.length ? Number((valid.reduce((sum, item) => sum + Number(item[key]), 0) / valid.length).toFixed(2)) : 0;
};

const attendancePercent = (value) => {
  if (value === '75-100%') return 90;
  if (value === '50-74%') return 62;
  if (value === 'Less than 50%') return 40;
  return 75;
};

const ratingLabel = (score) => {
  if (score >= 4.5) return 'Excellent';
  if (score >= 4) return 'Good';
  if (score >= 3) return 'Average';
  return 'Poor';
};

const rankLecturers = (evaluations, lecturers = [], facultyByLecturer = new Map()) => {
  const map = {};
  lecturers.forEach((item) => {
    map[item.lecturerId] = {
      lecturerId: item.lecturerId,
      lecturerName: item.fullName,
      faculty: facultyByLecturer.get(item.lecturerId) || 'Not assigned',
      total: 0,
      count: 0
    };
  });
  evaluations.forEach((item) => {
    map[item.lecturerId] ||= {
      lecturerId: item.lecturerId,
      lecturerName: item.lecturerName,
      faculty: item.faculty || 'Unknown',
      total: 0,
      count: 0
    };
    map[item.lecturerId].total += Number(item.lecturerOverallRating || 0);
    map[item.lecturerId].count += 1;
  });
  return Object.values(map)
    .map((item) => ({
      ...item,
      average: item.count ? Number((item.total / item.count).toFixed(2)) : 0,
      totalEvaluations: item.count
    }))
    .sort((a, b) => b.average - a.average || b.totalEvaluations - a.totalEvaluations)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

const commentsFromEvaluation = (item) => Object.values(item.comments || {}).filter(Boolean);

const buildInsights = ({ courses, classSummaries, lecturerRank, facultyRank, facultySize }) => {
  const bestCourse = [...courses].filter((item) => item.count > 0).sort((a, b) => b.average - a.average)[0];
  const bestClass = [...classSummaries].sort((a, b) => b.studentSatisfaction - a.studentSatisfaction)[0];
  const lowestEngagement = [...classSummaries].sort((a, b) => a.engagementScore - b.engagementScore)[0];
  return [
    bestCourse
      ? `Your ${bestCourse.courseName} course received ${bestCourse.average}/5 and is one of your strongest evaluated courses.`
      : 'No course insight is available until students submit evaluations.',
    lecturerRank
      ? `Your current university ranking is #${lecturerRank.rank} of ${lecturerRank.totalLecturers} lecturers.`
      : 'University ranking will appear after lecturer evaluations are submitted.',
    facultyRank
      ? `Your faculty ranking is #${facultyRank} of ${facultySize} in ${bestCourse?.faculty || 'your faculty'}.`
      : 'Faculty ranking will appear when faculty-level evaluation data is available.',
    bestClass
      ? `Attendance in ${bestClass.className} is ${bestClass.attendanceQuality.toLowerCase()} with ${bestClass.courseCoverage}% course coverage.`
      : 'Class analysis will appear after your assigned classes receive feedback.',
    lowestEngagement && lowestEngagement.engagementScore < 70
      ? `Engagement in ${lowestEngagement.className} is below the desired level and may need assignment or activity follow-up.`
      : 'Student engagement is currently within a healthy range across evaluated classes.'
  ];
};

router.get('/me/comments', protect, authorize('lecturer'), async (req, res) => {
  const filter = { lecturerId: req.user.loginId };
  if (req.query.className) filter.className = req.query.className;
  const data = await TeacherComment.find(filter).sort({ createdAt: -1 }).lean();
  res.json({ data });
});

router.post('/me/comments', protect, authorize('lecturer'), async (req, res) => {
  const { className, comment, category = 'general' } = req.body;
  if (!className || !comment) return res.status(400).json({ message: 'Class name and comment are required' });
  const assignment = await CourseAssignment.findOne({
    lecturerId: req.user.loginId,
    className,
    status: { $ne: 'inactive' }
  }).lean();
  if (!assignment) return res.status(403).json({ message: 'You can only comment on your assigned classes' });

  const lecturer = await Lecturer.findOne({ lecturerId: req.user.loginId }).lean();
  const saved = await TeacherComment.create({
    lecturerId: req.user.loginId,
    lecturerName: lecturer?.fullName,
    className,
    comment,
    category
  });
  await logActivity(req, 'create', 'teacher_comment', saved._id.toString(), { className });
  res.status(201).json(saved);
});

router.get('/me/summary', protect, authorize('lecturer'), async (req, res) => {
  const lecturerId = req.user.loginId;
  const [evaluations, allEvaluations, assignments, comments, lecturers, allAssignments, allStudents] = await Promise.all([
    Evaluation.find({ lecturerId }).lean(),
    Evaluation.find().lean(),
    CourseAssignment.find({ lecturerId, status: { $ne: 'inactive' } }).lean(),
    TeacherComment.find({ lecturerId }).sort({ createdAt: -1 }).lean(),
    Lecturer.find({ status: 'active' }).lean(),
    CourseAssignment.find({ status: { $ne: 'inactive' } }).lean(),
    Student.find({ status: 'active' }).lean()
  ]);

  const assignedClasses = [...new Set(assignments.map((item) => item.className).filter(Boolean))];
  const assignedCourseCodes = [...new Set(assignments.map((item) => item.courseCode).filter(Boolean))];
  evaluations.forEach((item) => {
    if (item.className && !assignedClasses.includes(item.className)) assignedClasses.push(item.className);
    if (item.courseCode && !assignedCourseCodes.includes(item.courseCode)) assignedCourseCodes.push(item.courseCode);
  });

  const classFaculty = new Map();
  allStudents.forEach((student) => {
    if (!classFaculty.has(student.className)) classFaculty.set(student.className, student.faculty || 'Unknown');
  });
  const facultyByLecturer = new Map();
  allAssignments.forEach((assignment) => {
    const faculty = classFaculty.get(assignment.className);
    if (faculty && !facultyByLecturer.has(assignment.lecturerId)) facultyByLecturer.set(assignment.lecturerId, faculty);
  });
  allEvaluations.forEach((item) => {
    if (item.faculty) facultyByLecturer.set(item.lecturerId, item.faculty);
  });

  const rankings = rankLecturers(allEvaluations, lecturers, facultyByLecturer);
  const myRanking = rankings.find((item) => item.lecturerId === lecturerId);
  const primaryFaculty = evaluations[0]?.faculty || facultyByLecturer.get(lecturerId) || myRanking?.faculty;
  const facultyRankings = primaryFaculty && primaryFaculty !== 'Not assigned'
    ? rankings.filter((item) => item.faculty === primaryFaculty)
    : [];
  const facultyRank = facultyRankings.findIndex((item) => item.lecturerId === lecturerId) + 1 || null;

  const coursesMap = {};
  assignments.forEach((item) => {
    coursesMap[item.courseCode] ||= {
      courseCode: item.courseCode,
      courseName: item.courseName,
      faculty: primaryFaculty || 'Unknown',
      count: 0,
      score: 0,
      courseScore: 0,
      comments: [],
      trend: []
    };
  });
  evaluations.forEach((item) => {
    coursesMap[item.courseCode] ||= {
      courseCode: item.courseCode,
      courseName: item.courseName,
      faculty: item.faculty || 'Unknown',
      count: 0,
      score: 0,
      courseScore: 0,
      comments: [],
      trend: []
    };
    coursesMap[item.courseCode].count += 1;
    coursesMap[item.courseCode].score += Number(item.lecturerOverallRating || 0);
    coursesMap[item.courseCode].courseScore += Number(item.courseOverallRating || 0);
    coursesMap[item.courseCode].comments.push(...commentsFromEvaluation(item).map((text) => ({
      text,
      sentiment: item.sentiment
    })));
    coursesMap[item.courseCode].trend.push({
      name: item.semester || new Date(item.submittedAt).toLocaleDateString(),
      score: item.lecturerOverallRating || item.courseOverallRating || 0
    });
  });
  const courses = Object.values(coursesMap).map((course) => ({
    ...course,
    average: course.count ? Number((course.score / course.count).toFixed(2)) : 0,
    courseAverage: course.count ? Number((course.courseScore / course.count).toFixed(2)) : 0,
    topComments: course.comments.filter((item) => item.sentiment !== 'negative').slice(0, 3),
    negativeComments: course.comments.filter((item) => item.sentiment === 'negative').slice(0, 3)
  }));

  const students = allStudents.filter((item) => assignedClasses.includes(item.className));
  const studentMap = {};
  students.forEach((student) => {
    studentMap[student.studentId] = {
      studentId: student.studentId,
      name: student.fullName,
      className: student.className,
      submissions: 0,
      score: 0,
      attendanceTotal: 0
    };
  });
  evaluations.forEach((item) => {
    if (item.anonymous) return;
    studentMap[item.studentId] ||= {
      studentId: item.studentId,
      name: item.anonymous ? 'Anonymous Student' : item.studentId,
      className: item.className,
      submissions: 0,
      score: 0,
      attendanceTotal: 0
    };
    studentMap[item.studentId].submissions += 1;
    studentMap[item.studentId].score += Number(item.courseOverallRating || item.lecturerOverallRating || 0);
    studentMap[item.studentId].attendanceTotal += attendancePercent(item.attendanceRate);
  });
  const topStudents = Object.values(studentMap)
    .filter((item) => item.submissions > 0)
    .map((item) => ({
      ...item,
      averageScore: Number((item.score / item.submissions).toFixed(2)),
      attendance: Math.round(item.attendanceTotal / item.submissions)
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.attendance - a.attendance)
    .slice(0, 3);

  const classSummaries = assignedClasses.map((className) => {
    const classEvaluations = evaluations.filter((item) => item.className === className);
    const studentCount = students.filter((item) => item.className === className).length;
    const classAssignments = assignments.filter((item) => item.className === className).length || 1;
    const satisfaction = average(classEvaluations, 'lecturerOverallRating') || average(classEvaluations, 'courseOverallRating');
    const attendance = classEvaluations.length
      ? Math.round(classEvaluations.reduce((sum, item) => sum + attendancePercent(item.attendanceRate), 0) / classEvaluations.length)
      : 0;
    const possible = studentCount * classAssignments;
    const coverage = possible ? Math.min(100, Math.round((classEvaluations.length / possible) * 100)) : 0;
    return {
      className,
      evaluations: classEvaluations.length,
      attendanceQuality: ratingLabel(attendance / 20),
      courseCoverage: coverage,
      studentSatisfaction: satisfaction || 0,
      engagementScore: Math.round(((satisfaction || 0) * 14) + (attendance * 0.2) + (coverage * 0.1)),
      comments: comments.filter((item) => item.className === className).slice(0, 5)
    };
  });

  const studentById = new Map(allStudents.map((item) => [item.studentId, item]));
  const evaluationDetails = [...evaluations]
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
    .map((item) => ({
      _id: item._id,
      assignmentId: item.assignmentId,
      courseCode: item.courseCode,
      courseName: item.courseName,
      className: item.className,
      semester: item.semester,
      academicYear: item.academicYear,
      studentName: item.anonymous ? 'Anonymous Student' : studentById.get(item.studentId)?.fullName || item.studentId,
      studentId: item.anonymous ? null : item.studentId,
      courseOverallRating: item.courseOverallRating,
      lecturerOverallRating: item.lecturerOverallRating,
      recommendation: item.recommendation,
      attendanceRate: item.attendanceRate,
      responses: item.responses,
      comments: item.comments,
      sentiment: item.sentiment,
      submittedAt: item.submittedAt
    }));

  res.json({
    totalSubmissions: evaluations.length,
    totalCourses: assignedCourseCodes.length,
    totalEvaluations: evaluations.length,
    averageLecturerScore: average(evaluations, 'lecturerOverallRating'),
    averageCourseScore: average(evaluations, 'courseOverallRating'),
    universityRanking: myRanking ? { rank: myRanking.rank, totalLecturers: rankings.length } : null,
    facultyRanking: facultyRank ? { rank: facultyRank, faculty: primaryFaculty, totalLecturers: facultyRankings.length } : null,
    assignedClasses,
    courses,
    evaluations: evaluationDetails,
    classSummaries,
    topStudents,
    comments,
    insights: buildInsights({
      courses,
      classSummaries,
      lecturerRank: myRanking ? { rank: myRanking.rank, totalLecturers: rankings.length } : null,
      facultyRank,
      facultySize: facultyRankings.length
    })
  });
});

module.exports = router;
