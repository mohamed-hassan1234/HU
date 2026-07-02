const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const Evaluation = require('../models/Evaluation');
const CourseAssignment = require('../models/CourseAssignment');
const ClassGroup = require('../models/Class');
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
const manageStudents = [protect, authorize('admin', 'registration')];

const columns = [
  { header: 'Student ID', key: 'studentId' },
  { header: 'Full Name', key: 'fullName' },
  { header: 'Faculty', key: 'faculty' },
  { header: 'Department', key: 'department' },
  { header: 'Class', key: 'className' },
  { header: 'Status', key: 'status' }
];

const legacyColumns = [
  { header: 'student_id', key: 'studentId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'faculty', key: 'faculty' },
  { header: 'department', key: 'department' },
  { header: 'class_name', key: 'className' },
  { header: 'status', key: 'status' }
];

const studentImportFields = [
  { header: 'Student ID', key: 'studentId', aliases: ['student_id'] },
  { header: 'Full Name', key: 'fullName', aliases: ['full_name', 'student name', 'name'] },
  { header: 'Faculty', key: 'faculty' },
  { header: 'Department', key: 'department' },
  { header: 'Class', key: 'className', aliases: ['class_name'] },
  { header: 'Password', key: 'password' },
  { header: 'Status', key: 'status' }
];

const fullNameFromParts = (row) =>
  [row.firstName, row.middleName, row.lastName].map(normalizeText).filter(Boolean).join(' ');

const emailValid = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const phoneValid = (value) => /^[+\d\s().-]{6,20}$/.test(value);

const buildStudentMasterData = async () => {
  const [faculties, departments, classes] = await Promise.all([
    Faculty.find({ status: { $ne: 'inactive' } }).lean(),
    Department.find({ status: { $ne: 'inactive' } }).lean(),
    ClassGroup.find({ status: { $ne: 'inactive' } }).lean()
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
  const classesByDepartment = new Map();
  classes.forEach((classItem) => {
    const departmentId = String(classItem.department);
    const base = `${departmentId}|${normalizeLookup(classItem.className)}`;
    const displayLabel = `${classItem.className} / ${classItem.semester} / ${classItem.academicYear}`;
    classesByDepartment.set(base, classItem);
    classesByDepartment.set(`${departmentId}|${normalizeLookup(displayLabel)}`, classItem);
    classesByDepartment.set(`${departmentId}|${normalizeLookup(`${classItem.className} ${classItem.semester} ${classItem.academicYear}`)}`, classItem);
    classesByDepartment.set(`${base}|${normalizeLookup(classItem.academicYear)}|${normalizeLookup(classItem.semester)}`, classItem);
  });
  return { facultyMap, departmentsByFaculty, classesByDepartment };
};

const resolveImportedClass = (classesByDepartment, departmentId, value) => {
  const input = normalizeText(value);
  const direct = classesByDepartment.get(`${departmentId}|${normalizeLookup(input)}`);
  if (direct) return direct;
  const firstPart = input.split('/')[0]?.trim();
  if (firstPart && firstPart !== input) {
    const byFirstPart = classesByDepartment.get(`${departmentId}|${normalizeLookup(firstPart)}`);
    if (byFirstPart) return byFirstPart;
  }
  const normalizedInput = normalizeLookup(input);
  return [...classesByDepartment.entries()]
    .filter(([key]) => key.startsWith(`${departmentId}|`))
    .map(([, classItem]) => classItem)
    .find((classItem) => {
      const name = normalizeLookup(classItem.className);
      const label = normalizeLookup(`${classItem.className} / ${classItem.semester} / ${classItem.academicYear}`);
      return normalizedInput.startsWith(name) || label.startsWith(normalizedInput) || normalizedInput.startsWith(label);
    });
};

const duplicateQuery = (parts) => {
  const $or = parts.filter((item) => Object.values(item)[0].$in?.length);
  return $or.length ? { $or } : { _id: null };
};

const exportQuery = (req) => {
  const { format, scope, search = '', page, limit, faculty, facultyId, department, departmentId, className, classId, status } = req.query;
  const query = scopedQuery(req, {});
  if (search) query.$or = [{ studentId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  if (faculty) query.faculty = faculty;
  if (facultyId && req.user.role === 'admin') query.facultyId = facultyId;
  if (department) query.department = department;
  if (departmentId && ['admin', 'registration'].includes(req.user.role)) query.departmentId = departmentId;
  if (className) query.className = className;
  if (classId) query.classId = classId;
  if (['active', 'inactive'].includes(status)) query.status = status;
  return query;
};

const sendImportError = (res, error, fallback = 'Import failed') => {
  res.status(error.statusCode || 500).json({ message: error.message || fallback });
};

const toStudent = async (body, req) => {
  const base = {
    studentId: body.studentId || body.student_id,
    registrationNumber: body.registrationNumber || body.registration_number,
    firstName: body.firstName,
    middleName: body.middleName,
    lastName: body.lastName,
    fullName: body.fullName || body.full_name,
    gender: body.gender,
    email: body.email,
    phoneNumber: body.phoneNumber || body.phone_number,
    faculty: body.faculty,
    facultyId: body.facultyId || body.faculty_id,
    department: body.department,
    departmentId: body.departmentId || body.department_id,
    className: body.className || body.class_name,
    classId: body.classId || body.class_id,
    academicYear: body.academicYear || body.academic_year,
    semester: body.semester,
    username: body.username,
    password: body.password,
    notes: body.notes,
    status: body.status || 'active'
  };
  if (!base.fullName) base.fullName = fullNameFromParts(base);
  if (req?.user?.role === 'registration') {
    base.facultyId = userFacultyId(req.user);
  }
  const hydrated = await hydrateFacultyDepartment({
    facultyId: base.facultyId,
    departmentId: base.departmentId,
    classId: base.classId,
    fallback: base
  });
  if (req?.user?.role === 'registration') assertCanAccessFaculty(req, hydrated.facultyId);
  return { ...base, ...hydrated };
};

const upsertStudentUser = async (student, password) => {
  const user = await User.findOne({ loginId: student.studentId });
  if (user) {
    user.role = 'student';
    user.status = student.status;
    user.fullName = student.fullName;
    user.email = student.email;
    user.faculty = student.faculty;
    user.facultyId = student.facultyId;
    user.department = student.department;
    user.departmentId = student.departmentId;
    if (password) user.password = password;
    await user.save();
  } else {
    await User.create({
      loginId: student.studentId,
      password: password || '123456',
      role: 'student',
      fullName: student.fullName,
      email: student.email,
      faculty: student.faculty,
      facultyId: student.facultyId,
      department: student.department,
      departmentId: student.departmentId,
      status: student.status
    });
  }
};

const validateStudentRows = async (rawRows, req, fileName) => {
  ensureLimit(rawRows);
  const startedAt = Date.now();
  const master = await buildStudentMasterData();
  const rows = rawRows.map((row, index) => {
    const data = mapRow(row, studentImportFields);
    data.status = normalizeLookup(data.status || 'active');
    return { rowNumber: index + 2, data, errors: [], warnings: [] };
  });

  const ids = rows.map((row) => row.data.studentId).filter(Boolean);
  const existingStudents = await Student.find(duplicateQuery([{ studentId: { $in: ids } }])).lean();
  const existingStudentIds = new Set(existingStudents.map((item) => item.studentId).filter(Boolean));
  const seenIds = new Set();
  const statuses = new Set(['active', 'inactive']);

  rows.forEach((row) => {
    const { data, errors, warnings } = row;
    ['studentId', 'fullName', 'faculty', 'department', 'className', 'password', 'status'].forEach((field) => {
      if (!normalizeText(data[field])) errors.push(`${field} is required`);
    });
    if (data.status && !statuses.has(normalizeLookup(data.status))) errors.push('Invalid status');
    if (data.studentId && existingStudentIds.has(data.studentId)) errors.push('Duplicate Student ID already exists');
    if (data.studentId && seenIds.has(data.studentId)) errors.push('Duplicate Student ID inside file');
    if (data.studentId) seenIds.add(data.studentId);
    const faculty = master.facultyMap.get(normalizeLookup(data.faculty));
    if (!faculty) {
      errors.push('Invalid Faculty');
      return;
    }
    try {
      assertCanAccessFaculty(req, faculty._id);
    } catch (error) {
      errors.push(error.message);
    }
    const department = master.departmentsByFaculty.get(`${faculty._id}|${normalizeLookup(data.department)}`);
    if (!department) {
      errors.push('Invalid Department or department does not belong to Faculty');
      return;
    }
    const classItem = resolveImportedClass(master.classesByDepartment, String(department._id), data.className);
    if (!classItem) {
      errors.push('Invalid Class or class does not belong to Department. Use the class name or the full class label from the Student form.');
      return;
    }
    data.facultyId = String(faculty._id);
    data.faculty = faculty.name;
    data.departmentId = String(department._id);
    data.department = department.name;
    data.classId = String(classItem._id);
    data.className = classItem.className;
    data.academicYear = classItem.academicYear;
    data.semester = classItem.semester;
  });

  const validRecords = rows.filter((row) => !row.errors.length).length;
  const invalidRecords = rows.length - validRecords;
  return {
    type: 'students',
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

const getUniqueClasses = async (req, res) => {
  try {
    if (req.user.role === 'registration' && userFacultyId(req.user)) {
      const classes = await ClassGroup.find({ faculty: userFacultyId(req.user), status: { $ne: 'inactive' } })
        .sort({ className: 1 })
        .lean();
      return res.status(200).json(classes.map((item) => item.className));
    }
    const classes = await Student.distinct('className');
    const cleanClasses = [
      ...new Set(
        classes
          .filter((className) => className && className.trim() !== '')
          .map((className) => className.trim())
      )
    ].sort();

    res.status(200).json(cleanClasses);
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch unique classes',
      error: error.message
    });
  }
};

router.get('/classes', manageStudents, getUniqueClasses);

router.get('/', manageStudents, async (req, res) => {
  const { search = '', page = 1, limit = 10, faculty, facultyId, department, departmentId, className, classId } = req.query;
  const query = scopedQuery(req, {});
  if (search) query.$or = [{ studentId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  if (faculty) query.faculty = faculty;
  if (facultyId && req.user.role === 'admin') query.facultyId = facultyId;
  if (department) query.department = department;
  if (departmentId && ['admin', 'registration'].includes(req.user.role)) query.departmentId = departmentId;
  if (className) query.className = className;
  if (classId) query.classId = classId;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Student.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', manageStudents, async (req, res) => {
  const payload = await toStudent(req.body, req);
  const student = await Student.create(payload);
  await upsertStudentUser(student, payload.password);
  await logActivity(req, 'create', 'student', student.studentId);
  res.status(201).json(student);
});

router.put('/:id', manageStudents, async (req, res) => {
  const current = await Student.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Student not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
  const payload = await toStudent(req.body, req);
  const student = await Student.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  await upsertStudentUser(student, payload.password);
  await logActivity(req, 'update', 'student', student.studentId);
  res.json(student);
});

router.delete('/:id', manageStudents, async (req, res) => {
  const current = await Student.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Student not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  await User.deleteOne({ loginId: student.studentId });
  await logActivity(req, 'delete', 'student', student.studentId);
  res.json({ message: 'Student deleted' });
});

router.get('/template', manageStudents, async (req, res) => {
  const sample = {
    'Student ID': 'ST001',
    'Full Name': 'Amina Ali Hassan',
    Faculty: 'Faculty of Computing',
    Department: 'Computer Science',
    Class: 'CS202 / Semester 2 - 2024/2025 / 2024/2025',
    Password: '123456',
    Status: 'active'
  };
  if (String(req.query.format).toLowerCase() === 'csv') {
    return sendCsv(res, 'student_import_template.csv', [Object.fromEntries(studentImportFields.map((field) => [field.key, sample[field.header] || '']))], studentImportFields.map((field) => ({ header: field.header, key: field.key })));
  }
  sendTemplate(res, 'student_import_template.xlsx', studentImportFields, sample);
});

router.post('/bulk-import/validate', manageStudents, upload.importFile.single('file'), async (req, res) => {
  try {
    const rawRows = await readImportFile(req.file);
    const validation = await validateStudentRows(rawRows, req, req.file.originalname);
    const token = writeSession('students', validation);
    await logActivity(req, 'validate_import', 'student', 'bulk', {
      fileName: req.file.originalname,
      numberOfRecords: validation.summary.totalRecords,
      status: validation.summary.invalidRecords ? 'invalid' : 'valid'
    });
    res.json({ token, ...validation });
  } catch (error) {
    sendImportError(res, error, 'Validation failed');
  }
});

router.get('/bulk-import/errors/:token', manageStudents, async (req, res) => {
  try {
    const { data } = readSession('students', req.params.token);
    const rows = buildErrorRows(data.rows.filter((row) => !row.valid || row.warnings.length));
    sendRows(req, res, 'student_import_errors.csv', rows, [
      { header: 'Row', key: 'Row' },
      { header: 'Status', key: 'Status' },
      { header: 'Errors', key: 'Errors' },
      { header: 'Warnings', key: 'Warnings' },
      ...studentImportFields.map((field) => ({ header: field.header, key: field.key }))
    ]);
  } catch (error) {
    sendImportError(res, error, 'Error report failed');
  }
});

router.post('/bulk-import/commit', manageStudents, async (req, res) => {
  try {
    const startedAt = Date.now();
    const { filePath, data } = readSession('students', req.body.token);
    if (data.summary.invalidRecords > 0) {
      return res.status(400).json({ message: 'Import cannot continue until all validation errors are fixed', summary: data.summary });
    }
    const records = data.rows.map((row) => row.data);
    const ids = records.map((item) => item.studentId);
    const duplicateStudents = await Student.find(duplicateQuery([{ studentId: { $in: ids } }])).lean();
    if (duplicateStudents.length) {
      return res.status(409).json({ message: 'Duplicate records appeared after validation. Please validate the file again.' });
    }
    let imported = 0;
    for (const record of records) {
      const payload = await toStudent(record, req);
      const student = await Student.create(payload);
      await upsertStudentUser(student, payload.password);
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
    await logActivity(req, 'import_bulk', 'student', 'bulk', {
      importedBy: req.user.loginId,
      importDate: new Date(),
      fileName: data.fileName,
      numberOfRecords: records.length,
      status: 'success',
      summary
    });
    removeSession(filePath);
    res.json({ message: 'Students imported successfully', summary });
  } catch (error) {
    sendImportError(res, error, 'Import failed');
  }
});

router.post('/import-csv', manageStudents, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = await toStudent(row, req);
    if (!payload.studentId || !payload.fullName) continue;
    const student = await Student.findOneAndUpdate({ studentId: payload.studentId }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    await upsertStudentUser(student, payload.password);
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'student', 'bulk', { imported });
  res.json({ message: 'Students imported', imported });
});

router.get('/export', manageStudents, async (req, res) => {
  const students = await Student.find(exportQuery(req)).lean();
  sendRows(req, res, 'students.csv', students, columns);
});

router.get('/export-csv', manageStudents, async (req, res) => {
  const students = await Student.find(scopedQuery(req, {})).lean();
  sendCsv(res, 'students.csv', students, legacyColumns);
});

router.get('/me/courses', protect, authorize('student'), async (req, res) => {
  const student = await Student.findOne({ studentId: req.user.loginId });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const [assignments, evaluations] = await Promise.all([
    CourseAssignment.find({
      className: student.className,
      ...(student.departmentId ? { departmentId: student.departmentId } : {}),
      status: { $ne: 'inactive' }
    }).sort({ courseCode: 1 }),
    Evaluation.find({ studentId: student.studentId })
  ]);
  const evaluated = new Set(evaluations.map((item) => item.assignmentId || String(item.assignment)));
  res.json(
    assignments.map((course) => ({
      ...course.toObject(),
      evaluated: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)),
      studentStatus: evaluated.has(course.assignmentId) || evaluated.has(String(course._id)) ? 'Completed' : 'Pending'
    }))
  );
});

module.exports = router;
