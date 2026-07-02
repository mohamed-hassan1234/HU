const express = require('express');
const bcrypt = require('bcryptjs');
const Lecturer = require('../models/Lecturer');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Evaluation = require('../models/Evaluation');
const Student = require('../models/Student');
const CourseAssignment = require('../models/CourseAssignment');
const TeacherComment = require('../models/TeacherComment');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const {
  buildErrorRows,
  ensureLimit,
  mapRow,
  normalizeLookup,
  normalizeText,
  readImportFile,
  readSession,
  removeSession,
  sendRows,
  sendTemplate,
  writeSession
} = require('../utils/bulkImport');
const logActivity = require('../utils/logActivity');
const { hydrateFacultyDepartment, scopedQuery, assertCanAccessFaculty, userFacultyId } = require('../utils/accessControl');

const router = express.Router();
const manageLecturers = [protect, authorize('admin', 'registration')];

const columns = [
  { header: 'Lecturer ID', key: 'lecturerId' },
  { header: 'Full Name', key: 'fullName' },
  { header: 'Status', key: 'status' }
];

const legacyColumns = [
  { header: 'lecturer_id', key: 'lecturerId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'status', key: 'status' }
];

const lecturerImportFields = [
  { header: 'Lecturer ID', key: 'lecturerId', aliases: ['lecturer_id', 'employee id', 'employee_id'] },
  { header: 'Full Name', key: 'fullName', aliases: ['full_name', 'lecturer name', 'name'] },
  { header: 'Password', key: 'password' },
  { header: 'Status', key: 'status' }
];

const fullNameFromParts = (row) =>
  [row.firstName, row.middleName, row.lastName].map(normalizeText).filter(Boolean).join(' ');

const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = (value) => /^[+\d\s().-]{6,20}$/.test(value);

const duplicateQuery = (parts) => {
  const $or = parts.filter((item) => Object.values(item)[0].$in?.length);
  return $or.length ? { $or } : { _id: null };
};

const exportQuery = (req) => {
  const { format, scope, search = '', page, limit, facultyId, departmentId, status } = req.query;
  const query = scopedQuery(req, {});
  if (search) query.$or = [{ lecturerId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  if (facultyId && req.user.role === 'admin') query.facultyId = facultyId;
  if (departmentId && ['admin', 'registration'].includes(req.user.role)) query.departmentId = departmentId;
  if (['active', 'inactive'].includes(status)) query.status = status;
  return query;
};

const sendImportError = (res, error, fallback = 'Import failed') => {
  res.status(error.statusCode || 500).json({ message: error.message || fallback });
};

const buildLecturerMasterData = async () => {
  const [faculties, departments] = await Promise.all([
    Faculty.find({ status: { $ne: 'inactive' } }).lean(),
    Department.find({ status: { $ne: 'inactive' } }).lean()
  ]);
  const facultyMap = new Map();
  faculties.forEach((faculty) => {
    facultyMap.set(normalizeLookup(faculty.name), faculty);
    if (faculty.code) facultyMap.set(normalizeLookup(faculty.code), faculty);
  });
  const departmentsByFaculty = new Map();
  departments.forEach((department) => {
    const facultyId = String(department.faculty);
    [department.name, department.code].filter(Boolean).forEach((key) => {
      departmentsByFaculty.set(`${facultyId}|${normalizeLookup(key)}`, department);
    });
  });
  return { facultyMap, departmentsByFaculty };
};

const toLecturer = (body) => ({
  lecturerId: body.lecturerId || body.lecturer_id || body.employeeId,
  employeeId: body.employeeId || body.employee_id || body.lecturerId || body.lecturer_id,
  firstName: body.firstName,
  middleName: body.middleName,
  lastName: body.lastName,
  fullName: body.fullName || body.full_name || body.lecturer_name,
  gender: body.gender,
  email: body.email,
  phoneNumber: body.phoneNumber || body.phone_number,
  faculty: body.faculty,
  facultyId: body.facultyId || body.faculty_id,
  department: body.department,
  departmentId: body.departmentId || body.department_id,
  position: body.position,
  employmentType: body.employmentType || body.employment_type,
  username: body.username,
  password: body.password,
  notes: body.notes,
  status: String(body.status || 'active').toLowerCase()
});

const hydrateLecturer = async (body, req) => {
  const base = toLecturer(body);
  if (!base.fullName) base.fullName = fullNameFromParts(base);
  if (req?.user?.role === 'registration') base.facultyId = userFacultyId(req.user);
  const hydrated = await hydrateFacultyDepartment({
    facultyId: base.facultyId,
    departmentId: base.departmentId,
    fallback: base
  });
  if (req?.user?.role === 'registration') assertCanAccessFaculty(req, hydrated.facultyId);
  return { ...base, ...hydrated };
};

const upsertLecturerUser = async (lecturer, password) => {
  const user = await User.findOne({ loginId: lecturer.lecturerId });
  if (user) {
    user.role = 'lecturer';
    user.status = lecturer.status;
    user.fullName = lecturer.fullName;
    user.email = lecturer.email;
    user.faculty = lecturer.faculty;
    user.facultyId = lecturer.facultyId;
    user.department = lecturer.department;
    user.departmentId = lecturer.departmentId;
    if (password) user.password = password;
    await user.save();
  } else {
    await User.create({
      loginId: lecturer.lecturerId,
      password: password || lecturer.lecturerId,
      role: 'lecturer',
      fullName: lecturer.fullName,
      email: lecturer.email,
      faculty: lecturer.faculty,
      facultyId: lecturer.facultyId,
      department: lecturer.department,
      departmentId: lecturer.departmentId,
      status: lecturer.status
    });
  }
};

const validateLecturerRows = async (rawRows, req, fileName) => {
  ensureLimit(rawRows);
  const startedAt = Date.now();
  const rows = rawRows.map((row, index) => {
    const data = mapRow(row, lecturerImportFields);
    data.employeeId = data.lecturerId;
    data.status = normalizeLookup(data.status || 'active');
    return { rowNumber: index + 2, data, errors: [], warnings: [] };
  });
  const ids = rows.map((row) => row.data.lecturerId).filter(Boolean);
  const existingLecturers = await Lecturer.find(duplicateQuery([
    { lecturerId: { $in: ids } },
    { employeeId: { $in: ids } }
  ])).lean();
  const existingIds = new Set(existingLecturers.flatMap((item) => [item.lecturerId, item.employeeId]).filter(Boolean));
  const seenIds = new Set();
  const statuses = new Set(['active', 'inactive']);

  rows.forEach((row) => {
    const { data, errors, warnings } = row;
    ['lecturerId', 'fullName', 'password', 'status'].forEach((field) => {
      if (!normalizeText(data[field])) errors.push(`${field} is required`);
    });
    if (data.status && !statuses.has(normalizeLookup(data.status))) errors.push('Invalid status');
    if (data.lecturerId && existingIds.has(data.lecturerId)) errors.push('Duplicate Lecturer ID already exists');
    if (data.lecturerId && seenIds.has(data.lecturerId)) errors.push('Duplicate Lecturer ID inside file');
    if (data.lecturerId) seenIds.add(data.lecturerId);
    data.employeeId = data.lecturerId;
  });

  const validRecords = rows.filter((row) => !row.errors.length).length;
  const invalidRecords = rows.length - validRecords;
  return {
    type: 'lecturers',
    fileName,
    createdAt: new Date(),
    createdBy: req.user.loginId,
    processingTimeMs: Date.now() - startedAt,
    rows: rows.map((row) => ({ ...row, valid: row.errors.length === 0 })),
    summary: {
      totalRecords: rows.length,
      validRecords,
      invalidRecords,
      duplicateRecords: rows.filter((row) => row.errors.some((error) => error.toLowerCase().includes('duplicate'))).length,
      warningRecords: rows.filter((row) => row.warnings.length).length
    }
  };
};

router.get('/', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const { search = '', page = 1, limit = 10, facultyId, departmentId } = req.query;
  const query = scopedQuery(req, {});
  if (search) query.$or = [{ lecturerId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  if (facultyId && req.user.role === 'admin') query.facultyId = facultyId;
  if (departmentId && ['admin', 'registration'].includes(req.user.role)) query.departmentId = departmentId;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Lecturer.find(query).sort({ fullName: 1 }).skip(skip).limit(Number(limit)),
    Lecturer.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', manageLecturers, async (req, res) => {
  const payload = await hydrateLecturer(req.body, req);
  if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
  const lecturer = await Lecturer.create(payload);
  await upsertLecturerUser(lecturer, req.body.password || payload.lecturerId);
  await logActivity(req, 'create', 'lecturer', lecturer.lecturerId);
  res.status(201).json(lecturer);
});

router.put('/:id', manageLecturers, async (req, res) => {
  const current = await Lecturer.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Lecturer not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
  const payload = await hydrateLecturer(req.body, req);
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

router.delete('/:id', manageLecturers, async (req, res) => {
  const current = await Lecturer.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Lecturer not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
  const lecturer = await Lecturer.findByIdAndDelete(req.params.id);
  if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
  await User.deleteOne({ loginId: lecturer.lecturerId });
  await logActivity(req, 'delete', 'lecturer', lecturer.lecturerId);
  res.json({ message: 'Lecturer deleted' });
});

router.get('/template', manageLecturers, async (req, res) => {
  const sample = {
    'Lecturer ID': 'LEC001',
    'Full Name': 'Mohamed Ali Hassan',
    Password: '123456',
    Status: 'active'
  };
  if (String(req.query.format).toLowerCase() === 'csv') {
    return sendCsv(res, 'lecturer_import_template.csv', [Object.fromEntries(lecturerImportFields.map((field) => [field.key, sample[field.header] || '']))], lecturerImportFields.map((field) => ({ header: field.header, key: field.key })));
  }
  sendTemplate(res, 'lecturer_import_template.xlsx', lecturerImportFields, sample);
});

router.post('/bulk-import/validate', manageLecturers, upload.importFile.single('file'), async (req, res) => {
  try {
    const rawRows = await readImportFile(req.file);
    const validation = await validateLecturerRows(rawRows, req, req.file.originalname);
    const token = writeSession('lecturers', validation);
    await logActivity(req, 'validate_import', 'lecturer', 'bulk', {
      fileName: req.file.originalname,
      numberOfRecords: validation.summary.totalRecords,
      status: validation.summary.invalidRecords ? 'invalid' : 'valid'
    });
    res.json({ token, ...validation });
  } catch (error) {
    sendImportError(res, error, 'Validation failed');
  }
});

router.get('/bulk-import/errors/:token', manageLecturers, async (req, res) => {
  try {
    const { data } = readSession('lecturers', req.params.token);
    const rows = buildErrorRows(data.rows.filter((row) => !row.valid || row.warnings.length));
    sendRows(req, res, 'lecturer_import_errors.csv', rows, [
      { header: 'Row', key: 'Row' },
      { header: 'Status', key: 'Status' },
      { header: 'Errors', key: 'Errors' },
      { header: 'Warnings', key: 'Warnings' },
      ...lecturerImportFields.map((field) => ({ header: field.header, key: field.key }))
    ]);
  } catch (error) {
    sendImportError(res, error, 'Error report failed');
  }
});

router.post('/bulk-import/commit', manageLecturers, async (req, res) => {
  try {
    const startedAt = Date.now();
    const { filePath, data } = readSession('lecturers', req.body.token);
    if (data.summary.invalidRecords > 0) {
      return res.status(400).json({ message: 'Import cannot continue until all validation errors are fixed', summary: data.summary });
    }
    const records = data.rows.map((row) => row.data);
    const ids = records.map((item) => item.lecturerId);
    const duplicateLecturers = await Lecturer.find(duplicateQuery([
      { lecturerId: { $in: ids } },
      { employeeId: { $in: ids } }
    ])).lean();
    if (duplicateLecturers.length) {
      return res.status(409).json({ message: 'Duplicate records appeared after validation. Please validate the file again.' });
    }
    let imported = 0;
    for (const record of records) {
      const payload = await hydrateLecturer(record, req);
      const loginPassword = payload.password || payload.lecturerId;
      if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
      const lecturer = await Lecturer.create(payload);
      await upsertLecturerUser(lecturer, loginPassword);
      imported += 1;
    }
    const summary = {
      totalRecords: records.length,
      importedSuccessfully: imported,
      failedRecords: 0,
      duplicateRecords: data.summary.duplicateRecords,
      skippedRecords: 0,
      processingTimeMs: Date.now() - startedAt,
      successPercentage: records.length ? Number(((imported / records.length) * 100).toFixed(1)) : 0
    };
    await logActivity(req, 'import_bulk', 'lecturer', 'bulk', {
      importedBy: req.user.loginId,
      importDate: new Date(),
      fileName: data.fileName,
      numberOfRecords: records.length,
      status: 'success',
      summary
    });
    removeSession(filePath);
    res.json({ message: 'Lecturers imported successfully', summary });
  } catch (error) {
    sendImportError(res, error, 'Import failed');
  }
});

router.post('/import-csv', manageLecturers, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = await hydrateLecturer(row, req);
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

router.get('/export', manageLecturers, async (req, res) => {
  const lecturers = await Lecturer.find(exportQuery(req)).lean();
  sendRows(req, res, 'lecturers.csv', lecturers.map((item) => ({ ...item, employeeId: item.employeeId || item.lecturerId })), columns);
});

router.get('/export-csv', manageLecturers, async (req, res) => {
  sendCsv(res, 'lecturers.csv', await Lecturer.find(scopedQuery(req, {})).lean(), legacyColumns);
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
