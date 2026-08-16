const express = require('express');
const EvaluationCampaign = require('../models/EvaluationCampaign');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const Evaluation = require('../models/Evaluation');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const admin = [protect, authorize('admin')];

router.get('/', protect, authorize('admin', 'registration', 'dean', 'lecturer'), async (req, res) => {
  const query = {};
  if (req.query.academicYear) query.academicYear = req.query.academicYear;
  if (req.query.term) query.term = req.query.term;
  res.json(await EvaluationCampaign.find(query).sort({ startsAt: -1 }).lean());
});

router.post('/', admin, async (req, res) => {
  const [year, term] = await Promise.all([AcademicYear.findById(req.body.academicYear), AcademicTerm.findById(req.body.term)]);
  if (!year || !term || String(term.academicYear) !== String(year._id)) return res.status(400).json({ message: 'Select a valid academic year and term' });
  if (year.status === 'closed' || term.status === 'closed') return res.status(409).json({ message: 'Closed academic periods cannot receive campaigns' });
  const startsAt = new Date(req.body.startsAt); const endsAt = new Date(req.body.endsAt);
  if (startsAt < term.startDate || endsAt > term.endDate) return res.status(400).json({ message: 'Campaign dates must be inside the selected term' });
  if (req.body.targetType !== 'all' && !(req.body.targetIds || []).length) return res.status(400).json({ message: 'Select at least one campaign target' });
  const campaign = await EvaluationCampaign.create({ ...req.body, academicYearName: year.name, termNumber: term.termNumber, status: 'scheduled', createdBy: req.user.loginId });
  await logActivity(req, 'create', 'campaign', campaign._id.toString());
  res.status(201).json(campaign);
});

router.put('/:id', admin, async (req, res) => {
  const campaign = await EvaluationCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status !== 'scheduled') return res.status(409).json({ message: 'Only scheduled campaigns can be edited' });
  ['name', 'startsAt', 'endsAt', 'targetType', 'targetIds', 'minimumResponses'].forEach((key) => {
    if (req.body[key] !== undefined) campaign[key] = req.body[key];
  });
  await campaign.save();
  res.json(campaign);
});

router.patch('/:id/status', admin, async (req, res) => {
  const campaign = await EvaluationCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  const allowed = { scheduled: ['open', 'closed'], open: ['closed'], closed: ['published'], published: [] };
  if (!allowed[campaign.status].includes(req.body.status)) return res.status(409).json({ message: `Cannot change campaign from ${campaign.status} to ${req.body.status}` });
  if (req.body.status === 'published') {
    const count = await Evaluation.countDocuments({ campaign: campaign._id });
    if (!count) return res.status(409).json({ message: 'A campaign with no responses cannot be published' });
    campaign.publishedAt = new Date();
  }
  campaign.status = req.body.status;
  await campaign.save();
  await logActivity(req, req.body.status, 'campaign', campaign._id.toString());
  res.json(campaign);
});

router.delete('/:id', admin, async (req, res) => {
  const campaign = await EvaluationCampaign.findById(req.params.id);
  if (!campaign) return res.status(404).json({ message: 'Campaign not found' });
  if (campaign.status !== 'scheduled') return res.status(409).json({ message: 'Only scheduled campaigns can be deleted' });
  await campaign.deleteOne();
  res.json({ message: 'Campaign deleted' });
});

module.exports = router;
