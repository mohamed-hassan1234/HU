const express = require('express');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const readers = [protect, authorize('admin', 'registration', 'dean', 'lecturer')];
const admins = [protect, authorize('admin')];

const termPayload = async (body) => {
  const year = await AcademicYear.findById(body.academicYear || body.academicYearId).lean();
  if (!year) throw Object.assign(new Error('Academic year not found'), { statusCode: 400 });
  const termNumber = Number(body.termNumber);
  if (![1, 2].includes(termNumber)) throw Object.assign(new Error('Term number must be 1 or 2'), { statusCode: 400 });
  const startDate = new Date(body.startDate);
  const endDate = new Date(body.endDate);
  if (startDate < year.startDate || endDate > year.endDate) {
    throw Object.assign(new Error('Term dates must be inside the academic year'), { statusCode: 400 });
  }
  return {
    academicYear: year._id,
    academicYearName: year.name,
    termNumber,
    name: body.name || `Term ${termNumber}`,
    startDate: body.startDate,
    endDate: body.endDate
  };
};

router.get('/', readers, async (req, res) => {
  const query = {};
  if (req.query.academicYearId) query.academicYear = req.query.academicYearId;
  if (req.query.status) query.status = req.query.status;
  res.json({ data: await AcademicTerm.find(query).sort({ startDate: -1, termNumber: 1 }).lean() });
});

router.post('/', admins, async (req, res) => {
  const term = await AcademicTerm.create({ ...await termPayload(req.body), status: 'planned' });
  await logActivity(req, 'create', 'academic_term', term._id.toString(), { name: term.name, academicYear: term.academicYearName });
  res.status(201).json(term);
});

router.put('/:id', admins, async (req, res) => {
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return res.status(404).json({ message: 'Academic term not found' });
  if (term.status === 'closed') return res.status(409).json({ message: 'Closed academic terms are read-only' });
  Object.assign(term, await termPayload(req.body));
  await term.save();
  await logActivity(req, 'update', 'academic_term', term._id.toString(), { name: term.name });
  res.json(term);
});

router.patch('/:id/status', admins, async (req, res) => {
  const status = req.body.status;
  if (!['planned', 'active', 'closed'].includes(status)) return res.status(400).json({ message: 'Invalid academic term status' });
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return res.status(404).json({ message: 'Academic term not found' });
  if (term.status === 'closed') return res.status(409).json({ message: 'Closed academic terms cannot be reopened' });
  const year = await AcademicYear.findById(term.academicYear);
  if (!year || (status === 'active' && year.status !== 'active')) {
    return res.status(409).json({ message: 'Activate the term’s academic year before activating this term' });
  }
  if (status === 'active') {
    const previous = await AcademicTerm.findOne({ status: 'active', _id: { $ne: term._id } });
    if (previous) previous.status = 'closed';
    if (previous) await previous.save();
  }
  term.status = status;
  await term.save();
  await logActivity(req, `status_${status}`, 'academic_term', term._id.toString(), { name: term.name });
  res.json(term);
});

router.delete('/:id', admins, async (req, res) => {
  const term = await AcademicTerm.findById(req.params.id);
  if (!term) return res.status(404).json({ message: 'Academic term not found' });
  if (term.status !== 'planned') return res.status(409).json({ message: 'Only planned terms can be deleted' });
  await term.deleteOne();
  await logActivity(req, 'delete', 'academic_term', term._id.toString(), { name: term.name });
  res.json({ message: 'Academic term deleted' });
});

module.exports = router;
