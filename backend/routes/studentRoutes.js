const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const CourseAssignment = require('../models/CourseAssignment');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

const columns = [
  { header: 'student_id', key: 'studentId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'faculty', key: 'faculty' },
  { header: 'department', key: 'department' },
  { header: 'class_name', key: 'className' },
  { header: 'semester', key: 'semester' },
  { header: 'academic_year', key: 'academicYear' },
  { header: 'email', key: 'email' },
  { header: 'status', key: 'status' }
];

const toStudent = (body) => ({
  studentId: body.studentId || body.student_id,
  fullName: body.fullName || body.full_name,
  faculty: body.faculty,
  department: body.department,
  className: body.className || body.class_name,
  semester: body.semester,
  academicYear: body.academicYear || body.academic_year,
  email: body.email,
  password: body.password,
  status: body.status || 'active'
});

const upsertStudentUser = async (student, password) => {
  const user = await User.findOne({ loginId: student.studentId });
  if (user) {
    user.role = 'student';
    user.status = student.status;
    if (password) user.password = password;
    await user.save();
  } else {
    await User.create({
      loginId: student.studentId,
      password: password || '123456',
      role: 'student',
      status: student.status
    });
  }
};

const getUniqueClasses = async (req, res) => {
  try {
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

router.get('/classes', adminOnly, getUniqueClasses);

router.get('/academic-options', adminOnly, async (req, res) => {
  try {
    const students = await Student.find().select('className semester academicYear').lean();
    const classes = new Set();
    const semesters = new Set();
    const academicYears = new Set();
    const byClass = {};

    students.forEach((student) => {
      const className = student.className?.trim();
      const semester = student.semester?.trim();
      const academicYear = student.academicYear?.trim();
      if (!className) return;

      classes.add(className);
      if (semester) semesters.add(semester);
      if (academicYear) academicYears.add(academicYear);

      byClass[className] ||= { semesters: new Set(), academicYears: new Set() };
      if (semester) byClass[className].semesters.add(semester);
      if (academicYear) byClass[className].academicYears.add(academicYear);
    });

    res.json({
      classes: [...classes].sort(),
      semesters: [...semesters].sort(),
      academicYears: [...academicYears].sort(),
      byClass: Object.fromEntries(
        Object.entries(byClass).map(([className, values]) => [
          className,
          {
            semesters: [...values.semesters].sort(),
            academicYears: [...values.academicYears].sort()
          }
        ])
      )
    });
  } catch (error) {
    res.status(500).json({
      message: 'Failed to fetch academic options',
      error: error.message
    });
  }
});

router.get('/', adminOnly, async (req, res) => {
  const { search = '', page = 1, limit = 10, faculty, department, className } = req.query;
  const query = {};
  if (search) query.$or = [{ studentId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  if (faculty) query.faculty = faculty;
  if (department) query.department = department;
  if (className) query.className = className;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Student.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Student.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', adminOnly, async (req, res) => {
  const payload = toStudent(req.body);
  const student = await Student.create(payload);
  await upsertStudentUser(student, payload.password);
  await logActivity(req, 'create', 'student', student.studentId);
  res.status(201).json(student);
});

router.put('/:id', adminOnly, async (req, res) => {
  const payload = toStudent(req.body);
  const student = await Student.findByIdAndUpdate(req.params.id, payload, { new: true, runValidators: true });
  if (!student) return res.status(404).json({ message: 'Student not found' });
  await upsertStudentUser(student, payload.password);
  await logActivity(req, 'update', 'student', student.studentId);
  res.json(student);
});

router.delete('/:id', adminOnly, async (req, res) => {
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  await User.deleteOne({ loginId: student.studentId });
  await logActivity(req, 'delete', 'student', student.studentId);
  res.json({ message: 'Student deleted' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = toStudent(row);
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

router.get('/export-csv', adminOnly, async (req, res) => {
  const students = await Student.find().lean();
  sendCsv(res, 'students.csv', students, columns);
});

router.get('/me/courses', protect, authorize('student'), async (req, res) => {
  const student = await Student.findOne({ studentId: req.user.loginId });
  if (!student) return res.status(404).json({ message: 'Student profile not found' });
  const [assignments, evaluations] = await Promise.all([
    CourseAssignment.find({
      className: student.className,
      semester: student.semester,
      academicYear: student.academicYear,
      status: { $ne: 'inactive' }
    }).sort({ courseCode: 1 }),
    Evaluation.find({ studentId: student.studentId, semester: student.semester, academicYear: student.academicYear })
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
