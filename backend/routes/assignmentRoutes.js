const express = require('express');
const mongoose = require('mongoose');
const CourseAssignment = require('../models/CourseAssignment');
const Course = require('../models/Course');
const Lecturer = require('../models/Lecturer');
const Student = require('../models/Student');
const ClassGroup = require('../models/Class');
const Evaluation = require('../models/Evaluation');
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
const manageAssignments = [protect, authorize('admin', 'registration')];

const columns = [
  { header: 'assignment_id', key: 'assignmentId' },
  { header: 'course_code', key: 'courseCode' },
  { header: 'course_name', key: 'courseName' },
  { header: 'class_name', key: 'className' },
  { header: 'semester', key: 'semester' },
  { header: 'academic_year', key: 'academicYear' },
  { header: 'lecturer_id', key: 'lecturerId' },
  { header: 'lecturer_name', key: 'lecturerName' },
  { header: 'status', key: 'status' }
];

const assignmentImportFields = [
  { header: 'Assignment ID', key: 'assignmentId', aliases: ['assignment_id'] },
  { header: 'Course Code', key: 'courseCode', aliases: ['course_code'] },
  { header: 'Lecturer ID', key: 'lecturerId', aliases: ['lecturer_id', 'employee id', 'employee_id'] },
  { header: 'Class', key: 'className', aliases: ['class_name', 'class label', 'class_id'] },
  { header: 'Semester', key: 'semester' },
  { header: 'Academic Year', key: 'academicYear', aliases: ['academic_year'] },
  { header: 'Status', key: 'status' }
];

const toAssignment = (body) => ({
  assignmentId: body.assignmentId || body.assignment_id,
  courseCode: body.courseCode || body.course_code,
  courseName: body.courseName || body.course_name,
  faculty: body.faculty,
  facultyId: body.facultyId || body.faculty_id,
  department: body.department,
  departmentId: body.departmentId || body.department_id,
  className: body.className || body.class_name,
  classId: body.classId || body.class_id,
  semester: body.semester,
  academicYear: body.academicYear || body.academic_year,
  lecturerId: body.lecturerId || body.lecturer_id,
  lecturerName: body.lecturerName || body.lecturer_name,
  status: String(body.status || 'active').toLowerCase()
});

const duplicateQuery = (parts) => {
  const $or = parts.filter((item) => Object.values(item)[0].$in?.length);
  return $or.length ? { $or } : { _id: null };
};

const sendImportError = (res, error, fallback = 'Import failed') => {
  res.status(error.statusCode || 500).json({ message: error.message || fallback });
};

const unsupportedHeaders = (rawRows, fields) => {
  const allowed = new Set(fields.flatMap((field) => [field.header, field.key, ...(field.aliases || [])].map(normalizeLookup)));
  const seen = new Set();
  rawRows.forEach((row) => {
    Object.keys(row || {}).forEach((key) => {
      const normalized = normalizeLookup(key);
      if (normalized && !allowed.has(normalized)) seen.add(key);
    });
  });
  return [...seen];
};

const buildAssignmentMasterData = async (req) => {
  const classQuery = req.user.role === 'registration' && userFacultyId(req.user)
    ? { faculty: userFacultyId(req.user), status: { $ne: 'inactive' } }
    : { status: { $ne: 'inactive' } };
  const [courses, lecturers, classes] = await Promise.all([
    Course.find(scopedQuery(req, { status: { $ne: 'inactive' } })).lean(),
    Lecturer.find(scopedQuery(req, { status: { $ne: 'inactive' } })).lean(),
    ClassGroup.find(classQuery).lean()
  ]);
  return {
    coursesByCode: new Map(courses.map((course) => [normalizeLookup(course.courseCode), course])),
    lecturersById: new Map(lecturers.flatMap((lecturer) => [
      [normalizeLookup(lecturer.lecturerId), lecturer],
      [normalizeLookup(lecturer.employeeId), lecturer]
    ].filter(([key]) => key))),
    classes
  };
};

