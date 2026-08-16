const express = require('express');
const ClassGroup = require('../models/Class');
const Department = require('../models/Department');
const Student = require('../models/Student');
const User = require('../models/User');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const StudentClassMembership = require('../models/StudentClassMembership');
const ClassPromotion = require('../models/ClassPromotion');
const { protect, authorize } = require('../middleware/auth');
const logActivity = require('../utils/logActivity');

const router = express.Router();
const admins = [protect, authorize('admin')];

const destinationPeriod = async (classGroup) => {
  const currentYear = await AcademicYear.findById(classGroup.currentAcademicYear).lean();
  if (!currentYear) throw Object.assign(new Error('Class academic year was not found'), { statusCode: 409 });
  if (classGroup.currentTermNumber === 1) {
    const term = await AcademicTerm.findOne({ academicYear: currentYear._id, termNumber: 2 }).lean();
    if (!term) throw Object.assign(new Error('Create Term 2 before promoting this class'), { statusCode: 409 });
    return { year: currentYear, term };
  }
  const nextYear = await AcademicYear.findOne({ startDate: { $gt: currentYear.startDate }, status: { $ne: 'closed' } }).sort({ startDate: 1 }).lean();
  if (!nextYear) throw Object.assign(new Error('Create the next academic year before promoting this class'), { statusCode: 409 });
  const term = await AcademicTerm.findOne({ academicYear: nextYear._id, termNumber: 1 }).lean();
  if (!term) throw Object.assign(new Error('Create Term 1 for the next academic year before promotion'), { statusCode: 409 });
  return { year: nextYear, term };
};

const previewFor = async (classId) => {
  const classGroup = await ClassGroup.findById(classId).lean();
  if (!classGroup) throw Object.assign(new Error('Class not found'), { statusCode: 404 });
  if (classGroup.status !== 'active') throw Object.assign(new Error('Only active classes can be promoted'), { statusCode: 409 });
  const currentTerm = await AcademicTerm.findById(classGroup.currentTerm).lean();
  if (!currentTerm || currentTerm.status !== 'closed') throw Object.assign(new Error('Close the current academic term before promotion'), { statusCode: 409 });
  const department = await Department.findById(classGroup.department).lean();
  const students = await Student.find({ classId: classGroup._id, status: 'active' }).sort({ fullName: 1 }).select('_id studentId fullName').lean();
  const nextSemester = Number(classGroup.currentSemester) + 1;
  const graduating = nextSemester > Number(department?.totalSemesters || 8);
  const destination = graduating ? null : await destinationPeriod(classGroup);
  return { classGroup, department, students, nextSemester, graduating, destination };
};

router.get('/history', protect, authorize('admin', 'registration', 'dean'), async (req, res) => {
  const query = req.query.classId ? { class: req.query.classId } : {};
  res.json({ data: await ClassPromotion.find(query).sort({ promotedAt: -1 }).lean() });
});

router.get('/:classId/preview', admins, async (req, res) => {
  const data = await previewFor(req.params.classId);
  res.json({
    class: data.classGroup,
    students: data.students,
    nextSemester: data.nextSemester,
    graduating: data.graduating,
    destination: data.destination ? { academicYear: data.destination.year, term: data.destination.term, semester: data.nextSemester } : null
  });
});

