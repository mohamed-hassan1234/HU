const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');
const { getAnalyticsData } = require('./evaluationRoutes');
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();

router.get('/admin', protect, authorize('admin', 'department_head', 'dean'), async (req, res) => {
  const analytics = await getAnalyticsData(scopedQuery(req, req.query));
  const activity = await ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ ...analytics, activity });
});

router.get('/registration', protect, authorize('registration'), async (req, res) => {
  const analytics = await getAnalyticsData(scopedQuery(req, req.query));
  res.json({
    ...analytics,
    scope: {
      facultyId: req.user.facultyId,
      faculty: req.user.faculty,
      departmentId: req.user.departmentId,
      department: req.user.department
    }
  });
});

module.exports = router;
