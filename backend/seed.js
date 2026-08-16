require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const connectDB = require('./config/db');
const User = require('./models/User');
const Student = require('./models/Student');
const Lecturer = require('./models/Lecturer');
const Course = require('./models/Course');
const CourseAssignment = require('./models/CourseAssignment');
const EvaluationQuestion = require('./models/EvaluationQuestion');
const Evaluation = require('./models/Evaluation');
const ActivityLog = require('./models/ActivityLog');
const Faculty = require('./models/Faculty');
const Department = require('./models/Department');
const ClassGroup = require('./models/Class');
const AcademicYear = require('./models/AcademicYear');
const AcademicTerm = require('./models/AcademicTerm');
const StudentClassMembership = require('./models/StudentClassMembership');
const ClassPromotion = require('./models/ClassPromotion');
const EvaluationCampaign = require('./models/EvaluationCampaign');

const faculty = 'Faculty of Information Technology';
const department = 'Information Technology';
const className = 'BIT-4A';
const semester = 'Semester 2';
const academicYear = '2025/2026';

const lecturers = [
  ['2020', 'Abdirahman Ali Haji'],
  ['3030', 'Abdifitah Abdullahi Mohamed'],
  ['4040', 'Mumin Omar Adan'],
  ['5050', 'Mohamed Hassan Samatar'],
  ['6060', 'Abdimalik Abdishakur Osman']
].map(([lecturerId, fullName]) => ({
  lecturerId,
  fullName,
  password: '',
  status: 'active'
}));

const courses = [
  ['MGT 411', 'Principle of Management', 3],
  ['IS 909', 'Information Security', 3],
  ['CS 780', 'Cyber Security', 3],
  ['SPM 217', 'Software Process and Management', 3],
  ['ESD 321', 'Embedded System Design', 3],
  ['MPA 315', 'Microprocessor and Assembly', 3]
].map(([courseCode, courseName, creditHours]) => ({
  courseCode,
  courseName,
  creditHours,
  status: 'active'
}));

const students = Array.from({ length: 10 }, (_, index) => {
  const number = String(index + 1).padStart(3, '0');
  return {
    studentId: `ST${number}`,
    fullName: `Student ${number}`,
    faculty,
    department,
    className,
    semester,
    academicYear,
    password: '123456',
    status: 'active'
  };
});

const baseQuestions = [
  ['B1', 'The lecturer was well-prepared for each class', 'Teaching & Instruction Quality'],
  ['B2', 'The lecturer explained concepts clearly and understandably', 'Teaching & Instruction Quality'],
  ['B3', 'The lecturer was available for questions inside/outside class', 'Teaching & Instruction Quality'],
  ['B4', 'The lecturer treated all students with respect and fairness', 'Teaching & Instruction Quality'],
  ['B5', 'The lecturer used examples relevant to local Somali/African context', 'Teaching & Instruction Quality'],
  ['B6', 'The lecturer encouraged student participation and discussion', 'Teaching & Instruction Quality'],
  ['B7', 'The lecturer provided useful feedback on assignments', 'Teaching & Instruction Quality'],
  ['B8', 'Classes started and ended on time', 'Teaching & Instruction Quality'],
  ['C1', 'The course content was relevant to my program of study', 'Course Content & Curriculum'],
  ['C2', 'Course materials were helpful', 'Course Content & Curriculum'],
  ['C3', 'The workload was appropriate for the credit hours', 'Course Content & Curriculum'],
  ['C4', 'Course objectives were clearly communicated', 'Course Content & Curriculum'],
  ['C5', 'The course prepared me for real-world professional practice', 'Course Content & Curriculum'],
  ['D1', 'Assignments and exams were aligned with what was taught', 'Assessment & Evaluation'],
  ['D2', 'Grading was fair and transparent', 'Assessment & Evaluation'],
  ['D3', 'Feedback on assessments was returned on time', 'Assessment & Evaluation'],
  ['D4', 'Assessment methods tested understanding, not memorization', 'Assessment & Evaluation'],
  ['E1', 'The classroom environment was conducive to learning', 'Learning Environment & Resources'],
  ['E2', 'Technology/equipment supported learning', 'Learning Environment & Resources'],
  ['E3', 'Library and online resources were adequate', 'Learning Environment & Resources']
];

