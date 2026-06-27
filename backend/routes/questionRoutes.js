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

router.get('/', protect, async (req, res) => {
  const { search = '', category, activeOnly = 'false' } = req.query;
  const query = {};
  if (search) query.questionText = new RegExp(search, 'i');
  if (category) query.category = category;
  if (activeOnly === 'true') query.status = 'active';
  const data = await EvaluationQuestion.find(query).sort({ category: 1, order: 1 });
  res.json({ data });
});

router.post('/', questionManagers, async (req, res) => {
  const question = await EvaluationQuestion.create(toQuestion(req.body));
  await logActivity(req, 'create', 'question', question.questionId);
  res.status(201).json(question);
});

router.put('/:id', questionManagers, async (req, res) => {
  const question = await EvaluationQuestion.findByIdAndUpdate(req.params.id, toQuestion(req.body), {
    new: true,
    runValidators: true
  });
  if (!question) return res.status(404).json({ message: 'Question not found' });
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
  sendCsv(res, 'evaluation_questions.csv', await EvaluationQuestion.find().lean(), columns);
});

module.exports = router;
