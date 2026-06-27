const express = require('express');
const ClassGroup = require('../models/Class');
const Department = require('../models/Department');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const { userDepartmentId, userFacultyId } = require('../utils/accessControl');

const router = express.Router();

const toClass = async (body) => {
  const department = await Department.findById(body.department || body.departmentId).lean();
  if (!department) throw Object.assign(new Error('Selected department was not found'), { statusCode: 400 });
  return {
    className: body.className || body.name,
    faculty: department.faculty,
    facultyName: department.facultyName,
    department: department._id,
    departmentName: department.name,
    academicYear: body.academicYear,
    semester: body.semester,
    status: body.status || 'active'
  };
};

router.get('/', protect, authorize('admin', 'registration', 'department_head', 'dean', 'lecturer'), async (req, res) => {
  const query = {};
  if (req.query.facultyId) query.faculty = req.query.facultyId;
  if (req.query.departmentId) query.department = req.query.departmentId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.className = new RegExp(req.query.search, 'i');
  if (req.user.role === 'dean' && userFacultyId(req.user)) query.faculty = userFacultyId(req.user);
  if (['registration', 'department_head'].includes(req.user.role) && userDepartmentId(req.user)) {
    query.department = userDepartmentId(req.user);
  }
  res.json({ data: await ClassGroup.find(query).sort({ academicYear: -1, semester: 1, className: 1 }).lean() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const classGroup = await ClassGroup.create(await toClass(req.body));
    await logActivity(req, 'create', 'class', classGroup._id.toString(), { className: classGroup.className });
    res.status(201).json(classGroup);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const classGroup = await ClassGroup.findByIdAndUpdate(req.params.id, await toClass(req.body), {
      new: true,
      runValidators: true
    });
    if (!classGroup) return res.status(404).json({ message: 'Class not found' });
    await logActivity(req, 'update', 'class', classGroup._id.toString(), { className: classGroup.className });
    res.json(classGroup);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const classGroup = await ClassGroup.findByIdAndDelete(req.params.id);
  if (!classGroup) return res.status(404).json({ message: 'Class not found' });
  await logActivity(req, 'delete', 'class', classGroup._id.toString(), { className: classGroup.className });
  res.json({ message: 'Class deleted' });
});

router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  const classGroup = await ClassGroup.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!classGroup) return res.status(404).json({ message: 'Class not found' });
  await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'class', classGroup._id.toString());
  res.json(classGroup);
});

module.exports = router;