const questions = [
  ...baseQuestions.map(([questionId, questionText, category], index) => ({
    questionId,
    questionText,
    category,
    inputType: 'likert',
    options: ['1', '2', '3', '4', '5'],
    order: index + 1,
    status: 'active'
  })),
  {
    questionId: 'F1',
    questionText: 'Overall course rating',
    category: 'Overall Rating',
    inputType: 'star',
    options: ['1', '2', '3', '4', '5'],
    order: 101,
    status: 'active'
  },
  {
    questionId: 'F2',
    questionText: 'Overall lecturer rating',
    category: 'Overall Rating',
    inputType: 'star',
    options: ['1', '2', '3', '4', '5'],
    order: 102,
    status: 'active'
  },
  {
    questionId: 'F3',
    questionText: 'Would you recommend this course?',
    category: 'Overall Rating',
    inputType: 'radio',
    options: ['Yes', 'Maybe', 'No'],
    order: 103,
    status: 'active'
  },
  {
    questionId: 'F4',
    questionText: 'Attendance rate',
    category: 'Overall Rating',
    inputType: 'radio',
    options: ['75-100%', '50-74%', 'Less than 50%'],
    order: 104,
    status: 'active'
  }
];

const run = async () => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Database seeding is disabled in production');
  }
  if (process.env.ALLOW_DATABASE_RESET !== 'true') {
    throw new Error('Seed resets all application data. Set ALLOW_DATABASE_RESET=true to confirm this development-only reset.');
  }
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Faculty.deleteMany({}),
    Department.deleteMany({}),
    ClassGroup.deleteMany({}),
    AcademicYear.deleteMany({}),
    AcademicTerm.deleteMany({}),
    StudentClassMembership.deleteMany({}),
    ClassPromotion.deleteMany({}),
    EvaluationCampaign.deleteMany({}),
    Student.deleteMany({}),
    Lecturer.deleteMany({}),
    Course.deleteMany({}),
    CourseAssignment.deleteMany({}),
    EvaluationQuestion.deleteMany({}),
    Evaluation.deleteMany({}),
    ActivityLog.deleteMany({})
  ]);

  const computingFaculty = await Faculty.create({
    name: faculty,
    code: 'FIT',
    description: 'Computing and information technology programs',
    status: 'active'
  });
  const itDepartment = await Department.create({
    name: department,
    code: 'IT',
    faculty: computingFaculty._id,
    facultyName: computingFaculty.name,
    totalSemesters: 8,
    status: 'active'
  });
  const seededAcademicYear = await AcademicYear.create({
    name: academicYear,
    startDate: new Date('2025-09-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
    status: 'active'
  });
  await AcademicTerm.create({
    academicYear: seededAcademicYear._id,
    academicYearName: seededAcademicYear.name,
    termNumber: 1,
    name: 'Term 1',
    startDate: new Date('2025-09-01T00:00:00.000Z'),
    endDate: new Date('2026-01-31T23:59:59.999Z'),
    status: 'closed'
  });
  const seededTerm = await AcademicTerm.create({
    academicYear: seededAcademicYear._id,
    academicYearName: seededAcademicYear.name,
    termNumber: 2,
    name: 'Term 2',
    startDate: new Date('2026-02-01T00:00:00.000Z'),
    endDate: new Date('2026-08-31T23:59:59.999Z'),
    status: 'active'
  });
  const bitClass = await ClassGroup.create({
    classCode: 'BIT-4A',
    className,
    description: 'Bachelor of Information Technology cohort A',
    faculty: computingFaculty._id,
    facultyName: computingFaculty.name,
    department: itDepartment._id,
    departmentName: itDepartment.name,
    currentAcademicYear: seededAcademicYear._id,
    currentAcademicYearName: seededAcademicYear.name,
    currentTerm: seededTerm._id,
    currentTermNumber: 2,
    currentSemester: 2,
    semester,
    academicYear,
    status: 'active'
  });

  await User.create({ loginId: 'admin', fullName: 'System Administrator', password: 'admin123', role: 'admin', status: 'active' });
  await User.create({
    loginId: 'reg-it',
    fullName: 'IT Registration Officer',
    email: 'registration.it@hu.edu.so',
    password: 'Reg12345!',
    role: 'registration',
    facultyId: computingFaculty._id,
    faculty: computingFaculty.name,
    departmentId: itDepartment._id,
    department: itDepartment.name,
    permissions: ['students.manage', 'lecturers.manage', 'assignments.manage', 'questions.manage', 'reports.department'],
    status: 'active'
  });
  await User.create({
    loginId: 'dean-fit',
    fullName: 'Dean of Information Technology',
    email: 'dean.fit@hu.edu.so',
    password: 'Dean12345!',
    role: 'dean',
    facultyId: computingFaculty._id,
    faculty: computingFaculty.name,
    permissions: ['reports.faculty', 'analytics.faculty', 'rankings.faculty', 'class_reports.faculty'],
    status: 'active'
  });
  const hashedLecturerPassword = await bcrypt.hash('123456', 10);
  await Lecturer.insertMany(lecturers.map((lecturer) => ({
    ...lecturer,
    faculty,
    facultyId: computingFaculty._id,
    department,
    departmentId: itDepartment._id,
    password: hashedLecturerPassword
  })));
  for (const lecturer of lecturers) {
    await User.create({
      loginId: lecturer.lecturerId,
      fullName: lecturer.fullName,
      password: '123456',
      role: 'lecturer',
      facultyId: computingFaculty._id,
      faculty: computingFaculty.name,
      departmentId: itDepartment._id,
      department: itDepartment.name,
      status: 'active'
    });
  }

  await Course.insertMany(courses.map((course) => ({
    ...course,
    faculty,
    facultyId: computingFaculty._id,
    department,
    departmentId: itDepartment._id
  })));
  const seededStudents = await Student.insertMany(students.map((student) => ({
    ...student,
    facultyId: computingFaculty._id,
    departmentId: itDepartment._id,
    classId: bitClass._id
  })));
  await StudentClassMembership.insertMany(seededStudents.map((student) => ({
    student: student._id, studentId: student.studentId, class: bitClass._id,
    classCode: bitClass.classCode, className: bitClass.className,
    academicYear: seededAcademicYear._id, academicYearName: seededAcademicYear.name,
    term: seededTerm._id, termNumber: seededTerm.termNumber,
    semester: bitClass.currentSemester, status: 'active', reason: 'Seed registration'
  })));
  for (const student of students) {
    await User.create({
      loginId: student.studentId,
      fullName: student.fullName,
      password: '123456',
      role: 'student',
      facultyId: computingFaculty._id,
      faculty: computingFaculty.name,
      departmentId: itDepartment._id,
      department: itDepartment.name,
      status: 'active'
    });
  }

  await CourseAssignment.insertMany(
    courses.map((course, index) => {
      const lecturer = lecturers[index % lecturers.length];
      return {
        assignmentId: `ASN-${String(index + 1).padStart(3, '0')}`,
        courseCode: course.courseCode,
        courseName: course.courseName,
        faculty,
        facultyId: computingFaculty._id,
        department,
        departmentId: itDepartment._id,
        className,
        classId: bitClass._id,
        semester,
        academicYear,
        academicYearId: seededAcademicYear._id,
        termId: seededTerm._id,
        termNumber: seededTerm.termNumber,
        lecturerId: lecturer.lecturerId,
        lecturerName: lecturer.fullName,
        status: 'active'
      };
    })
  );

  await EvaluationQuestion.insertMany(questions);
  await ActivityLog.create({ actorLoginId: 'system', actorRole: 'system', action: 'seed', entity: 'database' });

  console.log('HUCEMS seed complete');
  console.log('Admin: admin / admin123');
  console.log('Registration Officer: reg-it / Reg12345!');
  console.log('Dean: dean-fit / Dean12345!');
  console.log('Student: ST001 / 123456');
  console.log('Lecturer: 2020 / 123456');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
