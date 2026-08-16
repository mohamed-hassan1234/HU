const ClassGroup = require('../models/Class');
const StudentClassMembership = require('../models/StudentClassMembership');

const syncStudentMembership = async (student, reason = 'Registration') => {
  if (!student.classId || student.status !== 'active') return null;
  const classGroup = await ClassGroup.findById(student.classId).lean();
  if (!classGroup?.currentAcademicYear || !classGroup?.currentTerm || !classGroup.currentSemester) return null;

  const active = await StudentClassMembership.findOne({ student: student._id, status: 'active' });
  const samePeriod = active
    && String(active.class) === String(classGroup._id)
    && String(active.academicYear) === String(classGroup.currentAcademicYear)
    && String(active.term) === String(classGroup.currentTerm);
  if (samePeriod) return active;

  if (active) {
    active.status = 'transferred';
    active.endedAt = new Date();
    active.reason = reason;
    await active.save();
  }

  return StudentClassMembership.create({
    student: student._id,
    studentId: student.studentId,
    class: classGroup._id,
    classCode: classGroup.classCode,
    className: classGroup.className,
    academicYear: classGroup.currentAcademicYear,
    academicYearName: classGroup.currentAcademicYearName,
    term: classGroup.currentTerm,
    termNumber: classGroup.currentTermNumber,
    semester: classGroup.currentSemester,
    status: 'active',
    reason
  });
};

module.exports = { syncStudentMembership };
