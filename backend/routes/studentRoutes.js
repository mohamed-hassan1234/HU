const express = require('express');
const Student = require('../models/Student');
const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const CourseAssignment = require('../models/CourseAssignment');
const ClassGroup = require('../models/Class');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');
const { hydrateFacultyDepartment, scopedQuery, assertCanAccessDepartment, userDepartmentId } = require('../utils/accessControl');

const router = express.Router();
const manageStudents = [protect, authorize('admin', 'registration')];

const columns = [
  { header: 'student_id', key: 'studentId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'faculty', key: 'faculty' },
  { header: 'department', key: 'department' },
  { header: 'class_name', key: 'className' },
  { header: 'status', key: 'status' }
];

const toStudent = async (body, req) => {
  const base = {
    studentId: body.studentId || body.student_id,
    fullName: body.fullName || body.full_name,
    faculty: body.faculty,
    facultyId: body.facultyId || body.faculty_id,
    department: body.department,
    departmentId: body.departmentId || body.department_id,
    className: body.className || body.class_name,
    classId: body.classId || body.class_id,
    password: body.password,
    status: body.status || 'active'
  };
  if (req?.user?.role === 'registration') {
    base.departmentId = userDepartmentId(req.user);
  }
  const hydrated = await hydrateFacultyDepartment({
    facultyId: base.facultyId,
    departmentId: base.departmentId,
    classId: base.classId,
    fallback: base
  });
  if (req?.user?.role === 'registration') assertCanAccessDepartment(req, hydrated.departmentId);
  return { ...base, ...hydrated };
};

const upsertStudentUser = async (student, password) => {
  const user = await User.findOne({ loginId: student.studentId });
  if (user) {
    user.role = 'student';
    user.status = student.status;
    user.fullName = student.fullName;
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
      faculty: student.faculty,
      facultyId: student.facultyId,
      department: student.department,
      departmentId: student.departmentId,
      status: student.status
    });
  }
};

const getUniqueClasses = async (req, res) => {
  try {
    if (req.user.role === 'registration' && userDepartmentId(req.user)) {
      const classes = await ClassGroup.find({ department: userDepartmentId(req.user), status: { $ne: 'inactive' } })
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
  if (departmentId && req.user.role === 'admin') query.departmentId = departmentId;
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
  if (req.user.role === 'registration') assertCanAccessDepartment(req, current.departmentId);
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
  if (req.user.role === 'registration') assertCanAccessDepartment(req, current.departmentId);
  const student = await Student.findByIdAndDelete(req.params.id);
  if (!student) return res.status(404).json({ message: 'Student not found' });
  await User.deleteOne({ loginId: student.studentId });
  await logActivity(req, 'delete', 'student', student.studentId);
  res.json({ message: 'Student deleted' });
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

router.get('/export-csv', manageStudents, async (req, res) => {
  const students = await Student.find(scopedQuery(req, {})).lean();
  sendCsv(res, 'students.csv', students, columns);
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
