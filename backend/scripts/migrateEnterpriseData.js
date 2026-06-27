require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const Faculty = require('../models/Faculty');
const Department = require('../models/Department');
const ClassGroup = require('../models/Class');
const Student = require('../models/Student');
const Lecturer = require('../models/Lecturer');
const Course = require('../models/Course');
const CourseAssignment = require('../models/CourseAssignment');
const Evaluation = require('../models/Evaluation');
const ClassEvaluation = require('../models/ClassEvaluation');
const User = require('../models/User');

const ensureMasterData = async ({ facultyName, departmentName, className, semester, academicYear }) => {
  const faculty = await Faculty.findOneAndUpdate(
    { name: facultyName },
    { name: facultyName, status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const department = await Department.findOneAndUpdate(
    { faculty: faculty._id, name: departmentName },
    { name: departmentName, faculty: faculty._id, facultyName: faculty.name, status: 'active' },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );
  const classGroup = className ? await ClassGroup.findOneAndUpdate(
    { department: department._id, className, semester, academicYear },
    {
      className,
      faculty: faculty._id,
      facultyName: faculty.name,
      department: department._id,
      departmentName: department.name,
      semester: semester || 'Current',
      academicYear: academicYear || 'Current',
      status: 'active'
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  ) : null;
  return { faculty, department, classGroup };
};

const run = async () => {
  await connectDB();

  for (const student of await Student.find()) {
    const { faculty, department, classGroup } = await ensureMasterData({
      facultyName: student.faculty || 'Unassigned Faculty',
      departmentName: student.department || 'Unassigned Department',
      className: student.className,
      semester: 'Current',
      academicYear: 'Current'
    });
    student.facultyId = faculty._id;
    student.departmentId = department._id;
    if (classGroup) student.classId = classGroup._id;
    await student.save();
    await User.updateOne(
      { loginId: student.studentId },
      { fullName: student.fullName, facultyId: faculty._id, faculty: faculty.name, departmentId: department._id, department: department.name }
    );
  }

  for (const lecturer of await Lecturer.find()) {
    const { faculty, department } = await ensureMasterData({
      facultyName: lecturer.faculty || 'Unassigned Faculty',
      departmentName: lecturer.department || 'Unassigned Department'
    });
    lecturer.facultyId = faculty._id;
    lecturer.faculty = faculty.name;
    lecturer.departmentId = department._id;
    lecturer.department = department.name;
    await lecturer.save();
    await User.updateOne(
      { loginId: lecturer.lecturerId },
      { fullName: lecturer.fullName, facultyId: faculty._id, faculty: faculty.name, departmentId: department._id, department: department.name }
    );
  }

  for (const course of await Course.find()) {
    const { faculty, department } = await ensureMasterData({
      facultyName: course.faculty || 'Unassigned Faculty',
      departmentName: course.department || 'Unassigned Department'
    });
    course.facultyId = faculty._id;
    course.faculty = faculty.name;
    course.departmentId = department._id;
    course.department = department.name;
    await course.save();
  }

  for (const assignment of await CourseAssignment.find()) {
    const { faculty, department, classGroup } = await ensureMasterData({
      facultyName: assignment.faculty || 'Unassigned Faculty',
      departmentName: assignment.department || 'Unassigned Department',
      className: assignment.className,
      semester: assignment.semester,
      academicYear: assignment.academicYear
    });
    assignment.facultyId = faculty._id;
    assignment.faculty = faculty.name;
    assignment.departmentId = department._id;
    assignment.department = department.name;
    if (classGroup) assignment.classId = classGroup._id;
    await assignment.save();
  }

  for (const evaluation of await Evaluation.find()) {
    const student = await Student.findOne({ studentId: evaluation.studentId }).lean();
    if (!student) continue;
    evaluation.facultyId = student.facultyId;
    evaluation.departmentId = student.departmentId;
    evaluation.classId = student.classId;
    await evaluation.save();
  }

  for (const report of await ClassEvaluation.find()) {
    const assignment = await CourseAssignment.findOne({ assignmentId: report.assignmentId }).lean();
    if (!assignment) continue;
    report.facultyId = assignment.facultyId;
    report.departmentId = assignment.departmentId;
    report.classId = assignment.classId;
    await report.save();
  }

  console.log('Enterprise master-data migration complete.');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
