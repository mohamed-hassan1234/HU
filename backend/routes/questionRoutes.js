const express = require('express');
const EvaluationQuestion = require('../models/EvaluationQuestion');
const upload = require('../middleware/upload');
const { protect, authorize } = require('../middleware/auth');
const { readCsv, sendCsv, parseOptions } = require('../utils/csv');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const questionManagers = [protect, authorize('admin', 'registration')];

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

const generateQuestionId = (prefix) => `${prefix}-${Date.now()}`;

router.get('/', protect, async (req, res) => {
  const { search = '', category, activeOnly = 'false', scope, lecturerId, courseCode, forStudent } = req.query;
  const query = {};
  if (search) query.questionText = new RegExp(search, 'i');
  if (category) query.category = category;
  if (activeOnly === 'true') query.status = 'active';

  if (forStudent === 'true' && lecturerId) {
    query.$or = [
      { scope: 'global' },
      { scope: 'all-teachers' },
      { scope: 'lecturer', lecturerId, ...(courseCode ? { $or: [{ courseCode: { $in: ['', null] } }, { courseCode }] } : {}) }
    ];
  } else if (scope === 'lecturer') {
    if (!['admin', 'registration'].includes(req.user.role)) return res.status(403).json({ message: 'Not authorized to view teacher questions' });
    query.$or = lecturerId ? [{ scope: 'lecturer', lecturerId }, { scope: 'all-teachers' }] : [{ scope: 'lecturer' }, { scope: 'all-teachers' }];
  } else if (scope === 'all-teachers') {
    if (!['admin', 'registration'].includes(req.user.role)) return res.status(403).json({ message: 'Not authorized to view teacher questions' });
    query.scope = 'all-teachers';
  } else {
    query.scope = 'global';
  }

  const data = await EvaluationQuestion.find(query).sort({ category: 1, order: 1 });
  res.json({ data });
});

router.post('/', questionManagers, async (req, res) => {
  const payload = toQuestion(req.body);
  if (req.body.scope === 'lecturer') {
    if (!req.body.lecturerId) return res.status(400).json({ message: 'Select the teacher this question belongs to' });
    payload.scope = 'lecturer';
    payload.lecturerId = req.body.lecturerId;
    payload.courseCode = req.body.courseCode || '';
    if (!payload.questionId) payload.questionId = generateQuestionId(`LQ-${req.body.lecturerId}`);
  } else if (req.body.scope === 'all-teachers') {
    payload.scope = 'all-teachers';
    payload.courseCode = '';
    if (!payload.questionId) payload.questionId = generateQuestionId('ATQ');
  } else {
    payload.scope = 'global';
  }
  const question = await EvaluationQuestion.create(payload);
  await logActivity(req, 'create', 'question', question.questionId);
  res.status(201).json(question);
});

router.put('/:id', questionManagers, async (req, res) => {
  const existing = await EvaluationQuestion.findById(req.params.id);
  if (!existing) return res.status(404).json({ message: 'Question not found' });

  const payload = toQuestion(req.body);
  if (existing.scope === 'lecturer') {
    payload.scope = 'lecturer';
    payload.lecturerId = req.body.lecturerId || existing.lecturerId;
    payload.courseCode = req.body.courseCode ?? existing.courseCode;
  } else if (existing.scope === 'all-teachers') {
    payload.scope = 'all-teachers';
    payload.courseCode = '';
  } else {
    payload.scope = 'global';
  }

  const question = await EvaluationQuestion.findByIdAndUpdate(req.params.id, payload, {
    new: true,
    runValidators: true
  });
  await logActivity(req, 'update', 'question', question.questionId);
  res.json(question);
});

router.delete('/:id', questionManagers, async (req, res) => {
  const question = await EvaluationQuestion.findByIdAndDelete(req.params.id);
  if (!question) return res.status(404).json({ message: 'Question not found' });
  await logActivity(req, 'delete', 'question', question.questionId);
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