const classLabels = (classItem) => [
  classItem.className,
  `${classItem.className} / ${classItem.departmentName}`,
  `${classItem.className} / ${classItem.departmentName} / ${classItem.semester} / ${classItem.academicYear}`,
  `${classItem.className} / ${classItem.semester} / ${classItem.academicYear}`
];

const resolveImportedClass = (classes, value, semester, academicYear) => {
  const input = normalizeText(value);
  if (!input) return { error: 'Class is required' };
  const normalizedInput = normalizeLookup(input);
  let matches = classes.filter((classItem) => String(classItem._id) === input);
  if (!matches.length) {
    matches = classes.filter((classItem) => classLabels(classItem).some((label) => normalizeLookup(label) === normalizedInput));
  }
  if (!matches.length) {
    const firstPart = input.split('/')[0]?.trim();
    matches = classes.filter((classItem) => normalizeLookup(classItem.className) === normalizeLookup(firstPart));
  }
  if (semester) matches = matches.filter((classItem) => normalizeLookup(classItem.semester) === normalizeLookup(semester));
  if (academicYear) matches = matches.filter((classItem) => normalizeLookup(classItem.academicYear) === normalizeLookup(academicYear));
  const unique = [...new Map(matches.map((item) => [String(item._id), item])).values()];
  if (!unique.length) return { error: `The class "${input}" does not exist.` };
  if (unique.length > 1) return { error: `More than one class matched "${input}". Use the full class label with semester and academic year.` };
  return { classItem: unique[0] };
};

const assignmentDuplicateKey = (data) =>
  [data.courseCode, data.classId || data.className, data.semester, data.academicYear]
    .map((part) => normalizeLookup(part))
    .join('|');

