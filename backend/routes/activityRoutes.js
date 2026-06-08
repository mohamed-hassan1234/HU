const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', protect, authorize('admin'), async (req, res) => {
  const data = await ActivityLog.find().sort({ createdAt: -1 }).limit(100);
  res.json({ data });
});

module.exports = router;
