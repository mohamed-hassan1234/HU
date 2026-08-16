const express = require('express');
const ClassGroup = require('../models/Class');
const Department = require('../models/Department');
const CourseAssignment = require('../models/CourseAssignment');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const { sendOperationalError } = require('../utils/httpError');
const { userFacultyId, userDepartmentId } = require('../utils/accessControl');
const { validateSemesterForTerm } = require('../utils/academicCalendar');

const router = express.Router();

const toClass = async (body) => {
  const department = await Department.findById(body.department || body.departmentId).lean();
  if (!department) throw Object.assign(new Error('Selected department was not found'), { statusCode: 400 });
  const academicYear = body.currentAcademicYear || body.currentAcademicYearId
    ? await AcademicYear.findById(body.currentAcademicYear || body.currentAcademicYearId).lean()
    : await AcademicYear.findOne({ status: 'active' }).lean();
  const term = body.currentTerm || body.currentTermId
    ? await AcademicTerm.findById(body.currentTerm || body.currentTermId).lean()
    : await AcademicTerm.findOne({ status: 'active' }).lean();
  if (!academicYear || !term) throw Object.assign(new Error('An academic year and term are required'), { statusCode: 400 });
  if (String(term.academicYear) !== String(academicYear._id)) {
    throw Object.assign(new Error('Selected term does not belong to the selected academic year'), { statusCode: 400 });
  }
  const currentSemester = Number(body.currentSemester);
  const semesterValidation = validateSemesterForTerm({ semester: currentSemester, termNumber: term.termNumber, totalSemesters: department.totalSemesters });
  if (!semesterValidation.valid) throw Object.assign(new Error(semesterValidation.message), { statusCode: 400 });
  return {
    classCode: body.classCode || body.code,
    className: body.className || body.name,
    description: body.description || '',
    faculty: department.faculty,
    facultyName: department.facultyName,
    department: department._id,
    departmentName: department.name,
    currentAcademicYear: academicYear._id,
    currentAcademicYearName: academicYear.name,
    currentTerm: term._id,
    currentTermNumber: term.termNumber,
    currentSemester,
    academicYear: academicYear.name,
    semester: `Semester ${currentSemester}`,
    status: body.status || 'active'
  };
};

router.get('/', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  const query = {};
  if (req.query.facultyId) query.faculty = req.query.facultyId;
  if (req.query.departmentId) query.department = req.query.departmentId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.className = new RegExp(req.query.search, 'i');
  if (req.user.role === 'dean' && userFacultyId(req.user)) query.faculty = userFacultyId(req.user);
  if (req.user.role === 'registration' && userDepartmentId(req.user)) query.department = userDepartmentId(req.user);
  if (req.user.role === 'lecturer') {
    const assignments = await CourseAssignment.find({
      lecturerId: req.user.loginId,
      status: { $ne: 'inactive' },
      classId: { $exists: true, $ne: null }
    }).select('classId').lean();
    query._id = { $in: [...new Set(assignments.map((assignment) => String(assignment.classId)))] };
  }
  res.json({ data: await ClassGroup.find(query).sort({ academicYear: -1, semester: 1, className: 1 }).lean() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    if (!req.body.classCode && !req.body.code) return res.status(400).json({ message: 'Class code is required' });
    const classGroup = await ClassGroup.create(await toClass(req.body));
    await logActivity(req, 'create', 'class', classGroup._id.toString(), { className: classGroup.className });
    res.status(201).json(classGroup);
  } catch (error) {
    sendOperationalError(res, error);
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const existing = await ClassGroup.findById(req.params.id).lean();
    if (!existing) return res.status(404).json({ message: 'Class not found' });
    if (existing.status === 'graduated') return res.status(409).json({ message: 'Graduated classes are read-only' });
    if (existing.classCode && (req.body.classCode || req.body.code) && String(req.body.classCode || req.body.code).toUpperCase() !== existing.classCode) {
      return res.status(409).json({ message: 'Class code cannot be changed' });
    }
    const classGroup = await ClassGroup.findByIdAndUpdate(req.params.id, await toClass(req.body), {
      new: true,
      runValidators: true
    });
    if (!classGroup) return res.status(404).json({ message: 'Class not found' });
    await logActivity(req, 'update', 'class', classGroup._id.toString(), { className: classGroup.className });
    res.json(classGroup);
  } catch (error) {
    sendOperationalError(res, error);
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const current = await ClassGroup.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Class not found' });
  if (current.status !== 'planned') return res.status(409).json({ message: 'Only planned classes can be deleted' });
  const classGroup = await ClassGroup.findByIdAndDelete(req.params.id);
  if (!classGroup) return res.status(404).json({ message: 'Class not found' });
  await logActivity(req, 'delete', 'class', classGroup._id.toString(), { className: classGroup.className });
  res.json({ message: 'Class deleted' });
});

router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  const status = req.body.status;
  if (!['planned', 'active', 'suspended', 'graduated', 'archived'].includes(status)) return res.status(400).json({ message: 'Invalid class status' });
  const existing = await ClassGroup.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Class not found' });
  if (existing.status === 'graduated') return res.status(409).json({ message: 'Graduated classes are read-only' });
  const classGroup = await ClassGroup.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!classGroup) return res.status(404).json({ message: 'Class not found' });
  await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'class', classGroup._id.toString());
  res.json(classGroup);
});

module.exports = router;
