const express = require('express');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const readers = [protect, authorize('admin', 'registration', 'dean', 'lecturer')];
const admins = [protect, authorize('admin')];

const payload = (body) => ({
  name: String(body.name || '').trim(),
  startDate: body.startDate,
  endDate: body.endDate
});

router.get('/', readers, async (req, res) => {
  const query = {};
  if (req.query.status) query.status = req.query.status;
  if (req.query.search) query.name = new RegExp(req.query.search, 'i');
  res.json({ data: await AcademicYear.find(query).sort({ startDate: -1 }).lean() });
});

router.post('/', admins, async (req, res) => {
  const data = payload(req.body);
  if (!/^\d{4}\/\d{4}$/.test(data.name)) return res.status(400).json({ message: 'Academic year must use YYYY/YYYY format' });
  const year = await AcademicYear.create({ ...data, status: 'planned' });
  await logActivity(req, 'create', 'academic_year', year._id.toString(), { name: year.name });
  res.status(201).json(year);
});

router.put('/:id', admins, async (req, res) => {
  const current = await AcademicYear.findById(req.params.id);
  if (!current) return res.status(404).json({ message: 'Academic year not found' });
  if (current.status === 'closed') return res.status(409).json({ message: 'Closed academic years are read-only' });
  Object.assign(current, payload(req.body));
  await current.save();
  await logActivity(req, 'update', 'academic_year', current._id.toString(), { name: current.name });
  res.json(current);
});

router.patch('/:id/status', admins, async (req, res) => {
  const status = req.body.status;
  if (!['planned', 'active', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid academic year status' });
  const year = await AcademicYear.findById(req.params.id);
  if (!year) return res.status(404).json({ message: 'Academic year not found' });
  if (year.status === 'closed') return res.status(409).json({ message: 'Closed academic years cannot be reopened' });
  if (status === 'active') {
    const previousYears = await AcademicYear.find({ _id: { $ne: year._id }, status: 'active' }).select('_id').lean();
    await AcademicTerm.updateMany({ academicYear: { $in: previousYears.map((item) => item._id) }, status: 'active' }, { $set: { status: 'closed' } });
    await AcademicYear.updateMany({ _id: { $ne: year._id }, status: 'active' }, { $set: { status: 'closed' } });
  }
  if (status === 'closed') {
    await AcademicTerm.updateMany({ academicYear: year._id, status: { $ne: 'closed' } }, { $set: { status: 'closed' } });
  }
  year.status = status;
  await year.save();
  await logActivity(req, `status_${status}`, 'academic_year', year._id.toString(), { name: year.name });
  res.json(year);
});

router.delete('/:id', admins, async (req, res) => {
  const year = await AcademicYear.findById(req.params.id);
  if (!year) return res.status(404).json({ message: 'Academic year not found' });
  if (year.status !== 'planned') return res.status(409).json({ message: 'Only planned academic years can be deleted' });
  if (await AcademicTerm.exists({ academicYear: year._id })) return res.status(409).json({ message: 'Delete this academic year’s terms first' });
  await year.deleteOne();
  await logActivity(req, 'delete', 'academic_year', year._id.toString(), { name: year.name });
  res.json({ message: 'Academic year deleted' });
});

module.exports = router;
