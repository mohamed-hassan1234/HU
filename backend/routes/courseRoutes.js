const express = require('express');
const Course = require('../models/Course');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');
const { scopedQuery } = require('../utils/accessControl');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

const columns = [
  { header: 'course_code', key: 'courseCode' },
  { header: 'course_name', key: 'courseName' },
  { header: 'credit_hours', key: 'creditHours' },
  { header: 'status', key: 'status' }
];

const toCourse = (body) => ({
  courseCode: body.courseCode || body.course_code,
  courseName: body.courseName || body.course_name,
  creditHours: Number(body.creditHours || body.credit_hours || 3),
  status: String(body.status || 'active').toLowerCase()
});

router.get('/', protect, authorize('admin', 'registration', 'department_head', 'dean'), async (req, res) => {
  const { search = '', page = 1, limit = 10, facultyId, departmentId } = req.query;
  const query = scopedQuery(req, {});
  if (search) query.$or = [{ courseCode: new RegExp(search, 'i') }, { courseName: new RegExp(search, 'i') }];
  if (facultyId && req.user.role === 'admin') query.facultyId = facultyId;
  if (departmentId && req.user.role === 'admin') query.departmentId = departmentId;
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Course.find(query).sort({ courseCode: 1 }).skip(skip).limit(Number(limit)),
    Course.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', adminOnly, async (req, res) => {
  const course = await Course.create(toCourse(req.body));
  await logActivity(req, 'create', 'course', course.courseCode);
  res.status(201).json(course);
});

router.put('/:id', adminOnly, async (req, res) => {
  const course = await Course.findByIdAndUpdate(req.params.id, toCourse(req.body), { new: true, runValidators: true });
  if (!course) return res.status(404).json({ message: 'Course not found' });
  await logActivity(req, 'update', 'course', course.courseCode);
  res.json(course);
});

router.delete('/:id', adminOnly, async (req, res) => {
  const course = await Course.findByIdAndDelete(req.params.id);
  if (!course) return res.status(404).json({ message: 'Course not found' });
  await logActivity(req, 'delete', 'course', course.courseCode);
  res.json({ message: 'Course deleted' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = toCourse(row);
    if (!payload.courseCode || !payload.courseName) continue;
    await Course.findOneAndUpdate({ courseCode: payload.courseCode }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'course', 'bulk', { imported });
  res.json({ message: 'Courses imported', imported });
});

router.get('/export-csv', adminOnly, async (req, res) => {
  sendCsv(res, 'courses.csv', await Course.find().lean(), columns);
});

module.exports = router;
