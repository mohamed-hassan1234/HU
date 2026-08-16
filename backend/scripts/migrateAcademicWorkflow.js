require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const AcademicYear = require('../models/AcademicYear');
const AcademicTerm = require('../models/AcademicTerm');
const ClassGroup = require('../models/Class');
const CourseAssignment = require('../models/CourseAssignment');
const Student = require('../models/Student');
const StudentClassMembership = require('../models/StudentClassMembership');

const semesterNumber = (value) => Number(String(value || '').match(/\d+/)?.[0] || 1);

async function run() {
  await connectDB();
  const classes = await ClassGroup.find({ status: { $nin: ['graduated', 'archived'] } });
  let migratedClasses = 0; let memberships = 0; let assignments = 0;
  for (const classGroup of classes) {
    const yearName = classGroup.currentAcademicYearName || classGroup.academicYear;
    if (!yearName) continue;
    const year = await AcademicYear.findOne({ name: yearName });
    if (!year) continue;
    const semester = classGroup.currentSemester || semesterNumber(classGroup.semester);
    const termNumber = semester % 2 ? 1 : 2;
    const term = await AcademicTerm.findOne({ academicYear: year._id, termNumber });
    if (!term) continue;
    classGroup.classCode ||= String(classGroup.className).replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toUpperCase();
    Object.assign(classGroup, { currentAcademicYear: year._id, currentAcademicYearName: year.name, currentTerm: term._id, currentTermNumber: termNumber, currentSemester: semester });
    await classGroup.save(); migratedClasses += 1;
    const result = await CourseAssignment.updateMany({ classId: classGroup._id, academicYear: year.name }, { $set: { academicYearId: year._id, termId: term._id, termNumber, semester: `Semester ${semester}` } });
    assignments += result.modifiedCount;
    const students = await Student.find({ classId: classGroup._id, status: 'active' });
    for (const student of students) {
      const exists = await StudentClassMembership.exists({ student: student._id, academicYear: year._id, term: term._id, class: classGroup._id });
      if (!exists) { await StudentClassMembership.create({ student: student._id, studentId: student.studentId, class: classGroup._id, classCode: classGroup.classCode, className: classGroup.className, academicYear: year._id, academicYearName: year.name, term: term._id, termNumber, semester, status: 'active', reason: 'Academic workflow migration' }); memberships += 1; }
    }
  }
  console.log(JSON.stringify({ migratedClasses, assignments, memberships }, null, 2));
  await mongoose.disconnect();
}
run().catch(async (error) => { console.error(error); await mongoose.disconnect(); process.exit(1); });
