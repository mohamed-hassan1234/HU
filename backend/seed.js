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

const faculty = 'Faculty of Information Technology';
const department = 'Information Technology';
const className = 'BIT-4A';
const semester = 'Semester 2 - 2024/2025';
const academicYear = '2024/2025';

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
  await connectDB();
  await Promise.all([
    User.deleteMany({}),
    Student.deleteMany({}),
    Lecturer.deleteMany({}),
    Course.deleteMany({}),
    CourseAssignment.deleteMany({}),
    EvaluationQuestion.deleteMany({}),
    Evaluation.deleteMany({}),
    ActivityLog.deleteMany({})
  ]);

  await User.create({ loginId: 'admin', password: 'admin123', role: 'admin', status: 'active' });
  const hashedLecturerPassword = await bcrypt.hash('123456', 10);
  await Lecturer.insertMany(lecturers.map((lecturer) => ({ ...lecturer, password: hashedLecturerPassword })));
  for (const lecturer of lecturers) {
    await User.create({ loginId: lecturer.lecturerId, password: '123456', role: 'lecturer', status: 'active' });
  }

  await Course.insertMany(courses);
  await Student.insertMany(students);
  for (const student of students) {
    await User.create({ loginId: student.studentId, password: '123456', role: 'student', status: 'active' });
  }

  await CourseAssignment.insertMany(
    courses.map((course, index) => {
      const lecturer = lecturers[index % lecturers.length];
      return {
        assignmentId: `ASN-${String(index + 1).padStart(3, '0')}`,
        courseCode: course.courseCode,
        courseName: course.courseName,
        className,
        semester,
        academicYear,
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
  console.log('Student: ST001 / 123456');
  console.log('Lecturer: 2020 / 123456');
  await mongoose.disconnect();
};

run().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
