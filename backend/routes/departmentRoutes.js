const express = require('express');
const Department = require('../models/Department');
const Faculty = require('../models/Faculty');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const { userFacultyId } = require('../utils/accessControl');

const router = express.Router();

const toDepartment = async (body) => {
  const faculty = await Faculty.findById(body.faculty || body.facultyId).lean();
  if (!faculty) throw Object.assign(new Error('Selected faculty was not found'), { statusCode: 400 });
  return {
    name: body.name,
    code: body.code,
    faculty: faculty._id,
    facultyName: faculty.name,
    description: body.description || '',
    status: body.status || 'active'
  };
};

router.get('/', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const query = {};
  if (req.query.facultyId) query.faculty = req.query.facultyId;
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.name = new RegExp(req.query.search, 'i');
  if (req.user.role === 'dean' && userFacultyId(req.user)) query.faculty = userFacultyId(req.user);
  if (req.user.role === 'registration' && userFacultyId(req.user)) query.faculty = userFacultyId(req.user);
  res.json({ data: await Department.find(query).sort({ facultyName: 1, name: 1 }).lean() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.create(await toDepartment(req.body));
    await logActivity(req, 'create', 'department', department._id.toString(), { name: department.name });
    res.status(201).json(department);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const department = await Department.findByIdAndUpdate(req.params.id, await toDepartment(req.body), {
      new: true,
      runValidators: true
    });
    if (!department) return res.status(404).json({ message: 'Department not found' });
    await logActivity(req, 'update', 'department', department._id.toString(), { name: department.name });
    res.json(department);
  } catch (error) {
    res.status(error.statusCode || 500).json({ message: error.message });
  }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const department = await Department.findByIdAndDelete(req.params.id);
  if (!department) return res.status(404).json({ message: 'Department not found' });
  await logActivity(req, 'delete', 'department', department._id.toString(), { name: department.name });
  res.json({ message: 'Department deleted' });
});

router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  const department = await Department.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!department) return res.status(404).json({ message: 'Department not found' });
  await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'department', department._id.toString());
  res.json(department);
});

module.exports = router;
