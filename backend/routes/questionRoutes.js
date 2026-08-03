const express = require('express');
const EvaluationQuestion = require('../models/EvaluationQuestion');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv, parseOptions } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const questionManagers = [protect, authorize('admin', 'registration')];
const questionAuthors = [protect, authorize('admin', 'registration', 'lecturer')];

const columns = [
  { header: 'question_id', key: 'questionId' },
  { header: 'question_text', key: 'questionText' },
  { header: 'category', key: 'category' },
  { header: 'input_type', key: 'inputType' },
  { header: 'options', key: 'options' },
  { header: 'order', key: 'order' },
  { header: 'status', key: 'status' }
];

const toQuestion = (body) => ({
  questionId: body.questionId || body.question_id,
  questionText: body.questionText || body.question_text,
  category: body.category,
  inputType: body.inputType || body.input_type || 'likert',
  options: Array.isArray(body.options) ? body.options : parseOptions(body.options),
  order: Number(body.order || 0),
  status: body.status || 'active'
});

const generateQuestionId = (lecturerId) => `LQ-${lecturerId}-${Date.now()}`;

router.get('/', protect, async (req, res) => {
  const { search = '', category, activeOnly = 'false', mine, lecturerId, courseCode } = req.query;
  const query = {};
  if (search) query.questionText = new RegExp(search, 'i');
  if (category) query.category = category;
  if (activeOnly === 'true') query.status = 'active';

  if (mine === 'true') {
    if (req.user.role !== 'lecturer') return res.status(403).json({ message: 'Only lecturers can view their own questions' });
    query.scope = 'lecturer';
    query.lecturerId = req.user.loginId;
  } else if (lecturerId) {
    query.$or = [
      { scope: 'global' },
      { scope: 'lecturer', lecturerId, ...(courseCode ? { $or: [{ courseCode: { $in: ['', null] } }, { courseCode }] } : {}) }
    ];
  } else {
    query.scope = 'global';
  }

  const data = await EvaluationQuestion.find(query).sort({ category: 1, order: 1 });
  res.json({ data });
});

router.post('/', questionAuthors, async (req, res) => {
  const payload = toQuestion(req.body);
  if (req.user.role === 'lecturer') {
    payload.scope = 'lecturer';
    payload.lecturerId = req.user.loginId;
    payload.courseCode = req.body.courseCode || '';
    if (!payload.questionId) payload.questionId = generateQuestionId(req.user.loginId);
  } else {
    payload.scope = 'global';
    payload.lecturerId = undefined;
    payload.courseCode = undefined;
  }
  const question = await EvaluationQuestion.create(payload);
  await logActivity(req, 'create', 'question', question.questionId);
  res.status(201).json(question);
});

router.put('/:id', questionAuthors, async (req, res) => {
  const existing = await EvaluationQuestion.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Question not found' });
  if (req.user.role === 'lecturer' && (existing.scope !== 'lecturer' || existing.lecturerId !== req.user.loginId)) {
    return res.status(403).json({ message: 'You can only edit your own questions' });
  }

  const payload = toQuestion(req.body);
  if (req.user.role === 'lecturer') {
    payload.scope = 'lecturer';
    payload.lecturerId = req.user.loginId;
    payload.courseCode = req.body.courseCode || '';
  } else {
    payload.scope = existing.scope;
    payload.lecturerId = existing.lecturerId;
    payload.courseCode = existing.courseCode;
  }

  const question = await EvaluationQuestion.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });
  await logActivity(req, 'update', 'question', question.questionId);
  res.json(question);
});

router.delete('/:id', questionAuthors, async (req, res) => {
  const existing = await EvaluationQuestion.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Question not found' });
  if (req.user.role === 'lecturer' && (existing.scope !== 'lecturer' || existing.lecturerId !== req.user.loginId)) {
    return res.status(403).json({ message: 'You can only delete your own questions' });
  }
  await EvaluationQuestion.findByIdAndDelete(req.params.id);
  await logActivity(req, 'delete', 'question', existing.questionId);
  res.json({ message: 'Question deleted' });
});

router.post('/import-csv', questionManagers, upload.single('file'), async (req, res) => {
  const rows = await readCsv(req.file.path);
  let imported = 0;
  for (const row of rows) {
    const payload = toQuestion(row);
    if (!payload.questionId || !payload.questionText) continue;
    await EvaluationQuestion.findOneAndUpdate({ questionId: payload.questionId }, payload, {
      upsert: true,
      new: true,
      runValidators: true
    });
    imported += 1;
  }
  await logActivity(req, 'import_csv', 'question', 'bulk', { imported });
  res.json({ message: 'Questions imported', imported });
});

router.get('/export-csv', questionManagers, async (req, res) => {
  sendCsv(res, 'evaluation_questions.csv', await EvaluationQuestion.find({ scope: 'global' }).lean(), columns);
});

module.exports = router;