const validateAssignmentRows = async (rawRows, req, fileName) => {
  ensureLimit(rawRows);
  const startedAt = Date.now();
  if (!rawRows.length) {
    const error = new Error('Import file is empty');
    error.statusCode = 400;
    throw error;
  }
  const unknownHeaders = unsupportedHeaders(rawRows, assignmentImportFields);
  const master = await buildAssignmentMasterData(req);
  const rows = rawRows.map((row, index) => {
    const data = mapRow(row, assignmentImportFields);
    data.status = normalizeLookup(data.status || 'active');
    return { rowNumber: index + 2, data, errors: [], warnings: [] };
  });
  const statuses = new Set(['active', 'inactive']);
  const requiredFields = ['assignmentId', 'courseCode', 'lecturerId', 'className', 'semester', 'academicYear', 'status'];
  const assignmentIds = rows.map((row) => row.data.assignmentId).filter(Boolean);
  const existingByAssignmentId = await CourseAssignment.find(duplicateQuery([{ assignmentId: { $in: assignmentIds } }])).lean();
  const existingAssignmentIds = new Set(existingByAssignmentId.map((assignment) => assignment.assignmentId));
  const seenIds = new Set();
  const seenAssignmentKeys = new Set();

  rows.forEach((row) => {
    const { data, errors, warnings } = row;
    unknownHeaders.forEach((header) => errors.push(`Unsupported column "${header}"`));
    requiredFields.forEach((field) => {
      if (!normalizeText(data[field])) errors.push(`${field} is required`);
    });
    if (data.status && !statuses.has(normalizeLookup(data.status))) errors.push('Invalid status');
    if (data.assignmentId && existingAssignmentIds.has(data.assignmentId)) errors.push(`Assignment ID "${data.assignmentId}" already exists`);
    if (data.assignmentId && seenIds.has(data.assignmentId)) errors.push(`Duplicate Assignment ID "${data.assignmentId}" inside file`);
    if (data.assignmentId) seenIds.add(data.assignmentId);

    const course = master.coursesByCode.get(normalizeLookup(data.courseCode));
    if (!course) errors.push(`Course Code: The course "${data.courseCode}" does not exist.`);
    else {
      data.courseCode = course.courseCode;
      data.courseName = course.courseName;
    }

    const lecturer = master.lecturersById.get(normalizeLookup(data.lecturerId));
    if (!lecturer) errors.push(`Lecturer ID: The lecturer "${data.lecturerId}" does not exist.`);
    else {
      data.lecturerId = lecturer.lecturerId;
      data.lecturerName = lecturer.fullName;
    }

    const resolved = resolveImportedClass(master.classes, data.className, data.semester, data.academicYear);
    if (resolved.error) errors.push(`Class: ${resolved.error}`);
    else {
      const classItem = resolved.classItem;
      try {
        assertCanAccessFaculty(req, classItem.faculty);
      } catch (error) {
        errors.push(error.message);
      }
      data.classId = String(classItem._id);
      data.className = classItem.className;
      data.facultyId = String(classItem.faculty);
      data.faculty = classItem.facultyName;
      data.departmentId = String(classItem.department);
      data.department = classItem.departmentName;
      if (normalizeLookup(data.semester) !== normalizeLookup(classItem.semester)) warnings.push(`Class semester is ${classItem.semester}`);
      if (normalizeLookup(data.academicYear) !== normalizeLookup(classItem.academicYear)) warnings.push(`Class academic year is ${classItem.academicYear}`);
    }

    if (course && lecturer && data.departmentId && lecturer.departmentId && String(lecturer.departmentId) !== String(data.departmentId)) {
      errors.push('Selected lecturer does not belong to the selected department');
    }
    const duplicateKey = assignmentDuplicateKey(data);
    if (data.courseCode && data.classId && data.semester && data.academicYear) {
      if (seenAssignmentKeys.has(duplicateKey)) errors.push('Duplicate Course Assignment row inside file');
      seenAssignmentKeys.add(duplicateKey);
    }
  });

  const candidateKeys = rows
    .filter((row) => row.data.courseCode && row.data.className && row.data.semester && row.data.academicYear)
    .map((row) => ({
      courseCode: row.data.courseCode,
      className: row.data.className,
      semester: row.data.semester,
      academicYear: row.data.academicYear
    }));
  const existingDuplicates = candidateKeys.length
    ? await CourseAssignment.find({ $or: candidateKeys }).lean()
    : [];
  const existingDuplicateKeys = new Set(existingDuplicates.map(assignmentDuplicateKey));
  rows.forEach((row) => {
    if (existingDuplicateKeys.has(assignmentDuplicateKey(row.data))) {
      row.errors.push('This course is already assigned to this class for the selected semester.');
    }
  });

  const studentChecks = await Promise.all(rows.map(async (row) => {
    if (row.errors.length || !row.data.className) return false;
    return Student.exists({
      className: row.data.className,
      ...(row.data.departmentId ? { departmentId: row.data.departmentId } : {}),
      status: { $ne: 'inactive' }
    });
  }));
  rows.forEach((row, index) => {
    if (!row.errors.length && !studentChecks[index]) {
      row.errors.push('No active students found for this class. Select a class from the student records.');
    }
  });

  const validRecords = rows.filter((row) => !row.errors.length).length;
  const invalidRecords = rows.length - validRecords;
  return {
    type: 'assignments',
    fileName,
    createdAt: new Date(),
    createdBy: req.user.loginId,
    processingTimeMs: Date.now() - startedAt,
    rows: rows.map((row) => ({ ...row, valid: row.errors.length === 0 })),
    summary: {
      totalRecords: rows.length,
      validRecords,
      invalidRecords,
      duplicateRecords: rows.filter((row) => row.errors.some((error) => error.toLowerCase().includes('duplicate') || error.toLowerCase().includes('already'))).length,
      warningRecords: rows.filter((row) => row.warnings.length).length
    }
  };
};