router.post('/:classId/execute', admins, async (req, res) => {
  const data = await previewFor(req.params.classId);
  if (await ClassPromotion.exists({ class: data.classGroup._id, fromAcademicYear: data.classGroup.currentAcademicYear, fromTerm: data.classGroup.currentTerm })) {
    return res.status(409).json({ message: 'This class has already been promoted from the current term' });
  }
  const requested = new Map((req.body.outcomes || []).map((item) => [item.studentId, item]));
  const outcomes = [];
  const validOutcomes = new Set(['promoted', 'repeated', 'transferred', 'suspended', 'withdrawn', 'graduated']);
  for (const student of data.students) {
    const choice = requested.get(student.studentId) || {};
    const outcome = data.graduating ? (choice.outcome || 'graduated') : (choice.outcome || 'promoted');
    if (!validOutcomes.has(outcome) || (data.graduating && outcome === 'promoted')) return res.status(400).json({ message: `Invalid outcome for ${student.studentId}` });
    if (['repeated', 'transferred'].includes(outcome) && !choice.destinationClassId) {
      return res.status(400).json({ message: `Destination class is required for ${student.studentId}` });
    }
    outcomes.push({ student, outcome, destinationClassId: choice.destinationClassId, reason: choice.reason || '' });
  }

  for (const item of outcomes.filter((entry) => entry.destinationClassId)) {
    const destinationClass = await ClassGroup.findById(item.destinationClassId).lean();
    if (!destinationClass || destinationClass.status !== 'active') return res.status(400).json({ message: `Active destination class not found for ${item.student.studentId}` });
    item.destinationClass = destinationClass;
  }

  for (const item of outcomes) {
    await StudentClassMembership.updateMany({ student: item.student._id, status: 'active' }, { $set: { status: item.outcome, endedAt: new Date(), reason: item.reason } });
    let destinationClass = data.classGroup;
    if (item.destinationClass) destinationClass = item.destinationClass;
    const keepsActive = ['promoted', 'repeated', 'transferred'].includes(item.outcome);
    if (keepsActive) {
      if (!destinationClass) return res.status(400).json({ message: `Destination class not found for ${item.student.studentId}` });
      const period = item.outcome === 'promoted' ? data.destination : {
        year: await AcademicYear.findById(destinationClass.currentAcademicYear).lean(),
        term: await AcademicTerm.findById(destinationClass.currentTerm).lean()
      };
      await StudentClassMembership.create({ student: item.student._id, studentId: item.student.studentId, class: destinationClass._id, classCode: destinationClass.classCode, className: destinationClass.className, academicYear: period.year._id, academicYearName: period.year.name, term: period.term._id, termNumber: period.term.termNumber, semester: item.outcome === 'promoted' ? data.nextSemester : destinationClass.currentSemester, status: 'active' });
      await Student.updateOne({ _id: item.student._id }, { $set: { classId: destinationClass._id, className: destinationClass.className, academicYear: period.year.name, semester: `Semester ${item.outcome === 'promoted' ? data.nextSemester : destinationClass.currentSemester}`, status: 'active' } });
    } else {
      await Student.updateOne({ _id: item.student._id }, { $set: { status: item.outcome } });
      await User.updateOne({ loginId: item.student.studentId }, { $set: { status: 'inactive' } });
    }
  }

  const promotion = await ClassPromotion.create({ class: data.classGroup._id, fromAcademicYear: data.classGroup.currentAcademicYear, fromTerm: data.classGroup.currentTerm, fromSemester: data.classGroup.currentSemester, toAcademicYear: data.destination?.year._id, toTerm: data.destination?.term._id, toSemester: data.graduating ? undefined : data.nextSemester, outcomes: outcomes.map((item) => ({ student: item.student._id, studentId: item.student.studentId, outcome: item.outcome, destinationClass: item.destinationClassId, reason: item.reason })), promotedBy: req.user.loginId });
  if (data.graduating) {
    await ClassGroup.updateOne({ _id: data.classGroup._id }, { $set: { status: 'graduated' } });
  } else {
    await ClassGroup.updateOne({ _id: data.classGroup._id }, { $set: { currentAcademicYear: data.destination.year._id, currentAcademicYearName: data.destination.year.name, currentTerm: data.destination.term._id, currentTermNumber: data.destination.term.termNumber, currentSemester: data.nextSemester, academicYear: data.destination.year.name, semester: `Semester ${data.nextSemester}` } });
  }
  await logActivity(req, 'promote', 'class', data.classGroup._id.toString(), { promotionId: promotion._id.toString(), students: outcomes.length });
  res.status(201).json(promotion);
});

module.exports = router;
