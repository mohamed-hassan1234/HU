const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { getAnalyticsData } = require('./evaluationRoutes');

const router = express.Router();

router.get('/admin', protect, authorize('admin', 'department_head', 'dean'), async (req, res) => {
  const analytics = await getAnalyticsData(req.query);
  const activity = await ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ ...analytics, activity });
});

module.exports = router;
