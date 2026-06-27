const express = require('express');
const Faculty = require('../models/Faculty');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');
const { userFacultyId } = require('../utils/accessControl');

const router = express.Router();

router.get('/', protect, authorize('admin', 'registration', 'department_head', 'dean'), async (req, res) => {
  const query = {};
  if (req.user.role === 'dean' && userFacultyId(req.user)) query._id = userFacultyId(req.user);
  if (['registration', 'department_head'].includes(req.user.role) && userFacultyId(req.user)) query._id = userFacultyId(req.user);
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.name = new RegExp(req.query.search, 'i');
  res.json({ data: await Faculty.find(query).sort({ name: 1 }).lean() });
});

router.post('/', protect, authorize('admin'), async (req, res) => {
  const faculty = await Faculty.create({
    name: req.body.name,
    code: req.body.code,
    description: req.body.description,
    status: req.body.status || 'active'
  });
  await logActivity(req, 'create', 'faculty', faculty._id.toString(), { name: faculty.name });
  res.status(201).json(faculty);
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
  await logActivity(req, 'update', 'faculty', faculty._id.toString(), { name: faculty.name });
  res.json(faculty);
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const faculty = await Faculty.findByIdAndDelete(req.params.id);
  if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
  await logActivity(req, 'delete', 'faculty', faculty._id.toString(), { name: faculty.name });
  res.json({ message: 'Faculty deleted' });
});

router.patch('/:id/status', protect, authorize('admin'), async (req, res) => {
  const status = req.body.status === 'inactive' ? 'inactive' : 'active';
  const faculty = await Faculty.findByIdAndUpdate(req.params.id, { status }, { new: true });
  if (!faculty) return res.status(404).json({ message: 'Faculty not found' });
  await logActivity(req, status === 'active' ? 'activate' : 'deactivate', 'faculty', faculty._id.toString());
  res.json(faculty);
});

module.exports = router;
