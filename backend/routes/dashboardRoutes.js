const express = require('express');
const ActivityLog = require('../models/ActivityLog');
const ClassEvaluation = require('../models/ClassEvaluation');
const { protect, authorize } = require('../middleware/auth');
const { getAnalyticsData } = require('./evaluationRoutes');
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();

const rankClassReports = (rows, idKey, labelKey = 'name') => {
  const map = new Map();
  rows.forEach((item) => {
    const name = item[labelKey] || 'Unknown';
    const key = String(item[idKey] || name);
    const row = map.get(key) || { [labelKey]: name, reports: 0, scoreTotal: 0, completionTotal: 0, attendanceTotal: 0 };
    row.reports += 1;
    row.scoreTotal += Number(item.overallScore || 0);
    row.completionTotal += Number(item.courseCompletion || 0);
    row.attendanceTotal += Number(item.attendancePercent || 0);
    map.set(key, row);
  });
  return [...map.values()]
    .map((item) => ({
      ...item,
      averageScore: item.reports ? Number((item.scoreTotal / item.reports).toFixed(2)) : 0,
      courseCompletion: item.reports ? Number((item.completionTotal / item.reports).toFixed(1)) : 0,
      attendancePercent: item.reports ? Number((item.attendanceTotal / item.reports).toFixed(1)) : 0
    }))
    .sort((a, b) => b.averageScore - a.averageScore || b.attendancePercent - a.attendancePercent)
    .map((item, index) => ({ ...item, rank: index + 1 }));
};

const classReportFilter = (filter = {}) => {
  const allowed = ['faculty', 'facultyId', 'department', 'departmentId', 'className', 'classId', 'lecturerId', 'courseCode', 'semester', 'academicYear'];
  const query = {};
  allowed.forEach((key) => {
    if (filter[key]) query[key] = filter[key];
  });
  if (filter.dateFrom || filter.dateTo) {
    query.submittedAt = {};
    if (filter.dateFrom) query.submittedAt.$gte = new Date(filter.dateFrom);
    if (filter.dateTo) query.submittedAt.$lte = new Date(filter.dateTo);
  }
  return query;
};

const getClassReportAnalytics = async (filter) => {
  const rows = await ClassEvaluation.find(classReportFilter(filter)).lean();
  const classRankings = rankClassReports(rows, 'classId', 'className');
  const departmentRankings = rankClassReports(rows, 'departmentId', 'department');
  const facultyRankings = rankClassReports(rows, 'facultyId', 'faculty');
  return {
    totalClassReports: rows.length,
    classRankings,
    departmentRankings,
    facultyRankings,
    bestClass: classRankings[0] || null,
    worstClass: [...classRankings].reverse().find((item) => item.reports > 0) || null,
    bestDepartment: departmentRankings[0] || null,
    worstDepartment: [...departmentRankings].reverse().find((item) => item.reports > 0) || null,
    bestFaculty: facultyRankings[0] || null,
    worstFaculty: [...facultyRankings].reverse().find((item) => item.reports > 0) || null
  };
};

router.get('/admin', protect, authorize('admin', 'dean'), async (req, res) => {
  const filter = scopedQuery(req, req.query);
  const analytics = await getAnalyticsData(filter);
  const classReports = await getClassReportAnalytics(filter);
  const activity = await ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean();
  res.json({ ...analytics, classReports, activity });
});

router.get('/registration', protect, authorize('registration'), async (req, res) => {
  const filter = scopedQuery(req, req.query);
  const analytics = await getAnalyticsData(filter);
  const classReports = await getClassReportAnalytics(filter);
  res.json({
    ...analytics,
    classReports,
    scope: {
      facultyId: req.user.facultyId,
      faculty: req.user.faculty,
      departmentId: req.user.departmentId,
      department: req.user.department
    }
  });
});

module.exports = router;
