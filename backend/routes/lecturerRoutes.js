const express = require('express');
const bcrypt = require('bcryptjs');
const Lecturer = require('../models/Lecturer');
const User = require('../models/User');
const Evaluation = require('../models/Evaluation');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const adminOnly = [protect, authorize('admin')];

const columns = [
  { header: 'lecturer_id', key: 'lecturerId' },
  { header: 'full_name', key: 'fullName' },
  { header: 'status', key: 'status' }
];

const toLecturer = (body) => ({
  lecturerId: body.lecturerId || body.lecturer_id,
  fullName: body.fullName || body.full_name || body.lecturer_name,
  password: body.password,
  status: String(body.status || 'active').toLowerCase()
});

const upsertLecturerUser = async (lecturer, password) => {
  const user = await User.findOne({ loginId: lecturer.lecturerId });
  if (user) {
    user.role = 'lecturer';
    user.status = lecturer.status;
    if (password) user.password = password;
    await user.save();
  } else {
    await User.create({
      loginId: lecturer.lecturerId,
      password: password || lecturer.lecturerId,
      role: 'lecturer',
      status: lecturer.status
    });
  }
};

router.get('/', protect, authorize('admin', 'department_head', 'dean'), async (req, res) => {
  const { search = '', page = 1, limit = 10 } = req.query;
  const query = {};
  if (search) query.$or = [{ lecturerId: new RegExp(search, 'i') }, { fullName: new RegExp(search, 'i') }];
  const skip = (Number(page) - 1) * Number(limit);
  const [data, total] = await Promise.all([
    Lecturer.find(query).sort({ fullName: 1 }).skip(skip).limit(Number(limit)),
    Lecturer.countDocuments(query)
  ]);
  res.json({ data, total, page: Number(page), pages: Math.ceil(total / Number(limit)) || 1 });
});

router.post('/', adminOnly, async (req, res) => {
  const payload = toLecturer(req.body);
  if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
  const lecturer = await Lecturer.create(payload);
  await upsertLecturerUser(lecturer, req.body.password || payload.lecturerId);
  await logActivity(req, 'create', 'lecturer', lecturer.lecturerId);
  res.status(201).json(lecturer);
});

router.put('/:id', adminOnly, async (req, res) => {
  const payload = toLecturer(req.body);
  if (!payload.password) delete payload.password;
  else payload.password = await bcrypt.hash(payload.password, 10);
  const lecturer = await Lecturer.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });
  if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
  await upsertLecturerUser(lecturer, req.body.password);
  await logActivity(req, 'update', 'lecturer', lecturer.lecturerId);
  res.json(lecturer);
});

router.delete('/:id', adminOnly, async (req, res) => {
  const lecturer = await Lecturer.findByIdAndDelete(req.params.id);
  if (!lecturer) return res.status(404).json({ message: 'Lecturer not found' });
  await User.deleteOne({ loginId: lecturer.lecturerId });
  await logActivity(req, 'delete', 'lecturer', lecturer.lecturerId);
  res.json({ message: 'Lecturer deleted' });
});

router.post('/import-csv', adminOnly, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = toLecturer(row);
    if (!payload.lecturerId || !payload.fullName) continue;
    const loginPassword = row.password || payload.lecturerId;
    if (payload.password) payload.password = await bcrypt.hash(payload.password, 10);
    const lecturer = await Lecturer.findOneAndUpdate({ lecturerId: payload.lecturerId }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    await upsertLecturerUser(lecturer, loginPassword);
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'lecturer', 'bulk', { imported });
  res.json({ message: 'Lecturers imported', imported });
});

router.get('/export-csv', adminOnly, async (req, res) => {
  sendCsv(res, 'lecturers.csv', await Lecturer.find().lean(), columns);
});

router.get('/me/summary', protect, authorize('lecturer'), async (req, res) => {
  const evaluations = await Evaluation.find({ lecturerId: req.user.loginId }).lean();
  const avg = (key) =>
    evaluations.length ? evaluations.reduce((sum, item) => sum + (item[key] || 0), 0) / evaluations.length : 0;
  const courses = {};
  evaluations.forEach((item) => {
    courses[item.courseCode] ||= { courseCode: item.courseCode, courseName: item.courseName, count: 0, score: 0 };
    courses[item.courseCode].count += 1;
    courses[item.courseCode].score += item.lecturerOverallRating || 0;
  });
  res.json({
    totalSubmissions: evaluations.length,
    averageLecturerScore: Number(avg('lecturerOverallRating').toFixed(2)),
    averageCourseScore: Number(avg('courseOverallRating').toFixed(2)),
    courses: Object.values(courses).map((course) => ({
      ...course,
      average: Number((course.score / course.count).toFixed(2))
    }))
  });
});

module.exports = router;