router.get('/', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  const { search = '', page = 1, limit = 10, courseCode, lecturerId, className, classId, semester, academicYear, departmentId } = req.query;
  const query = scopedQuery(req, {});
  if (req.user.role === 'lecturer') query.lecturerId = req.user.loginId;
  if (search) query.$or = [{ courseCode: new RegExp(search, 'i') }, { courseName: new RegExp(search, 'i') }];
  if (courseCode) query.courseCode = courseCode;
  if (lecturerId && req.user.role !== 'lecturer') query.lecturerId = lecturerId;
  if (className) query.className = className;
  if (classId) query.classId = classId;
  if (departmentId && ['admin', 'registration'].includes(req.user.role)) query.departmentId = departmentId;
  if (semester) query.semester = semester;
  if (academicYear) query.academicYear = academicYear;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    CourseAssignment.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    CourseAssignment.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.get('/:id/participation', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const assignment = mongoose.isValidObjectId(req.params.id)
    ? await CourseAssignment.findById(req.params.id).lean()
    : await CourseAssignment.findOne({ assignmentId: req.params.id }).lean();
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, assignment.facultyId);

  const [students, evaluations] = await Promise.all([
    Student.find({
      className: assignment.className,
      ...(assignment.departmentId ? { departmentId: assignment.departmentId } : {}),
      status: 'active'
    }).sort({ fullName: 1 }).lean(),
    Evaluation.find({ assignment: assignment._id }).sort({ submittedAt: -1 }).lean()
  ]);
  const evaluationByStudent = new Map(evaluations.map((item) => [item.studentId, item]));
  const roster = students.map((student) => {
    const evaluation = evaluationByStudent.get(student.studentId);
    return {
      studentId: student.studentId,
      studentName: student.fullName,
      faculty: student.faculty,
      department: student.department,
      status: evaluation ? 'submitted' : 'pending',
      submittedAt: evaluation?.submittedAt || null,
      courseScore: evaluation?.courseOverallRating || null,
      teacherScore: evaluation?.lecturerOverallRating || null
    };
  });
  const submitted = roster.filter((item) => item.status === 'submitted').length;
  const eligible = roster.length;

  res.json({
    assignment,
    totals: {
      eligible,
      submitted,
      pending: Math.max(eligible - submitted, 0),
      participationRate: eligible ? Number(((submitted / eligible) * 100).toFixed(1)) : 0
    },
    students: roster
  });
});

const hydrateAssignment = async (payload) => {
  const master = await hydrateFacultyDepartment({
    facultyId: payload.facultyId,
    departmentId: payload.departmentId,
    classId: payload.classId,
    fallback: payload
  });
  const [course, lecturer] = await Promise.all([
    Course.findOne({ courseCode: payload.courseCode }),
    Lecturer.findOne({ lecturerId: payload.lecturerId })
  ]);
  if (!course) throw Object.assign(new Error('Selected course was not found'), { statusCode: 400 });
  if (!lecturer) throw Object.assign(new Error('Selected lecturer was not found'), { statusCode: 400 });
  if (master.departmentId && lecturer.departmentId && String(lecturer.departmentId) !== String(master.departmentId)) {
    throw Object.assign(new Error('Selected lecturer does not belong to the selected department'), { statusCode: 400 });
  }
  return {
    ...payload,
    ...master,
    courseName: course.courseName,
    lecturerName: lecturer.fullName
  };
};

const ensureUniqueAssignment = async (payload, ignoreId) => {
  const duplicate = await CourseAssignment.findOne({
    courseCode: payload.courseCode,
    className: payload.className,
    semester: payload.semester,
    academicYear: payload.academicYear,
    ...(ignoreId ? { _id: { $ne: ignoreId } } : {})
  });
  if (duplicate) {
    throw Object.assign(new Error('This course is already assigned to this class for the selected semester.'), {
      statusCode: 409
    });
  }
};

const ensureStudentsExistForAssignment = async (payload) => {
  const exists = await Student.exists({
    className: payload.className,
    ...(payload.departmentId ? { departmentId: payload.departmentId } : {}),
    status: { $ne: 'inactive' }
  });
  if (!exists) {
    throw Object.assign(
      new Error('No active students found for this class. Select a class from the student records.'),
      { statusCode: 400 }
    );
  }
};

