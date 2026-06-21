const express = require('express');
const mongoose = require('mongoose');
const CourseAssignment = require('../models/CourseAssignment');
const Course = require('../models/Course');
const Lecturer = require('../models/Lecturer');
const Student = require('../models/Student');
const Evaluation = require('../models/Evaluation');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

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

const toAssignment = (body) => ({
  assignmentId: body.assignmentId || body.assignment_id,
  courseCode: body.courseCode || body.course_code,
  courseName: body.courseName || body.course_name,
  className: body.className || body.class_name,
  semester: body.semester,
  academicYear: body.academicYear || body.academic_year,
  lecturerId: body.lecturerId || body.lecturer_id,
  lecturerName: body.lecturerName || body.lecturer_name,
  status: String(body.status || 'active').toLowerCase()
});

router.get('/', protect, authorize('admin', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const { search = '', page = 1, limit = 10, courseCode, lecturerId, className, semester, academicYear } = req.query;
  const query = {};
  if (req.user.role === 'lecturer') query.lecturerId = req.user.loginId;
  if (search) query.$or = [{ courseCode: new RegExp(search, 'i') }, { courseName: new RegExp(search, 'i') }];
  if (courseCode) query.courseCode = courseCode;
  if (lecturerId && req.user.role !== 'lecturer') query.lecturerId = lecturerId;
  if (className) query.className = className;
  if (semester) query.semester = semester;
  if (academicYear) query.academicYear = academicYear;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    CourseAssignment.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    CourseAssignment.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.get('/:id/participation', protect, authorize('admin', 'department_head', 'dean'), async (req, res) => {
  const assignment = mongoose.isValidObjectId(req.params.id)
    ? await CourseAssignment.findById(req.params.id).lean()
    : await CourseAssignment.findOne({ assignmentId: req.params.id }).lean();
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });

  const [students, evaluations] = await Promise.all([
    Student.find({ className: assignment.className, status: 'active' }).sort({ fullName: 1 }).lean(),
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
  const [course, lecturer] = await Promise.all([
    Course.findOne({ courseCode: payload.courseCode }),
    Lecturer.findOne({ lecturerId: payload.lecturerId })
  ]);
  if (!course) throw Object.assign(new Error('Selected course was not found'), { statusCode: 400 });
  if (!lecturer) throw Object.assign(new Error('Selected lecturer was not found'), { statusCode: 400 });
  return {
    ...payload,
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
    status: { $ne: 'inactive' }
  });
  if (!exists) {
    throw Object.assign(
      new Error('No active students found for this class. Select a class from the student records.'),
      { statusCode: 400 }
    );
  }
};

router.post('/', adminOnly, async (req, res) => {
  try {
    const payload = await hydrateAssignment(toAssignment(req.body));
    await ensureStudentsExistForAssignment(payload);
    await ensureUniqueAssignment(payload);
    const assignment = await CourseAssignment.create(payload);
    await logActivity(req, 'create', 'assignment', assignment.assignmentId);
    res.status(201).json(assignment);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put('/:id', adminOnly, async (req, res) => {
  try {
    const payload = await hydrateAssignment(toAssignment(req.body));
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

router.delete('/:id', adminOnly, async (req, res) => {
  const assignment = await CourseAssignment.findByIdAndDelete(req.params.id);
  if (!assignment) return res.status(404).json({ message: 'Assignment not found' });
  await logActivity(req, 'delete', 'assignment', assignment.assignmentId);
  res.json({ message: 'Assignment deleted' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  let skipped = 0;
  for (const row of rows) {
    let payload = toAssignment(row);
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

router.get('/export-csv', adminOnly, async (req, res) => {
  sendCsv(res, 'course_assignments.csv', await CourseAssignment.find().lean(), columns);
});

module.exports = router;