router.post('/', manageAssignments, async (req, res) => {
  try {
    const base = toAssignment(req.body);
    if (req.user.role === 'registration') base.facultyId = userFacultyId(req.user);
    const payload = await hydrateAssignment(base);
    if (req.user.role === 'registration') assertCanAccessFaculty(req, payload.facultyId);
    await ensureStudentsExistForAssignment(payload);
    await ensureUniqueAssignment(payload);
    const assignment = await CourseAssignment.create(payload);
    await logActivity(req, 'create', 'assignment', assignment.assignmentId);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.get('/template', manageAssignments, async (req, res) => {
  const sample = {
    'Assignment ID': 'ASN-000001',
    'Course Code': 'CS101',
    'Lecturer ID': 'LEC001',
    Class: 'CS202 / Computer Science / Semester 2 - 2024/2025 / 2024/2025',
    Semester: 'Semester 2 - 2024/2025',
    'Academic Year': '2024/2025',
    Status: 'active'
  };
  if (String(req.query.format).toLowerCase() === 'csv') {
    return sendCsv(
      res,
      'course_assignment_import_template.csv',
      [Object.fromEntries(assignmentImportFields.map((field) => [field.key, sample[field.header] || '']))],
      assignmentImportFields.map((field) => ({ header: field.header, key: field.key }))
    );
  }
  sendTemplate(res, 'course_assignment_import_template.xlsx', assignmentImportFields, sample);
});

router.post('/bulk-import/validate', manageAssignments, upload.importFile.single('file'), async (req, res) => {
  try {
    const rawRows = await readImportFile(req.file);
    const validation = await validateAssignmentRows(rawRows, req, req.file.originalname);
    const token = writeSession('assignments', validation);
    await logActivity(req, 'validate_import', 'assignment', 'bulk', {
      fileName: req.file.originalname,
      numberOfRecords: validation.summary.totalRecords,
      status: validation.summary.invalidRecords ? 'invalid' : 'valid'
    });
    res.json({ token, ...validation });
  } catch (error) {
    sendImportError(res, error, 'Validation failed');
  }
});

router.get('/bulk-import/errors/:token', manageAssignments, async (req, res) => {
  try {
    const { data } = readSession('assignments', req.params.token);
    const rows = buildErrorRows(data.rows.filter((row) => !row.valid || row.warnings.length));
    sendRows(req, res, 'course_assignment_import_errors.csv', rows, [
      { header: 'Row', key: 'Row' },
      { header: 'Status', key: 'Status' },
      { header: 'Errors', key: 'Errors' },
      { header: 'Warnings', key: 'Warnings' },
      ...assignmentImportFields.map((field) => ({ header: field.header, key: field.key }))
    ]);
  } catch (error) {
    sendImportError(res, error, 'Error report failed');
  }
});

router.post('/bulk-import/commit', manageAssignments, async (req, res) => {
  let session;
  try {
    const startedAt = Date.now();
    const { filePath, data } = readSession('assignments', req.body.token);
    if (data.summary.invalidRecords > 0) {
      return res.status(400).json({ message: 'Import cannot continue until all validation errors are fixed', summary: data.summary });
    }
    const records = data.rows.map((row) => row.data);
    const duplicateAssignments = records.length
      ? await CourseAssignment.find({
        $or: records.map((record) => ({
          courseCode: record.courseCode,
          className: record.className,
          semester: record.semester,
          academicYear: record.academicYear
        }))
      }).lean()
      : [];
    const duplicateIds = await CourseAssignment.find(duplicateQuery([
      { assignmentId: { $in: records.map((record) => record.assignmentId).filter(Boolean) } }
    ])).lean();
    if (duplicateAssignments.length || duplicateIds.length) {
      return res.status(409).json({ message: 'Duplicate records appeared after validation. Please validate the file again.' });
    }

    session = await mongoose.startSession();
    let imported = 0;
    await session.withTransaction(async () => {
      for (const record of records) {
        let payload = toAssignment(record);
        if (req.user.role === 'registration') payload.facultyId = userFacultyId(req.user);
        payload = await hydrateAssignment(payload);
        if (req.user.role === 'registration') assertCanAccessFaculty(req, payload.facultyId);
        await ensureStudentsExistForAssignment(payload);
        await ensureUniqueAssignment(payload);
        await CourseAssignment.create([payload], { session });
        imported += 1;
      }
    });

    const summary = {
      totalRecords: records.length,
      importedSuccessfully: imported,
      failedRecords: 0,
      duplicateRecords: data.summary.duplicateRecords,
      skippedRecords: 0,
      processingTimeMs: Date.now() - startedAt,
      successPercentage: records.length ? Number(((imported / records.length) * 100).toFixed(1)) : 0
    };
    await logActivity(req, 'import_bulk', 'assignment', 'bulk', {
      importedBy: req.user.loginId,
      importDate: new Date(),
      fileName: data.fileName,
      numberOfRecords: records.length,
      status: 'success',
      summary
    });
    removeSession(filePath);
    res.json({ message: 'Course assignments imported successfully', summary });
  } catch (error) {
    sendImportError(res, error, 'Import failed');
  } finally {
    if (session) session.endSession();
  }
});

router.put('/:id', manageAssignments, async (req, res) => {
  try {
    const current = await CourseAssignment.findById(req.params.id).lean();
    if (!current) return res.status(404).json({ message: 'Assignment not found' });
    if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
    const base = toAssignment(req.body);
    if (req.user.role === 'registration') base.facultyId = userFacultyId(req.user);
    const payload = await hydrateAssignment(base);
    if (req.user.role === 'registration') assertCanAccessFaculty(req, payload.facultyId);
    await ensureStudentsExistForAssignment(payload);
    await ensureUniqueAssignment(payload, req.params.id);
    const assignment = await CourseAssignment.findByIdAndUpdate(req.params.id, payload, {
      new: true,
      runValidators: true
    });
    if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
    await logActivity(req, 'update', 'assignment', assignment.assignmentId);
    res.json(assignment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete('/:id', manageAssignments, async (req, res) => {
  const current = await CourseAssignment.findById(req.params.id).lean();
  if (!current) return res.status(404).json({ message: 'Assignment not found' });
  if (req.user.role === 'registration') assertCanAccessFaculty(req, current.facultyId);
  const assignment = await CourseAssignment.findByIdAndDelete(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  await logActivity(req, 'delete', 'assignment', assignment.assignmentId);
  res.json({ message: 'Assignment deleted' });
});

router.post('/import-csv', manageAssignments, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    let payload = toAssignment(row);
    if (req.user.role === 'registration') payload.facultyId = userFacultyId(req.user);
    payload = await hydrateAssignment(payload);
    if (req.user.role === 'registration') assertCanAccessFaculty(req, payload.facultyId);
    if (!payload.assignmentId || !payload.courseCode) continue;
    const duplicate = await CourseAssignment.findOne({
      courseCode: payload.courseCode,
      className: payload.className,
      semester: payload.semester,
      academicYear: payload.academicYear,
      assignmentId: { $ne: payload.assignmentId }
    });
    if (duplicate) {
      skipped += 1;
      continue;
    }
    const course = await Course.findOne({ courseCode: payload.courseCode });
    const lecturer = await Lecturer.findOne({ lecturerId: payload.lecturerId });
    payload.courseName = payload.courseName || course?.courseName;
    payload.lecturerName = payload.lecturerName || lecturer?.fullName;
    await CourseAssignment.findOneAndUpdate({ assignmentId: payload.assignmentId }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'assignment', 'bulk', { imported, skipped });
  res.json({ message: 'Assignments imported', imported, skipped });
});

router.get('/export-csv', manageAssignments, async (req, res) => {
  sendCsv(res, 'course_assignments.csv', await CourseAssignment.find(scopedQuery(req, {})).lean(), columns);
});

module.exports = router;
